import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { statusConst } from "@/constants/status";
import { db } from "@/lib/database";
import { createHash } from "@/lib/hash";
import { createSessionsService } from "@/modules/sessions/sessions-service";

const ACTIVE_EMAIL = "active@example.com";
const PENDING_EMAIL = "pending@example.com";
const NO_PASSWORD_EMAIL = "nopass@example.com";
const PLAIN_PASSWORD = "S3cret!pa$$word";

const _seedUsers = async () => {
  const hasher = createHash();
  const passwordHash = await hasher.create(PLAIN_PASSWORD);

  await db.user.createMany({
    data: [
      {
        name: "Active",
        email: ACTIVE_EMAIL,
        password: passwordHash,
        status: statusConst.ACTIVE,
      },
      {
        name: "Pending",
        email: PENDING_EMAIL,
        password: passwordHash,
        status: statusConst.PENDING,
      },
      {
        name: "No Password",
        email: NO_PASSWORD_EMAIL,
        password: null,
        status: statusConst.ACTIVE,
      },
    ],
  });
};

describe(".sessions", () => {
  beforeEach(async () => {
    await db.session.deleteMany();
    await db.user.deleteMany();
    await _seedUsers();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  describe(".create", () => {
    it("should create a session for valid active-user credentials", async () => {
      const service = createSessionsService();

      const result = await service.create({
        email: ACTIVE_EMAIL,
        password: PLAIN_PASSWORD,
      });

      expect(result.isOk()).toBe(true);
      const session = result._unsafeUnwrap();
      expect(session.token).toMatch(/^[a-f0-9]{64}$/);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should reject unknown email with INVALID_CREDENTIALS", async () => {
      const service = createSessionsService();

      const result = await service.create({
        email: "ghost@example.com",
        password: PLAIN_PASSWORD,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("INVALID_CREDENTIALS");
    });

    it("should reject wrong password with INVALID_CREDENTIALS", async () => {
      const service = createSessionsService();

      const result = await service.create({
        email: ACTIVE_EMAIL,
        password: "wrong-password-1!",
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("INVALID_CREDENTIALS");
    });

    it("should reject non-active user with USER_NOT_ACTIVE", async () => {
      const service = createSessionsService();

      const result = await service.create({
        email: PENDING_EMAIL,
        password: PLAIN_PASSWORD,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("USER_NOT_ACTIVE");
    });

    it("should reject user with null password as INVALID_CREDENTIALS", async () => {
      const service = createSessionsService();

      const result = await service.create({
        email: NO_PASSWORD_EMAIL,
        password: PLAIN_PASSWORD,
      });

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("INVALID_CREDENTIALS");
    });
  });

  describe(".validate", () => {
    it("should return Ok with session for a valid token", async () => {
      const service = createSessionsService();
      const created = await service.create({
        email: ACTIVE_EMAIL,
        password: PLAIN_PASSWORD,
      });
      const sessionToken = created._unsafeUnwrap().token;

      const result = await service.validate(sessionToken);

      expect(result.isOk()).toBe(true);
      expect(result._unsafeUnwrap().token).toBe(sessionToken);
    });

    it("should return Err TOKEN_NOT_FOUND for unknown token", async () => {
      const service = createSessionsService();

      const result = await service.validate("not-a-real-token");

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("TOKEN_NOT_FOUND");
    });

    it("should return Err TOKEN_EXPIRED for an expired session", async () => {
      const service = createSessionsService();
      const activeUser = await db.user.findUniqueOrThrow({
        where: { email: ACTIVE_EMAIL },
      });
      const expiredToken = "e".repeat(64);
      await db.session.create({
        data: {
          token: expiredToken,
          userId: activeUser.id,
          expiresAt: new Date(Date.now() - 1_000),
        },
      });

      const result = await service.validate(expiredToken);

      expect(result.isErr()).toBe(true);
      expect(result._unsafeUnwrapErr()).toBe("TOKEN_EXPIRED");
    });
  });

  describe(".delete", () => {
    it("should remove an existing session", async () => {
      const service = createSessionsService();
      const created = await service.create({
        email: ACTIVE_EMAIL,
        password: PLAIN_PASSWORD,
      });
      const sessionToken = created._unsafeUnwrap().token;

      const result = await service.delete(sessionToken);

      expect(result.isOk()).toBe(true);
      const stillThere = await db.session.findUnique({
        where: { token: sessionToken },
      });
      expect(stillThere).toBeNull();
    });

    it("should succeed silently for a non-existent token", async () => {
      const service = createSessionsService();

      const result = await service.delete("never-existed-token");

      expect(result.isOk()).toBe(true);
    });
  });
});
