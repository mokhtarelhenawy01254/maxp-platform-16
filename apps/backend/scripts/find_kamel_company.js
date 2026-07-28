const { PrismaClient } = require('../generated/postgresql_v2');
const p = new PrismaClient();
async function main() {
  // Search for كامل (Arabic) in company names
  const companiesAr = await p.company.findMany({
    where: { name: { contains: 'كامل', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true }
  });
  console.log('=== Companies containing "كامل" (Arabic):', companiesAr.length);
  console.log(JSON.stringify(companiesAr, null, 2));

  // Search for "kamel" case-insensitive
  const companiesEn = await p.company.findMany({
    where: { name: { contains: 'kamel', mode: 'insensitive' } },
    select: { id: true, name: true, slug: true }
  });
  console.log('=== Companies containing "kamel" (English):', companiesEn.length);
  console.log(JSON.stringify(companiesEn, null, 2));

  // Also search in slug
  const companiesSlug = await p.company.findMany({
    where: { OR: [
      { slug: { contains: 'kamel', mode: 'insensitive' } },
      { slug: { contains: 'كامل', mode: 'insensitive' } }
    ]},
    select: { id: true, name: true, slug: true }
  });
  console.log('=== Companies matching in slug:', companiesSlug.length);
  console.log(JSON.stringify(companiesSlug, null, 2));

  // List all companies with their names
  const allCompanies = await p.company.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  console.log('=== Last 50 companies:');
  allCompanies.forEach(c => console.log(c.id, '|', c.name, '|', c.slug));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
