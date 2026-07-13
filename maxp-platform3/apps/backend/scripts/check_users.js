const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function check() {
    try {
        if (!prisma) {
            console.error("Prisma client is null");
            process.exit(1);
        }
        console.log("Prisma client initialized");

        // Wait for connection
        setTimeout(async () => {
            try {
                const userCount = await prisma.user.count();
                console.log("User count:", userCount);

                const users = await prisma.user.findMany({
                    take: 5,
                    include: { company: true }
                });
                console.log(JSON.stringify(users, null, 2));
                process.exit(0);
            } catch (err) {
                console.error("Query Error:", err.message);
                process.exit(1);
            }
        }, 2000);
    } catch (e) {
        console.error("Initialization Error:", e);
        process.exit(1);
    }
}

check();
