const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getSharedPrismaClientAsync } = require('./services/sharedDatabase');

async function main() {
  const prisma = await getSharedPrismaClientAsync();
  if (!prisma) {
    console.error('Could not initialize Prisma');
    return;
  }
  
  try {
    const template = await prisma.homepageTemplate.findFirst({
      where: { name: { contains: 'Femme Chic' } },
      select: { id: true, name: true, content: true }
    });
    
    if (!template) {
      console.log('Template not found');
      return;
    }
    
    console.log(`Template: ${template.name} (${template.id})`);
    let content = template.content;
    
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
        console.log('Content was string, parsed successfully.');
      } catch (e) {
        console.log('Content was string but FAILED TO PARSE.');
      }
    }
    
    if (content && typeof content === 'object') {
       console.log('Content keys:', Object.keys(content));
       if (content.demoDataBlueprint) {
         console.log('✅ Blueprint found!');
         console.log('Blueprint highlights:', JSON.stringify({
           productCount: content.demoDataBlueprint.products?.length,
           categoryCount: content.demoDataBlueprint.categories?.length,
           settingsPresent: !!content.demoDataBlueprint.settings
         }));
       } else {
         console.log('❌ No blueprint found in content object.');
       }
    } else {
      console.log('❌ Content is not an object or null.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
