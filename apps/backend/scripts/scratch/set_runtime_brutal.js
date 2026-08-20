const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');

async function setRuntimeVariantBrutal() {
  try {
    const company = await prisma.company.findFirst();
    if (!company) { console.log('No company found.'); return; }
    console.log('Company:', company.id);

    // Get active homepage template
    const activeTemplate = await prisma.homepageTemplate.findFirst({
      where: { companyId: company.id, isActive: true }
    });
    
    if (!activeTemplate) {
      console.log('No active template found. Listing all templates:');
      const all = await prisma.homepageTemplate.findMany({ where: { companyId: company.id }, select: { id: true, name: true, slug: true, sourceSlug: true, isActive: true } });
      console.log(JSON.stringify(all, null, 2));
      return;
    }

    console.log('Active template:', activeTemplate.id, activeTemplate.name, 'sourceSlug:', activeTemplate.sourceSlug);
    
    // Parse content
    let content = activeTemplate.content;
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch(e) { content = {}; }
    }
    content = content || {};
    
    // Check if there's a registry file for this template
    const sourceSlug = activeTemplate.sourceSlug || activeTemplate.slug;
    if (sourceSlug) {
      // Try to find the manifest file
      const registryPath = path.resolve(__dirname, `src/templates/registry/${sourceSlug}/manifest.json`);
      if (fs.existsSync(registryPath)) {
        console.log('Found registry manifest at:', registryPath);
        const manifest = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        console.log('Current runtimeVariant:', manifest.runtimeVariant);
        manifest.runtimeVariant = 'brutal';
        fs.writeFileSync(registryPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log('Updated registry manifest runtimeVariant to brutal!');
        return;
      } else {
        console.log('No registry file at:', registryPath);
      }
    }
    
    // Fallback: update the content.settings.runtimeVariant field in the DB
    if (!content.settings) content.settings = {};
    content.settings.runtimeVariant = 'brutal';
    
    await prisma.homepageTemplate.update({
      where: { id: activeTemplate.id },
      data: { content: content }
    });

    console.log('Updated template content.settings.runtimeVariant to brutal!');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

setRuntimeVariantBrutal();
