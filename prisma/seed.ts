import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { subscription: null },
  });

  for (const user of users) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        tier: "free",
      },
    });
  }

  console.log(`Seeded ${users.length} users with free subscription`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
