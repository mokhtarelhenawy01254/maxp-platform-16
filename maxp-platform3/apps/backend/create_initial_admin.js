require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getSharedPrismaClient } = require('./services/sharedDatabase');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    const prisma = getSharedPrismaClient();
    try {
        const hashedPassword = await bcrypt.hash('SuperAdmin123!', 12);
        const superAdmin = await prisma.user.create({
            data: {
                email: 'superadmin@system.com',
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Admin',
                role: 'SUPER_ADMIN',
                isActive: true,
                isEmailVerified: true
            }
        });
        console.log('Super Admin created:', superAdmin.email);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
