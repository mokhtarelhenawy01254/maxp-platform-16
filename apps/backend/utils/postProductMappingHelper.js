const { getSharedPrismaClient } = require('../services/sharedDatabase');

async function enrichMemoryContextWithPostProduct(companyId, threadId, memoryContext) {
  let enrichedContext = memoryContext ? { ...memoryContext } : {};

  try {
    const prisma = getSharedPrismaClient();
    if (!prisma) return enrichedContext;

    // 1. Always enrich companyVertical (safely, even when threadId or postId is null)
    if (companyId && prisma.company && typeof prisma.company.findUnique === 'function') {
      try {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
          select: {
            businessSpecialty: {
              select: { slug: true, nameAr: true, nameEn: true },
            },
            installedApps: {
              where: { status: { in: ['ACTIVE', 'TRIAL'] } },
              select: { app: { select: { slug: true } } },
            },
          },
        });

        if (company) {
          enrichedContext.companyVertical = {
            specialtySlug: company.businessSpecialty?.slug || null,
            specialtyNameAr: company.businessSpecialty?.nameAr || null,
            specialtyNameEn: company.businessSpecialty?.nameEn || null,
            activeApps: Array.isArray(company.installedApps)
              ? company.installedApps.map((item) => item?.app?.slug).filter(Boolean)
              : [],
          };
        }
      } catch (verticalErr) {
        console.warn('⚠️ [POST-PRODUCT-MAPPING] Failed to enrich companyVertical:', verticalErr.message);
      }
    }

    if (!threadId) return enrichedContext;

    // 2. Fetch conversation to get metadata
    const conversation = await prisma.conversation.findUnique({
      where: { id: threadId },
      select: { metadata: true }
    });

    if (!conversation || !conversation.metadata) return enrichedContext;

    let meta = {};
    try {
      meta = JSON.parse(conversation.metadata);
    } catch (e) {
      return enrichedContext;
    }

    const postId = meta.postId;
    if (!postId) return enrichedContext;

    // 3. Fetch post response settings and include product
    const postSettings = await prisma.postResponseSettings.findUnique({
      where: {
        postId_companyId: {
          postId,
          companyId
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            description: true
          }
        }
      }
    });

    if (postSettings?.product) {
      enrichedContext.referredProduct = {
        id: postSettings.product.id,
        name: postSettings.product.name,
        price: postSettings.product.price,
        description: postSettings.product.description
      };
      console.log(`✅ [POST-PRODUCT-MAPPING] Enriched context with referred product: ${postSettings.product.name}`);
    }
  } catch (err) {
    console.warn('⚠️ [POST-PRODUCT-MAPPING] Failed to enrich memory context with post product:', err.message);
  }

  return enrichedContext;
}

module.exports = {
  enrichMemoryContextWithPostProduct
};
