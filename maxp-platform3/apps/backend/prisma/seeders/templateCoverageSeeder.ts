import { PrismaClient } from '../generated/postgresql_v2';

const prisma = new PrismaClient();

const REQUIRED_PAGE_SLUGS = [
    "shop",
    "product-details",
    "wishlist",
    "cart",
    "checkout",
    "order-confirmation",
    "track-order",
    "about-us",
    "contact-us",
    "faq",
    "blog",
    "shipping-policy",
    "return-policy",
    "size-guide",
    "privacy-policy",
    "terms",
];

export async function seedTemplateCoverage() {
    console.log('🏗️ Starting Template Coverage Seeder...');

    // System templates only; never mutate company templates here.
    const templates = await prisma.homepageTemplate.findMany({
        where: { isSystem: true },
        select: { id: true, name: true, content: true, slug: true },
    });

    console.log(`🔍 Found ${templates.length} system templates to check.`);

    const pageFactory = (slug: string) => {
        if (
            slug === 'shop' ||
            slug === 'product-details' ||
            slug === 'wishlist' ||
            slug === 'cart' ||
            slug === 'checkout' ||
            slug === 'order-confirmation' ||
            slug === 'track-order'
        ) {
            return {
                slug,
                title: slug,
                sections: [
                    {
                        id: `${slug}-native`,
                        type: 'native-page',
                        content: {
                            page: slug,
                            mode: 'functional',
                        },
                    },
                ],
            };
        }

        const genericTitle =
            slug
                .split('-')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ') || 'Page';

        return {
            slug,
            title: genericTitle,
            sections: [
                {
                    id: `${slug}-header`,
                    type: 'header',
                    content: { title: genericTitle },
                },
                {
                    id: `${slug}-content`,
                    type: 'content',
                    content: {
                        html: `<div style='max-width:860px;margin:0 auto;padding:24px 12px;direction:rtl;text-align:right'><p style='line-height:2;color:#475569'>يمكنك تعديل محتوى صفحة ${genericTitle} من محرر القالب.</p></div>`,
                    },
                },
            ],
        };
    };

    let updatedCount = 0;
    for (const template of templates) {
        const parsedContent =
            typeof template.content === 'string'
                ? (() => {
                      try {
                          return JSON.parse(template.content);
                      } catch {
                          return {};
                      }
                  })()
                : template.content || {};

        const pages = Array.isArray(parsedContent.pages) ? parsedContent.pages : [];
        const existingSlugs = new Set(
            pages
                .map((page: any) => String(page?.slug || '').trim().toLowerCase())
                .filter(Boolean),
        );

        const missingSlugs = REQUIRED_PAGE_SLUGS.filter((slug) => !existingSlugs.has(slug));
        if (missingSlugs.length === 0) {
            continue;
        }

        const nextContent = {
            ...parsedContent,
            pages: [...pages, ...missingSlugs.map((slug) => pageFactory(slug))],
        };

        await prisma.homepageTemplate.update({
            where: { id: template.id },
            data: { content: nextContent },
        });

        updatedCount += 1;
        console.log(
            `✅ Updated template coverage: ${template.name} (added ${missingSlugs.length} pages)`,
        );
    }

    console.log(
        `🎉 Template Coverage Seeder completed. Updated ${updatedCount}/${templates.length} system templates.`,
    );
}

if (require.main === module) {
    seedTemplateCoverage()
        .catch(e => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
