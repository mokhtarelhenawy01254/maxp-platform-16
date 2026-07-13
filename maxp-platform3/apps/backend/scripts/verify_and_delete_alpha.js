
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const adminCompnayController = require('../controller/adminCompnayController');

async function testDelete() {
    console.log('🔍 [STEP 1] Searching for company: Alpha@gmail.com');

    try {
        const prisma = getSharedPrismaClient();
        if (!prisma) {
            console.error('❌ Prisma client not initialized');
            return;
        }

        const company = await prisma.company.findFirst({
            where: {
                email: 'Alpha@gmail.com'
            }
        });

        if (!company) {
            console.log('⚠️ Company not found in database. Cannot proceed with deletion test.');
            return;
        }

        console.log(`✅ [STEP 1] Found company!`);
        console.log(`   - ID: ${company.id}`);
        console.log(`   - Name: ${company.name}`);
        console.log(`   - Email: ${company.email}`);

        // Mock Request and Response for Controller
        const req = {
            body: {
                companyIds: [company.id]
            }
        };

        const res = {
            status: function (code) {
                console.log(`📡 [HTTP] Response Status: ${code}`);
                return this;
            },
            json: function (data) {
                console.log('📦 [HTTP] Response Data:', JSON.stringify(data, null, 2));
                return this;
            }
        };

        console.log('\n🗑️ [STEP 2] Executing Bulk Delete Operation...');
        await adminCompnayController.bulkDeleteCompanies(req, res);

        console.log('\n🔍 [STEP 3] Verifying deletion in database...');
        const checkCompany = await prisma.company.findUnique({
            where: { id: company.id }
        });

        if (!checkCompany) {
            console.log('✅ [SUCCESS] Company has been permanently deleted from the database.');
        } else {
            console.error('❌ [FAILURE] Company still exists in the database!');
        }

    } catch (error) {
        console.error('❌ Unexpected Error:', error);
    } finally {
        setTimeout(() => process.exit(0), 2000);
    }
}

testDelete();
