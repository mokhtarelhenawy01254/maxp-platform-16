const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:0165676135@localhost:5432/maxp"
        }
    }
});

async function main() {
    const hashedPassword = await bcrypt.hash('123456', 10);
    const superAdmin = await prisma.user.update({
        where: { email: 'admin@mokhtarelhenawy.com' },
        data: { password: hashedPassword }
    });
    console.log('Password updated for:', superAdmin.email);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
