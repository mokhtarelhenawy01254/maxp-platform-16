require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function createSuperAdmin() {
    try {
        console.log('ðŸ”§ Initializing database...');
        await initializeSharedDatabase();

        const prisma = getSharedPrismaClient();

        // 1. Create a Default System Company
        console.log('ðŸ¢ Creating system company...');
        const companyEmail = 'admin@mokhtarelhenawy.com';
        let company = await prisma.company.findFirst({
            where: { email: companyEmail }
        });

        if (!company) {
            company = await prisma.company.create({
                data: {
                    name: 'Mokhtar Elhenawy Systems',
                    email: companyEmail,
                    slug: 'mokhtar-systems',
                    isActive: true,
                    // useCentralKeys removed — schema-agnostic routing
                    sidebarLayout: 'three-tier',
                    timezone: 'Africa/Cairo'
                }
            });
            console.log('âœ… Company created:', company.name);
        } else {
            console.log('â„¹ï¸  Company already exists');
        }

        // 2. Create Super Admin User
        const email = 'admin@mokhtarelhenawy.com';
        const password = process.env.PASSWORD || 'Admin@123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('ðŸ” Checking for user...');
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('âš ï¸  User already exists, updating to SUPER_ADMIN...');
            await prisma.user.update({
                where: { email },
                data: {
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    companyId: company.id
                }
            });
        } else {
            console.log('ðŸ‘¤ Creating new Super Admin user...');
            const user = await prisma.user.create({
                data: {
                    id: uuidv4(),
                    email: email,
                    password: hashedPassword,
                    firstName: 'Mokhtar',
                    lastName: 'Admin',
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    isEmailVerified: true,
                    companyId: company.id,
                    timezone: 'Africa/Cairo'
                }
            });

            // Create UserCompany record
            await prisma.userCompany.create({
                data: {
                    userId: user.id,
                    companyId: company.id,
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    isDefault: true
                }
            });

            console.log('âœ… Super Admin created successfully!');
        }

        console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
        console.log('ðŸ“§ Email:', email);
        console.log('ðŸ”‘ Password:', password);
        console.log('ðŸ¢ Company:', company.name);
        console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

    } catch (error) {
        console.error('âŒ Error:', error);
    } finally {
        process.exit(0);
    }
}

createSuperAdmin();

