const { PrismaClient } = require('/var/www/backend2/prisma/generated/postgresql_v2');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' } } });

async function check() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'ahmedfares61994@gmail.com', mode: 'insensitive' } },
    include: { company: true }
  });
  
  for (const u of users) {
    console.log('User:', u.email, '| ID:', u.id, '| CompanyId:', u.companyId, '| CompanyName:', u.company ? u.company.name : 'N/A');
    if (!u.companyId) continue;

    const wallet = await prisma.companyWallet.findFirst({
      where: { companyId: u.companyId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
    console.log('Wallet:', wallet);

    const installedApps = await prisma.companyApp.findMany({
      where: { companyId: u.companyId },
      include: { app: true }
    });
    console.log('Installed Apps Count:', installedApps.length);
    installedApps.forEach(ia => {
      console.log(`- App ID: ${ia.appId} | Slug: ${ia.app.slug} | Name: ${ia.app.name} | Status: ${ia.status} | TotalSpent: ${ia.totalSpent} | CreatedAt: ${ia.createdAt}`);
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
