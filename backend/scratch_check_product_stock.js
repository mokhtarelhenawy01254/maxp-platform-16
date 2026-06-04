const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const productId = 'cmng572sm007tvbtk4zz69rpx';
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { variants: true }
    });
    console.log("Product:", JSON.stringify(product, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
