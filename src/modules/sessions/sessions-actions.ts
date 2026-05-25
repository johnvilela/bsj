"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieConst } from "@/constants/cookies";
import { safeAction } from "@/lib/safe-action";
import { createSessionsService } from "./sessions-service";
import { createSessionSchema } from "./sessions-types";

const _isProd = process.env.NODE_ENV === "production";

const _baseCookieOptions = (expiresAt: Date) => ({
  sameSite: "lax" as const,
  secure: _isProd,
  path: "/",
  expires: expiresAt,
});

const _setSessionCookies = async (session: {
  token: string;
  userId: string;
  expiresAt: Date;
}) => {
  const cookieStore = await cookies();
  const base = _baseCookieOptions(session.expiresAt);

  cookieStore.set(cookieConst.SESSION_TOKEN, session.token, {
    ...base,
    httpOnly: true,
  });
  cookieStore.set(
    cookieConst.SESSION_EXPIRES_AT,
    session.expiresAt.toISOString(),
    base,
  );
  cookieStore.set(cookieConst.USER_ID, session.userId, {
    ...base,
    httpOnly: true,
  });
};

const _clearSessionCookies = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(cookieConst.SESSION_TOKEN);
  cookieStore.delete(cookieConst.SESSION_EXPIRES_AT);
  cookieStore.delete(cookieConst.USER_ID);
};

export const createSessionAction = safeAction
  .inputSchema(createSessionSchema)
  .action(async ({ parsedInput }) => {
    const result = await createSessionsService().create(parsedInput);

    if (result.isErr()) {
      return { ok: false as const, error: result.error };
    }

    await _setSessionCookies(result.value);
    redirect("/dashboard");
  });

export const deleteSessionAction = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(cookieConst.SESSION_TOKEN)?.value;

  if (sessionToken) {
    await createSessionsService().delete(sessionToken);
  }

  await _clearSessionCookies();
  redirect("/login");
};
