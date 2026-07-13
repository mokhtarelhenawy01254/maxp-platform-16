const { getSharedPrismaClient } = require('./services/sharedDatabase');
const prisma = getSharedPrismaClient();

async function main() {
  if (!prisma) {
    console.error('Failed to get prisma client');
    process.exit(1);
  }

  const company = await prisma.company.findUnique({
    where: { slug: 'aura-chic-test' },
  });

  if (!company) {
    console.error('Company not found');
    return;
  }

  const template = await prisma.homepageTemplate.findFirst({
    where: { companyId: company.id, isActive: true },
  });

  if (!template) {
    console.error('Active template not found');
    return;
  }

  console.log(JSON.stringify({
    id: template.id,
    name: template.name,
    isActive: template.isActive,
    content: typeof template.content === 'string' ? JSON.parse(template.content) : template.content,
    publishedContent: typeof template.publishedContent === 'string' ? JSON.parse(template.publishedContent) : template.publishedContent,
  }, null, 2));
}

main().catch(console.error).finally(() => {
    if (prisma && prisma.$disconnect) prisma.$disconnect();
});
