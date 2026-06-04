const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DB Check ---');
    const count = await prisma.company.count();
    console.log('Companies:', count);

    const alpha = await prisma.company.findMany({
        where: { name: { contains: 'Alpha' } }
    });
    console.log('Alpha:', alpha.length);

    const h2m = await prisma.company.findMany({
        where: { name: { contains: 'H2m' } }
    });
    console.log('H2m:', h2m.length);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
