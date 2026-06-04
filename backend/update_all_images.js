const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
    const prisma = await getSharedPrismaClientAsync();
    
    try {
        const products = await prisma.product.findMany();
        const variants = await prisma.productVariant.findMany();
        const categories = await prisma.category.findMany();
        
        const shoeImages = [
            'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=500',
            'https://images.unsplash.com/photo-1562183241-b937e95585b6?q=80&w=500',
            'https://images.unsplash.com/photo-1571859856639-d524861b5f6a?q=80&w=500',
            'https://images.unsplash.com/photo-1620352514332-9cb52b3117b4?q=80&w=500',
            'https://images.unsplash.com/photo-1508243529287-e21914733111?q=80&w=500',
            'https://images.unsplash.com/photo-1515347619362-e67411681ce2?q=80&w=500',
            'https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?q=80&w=500',
            'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=500',
            'https://images.unsplash.com/photo-1505784045224-1247b2b29cf3?q=80&w=500',
            'https://images.unsplash.com/photo-1514989940723-e8e51635b782?q=80&w=500',
            'https://images.unsplash.com/photo-1614252332821-36ba62c3e1ab?q=80&w=500',
            'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=500',
            'https://images.unsplash.com/photo-1620809703445-5d9c24095db1?q=80&w=500',
            'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=500',
            'https://images.unsplash.com/photo-1569485641774-7e8c3bf0641d?q=80&w=500',
            'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?q=80&w=500',
            'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=500',
            'https://images.unsplash.com/photo-1587563871167-1ea70cb1affb?q=80&w=500',
            'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=500',
            'https://images.unsplash.com/photo-1616406432452-07bc5938759d?q=80&w=500'
        ];
        
        const catImages = [
            'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=500',
            'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?q=80&w=500',
            'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=500'
        ];

        let pCount = 0;
        for (const product of products) {
            const randomImage = shoeImages[pCount % shoeImages.length];
            // Ensure product images are always populated
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    mainImage: randomImage,
                    images: JSON.stringify([{ url: randomImage, alt: product.name || 'product' }])
                }
            });
            pCount++;
        }

        let vCount = 0;
        for (const v of variants) {
            const randomImage = shoeImages[(vCount + 5) % shoeImages.length];
            await prisma.productVariant.update({
                where: { id: v.id },
                data: {
                    images: randomImage
                }
            });
            vCount++;
        }

        let cCount = 0;
        for (const c of categories) {
            const randomImage = catImages[cCount % catImages.length];
            await prisma.category.update({
                where: { id: c.id },
                data: {
                    image: randomImage
                }
            });
            cCount++;
        }
        
        console.log(`Updated ${pCount} products, ${vCount} variants, ${cCount} categories with varied Men's and Women's shoes images.`);
        
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
