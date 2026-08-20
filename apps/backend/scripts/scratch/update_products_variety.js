const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
    const prisma = await getSharedPrismaClientAsync();
    
    try {
        const products = await prisma.product.findMany();
        
        const names = [
            'حذاء نسائي كعب عالي للسهرات',
            'سنيكرز نسائي كاجوال مريح',
            'بوت نسائي شتوي أنيق',
            'صندل نسائي صيفي خفيف',
            'حذاء نسائي للمشي والرياضة',
            'حذاء باليرينا فلات للعمل',
            'حذاء نسائي كعب عريض ومريح',
            'بوت قصير (أنكل بوت) بناتي',
            'حذاء قماش عصري للبنات',
            'ميول نسائي مريح وأنيق',
            'حذاء رجالي كلاسيك للمناسبات',
            'سنيكرز رجالي رياضي وعصري',
            'بوت رجالي من الجلد الطبيعي',
            'حذاء أكسفورد رجالي فخم',
            'حذاء لوفر (Loafer) رجالي مريح',
            'حذاء رياضي للتمارين والجري',
            'رانينج شوز خفيف للرجال',
            'صندل رجالي للاستخدام اليومي',
            'حذاء كاجوال جلد طبيعي للرجال',
            'كوتشي رجالي قماش مريح'
        ];
        
        const images = [
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500&q=80', // heels
            'https://images.unsplash.com/photo-1562183241-b937e95585b6?w=500&q=80', // women sneakers
            'https://images.unsplash.com/photo-1571859856639-d524861b5f6a?w=500&q=80', // boots
            'https://images.unsplash.com/photo-1620352514332-9cb52b3117b4?w=500&q=80', // sandals
            'https://images.unsplash.com/photo-1508243529287-e21914733111?w=500&q=80', // walking shoes
            'https://images.unsplash.com/photo-1515347619362-e67411681ce2?w=500&q=80', // flats/fashion
            'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?w=500&q=80', // wide heel
            'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80', // ankle boots
            'https://images.unsplash.com/photo-1505784045224-1247b2b29cf3?w=500&q=80', // canvas girls
            'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=500&q=80', // mule fashion
            'https://images.unsplash.com/photo-1614252332821-36ba62c3e1ab?w=500&q=80', // men classic
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=500&q=80', // men sneakers
            'https://images.unsplash.com/photo-1620809703445-5d9c24095db1?w=500&q=80', // men boots
            'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&q=80', // men oxford
            'https://images.unsplash.com/photo-1569485641774-7e8c3bf0641d?w=500&q=80', // loafers
            'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=500&q=80', // training shoes
            'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500&q=80', // running
            'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=500&q=80', // sandal proxy
            'https://images.unsplash.com/photo-1587563871167-1ea70cb1affb?w=500&q=80', // leather casual
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80'  // cloth men
        ];
        
        let count = 0;
        for (const product of products) {
            const randomName = names[count % names.length];
            const randomImage = images[count % images.length];
            
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    name: randomName,
                    mainImage: randomImage,
                    images: JSON.stringify([{ url: randomImage, alt: randomName }])
                }
            });
            count++;
        }
        
        console.log(`Updated ${count} products with varied Men's and Women's shoes.`);
        
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
