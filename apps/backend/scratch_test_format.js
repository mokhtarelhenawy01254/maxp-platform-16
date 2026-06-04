
const { formatProductResponse } = require('./routes/publicProductsRoutes');
const { initializeSharedDatabase, getSharedPrismaClient } = require('./services/sharedDatabase');

async function test() {
    await initializeSharedDatabase();
    const prisma = getSharedPrismaClient();
    
    // Get one product from y4
    const product = await prisma.product.findFirst({
        where: { company: { slug: 'y4' } },
        include: { productVariants: true }
    });
    
    if (!product) {
        console.log("No product found for company y4");
        return;
    }
    
    console.log("Original Product:", JSON.stringify({
        name: product.name,
        mainImage: product.mainImage,
        images: product.images
    }, null, 2));
    
    const formatted = formatProductResponse(product);
    
    console.log("Formatted Product:", JSON.stringify({
        name: formatted.name,
        mainImage: formatted.mainImage,
        images: formatted.images
    }, null, 2));
}

test().catch(console.error);
