const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function verify() {
  try {
    const prisma = getSharedPrismaClient();
    console.log('=== 🔍 التحقق من أعمدة Competitors ===\n');

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'competitors'
        AND column_name IN ('activity_type', 'target_market', 'founded_year', 'employee_count',
                            'activityType', 'targetMarket', 'foundedYear', 'employeeCount')
      ORDER BY column_name
    `;

    console.log('الأعمدة الموجودة في جدول competitors:');
    for (const c of columns) {
      console.log(`   ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`);
    }

    const wrongColumns = columns.filter(c =>
      ['activityType', 'targetMarket', 'foundedYear', 'employeeCount'].includes(c.column_name)
    );

    if (wrongColumns.length > 0) {
      console.log(`\n⚠️  يوجد ${wrongColumns.length} عمود/أعمدة بأسماء camelCase خطأ — يجب حذفها:`);
      for (const c of wrongColumns) {
        console.log(`   ❌ ${c.column_name}`);
      }
    } else {
      console.log('\n✅ لا توجد أعمدة camelCase قديمة — كل شيء سليم.');
    }

    const correctColumns = columns.filter(c =>
      ['activity_type', 'target_market', 'founded_year', 'employee_count'].includes(c.column_name)
    );
    console.log(`\n✅ الأعمدة الصحيحة (snake_case): ${correctColumns.length}/4`);

  } catch (err) {
    console.error('❌ خطأ:', err.message);
  } finally {
    await getSharedPrismaClient().$disconnect();
  }
}

verify();
