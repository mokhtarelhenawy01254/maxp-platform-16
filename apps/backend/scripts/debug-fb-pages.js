const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function debugFBPages() {
  const prisma = getSharedPrismaClient();
  try {
    console.log('--- Facebook Pages Status ---');
    const pages = await prisma.facebookPage.findMany({
      select: {
        pageId: true,
        pageName: true,
        status: true,
        companyId: true,
        connectedAt: true,
        disconnectedAt: true
      }
    });
    console.table(pages);

    console.log('\n--- Recent Ignored SentMessageStats ---');
    const ignoredStats = await prisma.sentMessageStat.findMany({
      where: {
        messageStatus: 'ignored'
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 20
    });
    console.table(ignoredStats.map(s => ({
      pageId: s.facebookPageId,
      status: s.messageStatus,
      reason: s.ignoredReason,
      sentAt: s.sentAt
    })));

    console.log('\n--- Recent SentMessageStats (Last 10) ---');
    const recentStats = await prisma.sentMessageStat.findMany({
      orderBy: {
        sentAt: 'desc'
      },
      take: 10
    });
    console.table(recentStats.map(s => ({
      pageId: s.facebookPageId,
      status: s.messageStatus,
      reason: s.ignoredReason,
      sentAt: s.sentAt
    })));

  } catch (error) {
    console.error('Error debugging FB pages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugFBPages();

