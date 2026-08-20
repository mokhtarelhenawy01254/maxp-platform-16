const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();

async function setManifestBrutal() {
  try {
    // Find the manifest for this company (it's stored in homepageTemplate or templateManifest)
    const company = await prisma.company.findFirst();
    if (!company) { console.log('No company found.'); return; }
    console.log('Company:', company.id);

    // Try to find the template manifest
    // It might be stored as a separate table or inside the homepage template
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    console.log('Available Prisma models:', models.join(', '));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

setManifestBrutal();
