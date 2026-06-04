const { PrismaClient } = require('../prisma/generated/postgresql');

const prisma = new PrismaClient();

async function updateCompanies() {
  try {
    // Get all shipping companies
    const companies = await prisma.shippingCompany.findMany();
    console.log('Found companies:', companies.length);
    
    for (const company of companies) {
      console.log(`- ${company.name} (ID: ${company.id})`);
    }

    // Find turbo companies and update them
    const turboCompanies = companies.filter(c => c.name.toLowerCase().includes('turbo'));
    
    if (turboCompanies.length >= 2) {
      // Update first to Fiora
      await prisma.shippingCompany.update({
        where: { id: turboCompanies[0].id },
        data: { 
          name: 'Fiora',
          slug: 'fiora'
        }
      });
      console.log('âœ… Updated first company to: Fiora (slug: fiora)');

      // Update second to Sola
      await prisma.shippingCompany.update({
        where: { id: turboCompanies[1].id },
        data: { 
          name: 'Sola',
          slug: 'sola'
        }
      });
      console.log('âœ… Updated second company to: Sola (slug: sola)');
    } else {
      console.log('âš ï¸ Found less than 2 turbo companies');
    }

    // Show final state
    const finalCompanies = await prisma.shippingCompany.findMany();
    console.log('\nFinal companies:');
    for (const company of finalCompanies) {
      console.log(`- ${company.name} (slug: ${company.slug}, ID: ${company.id})`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompanies();

