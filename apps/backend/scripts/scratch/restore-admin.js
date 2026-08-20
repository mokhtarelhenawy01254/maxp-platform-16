const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  try {
    const password = await bcrypt.hash(process.env.PASSWORD || '0165676135', 12);
    
    // Create a default company
    const company = await prisma.company.create({
      data: {
        name: "Mokhtar Enterprise",
        email: "admin@mokhtarelhenawy.com",
        isActive: true,
        slug: "mokhtar"
      }
    });

    const user = await prisma.user.create({
      data: {
        email: "admin@mokhtarelhenawy.com",
        password: password,
        firstName: "Super",
        lastName: "Admin",
        role: "SUPER_ADMIN",
        isActive: true,
        companyId: company.id,
        isEmailVerified: true
      }
    });
    
    console.log("✅ Admin user restored: admin@mokhtarelhenawy.com / 0165676135");
  } catch (err) {
    console.error("❌ Error seeding admin:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
