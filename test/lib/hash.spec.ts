import { describe, expect, it } from "bun:test";
import { createHash } from "@/lib/hash";

describe(".hash", () => {
  describe(".create", () => {
    it("should produce argon2id-format string", async () => {
      const hasher = createHash();

      const digest = await hasher.create("hunter2");

      expect(digest.startsWith("$argon2id$")).toBe(true);
    });

    it("should produce different hash each call due to random salt", async () => {
      const hasher = createHash();
      const originalPassword = "correct horse battery staple";

      const firstDigest = await hasher.create(originalPassword);
      const secondDigest = await hasher.create(originalPassword);

      expect(firstDigest).not.toBe(secondDigest);
    });
  });

  describe(".compare", () => {
    it("should verify correct password", async () => {
      const hasher = createHash();
      const originalPassword = "s3cret-pa$$";
      const digest = await hasher.create(originalPassword);

      const isMatch = await hasher.compare(originalPassword, digest);

      expect(isMatch).toBe(true);
    });

    it("should reject wrong password", async () => {
      const hasher = createHash();
      const originalPassword = "right-one";
      const attemptedPassword = "wrong-one";
      const digest = await hasher.create(originalPassword);

      const isMatch = await hasher.compare(attemptedPassword, digest);

      expect(isMatch).toBe(false);
    });

    it("should reject tampered hash", async () => {
      const hasher = createHash();
      const originalPassword = "hunter2";
      const digest = await hasher.create(originalPassword);
      const tamperedDigest = `${digest.slice(0, -1)}${digest.endsWith("A") ? "B" : "A"}`;

      const isMatch = await hasher.compare(originalPassword, tamperedDigest);

      expect(isMatch).toBe(false);
    });
  });

  it("should apply pepper so changing AUTH_SECRET invalidates existing hashes", async () => {
    const originalPassword = "peppered-password";
    const hashScript = `
      const { createHash } = await import("./src/lib/hash.ts");
      const digest = await createHash().create(${JSON.stringify(originalPassword)});
      process.stdout.write(digest);
    `;
    const hashWithFirstSecret = Bun.spawn(["bun", "-e", hashScript], {
      env: { ...process.env, AUTH_SECRET: "first-secret" },
      stdout: "pipe",
    });
    await hashWithFirstSecret.exited;
    const digestFromFirstSecret = await new Response(
      hashWithFirstSecret.stdout,
    ).text();

    const verifyScript = `
      const { createHash } = await import("./src/lib/hash.ts");
      const isMatch = await createHash().compare(${JSON.stringify(originalPassword)}, ${JSON.stringify(digestFromFirstSecret)});
      process.stdout.write(String(isMatch));
    `;
    const verifyWithDifferentSecret = Bun.spawn(["bun", "-e", verifyScript], {
      env: { ...process.env, AUTH_SECRET: "second-secret" },
      stdout: "pipe",
    });
    await verifyWithDifferentSecret.exited;
    const verifyOutput = await new Response(
      verifyWithDifferentSecret.stdout,
    ).text();

    expect(verifyOutput).toBe("false");
  });

  it("should throw at import time when AUTH_SECRET missing", async () => {
    const importScript = `await import("./src/lib/hash.ts");`;
    const childProcess = Bun.spawn(["bun", "-e", importScript], {
      env: { PATH: process.env.PATH ?? "" },
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await childProcess.exited;
    const stderrOutput = await new Response(childProcess.stderr).text();

    expect(exitCode).not.toBe(0);
    expect(stderrOutput).toContain("AUTH_SECRET required");
  });
});
