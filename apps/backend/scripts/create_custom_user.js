const { PrismaClient } = require('../prisma/generated/postgresql');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function createCustomUser() {
    try {
        const email = 'testuser@example.com';
        const password = 'Password123!';
        const firstName = 'Test';
        const lastName = 'User';

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Get first active company
        const company = await prisma.company.findFirst({
            where: { isActive: true }
        });

        if (!company) {
            console.log('âŒ No active company found');
            return;
        }

        console.log('ðŸ¢ Using company:', company.name);

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('âœ… User already exists, updating password...');
            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    isActive: true
                }
            });
            console.log('âœ… Password updated successfully');
        } else {
            console.log('ðŸ“ Creating new user...');
            const user = await prisma.user.create({
                data: {
                    id: crypto.randomUUID(),
                    email,
                    password: hashedPassword,
                    firstName,
                    lastName,
                    role: 'OWNER',
                    isActive: true,
                    companyId: company.id,
                    updatedAt: new Date()
                }
            });

            console.log('âœ… User created successfully:', {
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
                companyId: user.companyId
            });
        }

        console.log('\nðŸ”‘ Login credentials:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error('âŒ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createCustomUser();

