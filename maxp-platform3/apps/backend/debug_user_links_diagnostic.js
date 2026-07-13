
const { getSharedPrismaClient, initializeSharedDatabase } = require('./services/sharedDatabase');

async function debugUser() {
    try {
        await initializeSharedDatabase();
        const prisma = getSharedPrismaClient();

        const email = 'h2m.office@maxp.com';
        const user = await prisma.user.findFirst({
            where: { email: email.trim().toLowerCase() },
            include: {
                company: true,
                userCompanies: {
                    include: {
                        company: true
                    }
                }
            }
        });

        if (!user) {
            console.log('❌ User not found:', email);
            return;
        }

        console.log('✅ User Found:');
        console.log('ID:', user.id);
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Primary CompanyId:', user.companyId);
        console.log('Primary Company Name:', user.company?.name || 'NONE');

        console.log('\n--- Linked Companies (userCompanies) ---');
        if (user.userCompanies && user.userCompanies.length > 0) {
            user.userCompanies.forEach((uc, index) => {
                console.log(`${index + 1}. Company ID: ${uc.companyId}, Name: ${uc.company?.name}, Role: ${uc.role}, IsDefault: ${uc.isDefault}, IsActive: ${uc.isActive}`);
            });
        } else {
            console.log('NONE');
        }

        // Check system roles
        const isSystemRole = ['SUPER_ADMIN', 'Project Manager', 'Team Lead', 'Developer', 'Tester'].includes(user.role);
        console.log('\nIs System Role:', isSystemRole);

        if (!user.companyId && !isSystemRole) {
            console.log('\n🚨 LOGIN WOULD FAIL: user.companyId is null and not a system role.');
        } else if (!user.company && user.role !== 'SUPER_ADMIN') {
            console.log('\n🚨 LOGIN WOULD FAIL: user.company is null and role is not SUPER_ADMIN.');
        } else {
            console.log('\n✅ Login association check should pass.');
        }

    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        process.exit();
    }
}

debugUser();
