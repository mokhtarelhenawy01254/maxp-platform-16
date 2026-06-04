
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany({
        include: {
            _count: {
                select: {
                    users: true,
                    employees: true
                }
            }
        }
    });

    console.log(`Checking all companies:`);
    companies.forEach(c => {
        console.log(`- Company: ${c.name} (ID: ${c.id})`);
        console.log(`  Users count: ${c._count.users}, HR Employees count: ${c._count.employees}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
