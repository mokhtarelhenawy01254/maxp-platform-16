const path = require('path');
const { PrismaClient } = require(path.join(__dirname, 'prisma', 'generated', 'postgresql_v2'));
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.POSTGRES_URL || process.env.DATABASE_URL } }
});

async function check() {
  try {
    console.log('--- Database Check ---');
    const companies = await prisma.company.findMany({
      select: { id: true, slug: true, name: true, customDomain: true, isActive: true },
      take: 20
    });
    
    console.log(`Found ${companies.length} companies:`);
    companies.forEach(c => {
      console.log(`- [${c.id}] Name: ${c.name}, Slug: ${c.slug}, Domain: ${c.customDomain}, Active: ${c.isActive}`);
    });

    const swan = await prisma.company.findFirst({
      where: {
        OR: [
          { slug: 'swan' },
          { id: 'swan' },
          { name: { contains: 'swan', mode: 'insensitive' } }
        ]
      }
    });
    
    if (swan) {
      console.log('\n--- SWAN FOUND ---');
      console.log(JSON.stringify(swan, null, 2));
    } else {
      console.log('\n--- SWAN NOT FOUND (by slug, id, or name) ---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
