
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const companyId = 'cmlcatkmn0000vb70t1k03jpd';
    const email = 'test_emp@example.com';

    // Create user
    const user = await prisma.user.create({
        data: {
            email,
            password: 'password123',
            firstName: 'Test',
            lastName: 'Employee',
            companyId,
            employeeNumber: 'TEST001',
            isActive: true,
            userCompanies: {
                create: {
                    companyId,
                    role: 'AGENT',
                    isActive: true
                }
            }
        }
    });

    console.log(`Created test employee: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
