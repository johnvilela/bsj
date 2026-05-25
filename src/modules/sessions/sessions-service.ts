import { randomBytes } from "node:crypto";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { statusConst } from "@/constants/status";
import { db } from "@/lib/database";
import { createHash } from "@/lib/hash";
import type { CreateSessionDTO } from "./sessions-types";

const _DEFAULT_TTL_DAYS = 7;
const _MS_PER_DAY = 24 * 60 * 60 * 1000;

const _ttlMs = () => {
  const raw = Number(process.env.SESSION_TTL_DAYS);
  const days = Number.isFinite(raw) && raw > 0 ? raw : _DEFAULT_TTL_DAYS;
  return days * _MS_PER_DAY;
};

const _generateToken = () => randomBytes(32).toString("hex");

export const createSessionsService = () => {
  const hasher = createHash();

  return {
    create: ({ email, password }: CreateSessionDTO) =>
      ResultAsync.fromPromise(
        db.user.findUnique({ where: { email } }),
        () => "UNKNOWN" as const,
      ).andThen((user) => {
        if (!user || !user.password) {
          return errAsync("INVALID_CREDENTIALS" as const);
        }

        if (user.status !== statusConst.ACTIVE) {
          return errAsync("USER_NOT_ACTIVE" as const);
        }

        return ResultAsync.fromPromise(
          hasher.compare(password, user.password),
          () => "UNKNOWN" as const,
        ).andThen((isMatch) =>
          isMatch
            ? ResultAsync.fromPromise(
                db.session.create({
                  data: {
                    token: _generateToken(),
                    userId: user.id,
                    expiresAt: new Date(Date.now() + _ttlMs()),
                  },
                }),
                () => "UNKNOWN" as const,
              )
            : errAsync("INVALID_CREDENTIALS" as const),
        );
      }),

    validate: (sessionToken: string) =>
      ResultAsync.fromPromise(
        db.session.findUnique({ where: { token: sessionToken } }),
        () => "UNKNOWN" as const,
      ).andThen((session) => {
        if (!session) return errAsync("TOKEN_NOT_FOUND" as const);
        if (session.expiresAt <= new Date()) {
          return errAsync("TOKEN_EXPIRED" as const);
        }
        return okAsync(session);
      }),

    delete: (sessionToken: string) =>
      ResultAsync.fromPromise(
        db.session.deleteMany({ where: { token: sessionToken } }),
        () => "UNKNOWN" as const,
      ).map(() => undefined),
  };
};
