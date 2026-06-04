const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getSharedPrismaClientAsync } = require('../../services/sharedDatabase');

async function registerTemplate() {
    const prisma = await getSharedPrismaClientAsync();
    if (!prisma) {
        console.error('❌ Could not initialize Prisma client.');
        process.exit(1);
    }

    const slug = 'nile-walk-elite';
    const appSlug = `template-${slug}`;

    const appData = {
        slug: appSlug,
        name: 'نايل ووك إيليت (Nile Walk Elite)',
        description: 'قالب نايل ووك إيليت - أفخم تجربة تسوق للأحذية والملابس في السوق المصري. تصميم عصري، تجربة مستخدم سلسة، ودعم كامل للغة العربية.',
        category: 'TEMPLATE',
        icon: '👟',
        monthlyPrice: 0,
        yearlyPrice: 0,
        pricingModel: 'FREE',
        features: JSON.stringify([
            'تصميم مخصص للسوق المصري',
            'دعم كامل للغة العربية (RTL)',
            'أقسام Hero احترافية',
            'عرض منتجات متنوع',
            'متوافق مع جميع الشاشات',
            'سرعة تحميل فائقة'
        ]),
        isActive: true,
        isPublic: true,
        isFeatured: true,
        trialDays: 0,
        mainRoute: `/templates/${slug}`,
        adminRoute: `/admin/templates/${slug}`
    };

    try {
        const app = await prisma.marketplaceApp.upsert({
            where: { slug: appSlug },
            update: appData,
            create: appData
        });
        console.log(`✅ Registered Template App: ${app.name} (${app.slug})`);
    } catch (error) {
        console.error('❌ Error registering template app:', error);
    } finally {
        await prisma.$disconnect();
    }
}

registerTemplate();
