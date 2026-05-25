import { type NextRequest, NextResponse } from "next/server";
import { cookieConst } from "@/constants/cookies";
import { createSessionsService } from "@/modules/sessions/sessions-service";

const _PUBLIC_PATHS = new Set(["/login"]);

const _redirectTo = (path: string, request: NextRequest) =>
  NextResponse.redirect(new URL(path, request.url));

const _clearAuthCookies = (response: NextResponse) => {
  response.cookies.delete(cookieConst.SESSION_TOKEN);
  response.cookies.delete(cookieConst.SESSION_EXPIRES_AT);
  response.cookies.delete(cookieConst.USER_ID);
  return response;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return _redirectTo("/login", request);
  }

  const isPublic = _PUBLIC_PATHS.has(pathname);
  const sessionToken = request.cookies.get(cookieConst.SESSION_TOKEN)?.value;
  const expiresAtRaw = request.cookies.get(
    cookieConst.SESSION_EXPIRES_AT,
  )?.value;
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  const isCookieFresh =
    !!sessionToken && !!expiresAt && expiresAt.getTime() > Date.now();

  if (!isCookieFresh) {
    if (isPublic) return NextResponse.next();
    return _redirectTo("/login", request);
  }

  const validation = await createSessionsService().validate(sessionToken);

  if (validation.isErr()) {
    return _clearAuthCookies(_redirectTo("/login", request));
  }

  if (isPublic) {
    return _redirectTo("/dashboard", request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
