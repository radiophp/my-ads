import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const expiredSubs = await prisma.userSubscription.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lt: now },
    },
    select: { id: true, userId: true },
  });

  if (expiredSubs.length === 0) {
    console.log('No expired subscriptions found.');
    return;
  }

  const userIds = [...new Set(expiredSubs.map((s) => s.userId))];
  const subIds = expiredSubs.map((s) => s.id);

  await prisma.$transaction([
    prisma.userSubscription.updateMany({
      where: { id: { in: subIds } },
      data: { status: 'EXPIRED' },
    }),
    prisma.savedFilter.updateMany({
      where: { userId: { in: userIds }, isActive: true },
      data: { isActive: false, notificationsEnabled: false },
    }),
  ]);

  console.log(
    `Expired ${subIds.length} subscription(s) and deactivated saved filters for ${userIds.length} user(s).`,
  );
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
