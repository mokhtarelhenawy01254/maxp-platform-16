const { getSharedPrismaClient } = require('./services/sharedDatabase');
async function main() {
    const prisma = getSharedPrismaClient();
    try {
        const templates = await prisma.homepageTemplate.findMany({
            select: {
                id: true,
                name: true,
                companyId: true,
                isSystem: true,
                slug: true,
                sourceSlug: true
            }
        });
        console.log('---DATABASE_TEMPLATES_START---');
        console.log(JSON.stringify(templates, null, 2));
        console.log('---DATABASE_TEMPLATES_END---');
    } catch (err) {
        console.error(err);
    }
}
main();
