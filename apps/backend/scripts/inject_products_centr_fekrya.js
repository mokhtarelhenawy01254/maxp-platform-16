const path = require('path');
const { PrismaClient } = require('../prisma/generated/postgresql_v2');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production'), quiet: true });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } },
  log: ['error'],
});

const COMPANY_NAME = 'سنتر فكية';

const categories = [
  { name: 'اكسسوارات موبايل', nameEn: 'Mobile Accessories', products: [
    { name: 'جراب حماية سيليكون شفاف', price: 45, image: 'https://picsum.photos/seed/silicon-case/400/400', description: 'جراب سيليكون شفاف مضاد للصدمات يناسب جميع الموديلات - متين ومرن' },
    { name: 'حامل جوال سيارة مغناطيسي', price: 85, image: 'https://picsum.photos/seed/car-holder/400/400', description: 'حامل مغناطيسي قوي للسيارة قابل للتثبيت على الفتحات - يدور 360 درجة' },
    { name: 'حماية شاشة تمبردد 9H', price: 35, image: 'https://picsum.photos/seed/tempered-glass/400/400', description: 'طبقة حماية من الزجاج المقوى 9H ضد الخدوش والكسر - شفاف فائق' },
  ]},
  { name: 'صبات', nameEn: 'USB Flash Drives', products: [
    { name: 'فلاشة USB 3.0 32GB', price: 120, image: 'https://picsum.photos/seed/usb32/400/400', description: 'فلاشة تخزين 32 جيجابايت - USB 3.0 سرعة قراءة تصل إلى 100 ميجابايت/ثانية' },
    { name: 'فلاشة USB 3.1 64GB', price: 185, image: 'https://picsum.photos/seed/usb64/400/400', description: 'فلاشة تخزين 64 جيجابايت - USB 3.1 معدنية مقاومة للماء والصدمات' },
    { name: 'فلاشة USB-C 128GB', price: 280, image: 'https://picsum.photos/seed/usb128/400/400', description: 'فلاشة 128 جيجابايت بمنفذ USB-C للأجهزة الحديثة - سرعة فائقة' },
  ]},
  { name: 'هاندي فري', nameEn: 'Handsfree', products: [
    { name: 'سماعة بلوتوث لاسلكية استريو', price: 150, image: 'https://picsum.photos/seed/bt-headphones/400/400', description: 'سماعة بلوتوث لاسلكية بتقنية 5.3 - جودة صوت عالية - بطارية 8 ساعات' },
    { name: 'سماعة سلكية ستيريو', price: 55, image: 'https://picsum.photos/seed/wired-handsfree/400/400', description: 'سماعة ستيريو سلكية مع مايك - صوت نقي ونقي - تصميم مريح للأذن' },
    { name: 'سماعة بلوتوث ايربودز', price: 220, image: 'https://picsum.photos/seed/earbuds/400/400', description: 'سماعات ايربودز لاسلكية تو مان - شحن لاسلكي - عزل ضوضاء' },
  ]},
  { name: 'شواحن موبايل', nameEn: 'Mobile Chargers', products: [
    { name: 'شاحن حائط سريع 25 وات', price: 110, image: 'https://picsum.photos/seed/wall-charger/400/400', description: 'شاحن حائط USB-A سريع 25 وات - شحن سريع متوافق مع جميع الأجهزة' },
    { name: 'شاحن سيارة 30 وات', price: 95, image: 'https://picsum.photos/seed/car-charger/400/400', description: 'شاحن سيارة USB مزدوج 30 وات - شحن سريع - متوافق مع اندرويد وابل' },
    { name: 'باور بانك 10000mAh', price: 175, image: 'https://picsum.photos/seed/powerbank/400/400', description: 'باور بانك 10000 ملي امبير - شحن سريع - مدخل USB-C خفيف ومحمول' },
  ]},
  { name: 'كبلات', nameEn: 'Cables', products: [
    { name: 'كابل USB-C 1 متر', price: 25, image: 'https://picsum.photos/seed/usbc-cable/400/400', description: 'كابل USB-C بطول 1 متر - شحن ونقل بيانات - متين ومضفر' },
    { name: 'كابل لايتنينج 1.5 متر', price: 35, image: 'https://picsum.photos/seed/lightning-cable/400/400', description: 'كابل لايتنينج أبل بطول 1.5 متر - معتمد - شحن سريع ونقل بيانات' },
    { name: 'كابل مايكرو USB 2 متر', price: 30, image: 'https://picsum.photos/seed/micro-cable/400/400', description: 'كابل مايكرو USB بطول 2 متر - متين - مناسب للشاحن القديم ونقل البيانات' },
  ]},
];

async function main() {
  console.log(`🔍 Searching for company: "${COMPANY_NAME}"...`);
  const company = await prisma.company.findFirst({
    where: { name: { contains: COMPANY_NAME, mode: 'insensitive' } }
  });

  if (!company) {
    console.error(`❌ Company "${COMPANY_NAME}" not found!`);
    process.exit(1);
  }

  console.log(`✅ Found company: ${company.name} (${company.id})`);

  for (const cat of categories) {
    console.log(`\n📁 Category: ${cat.name}`);

    let category = await prisma.category.findFirst({
      where: { name: cat.name, companyId: company.id }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: cat.name, companyId: company.id, isActive: true }
      });
      console.log(`  ✅ Created category: ${category.name} (${category.id})`);
    } else {
      console.log(`  ✅ Found existing category: ${category.name} (${category.id})`);
    }

    for (const prod of cat.products) {
      const product = await prisma.product.create({
        data: {
          name: prod.name,
          description: prod.description,
          price: prod.price,
          mainImage: prod.image,
          images: JSON.stringify([prod.image]),
          stock: 50,
          isActive: true,
          categoryId: category.id,
          companyId: company.id,
          trackInventory: true,
        }
      });
      console.log(`  ✅ Product created: ${product.name} - ${prod.price} EGP`);
    }
  }

  console.log('\n🎉 All products injected successfully!');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
