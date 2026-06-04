const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('../prisma/generated/postgresql');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetPassword() {
    try {
        const email = 'h2m@maxpi.com';
        const newPassword = '123';

        console.log(`Checking for user: ${email}...`);
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log(`❌ User with email ${email} not found.`);
            return;
        }

        console.log(`🔄 Resetting password for ${email} to "${newPassword}"...`);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword
            }
        });

        console.log('✅ Password reset successfully!');
        console.log('  - User ID:', updatedUser.id);
        console.log('  - Email:', updatedUser.email);

    } catch (error) {
        console.error('❌ Error resetting password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword();
