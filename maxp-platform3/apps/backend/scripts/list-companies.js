const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('../prisma/generated/postgresql');

const prisma = new PrismaClient();

async function checkCompanies() {
    try {
        const companies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                email: true
            }
        });
        console.table(companies);
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCompanies();
