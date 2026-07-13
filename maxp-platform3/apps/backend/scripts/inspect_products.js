const { t: i18n } = require('./i18n');
const { t: i18n } = require('./i18ni18n.t('msg.e4623830')pg');

async function inspectProducts() {
  console.log('🔍 فحص المنتجات في PostgreSQL...\n');

  const client = new Client({
    connectionString: "postgresql://appuser:your_password@localhost:5432/maxp",
    ssl: false
  });

  try {
    await client.connect();
    console.log('✅ متصل بـ PostgreSQL\ni18n.t('msg.ebf66075i18n.t('msg.825e4dc5'));
    const totalResult = await client.query('SELECT COUNT(*) as count FROM productsi18n.t('msg.f54b2007')SELECT COUNT(*) as count FROM products WHERE is_active = truei18n.t('msg.2a05bc6e')SELECT COUNT(*) as count FROM products WHERE embedding IS NOT NULLi18n.t('msg.38677183')\n🏢 توزيع المنتجات حسب الشركة:i18n.t('msg.a0a6df40')\n📦 عينة من المنتجات مع embeddings:i18n.t('msg.af3b0fad')\n🔍 اختبار البحث المباشر:i18n.t('msg.cbfe7acei18n.t('msg.1826339f') OR name ILIKE '%product%' OR name ILIKE '%shirt%i18n.t('msg.b188a965')\n🏷️ أسماء المنتجات الشائعة:');
    const nameResult = await client.query(`
      SELECT 
        SUBSTRING(name, 1, 30) as name_sample,
        COUNT(*) as count
      FROM products 
      WHERE embedding IS NOT NULL AND is_active = true
      GROUP BY SUBSTRING(name, 1, 30)
      ORDER BY count DESC
      LIMIT 5
    `);

    nameResult.rows.forEach(row => {
      console.log(`   "${row.name_sample}": ${row.count}${i18n.t('msg.4cff5b9e')}`);
    });

  } catch (error) {
    console.error(i18n.t('msg.f2d1c024'), error.message);
  } finally {
    await client.end();
  }
}

inspectProducts().catch(console.error);
