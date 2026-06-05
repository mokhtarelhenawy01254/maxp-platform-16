
const { getSharedPrismaClient } = require('../services/sharedDatabase');
require('dotenv').config();

async function deepAudit() {
    const prisma = getSharedPrismaClient();
    if (!prisma) {
        console.error('Failed to get prisma client');
        process.exit(1);
    }

    try {
        // 1. Get all advances
        // NOTE: We bypass RLS by not setting tenant context (if policies allow)
        // Actually sharedDatabase.js forces RLS if we use the extended client.
        // Let's use the base client if possible, or just don't set context.
        // SharedDatabase.js says if no companyId in context, it sets it to ''

        const advances = await prisma.advanceRequest.findMany({
            include: {
                user: {
                    include: {
                        userCompanies: true
                    }
                }
            }
        });

        console.log(`Found ${advances.length} total advances across all companies (or visible ones)`);

        for (const a of advances) {
            console.log(`\nAdvance ID: ${a.id}`);
            console.log(`  Amount: ${a.amount}, Status: ${a.status}`);
            console.log(`  Advance CompanyID: ${a.companyId}`);
            console.log(`  Advance UserID:    ${a.userId}`);

            if (a.user) {
                console.log(`  User: ${a.user.firstName} ${a.user.lastName} (${a.user.email})`);
                console.log(`  User Primary CompanyID: ${a.user.companyId}`);
                console.log(`  User's Member Companies:`);
                a.user.userCompanies.forEach(uc => {
                    console.log(`    - ${uc.companyId} (Role: ${uc.role}, Active: ${uc.isActive})`);
                });

                const isMemberOfAdvCompany = a.user.userCompanies.some(uc => uc.companyId === a.companyId);
                console.log(`  User is member of Advance Company: ${isMemberOfAdvCompany ? 'YES' : 'NO'}`);

                if (a.companyId !== a.user.companyId && !isMemberOfAdvCompany) {
                    console.log(`  âš ï¸ POTENTIAL ISSUE: Advance created for company ${a.companyId} but user is not a member!`);
                }
            } else {
                console.log(`  âš ï¸ USER NOT FOUND for userId: ${a.userId}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

deepAudit();

