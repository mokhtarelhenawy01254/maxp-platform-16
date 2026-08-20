const { PrismaClient } = require('./legacy_mysql/generated/mysql');
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
        console.log('🔍 Searching in Legacy MySQL...');

        // Search for company m22
        const companies = await prisma.company.findMany({
            where: {
                OR: [
                    { name: { contains: 'm22' } },
                    { slug: { contains: 'm22' } },
                    { email: { contains: 'm22' } }
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
            // Check if user has an employee record
            // The model name might be HrEmployee or Employee
            // Checking fields in schema: model hr_employees maps to HrEmployee? No, @@map("hr_employees")
            // Let's try finding the model name in the client
            const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
            console.log('Available models in legacy prisma:', models);

            if (models.includes('hrEmployee')) {
                const employees = await prisma.hrEmployee.findMany({
                    where: {
                        userId: user.id
                    }
                });
                console.log('Found HR Employee records:', employees);
            }
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
