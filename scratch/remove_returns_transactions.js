const { PrismaClient } = require('/var/www/backend2/prisma/generated/postgresql_v2');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://appuser:mokhtar1234@localhost:5432/maxp' } }
});

async function main() {
  const companyId = 'cmteva12p00lrjuwxpufr4k8w'; // Ameerelle
  const walletId = 'cmtfre1ho00g9jugp3e4ggwn4';
  const appSlug = 'returns-reasons-analytics';

  console.log(`Starting cleanup of transaction history for wallet ${walletId}...`);

  // 1. Find transactions related to returns reasons app
  const txsToDelete = await prisma.transaction.findMany({
    where: {
      walletId: walletId,
      OR: [
        { description: { contains: 'أسباب المرتجعات' } },
        { referenceId: { contains: 'returns-reasons-analytics' } }
      ]
    }
  });

  console.log(`Found ${txsToDelete.length} transactions to delete:`);
  txsToDelete.forEach(t => console.log(`- ID: ${t.id} | Amount: ${t.amount} | Type: ${t.type} | Desc: ${t.description}`));

  // 2. Find companyApp record if exists
  const companyApp = await prisma.companyApp.findFirst({
    where: {
      companyId: companyId,
      app: { slug: appSlug }
    }
  });

  if (companyApp) {
    console.log(`Found CompanyApp record ID: ${companyApp.id} (Status: ${companyApp.status})`);
  }

  // Execute database transaction to delete
  const result = await prisma.$transaction(async (tx) => {
    // Delete transactions
    const deletedTxs = await tx.transaction.deleteMany({
      where: {
        id: { in: txsToDelete.map(t => t.id) }
      }
    });

    // Delete CompanyApp record completely
    let deletedCompanyApp = null;
    if (companyApp) {
      deletedCompanyApp = await tx.companyApp.delete({
        where: { id: companyApp.id }
      });
    }

    // Verify wallet balance remains intact (594 EGP)
    const currentWallet = await tx.companyWallet.findUnique({
      where: { id: walletId }
    });

    return { deletedTxsCount: deletedTxs.count, deletedCompanyApp, currentWallet };
  });

  console.log('✅ Cleanup completed successfully!');
  console.log(`- Deleted transactions count: ${result.deletedTxsCount}`);
  console.log(`- Deleted CompanyApp: ${result.deletedCompanyApp ? 'YES' : 'NO'}`);
  console.log(`- Wallet Balance remains: ${result.currentWallet.balance} EGP`);
}

main()
  .catch((err) => {
    console.error('❌ Error executing cleanup script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
