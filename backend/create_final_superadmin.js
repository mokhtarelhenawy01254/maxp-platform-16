const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const prisma = new PrismaClient();

async function createSuperAdmin() {
    const email = 'superadmin@maxp.com';
    const password = 'SuperAdmin@2026';
    
    try {
        console.log(`🚀 Creating Super Admin: ${email}`);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                role: 'SUPER_ADMIN',
                password: hashedPassword,
                isActive: true
            },
            create: {
                id: uuidv4(),
                email: email,
                password: hashedPassword,
                firstName: 'MaxP',
                lastName: 'SuperAdmin',
                role: 'SUPER_ADMIN',
                isActive: true
            }
        });
        
        console.log('✅ Super Admin created/updated successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createSuperAdmin();
