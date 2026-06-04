const { getSharedPrismaClient } = require('./services/sharedDatabase');
const { personalizeTemplateContentForCompany } = require('./src/templates/contentHelpers');
const prisma = getSharedPrismaClient();

async function main() {
  if (!prisma) {
    console.error('Failed to get prisma client');
    process.exit(1);
  }

  const company = await prisma.company.findUnique({
    where: { slug: 'aura-chic-test' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true
    }
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

  const contentToParse = template.publishedContent || template.content;
  const parsedContent = typeof contentToParse === 'string' ? JSON.parse(contentToParse) : contentToParse;

  console.log('--- BEFORE PERSONALIZATION ---');
  console.log('Sections length:', parsedContent.sections?.length);
  console.log('Pages type:', typeof parsedContent.pages);

  const personalizedContent = personalizeTemplateContentForCompany(
    parsedContent,
    company
  );

  console.log('--- AFTER PERSONALIZATION ---');
  console.log('Sections length:', personalizedContent.sections?.length);
  console.log('Pages length (if array):', Array.isArray(personalizedContent.pages) ? personalizedContent.pages.length : 'NOT ARRAY');
  
  console.log('--- FULL OUTPUT ---');
  console.log(JSON.stringify(personalizedContent, null, 2));
}

main().catch(console.error).finally(() => {
    if (prisma && prisma.$disconnect) prisma.$disconnect();
});
