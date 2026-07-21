const { PrismaClient } = require('../prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
    // 1. Find or create a company
    let company = await prisma.company.findFirst();
    if (!company) {
        console.log('🏢 No company found. Creating a default company...');
        company = await prisma.company.create({
            data: {
                id: uuidv4(),
                name: 'Default Company',
                email: 'company@example.com',
                isActive: true,
                slug: 'default-company'
            }
        });
        console.log('🏢 Default company created:', company.name);
    } else {
        console.log('🏢 Existing company found:', company.name);
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash('123456', 12);

    // 3. Upsert user
    const email = 'mokhtar@mokhtar.com';
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            role: 'SUPER_ADMIN',
            companyId: company.id,
            isActive: true,
        },
        create: {
            id: uuidv4(),
            email,
            password: hashedPassword,
            firstName: 'Mokhtar',
            lastName: 'Admin',
            role: 'SUPER_ADMIN',
            isActive: true,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
            companyId: company.id,
        },
    });

    console.log('✅ User created/updated successfully!');
    console.log(`📧 Email: ${user.email}`);
    console.log(`🔑 Password: 123456`);
    console.log(`🏢 Company: ${company.name}`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
