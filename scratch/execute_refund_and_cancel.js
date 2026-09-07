const { PrismaClient } = require('/var/www/backend2/prisma/generated/postgresql_v2');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' } }
});

async function main() {
  const email = 'ahmedfares61994@gmail.com';
  const appSlug = 'returns-reasons-analytics';
  const refundAmount = 99;

  console.log(`Starting refund and app cancellation process for ${email}...`);

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    include: { company: true }
  });

  if (!user || !user.companyId) {
    throw new Error(`User or company not found for email: ${email}`);
  }

  const companyId = user.companyId;
  console.log(`Company found: ${user.company.name} (${companyId})`);

  // Find the target app
  const app = await prisma.marketplaceApp.findUnique({
    where: { slug: appSlug }
  });

  if (!app) {
    throw new Error(`Marketplace app not found for slug: ${appSlug}`);
  }

  // Find company app installation
  const companyApp = await prisma.companyApp.findFirst({
    where: { companyId, appId: app.id }
  });

  if (!companyApp) {
    throw new Error(`Company app installation not found for app ${app.name}`);
  }

  console.log(`Current CompanyApp status: ${companyApp.status}`);

  // Find company wallet
  const wallet = await prisma.companyWallet.findFirst({
    where: { companyId }
  });

  if (!wallet) {
    throw new Error(`Company wallet not found for company ${companyId}`);
  }

  console.log(`Current Wallet Balance: ${wallet.balance} EGP, Total Spent: ${wallet.totalSpent} EGP`);

  // Execute database transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update CompanyApp status to CANCELLED
    const updatedCompanyApp = await tx.companyApp.update({
      where: { id: companyApp.id },
      data: { status: 'CANCELLED' }
    });

    // 2. Decrement install count on app
    await tx.marketplaceApp.update({
      where: { id: app.id },
      data: { installCount: { decrement: 1 } }
    });

    // 3. Update Wallet Balance and Total Spent
    const newBalance = Number(wallet.balance) + refundAmount;
    const newTotalSpent = Math.max(0, Number(wallet.totalSpent) - refundAmount);

    const updatedWallet = await tx.companyWallet.update({
      where: { id: wallet.id },
      data: {
        balance: newBalance,
        totalSpent: newTotalSpent
      }
    });

    // 4. Create Refund Transaction
    const transaction = await tx.transaction.create({
      data: {
        id: randomUUID(),
        walletId: wallet.id,
        amount: refundAmount,
        type: 'REFUND',
        status: 'COMPLETED',
        description: 'استرداد مبلغ تفعيل تطبيق أسباب المرتجعات (إلغاء الاشتراك)',
        referenceId: `REFUND_${appSlug}_${Date.now()}`
      }
    });

    return { updatedCompanyApp, updatedWallet, transaction };
  });

  console.log('✅ Operation completed successfully!');
  console.log(`- New Wallet Balance: ${result.updatedWallet.balance} EGP`);
  console.log(`- New Total Spent: ${result.updatedWallet.totalSpent} EGP`);
  console.log(`- App Status: ${result.updatedCompanyApp.status}`);
  console.log(`- Refund Transaction ID: ${result.transaction.id}`);
}

main()
  .catch((err) => {
    console.error('❌ Error executing refund script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
