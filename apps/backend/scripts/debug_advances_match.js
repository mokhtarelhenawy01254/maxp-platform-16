
const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function checkAdvancesAccess() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        const advances = await prisma.advanceRequest.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        console.log(`Total Advances in DB: ${advances.length}`);

        for (const adv of advances) {
            console.log(`Advance ID: ${adv.id}`);
            console.log(`  Amount: ${adv.amount}, Status: ${adv.status}`);
            console.log(`  Stored userId: ${adv.userId}`);
            if (adv.user) {
                console.log(`  Linked User: ${adv.user.firstName} ${adv.user.lastName} (${adv.user.email})`);
                console.log(`  User ID from DB: ${adv.user.id}`);
                if (adv.userId === adv.user.id) {
                    console.log(`  MATCH: Stored userId matches User.id`);
                } else {
                    console.log(`  MISMATCH: Stored userId (${adv.userId}) vs User.id (${adv.user.id})`);
                }
            } else {
                console.log(`  User: NOT FOUND in DB for userId: ${adv.userId}`);
            }
            console.log('---');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkAdvancesAccess();

