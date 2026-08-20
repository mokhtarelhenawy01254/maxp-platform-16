require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();

    try {
        const companyId = 'cmmhkxobb0000vpk440j1n6ui';

        // Get categories
        const categories = await prisma.category.findMany({
            where: { companyId },
            select: { id: true, name: true, slug: true }
        });

        console.log('Found categories:', categories.map(c => c.name));

        // Create 10 products
        const productsData = [
            {
                name: 'هاتف ذكي',
                description: 'هاتف ذكي حديث بشاشة 6.7 بوصة وكاميرا 108 ميجابيكسل',
                price: 15000,
                comparePrice: 18000,
                stock: 50,
                categoryId: categories.find(c => c.slug === 'electronics')?.id,
                isFeatured: true,
                tags: 'electronics,smartphone,gadgets',
                sku: 'ELEC-001'
            },
            {
                name: 'لابتوب',
                description: 'لابتوب قوي بمعالج i7 وذاكرة 16 جيجابايت',
                price: 25000,
                comparePrice: 30000,
                stock: 25,
                categoryId: categories.find(c => c.slug === 'electronics')?.id,
                tags: 'electronics,laptop,computer',
                sku: 'ELEC-002'
            },
            {
                name: 'قميص رجالي',
                description: 'قميص رجالي قطن بألوان متعددة',
                price: 350,
                comparePrice: 450,
                stock: 200,
                categoryId: categories.find(c => c.slug === 'clothing')?.id,
                tags: 'clothing,men,shirt',
                sku: 'CLTH-001'
            },
            {
                name: 'فستان نسائي',
                description: 'فستان أنيق للمناسبات',
                price: 750,
                comparePrice: 900,
                stock: 100,
                categoryId: categories.find(c => c.slug === 'clothing')?.id,
                tags: 'clothing,women,dress',
                sku: 'CLTH-002'
            },
            {
                name: 'زيت زيتون',
                description: 'زيت زيتون عضوي طبيعي 1 لتر',
                price: 120,
                comparePrice: 150,
                stock: 500,
                categoryId: categories.find(c => c.slug === 'food')?.id,
                tags: 'food,olive oil,organic',
                sku: 'FOOD-001'
            },
            {
                name: 'عسل طبيعي',
                description: 'عسل طبيعي نقي 500 جرام',
                price: 200,
                comparePrice: 250,
                stock: 300,
                categoryId: categories.find(c => c.slug === 'food')?.id,
                tags: 'food,honey,organic',
                sku: 'FOOD-002'
            },
            {
                name: 'طقم أوانٍ',
                description: 'طقم أوانٍ مطبخ كامل 12 قطعة',
                price: 800,
                comparePrice: 1000,
                stock: 75,
                categoryId: categories.find(c => c.slug === 'home')?.id,
                tags: 'home,kitchen,cookware',
                sku: 'HOME-001'
            },
            {
                name: 'مفرش سرير',
                description: 'مفرش سرير فاخر قطني',
                price: 450,
                comparePrice: 550,
                stock: 150,
                categoryId: categories.find(c => c.slug === 'home')?.id,
                tags: 'home,bedroom,bedsheet',
                sku: 'HOME-002'
            },
            {
                name: 'دراجة هوائية',
                description: 'دراجة هوائية للتنقل واللياقة',
                price: 3500,
                comparePrice: 4200,
                stock: 20,
                categoryId: categories.find(c => c.slug === 'sports')?.id,
                isFeatured: true,
                tags: 'sports,bicycle,fitness',
                sku: 'SPRT-001'
            },
            {
                name: 'شنطة رياضية',
                description: 'شنطة رياضية متعددة الأقسام',
                price: 400,
                comparePrice: 500,
                stock: 100,
                categoryId: categories.find(c => c.slug === 'sports')?.id,
                tags: 'sports,bag,gym',
                sku: 'SPRT-002'
            }
        ];

        const products = await Promise.all(
            productsData.map(data =>
                prisma.product.create({
                    data: {
                        ...data,
                        companyId,
                        slug: data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
                    }
                })
            )
        );

        console.log('Created 10 products:');
        console.log(JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, categoryId: p.categoryId })), null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main()
    .catch(e => console.error('Fatal:', e.message))
    .finally(() => { });
