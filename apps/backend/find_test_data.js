const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function main() {
    const company = await prisma.company.findFirst({
        select: { id: true, name: true }
    });
    console.log('COMPANY:', JSON.stringify(company));

    const product = await prisma.product.findFirst({
        select: { id: true, name: true, companyId: true }
    });
    console.log('PRODUCT:', JSON.stringify(product));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
