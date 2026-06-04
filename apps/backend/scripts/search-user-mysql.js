const { PrismaClient } = require('../legacy_mysql/generated/mysql');
const path = require('path');
// Load the fixed production env which contains the MySQL settings
require('dotenv').config({ path: path.join(__dirname, '../.env.production.fixed') });

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function findInMySQL() {
    try {
        const email = 'h2m@maxpi.com';
        console.log('🔍 Searching in MySQL (DATABASE_URL):', email);

        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email
                }
            }
        });

        if (user) {
            console.log('✅ User found in MySQL:');
            console.log(JSON.stringify(user, null, 2));
        } else {
            console.log('❌ User not found in MySQL.');

            // Try partial search
            const partial = await prisma.user.findMany({
                where: {
                    email: {
                        contains: 'h2m'
                    }
                },
                take: 5
            });
            if (partial.length > 0) {
                console.log('Found similar emails:', partial.map(u => u.email));
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

findInMySQL();
