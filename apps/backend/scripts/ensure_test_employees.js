const { t: i18n } = require('./i18n');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const companyId = '71ab1ca7-271d-4e3a-b77c-72a51ddff454';

    console.log(`Checking users for company: ${companyId}`);

    const users = await prisma.user.findMany({
        where: {
            userCompanies: {
                some: {
                    companyId: companyId
                }
            }
        },
        include: {
            userCompanies: true
        }
    });

    console.log(`Found ${users.length} users.`);

    if (users.length < 3) {
        console.log('Creating fake employees...');
        const fakeEmployees = [
            { firstName: i18n.t('msg.6b58ccd2'), lastName: i18n.t('msg.9aab3ed9'), email: 'ahmed@test.com' },
            { firstName: i18n.t('msg.30779869'), lastName: i18n.t('msg.cdf4d9bd'), email: 'sara@test.com' },
            { firstName: i18n.t('msg.d431eb71'), lastName: i18n.t('msg.5cea7525'), email: 'mahmoud@test.com' }
        ];

        for (const emp of fakeEmployees) {
            const existing = await prisma.user.findUnique({ where: { email: emp.email } });
            if (!existing) {
                const user = await prisma.user.create({
                    data: {
                        id: `fake_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        email: emp.email,
                        password: 'hashed_password', // won't use it for login
                        firstName: emp.firstName,
                        lastName: emp.lastName,
                        employeeNumber: `EMP${Math.floor(Math.random() * 9000) + 1000}`,
                        isActive: true,
                        updatedAt: new Date(),
                        userCompanies: {
                            create: {
                                companyId: companyId,
                                role: 'AGENT',
                                isActive: true
                            }
                        }
                    }
                });
                console.log(`Created user: ${user.firstName} ${user.lastName}`);
            } else {
                // Ensure it's in the company
                const link = await prisma.userCompany.findUnique({
                    where: {
                        userId_companyId: {
                            userId: existing.id,
                            companyId: companyId
                        }
                    }
                });
                if (!link) {
                    await prisma.userCompany.create({
                        data: {
                            userId: existing.id,
                            companyId: companyId,
                            role: 'AGENT',
                            isActive: true
                        }
                    });
                    console.log(`Linked existing user: ${existing.email} to company.`);
                }
            }
        }
    } else {
        console.log('Users already exist:');
        users.forEach(u => console.log(`- ${u.firstName} ${u.lastName} (${u.email})`));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
