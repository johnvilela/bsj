import { afterAll } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const TEST_DB_PATH = resolve(import.meta.dir, "..", "db", "test.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

const _removeTestDb = () => {
  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    const path = `${TEST_DB_PATH}${suffix}`;
    if (existsSync(path)) rmSync(path, { force: true });
  }
};

_removeTestDb();

process.env.DATABASE_URL = TEST_DB_URL;

const migrationResult = spawnSync("bunx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: TEST_DB_URL },
});

if (migrationResult.status !== 0) {
  throw new Error("prisma migrate deploy failed in test setup");
}

afterAll(_removeTestDb);
