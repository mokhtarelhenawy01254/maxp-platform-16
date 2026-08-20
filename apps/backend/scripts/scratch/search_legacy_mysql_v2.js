const { PrismaClient } = require('./legacy_mysql/generated/mysql_fixed');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.production.fixed') });

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function main() {
    try {
        console.log('🔍 Searching in Legacy MySQL (mysql_fixed)...');

        // List models to be sure
        const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
        console.log('Available models:', models);

        // Search for company m22
        const companies = await prisma.company.findMany({
            where: {
                OR: [
                    { name: { contains: 'm22' } },
                    { slug: { contains: 'm22' } }
                ]
            }
        });
        console.log('Found companies:', companies);

        // Search for user shrouk9
        const users = await prisma.user.findMany({
            where: {
                email: 'shrouk9@gmail.com'
            }
        });
        console.log('Found users:', users);

        if (users.length > 0) {
            const user = users[0];
            const hrEmployees = await prisma.hrEmployee.findMany({
                where: {
                    userId: user.id
                }
            });
            console.log('Found HR Employee records:', hrEmployees);

            if (hrEmployees.length > 0) {
                const emp = hrEmployees[0];
                // Check advances for this employee
                const advances = await prisma.hrAdvanceRequest.findMany({
                    where: {
                        employeeId: emp.id
                    }
                });
                console.log('Advances for this employee:', advances);
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
