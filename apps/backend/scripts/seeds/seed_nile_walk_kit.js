
const { PrismaClient } = require('../../prisma/generated/postgresql_v2');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
    const templateDir = path.join(__dirname, '../../src/templates/system/nile-walk-elite-v2');
    const manifest = JSON.parse(fs.readFileSync(path.join(templateDir, 'manifest.json'), 'utf8'));
    const content = JSON.parse(fs.readFileSync(path.join(templateDir, 'content.json'), 'utf8'));

    // Find existing by slug
    const existing = await prisma.homepageTemplate.findFirst({
        where: { slug: manifest.slug }
    });

    let result;
    if (existing) {
        result = await prisma.homepageTemplate.update({
            where: { id: existing.id },
            data: {
                name: manifest.name,
                description: manifest.description,
                content: content,
                thumbnail: manifest.thumbnail,
                isSystem: true,
                isActive: true,
                category: manifest.category,
                pageType: 'HOMEPAGE'
            }
        });
        console.log(`System Template updated: ${result.name} (${result.id})`);
    } else {
        result = await prisma.homepageTemplate.create({
            data: {
                name: manifest.name,
                slug: manifest.slug,
                description: manifest.description,
                content: content,
                thumbnail: manifest.thumbnail,
                isSystem: true,
                isActive: true,
                category: manifest.category,
                pageType: 'HOMEPAGE'
            }
        });
        console.log(`System Template created: ${result.name} (${result.id})`);
    }

    // Link to test company: cmm4b2hzm0000ufhg0h6wznup
    const testCompanyId = 'cmm4b2hzm0000ufhg0h6wznup';
    try {
        const company = await prisma.company.findUnique({
            where: { id: testCompanyId }
        });

        if (company) {
            // Check if this company already has this template
            const existingCompanyTemplate = await prisma.homepageTemplate.findFirst({
                where: { companyId: testCompanyId, slug: manifest.slug }
            });

            if (existingCompanyTemplate) {
                await prisma.homepageTemplate.update({
                    where: { id: existingCompanyTemplate.id },
                    data: {
                        name: manifest.name,
                        description: manifest.description,
                        content: content,
                        thumbnail: manifest.thumbnail,
                        isActive: true,
                        category: manifest.category,
                        pageType: 'HOMEPAGE'
                    }
                });
                console.log(`Updated active template for test company (${testCompanyId})`);
            } else {
                await prisma.homepageTemplate.create({
                    data: {
                        companyId: testCompanyId,
                        name: manifest.name,
                        slug: manifest.slug,
                        description: manifest.description,
                        content: content,
                        thumbnail: manifest.thumbnail,
                        isActive: true,
                        isSystem: false,
                        category: manifest.category,
                        pageType: 'HOMEPAGE'
                    }
                });
                console.log(`Created and activated template for test company (${testCompanyId})`);
            }

            // Deactivate other templates for this company to ensure this one is active
            await prisma.homepageTemplate.updateMany({
                where: {
                    companyId: testCompanyId,
                    slug: { not: manifest.slug },
                    isActive: true
                },
                data: { isActive: false }
            });
        } else {
            console.log(`Test company ${testCompanyId} not found, skipping link.`);
        }
    } catch (e) {
        console.error("Error linking to test company:", e.stack);
    }

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
