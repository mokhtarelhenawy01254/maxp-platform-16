const { t: i18n } = require('./i18n');
const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupArchiveDatabase() {
  console.log('🔧 بدء إعداد قاعدة بيانات الأرشيف...\ni18n.t('msg.0dbec452')srv1812.hstgr.io',
    port: 3306,
    user: 'u339372869_Archive',
    password: '0190711037Aa@',
    database: 'u339372869_Archivei18n.t('msg.c999124ci18n.t('msg.13a44249'));
    connection = await mysql.createConnection(config);
    console.log('✅ تم الاتصال بنجاح!\ni18n.t('msg.d6f64bc7i18n.t('msg.7d3b9885'));
    const sql = fs.readFileSync('./create_archive_tables.sql', 'utf8i18n.t('msg.657c80d2')⚙️ إنشاء الجداول...\n');
    await connection.query(sql);
    
    console.log('✅ تم إنشاء جميع الجداول بنجاح!\ni18n.t('msg.ced0932d')🔍 التحقق من الجداول المنشأة...\n');
    const [tables] = await connection.query('SHOW TABLES');
    
    console.log(i18n.t('msg.95904127'));
    console.log('='.repeat(50));
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    console.log('='.repeat(50));
    console.log(`${i18n.t('msg.77d624c1')}${tables.length}\n`${i18n.t('msg.5c806c0b')}`DESCRIBE ${tableName}`);
      console.log(`\n📦 ${tableName}:`);
      console.log(i18n.t('msg.2fb3b257'));
      console.log(i18n.t('msg.61119a0c'));
    }

    console.log('\n' + '='.repeat(50));
    console.log(i18n.t('msg.b06b023c'));
    console.log('='.repeat(50));

  } catch (error) {
    console.error(i18n.t('msg.f2d1c024'), error.message);
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️ خطأ في بيانات الاتصال. تحقق من:');
      console.error(i18n.t('msg.51867019'));
      console.error(i18n.t('msg.e26baf1c'));
      console.error(i18n.t('msg.4727b83e'));
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 تم إغلاق الاتصال');
    }
  }
}

setupArchiveDatabase().catch(console.error);
