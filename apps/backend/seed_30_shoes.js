const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

const COMPANY_ID = 'cmlm43i6n0000vpfk3npm506j'; // ElSherka

const categories = [
  { name: 'شوزات رجالي', slug: 'men-shoes' },
  { name: 'شوزات حريمي', slug: 'women-shoes' },
];

const menShoeTitles = [
  'سنيكرز جلد فاخر', 'حذاء رياضي عصري', 'كلاسيك رسمي أسود', 'بوت جبلي متين', 'لوفر كاجوال بني',
  'سنيكرز فلات مريح', 'حذاء فليكس سيتي', 'كلاسيك أوكسفورد', 'بوت كاجوال هاف لايت', 'سنيكرز سبورت برو',
  'حذاء رانينج الترا', 'سنيكرز كورت وايت', 'بوت شتوي مبطن', 'حذاء مشي طبي', 'سنيكرز إير فلو'
];

const womenShoeTitles = [
  'حذاء كعب عالي ساتان', 'سنيكرز روزي ناعم', 'صندل صيفي أنيق', 'بوت كاحل جلدي', 'فلات رقيق يومي',
  'حذاء سهرة لامع', 'سنيكرز لونا سبورت', 'بوت طويل كلاسيك', 'حذاء كعب رفيع مريح', 'سنيكرز جلو وايت',
  'لوفر حريمي عصري', 'بوت جليتر احتفالي', 'حذاء باليرينا ناعم', 'سنيكرز ميرا باستيل', 'حذاء زفاف ملكي'
];

const sizes = [37, 38, 39, 40, 41, 42, 43, 44, 45];
const colors = ['أسود', 'أبيض', 'بني', 'أزرق', 'بيج'];

async function main() {
  const prisma = await getSharedPrismaClientAsync();

  try {
    console.log('🚀 Starting products seed for 30 shoes...');

    // 1. Ensure categories
    const categoryMap = {};
    for (const cat of categories) {
      const dbCat = await prisma.category.upsert({
        where: { companyId_slug: { companyId: COMPANY_ID, slug: cat.slug } },
        update: { name: cat.name },
        create: {
          name: cat.name,
          slug: cat.slug,
          companyId: COMPANY_ID,
          isActive: true
        }
      });
      categoryMap[cat.name] = dbCat.id;
    }

    // 2. Add Men Shoes
    for (let i = 0; i < menShoeTitles.length; i++) {
        const title = menShoeTitles[i];
        const price = 1200 + Math.floor(Math.random() * 2000);
        const sku = `MEN-SHOE-${i + 100}`;
        const slug = `${sku.toLowerCase()}-${title.replace(/\s+/g, '-')}`;
        
        const mainImage = i % 2 === 0 ? '/uploads/products/seed_men_sneakers.png' : '/uploads/products/product-0ffe0e70-87d4-4469-9785-25825babef8f.jpg';

        console.log(`Creating product: ${title}...`);
        const product = await prisma.product.upsert({
            where: { companyId_sku: { companyId: COMPANY_ID, sku: sku } },
            update: {},
            create: {
                name: title,
                slug: slug,
                description: `حذاء رجالي عصري يجمع بين القوة والأناقة. مصمم بعناية ليناسب الاستخدام اليومي والمناسبات. خامات عالية الجودة تضمن الراحة والمتانة.`,
                sku: sku,
                price: price,
                comparePrice: price + 400,
                stock: 100,
                companyId: COMPANY_ID,
                categoryId: categoryMap['شوزات رجالي'],
                mainImage: mainImage,
                images: JSON.stringify([{ url: mainImage, alt: title }]),
                isActive: true,
                isFeatured: i < 5,
                tags: 'رجالي,شوزات,أحذية,سنيكرز'
            }
        });

        // Add Variants
        for (const color of ['أسود', 'بني', 'أبيض']) {
            for (const size of [41, 42, 43, 44]) {
                const varSku = `${sku}-S${size}-C${color}`;
                await prisma.productVariant.upsert({
                    where: { productId_sku: { productId: product.id, sku: varSku } },
                    update: {},
                    create: {
                        productId: product.id,
                        name: `${color} - ${size}`,
                        sku: varSku,
                        price: price,
                        stock: 10,
                        isActive: true
                    }
                });
            }
        }
    }

    // 3. Add Women Shoes
    for (let i = 0; i < womenShoeTitles.length; i++) {
        const title = womenShoeTitles[i];
        const price = 900 + Math.floor(Math.random() * 1500);
        const sku = `WMN-SHOE-${i + 200}`;
        const slug = `${sku.toLowerCase()}-${title.replace(/\s+/g, '-')}`;
        
        const mainImage = i % 2 === 0 ? '/uploads/products/seed_women_heels.png' : '/uploads/products/seed_women_sneakers.png';

        console.log(`Creating product: ${title}...`);
        const product = await prisma.product.upsert({
            where: { companyId_sku: { companyId: COMPANY_ID, sku: sku } },
            update: {},
            create: {
                name: title,
                slug: slug,
                description: `حذاء حريمي غاية في الأناقة والجمال. تصميم مريح ومثالي لكل الأوقات، متوفر بمقاسات وألوان متنوعة لتناسب ذوقك الرفيع.`,
                sku: sku,
                price: price,
                comparePrice: price + 300,
                stock: 100,
                companyId: COMPANY_ID,
                categoryId: categoryMap['شوزات حريمي'],
                mainImage: mainImage,
                images: JSON.stringify([{ url: mainImage, alt: title }]),
                isActive: true,
                isFeatured: i < 5,
                tags: 'حريمي,شوزات,أحذية,سهرة,كاجوال'
            }
        });

        // Add Variants
        for (const color of ['أسود', 'أحمر', 'بيج', 'أبيض']) {
            for (const size of [37, 38, 39, 40]) {
                const varSku = `${sku}-S${size}-C${color}`;
                await prisma.productVariant.upsert({
                    where: { productId_sku: { productId: product.id, sku: varSku } },
                    update: {},
                    create: {
                        productId: product.id,
                        name: `${color} - ${size}`,
                        sku: varSku,
                        price: price,
                        stock: 10,
                        isActive: true
                    }
                });
            }
        }
    }

    console.log('✅ Success! 30 shoe products with variants seeded for ElSherka.');

  } catch (error) {
    console.error('❌ Error seeding products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
