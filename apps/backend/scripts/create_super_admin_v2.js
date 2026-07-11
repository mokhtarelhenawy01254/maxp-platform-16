require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getSharedPrismaClient, initializeSharedDatabase } = require('../services/sharedDatabase');

async function createSuperAdmin() {
    try {
        console.log('Initializing database...');
        await initializeSharedDatabase();

        const prisma = getSharedPrismaClient();

        const email = 'admin@mokhtarelhenawy.com';
        const password = process.env.PASSWORD || 'Admin@123456';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Checking for user...');
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('User already exists, updating to SUPER_ADMIN...');
            await prisma.user.update({
                where: { email },
                data: {
                    role: 'SUPER_ADMIN',
                    isActive: true,
                    companyId: null
                }
            });
        } else {
            console.log('Creating new Super Admin user...');
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
                    companyId: null,
                    timezone: 'Africa/Cairo'
                }
            });

            console.log('Super Admin created successfully!');
        }

        console.log('-----------------------');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('-----------------------');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

createSuperAdmin();
