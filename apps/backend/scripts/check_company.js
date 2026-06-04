const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function check() {
    try {
        const company = await prisma.company.findFirst({
            where: { name: { contains: 'Sdfsdfds', mode: 'insensitive' } },
            include: { users: true }
        });
        console.log(JSON.stringify(company, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
