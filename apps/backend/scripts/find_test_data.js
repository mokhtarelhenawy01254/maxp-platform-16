require('dotenv').config();
const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function findData() {
    const prisma = getSharedPrismaClient();
    try {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'm22', mode: 'insensitive' } }
        });
        console.log('COMPANY:', JSON.stringify(company));

        if (company) {
            const employee = await prisma.employee.findFirst({
                where: {
                    companyId: company.id,
                    phone: { not: null }
                },
                orderBy: { createdAt: 'desc' }
            });
            console.log('EMPLOYEE:', JSON.stringify(employee));
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

findData();

