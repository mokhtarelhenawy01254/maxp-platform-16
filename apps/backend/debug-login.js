const { PrismaClient } = require('./prisma/generated/postgresql_v2');

async function checkDatabase(url, name) {
    const prisma = new PrismaClient({
        datasources: {
            db: { url }
        }
    });

    try {
        console.log(`\n--- Checking ${name} ---`);
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    contains: 'shrouk',
                    mode: 'insensitive'
                }
            },
            select: { email: true, firstName: true, companyId: true }
        });

        if (user) {
            console.log(`Found: ${JSON.stringify(user)}`);
        } else {
            console.log('No user containing "shrouk" found.');
        }

        const count = await prisma.user.count();
        console.log(`Total users in ${name}: ${count}`);
    } catch (e) {
        console.error(`Error with ${name}: ${e.message}`);
    } finally {
        await prisma.$disconnect();
    }
}

async function main() {
    const base = 'postgresql://postgres:0165676135@localhost:5432';
    await checkDatabase(`${base}/max`, 'DB: max');
    await checkDatabase(`${base}/maxp`, 'DB: maxp');
}

main();
