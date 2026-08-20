const { PrismaClient } = require('./prisma/generated/postgresql_v2');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const systemPath = path.join(__dirname, 'src', 'templates', 'system');

async function exportTemplates() {
    console.log('🚀 Starting Template Export to Filesystem...');

    try {
        const systemTemplates = await prisma.homepageTemplate.findMany({
            where: { isSystem: true }
        });

        console.log(`Found ${systemTemplates.length} system templates to export.`);

        if (!fs.existsSync(systemPath)) {
            fs.mkdirSync(systemPath, { recursive: true });
        }

        for (const template of systemTemplates) {
            // Generate slug from name if not present or just uses name lowercase-hyphen
            const slug = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            const templateDir = path.join(systemPath, slug);

            if (!fs.existsSync(templateDir)) {
                fs.mkdirSync(templateDir, { recursive: true });
            }

            const manifest = {
                slug: slug,
                version: "1.0.0",
                name: template.name,
                category: template.category || 'other',
                description: `System template for ${template.name}`,
                engineVersion: ">=1.0.0",
                lastUpdated: new Date().toISOString().split('T')[0]
            };

            const content = template.config || { rows: [] };

            fs.writeFileSync(path.join(templateDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
            fs.writeFileSync(path.join(templateDir, 'content.json'), JSON.stringify(content, null, 2));

            console.log(`✅ Exported: ${slug}`);
        }

        console.log('✨ All templates exported successfully!');
    } catch (error) {
        console.error('❌ Export failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

exportTemplates();
