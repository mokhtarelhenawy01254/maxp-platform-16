const { safeJsonParse } = require('./jsonUtils');

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0660-\u0669-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function findUniquePresentationSlug(prisma, productId, baseSlug) {
  const candidate = slugify(baseSlug);
  if (!candidate) return '';

  let slug = candidate;
  let suffix = 2;

  for (;;) {
    const existing = await prisma.productPresentation.findFirst({
      where: { productId, slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${candidate}-${suffix}`;
    suffix += 1;
  }
}

function buildPresentationResponse(presentation) {
  return {
    ...presentation,
    images: presentation.images ? JSON.parse(presentation.images) : [],
  };
}

async function findConvertedPresentationBySlug(prisma, companyId, slugOrId) {
  if (!prisma || !companyId || !slugOrId) {
    return null;
  }

  const deletedSource = await prisma.product.findFirst({
    where: {
      companyId,
      deletedAt: { not: null },
      OR: [
        { slug: slugOrId },
        { sku: slugOrId },
        ...(typeof slugOrId === 'string' && slugOrId.length > 20 ? [{ id: slugOrId }] : []),
      ],
    },
    select: {
      id: true,
      slug: true,
      sku: true,
    },
  });

  const candidates = new Set([slugOrId]);
  if (deletedSource) {
    if (deletedSource.id) candidates.add(deletedSource.id);
    if (deletedSource.sku) candidates.add(deletedSource.sku);
  }

  const presentations = await prisma.productPresentation.findMany({
    where: {
      product: { companyId, deletedAt: null },
      OR: Array.from(candidates).map((value) => ({ metadata: { contains: value } })),
    },
    select: {
      id: true,
      slug: true,
      productId: true,
      metadata: true,
    },
    take: 25,
  });

  const matchedPresentation = presentations.find((presentation) => {
    const meta = safeJsonParse(presentation.metadata, null);
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      return false;
    }

    if (deletedSource && meta.convertedFromProductId === deletedSource.id) {
      return true;
    }

    if (meta.convertedFromSku === slugOrId) {
      return true;
    }

    if (deletedSource?.sku && meta.convertedFromSku === deletedSource.sku) {
      return true;
    }

    return false;
  });

  if (!matchedPresentation) {
    return null;
  }

  const targetProduct = await prisma.product.findFirst({
    where: { id: matchedPresentation.productId, companyId, deletedAt: null },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!targetProduct || !targetProduct.slug) {
    return null;
  }

  return { presentation: matchedPresentation, targetProduct };
}

module.exports = {
  buildPresentationResponse,
  findConvertedPresentationBySlug,
  findUniquePresentationSlug,
  slugify,
};
