
const { PrismaClient } = require('../prisma/generated/postgresql');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'h2m@maxpi.com' }
    });
    if (user) {
        console.log(`User h2m@maxpi.com found. ID: ${user.id}`);
    } else {
        console.log(`User h2m@maxpi.com not found. Creating it...`);
        const { hash } = require('bcryptjs');
        const hashedPassword = await hash('Password123!', 10);
        const newUser = await prisma.user.create({
            data: {
                email: 'h2m@maxpi.com',
                password: hashedPassword,
                firstName: 'H2M',
                lastName: 'User',
                role: 'COMPANY_ADMIN',
                companyId: 'cmlcatkmn0000vb70t1k03jpd',
                userCompanies: {
                    create: {
                        companyId: 'cmlcatkmn0000vb70t1k03jpd',
                        role: 'COMPANY_ADMIN'
                    }
                }
            }
        });
        console.log(`User created. ID: ${newUser.id}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
