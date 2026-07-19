const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function check() {
    try {
        const partners = await prisma.platformPartner.findMany({
            include: { user: true }
        });
        console.log(JSON.stringify(partners, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
