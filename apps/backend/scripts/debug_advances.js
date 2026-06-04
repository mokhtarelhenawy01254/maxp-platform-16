
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const tenantContext = require('../services/tenantContext');
require('dotenv').config();

async function checkAdvances() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        const companies = await prisma.company.findMany({ take: 5 });
        if (companies.length === 0) {
            console.log('No companies found');
            process.exit(0);
        }

        for (const company of companies) {
            console.log(`\n--- Company: ${company.name} (${company.id}) ---`);

            await tenantContext.run(company.id, async () => {
                const advances = await prisma.advanceRequest.findMany({
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                companyId: true
                            }
                        }
                    }
                });

                console.log(`Found ${advances.length} advances`);
                advances.forEach(a => {
                    console.log(`[ADV] ID: ${a.id}`);
                    console.log(`      Amount: ${a.amount}, Status: ${a.status}`);
                    console.log(`      AdvCompanyID: ${a.companyId}`);
                    console.log(`      AdvUserID:    ${a.userId}`);
                    if (a.user) {
                        console.log(`      User:         ${a.user.firstName} ${a.user.lastName}`);
                        console.log(`      UserCompanyID: ${a.user.companyId}`);
                    } else {
                        console.log(`      User:         NOT FOUND`);
                    }
                    console.log(`      Match:        ${a.user && a.user.id === a.userId ? 'YES' : 'NO'}`);
                    console.log('---');
                });
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkAdvances();

