const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('../prisma/generated/postgresql');

const prisma = new PrismaClient();

async function findEmployee() {
    try {
        const email = 'h2m@maxpi.com';
        console.log('🔍 Searching for employee with email:', email);

        const employee = await prisma.employee.findFirst({
            where: { email },
            include: { user: true }
        });

        if (employee) {
            console.log('✅ Employee found:');
            console.log(JSON.stringify(employee, null, 2));
        } else {
            console.log('❌ Employee not found in current DB.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findEmployee();
