require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'shrouk9@gmail.com' }
        });
        console.log('USER:', user?.email, user?.id, user?.companyId);

        const m22 = await prisma.company.findFirst({
            where: { name: 'm22' }
        });
        console.log('M22 COMPANY:', m22?.name, m22?.id);

        if (user && m22 && user.companyId !== m22.id) {
            console.log('Linking user to m22...');
            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: m22.id }
            });
            console.log('Successfully linked user to m22.');
        } else if (!user) {
            console.log('User not found!');
        } else if (!m22) {
            console.log('m22 company not found!');
        } else {
            console.log('User is already linked to m22.');
        }

    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
