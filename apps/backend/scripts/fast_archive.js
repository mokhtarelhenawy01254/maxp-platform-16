const { t: i18n } = require('./i18n');
const mysql = require('mysql2/promise');

async function fastArchive() {
  console.log('⚡ أرشفة سريعة - طريقة محسّنة\n');

  const mainConfig = {
    host: '92.113.22.70',
    user: 'u339372869_test2',
    password: '0165676135Aa@A',
    database: 'u339372869_test2'
  };

  let mainConn;

  try {
    console.log(i18n.t('msg.5ceccb0e'));
    mainConn = await mysql.createConnection(mainConfig);
    console.log('✅ تم الاتصال بنجاح!\n');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateStr = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' i18n.t('msg.15d617b5i18n.t('msg.6654b44c'));
    
    const [countResult] = await mainConn.query(
      'SELECT COUNT(*) as count FROM messages WHERE createdAt < ?i18n.t('msg.750f8a6di18n.t('msg.395289d5')msg.495fbc48')(?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',i18n.t('msg.854d43f4i18n.t('msg.6b3c0285'));
      const [deleteResult] = await mainConn.query(
        'DELETE FROM messages WHERE createdAt < ?',
        [dateStr]
      );
      
      console.log(`${i18n.t('msg.2e441b6c')}${deleteResult.affectedRows.toLocaleString()}${i18n.t('msg.9fe73227')}`${i18n.t('msg.2b8283f0')}`${i18n.t('msg.2e441b6c')}${deleteMemResult.affectedRows.toLocaleString()}${i18n.t('msg.fbc98281')}`${i18n.t('msg.479c7351')}`${i18n.t('msg.8a2a8faa')}${(totalArchived / 1024).toFixed(2)} MB\n`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error(i18n.t('msg.f2d1c024'), error.message);
    console.error(error.stack);
  } finally {
    if (mainConn) await mainConn.end();
  }
}

fastArchive().catch(console.error);
