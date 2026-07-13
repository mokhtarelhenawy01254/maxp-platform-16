const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
    console.log('Searching for "m22"...');
    const companies = await prisma.company.findMany({
        where: {
            OR: [
                { name: { contains: 'm22', mode: 'insensitive' } },
                { slug: { contains: 'm22', mode: 'insensitive' } }
            ]
        }
    });
    console.log('Companies matching m22:', companies);

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: 'm22', mode: 'insensitive' } },
                { firstName: { contains: 'm22', mode: 'insensitive' } },
                { lastName: { contains: 'm22', mode: 'insensitive' } }
            ]
        }
    });
    console.log('Users matching m22:', users);

    const employees = await prisma.employee.findMany({
        where: {
            OR: [
                { email: { contains: 'm22', mode: 'insensitive' } },
                { name: { contains: 'm22', mode: 'insensitive' } }
            ]
        }
    });
    console.log('Employees matching m22:', employees);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
