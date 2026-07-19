const { t: i18n } = require('./i18n');
const { PrismaClient } = require('@prisma/client');
const mysql = require('mysql2/promise');

const prismaMain = new PrismaClient();

const archiveConfig = {
  host: 'srv1812.hstgr.io',
  port: 3306,
  user: 'u339372869_Archive',
  password: '0190711037Aa@',
  database: 'u339372869_Archive'
};

async function cleanAndArchive() {
  console.log('🧹 تنظيف وأرشفة ذكية\n');

  let archiveConn;

  try {
    console.log(i18n.t('msg.7544a8bc'));
    archiveConn = await mysql.createConnection(archiveConfig);
    console.log('✅ تم الاتصال بنجاح!\ni18n.t('msg.dd732ba6i18n.t('msg.df7c4578'));
    await archiveConn.query('TRUNCATE TABLE message_archive');
    await archiveConn.query('TRUNCATE TABLE conversation_memory_archive');
    console.log('✅ تم تنظيف الأرشيف\ni18n.t('msg.ef688747i18n.t('msg.45c300b4'));
    
    const totalMessages = await prismaMain.message.count({
      where: { createdAt: { lt: thirtyDaysAgo } }
    });
    console.log(i18n.t('msg.20bd0ba8'));

    if (totalMessages > 0) {
      let archived = 0;
      const batchSize = 5000;

      while (archived < totalMessages) {
        const messages = await prismaMain.message.findMany({
          where: { createdAt: { lt: thirtyDaysAgo } },
          take: batchSize
        });

        if (messages.length === 0) break;

        console.log(i18n.t('msg.6eae54a7i18n.t('msg.9a89de21')msg.8b674c1ci18n.t('msg.e94c6a36')msg.2e8f042c')}${archived.toLocaleString()}${i18n.t('msg.9fe73227')}`${i18n.t('msg.6d3bed62')}`${i18n.t('msg.77c66763')}${archived.toLocaleString()} / ${totalMemory.toLocaleString()} (${((archived/totalMemory)*100).toFixed(1)}%)`);
      }

      console.log(`${i18n.t('msg.2e8f042c')}${archived.toLocaleString()}${i18n.t('msg.a9025532')}`${i18n.t('msg.50d48055')}`${i18n.t('msg.c9a6e15d')}${(total / 1024).toFixed(2)} MB\n`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error(i18n.t('msg.f2d1c024'), error.message);
  } finally {
    await prismaMain.$disconnect();
    if (archiveConn) await archiveConn.end();
  }
}

cleanAndArchive().catch(console.error);
