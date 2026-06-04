const { getSharedPrismaClient } = require('../services/sharedDatabase');
const fs = require('fs');
const path = require('path');

async function run() {
  const prisma = getSharedPrismaClient();
  if (!prisma) {
    console.error('Failed to get prisma client');
    process.exit(1);
  }

  const contentPath = path.join(__dirname, '..', 'src', 'templates', 'system', 'femme-chic', 'content.json');
  if (!fs.existsSync(contentPath)) {
      console.error('Content file not found at:', contentPath);
      process.exit(1);
  }
  const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

  const companyId = 'cmmhkxobb0000vpk440j1n6ui';
  const slug = 'femme-chic';

  console.log(`Updating template for company ${companyId} and slug ${slug}...`);

  // 1. Deactivate all templates for this company first to be clean
  await prisma.homepageTemplate.updateMany({
    where: { companyId: companyId },
    data: { isActive: false }
  });

  // 2. Activate and update Femme Chic
  const result = await prisma.homepageTemplate.updateMany({
    where: {
      companyId: companyId,
      slug: slug
    },
    data: {
      content: content,
      publishedContent: content,
      isActive: true
    }
  });

  console.log(`Update result:`, result);
}

run();
