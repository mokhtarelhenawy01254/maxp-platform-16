require('dotenv').config();
const { getSharedPrismaClient } = require('./services/sharedDatabase');

async function main() {
    const prisma = getSharedPrismaClient();

    try {
        const companyId = 'cmmhkxobb0000vpk440j1n6ui';

        // Create 5 categories
        const categoriesData = [
            {
                name: 'إلكترونيات',
                description: 'أجهزة كهربائية وإلكترونية',
                slug: 'electronics',
                displayType: 'grid',
                sortOrder: 1
            },
            {
                name: 'ملابس',
                description: 'ملابس رجالية ونسائية وأطفال',
                slug: 'clothing',
                displayType: 'grid',
                sortOrder: 2
            },
            {
                name: 'منتجات غذائية',
                description: 'مواد غذائية وطازجة',
                slug: 'food',
                displayType: 'list',
                sortOrder: 3
            },
            {
                name: 'مستلزمات منزلية',
                description: 'أدوات ومنتجات للمنزل',
                slug: 'home',
                displayType: 'grid',
                sortOrder: 4
            },
            {
                name: 'رياضة ولياقة',
                description: 'معدات رياضية ومنتجات لياقة',
                slug: 'sports',
                displayType: 'grid',
                sortOrder: 5
            }
        ];

        const categories = await Promise.all(
            categoriesData.map(data =>
                prisma.category.create({
                    data: {
                        ...data,
                        companyId
                    }
                })
            )
        );

        console.log('Created 5 categories:');
        console.log(JSON.stringify(categories, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main()
    .catch(e => console.error('Fatal:', e.message))
    .finally(() => { });
