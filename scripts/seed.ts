import { statusConst } from "@/constants/status";
import { db } from "@/lib/database";
import { createHash } from "@/lib/hash";

const ADMIN_EMAIL = "admin@mail.com";
const ADMIN_PASSWORD = "1234567Aa!";

const main = async () => {
  const passwordHash = await createHash().create(ADMIN_PASSWORD);

  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { password: passwordHash, status: statusConst.ACTIVE },
    create: {
      name: "Admin",
      email: ADMIN_EMAIL,
      password: passwordHash,
      status: statusConst.ACTIVE,
    },
  });

  console.log(`seeded ${admin.email} (${admin.status})`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
