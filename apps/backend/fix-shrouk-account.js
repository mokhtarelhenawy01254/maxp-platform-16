const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('--- Fixing Shrouk Account (Take 2) ---');

    const password = process.env.PASSWORD || 'shrouk9_Password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create or get Company m22
    let company = await prisma.company.findFirst({
        where: {
            OR: [
                { name: 'm22' },
                { slug: 'm22' }
            ]
        }
    });

    if (!company) {
        console.log('Creating company m22...');
        company = await prisma.company.create({
            data: {
                name: 'm22',
                slug: 'm22',
                email: 'info@m22.com',
                isActive: true,
                plan: 'PRO'
            }
        });
    }
    console.log('Company ID:', company.id);

    // 2. Create or update User shrouk9@gmail.com
    const userEmail = 'shrouk9@gmail.com';
    let user = await prisma.user.findUnique({
        where: { email: userEmail }
    });

    if (user) {
        console.log('User found, updating...');
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                companyId: company.id,
                role: 'SUPER_ADMIN',
                isActive: true
            }
        });
    } else {
        console.log('User not found, creating...');
        user = await prisma.user.create({
            data: {
                email: userEmail,
                password: hashedPassword,
                firstName: 'Shrouk',
                lastName: 'User',
                role: 'SUPER_ADMIN',
                companyId: company.id,
                isActive: true
            }
        });
    }

    // 3. Ensure UserCompany association
    // Using 'OWNER' role as it's safe for Admin
    const userCompany = await prisma.userCompany.upsert({
        where: {
            userId_companyId: {
                userId: user.id,
                companyId: company.id
            }
        },
        update: {
            role: 'OWNER',
            isActive: true,
            isDefault: true
        },
        create: {
            userId: user.id,
            companyId: company.id,
            role: 'OWNER',
            isActive: true,
            isDefault: true
        }
    });

    console.log('✅ Fix completed successfully!');
    console.log('Email:', userEmail);
    console.log('Temporary Password:', password);
    console.log('Company:', company.name);
}

main()
    .catch(e => {
        console.error('❌ Error:', e);
    })
    .finally(() => prisma.$disconnect());
