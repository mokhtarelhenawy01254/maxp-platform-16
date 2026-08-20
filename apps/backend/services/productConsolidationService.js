const { getSharedPrismaClient } = require('./sharedDatabase');

const ORIGINALS_ACTION = {
  KEEP: 'KEEP',
  HIDE: 'HIDE',
  DELETE: 'DELETE'
};

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }
  return {};
}

function slugify(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u0660-\u0669-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueProductSlug(prisma, companyId, baseSlug) {
  let slug = baseSlug || 'product';
  let n = 2;
  while (await prisma.product.findFirst({ where: { companyId, slug } })) {
    slug = `${baseSlug}-${n}`;
    n += 1;
  }
  return slug;
}

async function resolveProducts(prisma, companyId, productIds) {
  const products = await prisma.product.findMany({
    where: { companyId, id: { in: productIds }, deletedAt: null },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  return productIds.map((id) => byId.get(id)).filter(Boolean);
}

async function listDuplicateGroups({ companyId, onlyActive = true }) {
  const prisma = getSharedPrismaClient();
  const products = await prisma.product.findMany({
    where: { companyId, ...(onlyActive ? { deletedAt: null } : {}) },
    select: { id: true, name: true, sku: true, price: true, comparePrice: true, images: true, mainImage: true, status: true, isActive: true, deletedAt: true },
  });

  const groups = new Map();
  for (const p of products) {
    const key = p.name.trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  const result = [];
  for (const [name, items] of groups.entries()) {
    if (items.length < 2) continue;
    const itemsWithImages = items.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price) || 0,
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      images: parseJsonArray(p.images),
      mainImage: p.mainImage,
      status: p.status,
      isActive: p.isActive,
      isHidden: p.deletedAt !== null,
    }));
    result.push({
      name,
      count: items.length,
      items: itemsWithImages,
    });
  }

  result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return result;
}

async function consolidateProducts({
  companyId,
  userId,
  userName,
  name,
  description,
  sourceProductIds,
  variantSelections,
  originalsAction = ORIGINALS_ACTION.HIDE,
  categoryId = null,
  newSlug,
}) {
  const prisma = getSharedPrismaClient();

  if (!companyId) throw new Error('معرف الشركة مطلوب');
  if (!name || !String(name).trim()) throw new Error('اسم المنتج الجديد مطلوب');
  if (!Array.isArray(sourceProductIds) || sourceProductIds.length === 0) {
    throw new Error('اختر منتجاً واحداً على الأقل لدمجه');
  }

  const products = await resolveProducts(prisma, companyId, sourceProductIds);
  if (products.length === 0) throw new Error('لا توجد منتجات صالحة للدمج');

  const uniqueIds = new Set(products.map((p) => p.id));
  if (uniqueIds.size !== sourceProductIds.length) {
    throw new Error('أحد المنتجات المحددة غير موجود أو محذوف');
  }

  const variantKeys = new Set();
  for (const sel of variantSelections || []) {
    const product = products.find((p) => p.id === sel.productId);
    if (!product) throw new Error('متغير غير صالح في قائمة الدمج');
    const sku = (sel.sku ?? product.sku ?? '').toString().trim();
    if (sku && variantKeys.has(sku)) {
      throw new Error(`تعارض في SKU: ${sku} مكرر بين المنتجات المدمجة`);
    }
    if (sku) variantKeys.add(sku);
  }

  const slug = await uniqueProductSlug(prisma, companyId, slugify(newSlug || name));

  const first = products[0];

  const newProduct = await prisma.product.create({
    data: {
      name: String(name).trim(),
      description: description !== undefined && description !== null ? description : first.description,
      sku: first.sku,
      price: first.price,
      comparePrice: first.comparePrice,
      cost: first.cost,
      images: first.images,
      mainImage: first.mainImage,
      stock: first.stock,
      trackInventory: first.trackInventory,
      categoryId: categoryId || first.categoryId || null,
      companyId,
      isActive: true,
      isFeatured: first.isFeatured,
      tags: first.tags,
      slug,
      source: 'consolidated',
      metadata: JSON.stringify({
        consolidated: true,
        consolidatedFrom: products.map((p) => p.id),
        consolidatedBy: userName || null,
        consolidatedAt: new Date().toISOString(),
      }),
    },
  });

  const createdVariants = [];
  let sortOrder = 0;
  for (const sel of variantSelections || []) {
    const product = products.find((p) => p.id === sel.productId);
    const sku = (sel.sku ?? product.sku ?? '').toString().trim() || null;
    const variantName = sel.name || product.name || `Variant ${sortOrder + 1}`;
    const images = parseJsonArray(sel.images ?? product.images);

    const variant = await prisma.productVariant.create({
      data: {
        productId: newProduct.id,
        name: variantName,
        type: sel.type || 'variant',
        sku,
        price: sel.price !== undefined && sel.price !== null ? parseFloat(sel.price) : product.price ? parseFloat(product.price) : null,
        comparePrice: sel.comparePrice !== undefined && sel.comparePrice !== null ? parseFloat(sel.comparePrice) : product.comparePrice ? parseFloat(product.comparePrice) : null,
        cost: sel.cost !== undefined && sel.cost !== null ? parseFloat(sel.cost) : product.cost ? parseFloat(product.cost) : null,
        images: images.length > 0 ? JSON.stringify(images) : null,
        stock: sel.stock !== undefined && sel.stock !== null ? parseInt(sel.stock) : product.stock,
        trackInventory: product.trackInventory,
        isActive: true,
        sortOrder: sortOrder,
        metadata: JSON.stringify({
          consolidatedFromProductId: product.id,
          originalSku: product.sku || null,
        }),
      },
    });
    createdVariants.push(variant);
    sortOrder += 1;
  }

  const variantBySourceProduct = new Map();
  (variantSelections || []).forEach((sel, idx) => {
    const product = products.find((p) => p.id === sel.productId);
    if (product) variantBySourceProduct.set(product.id, createdVariants[idx]);
  });

  const sourceIds = products.map((p) => p.id);

  await prisma.orderItem.updateMany({
    where: { productId: { in: sourceIds } },
    data: { productId: newProduct.id },
  });

  await prisma.orderItem.updateMany({
    where: { variantId: { in: sourceIds.map((id) => variantBySourceProduct.get(id)?.id).filter(Boolean) } },
    data: { productId: newProduct.id },
  });

  await prisma.productPresentation.updateMany({
    where: { productId: { in: sourceIds } },
    data: { productId: newProduct.id },
  });

  if (prisma.productAnalytic) {
    await prisma.productAnalytic.updateMany({
      where: { productId: { in: sourceIds } },
      data: { productId: newProduct.id },
    }).catch(() => {});
  }

  if (prisma.stockMovement) {
    await prisma.stockMovement.updateMany({
      where: { productId: { in: sourceIds } },
      data: { productId: newProduct.id },
    }).catch(() => {});
  }

  if (prisma.wishlist) {
    await prisma.wishlist.updateMany({
      where: { productId: { in: sourceIds } },
      data: { productId: newProduct.id },
    }).catch(() => {});
  }

  if (prisma.recentlyViewed) {
    await prisma.recentlyViewed.updateMany({
      where: { productId: { in: sourceIds } },
      data: { productId: newProduct.id },
    }).catch(() => {});
  }

  let originalsHandled = [];
  if (originalsAction === ORIGINALS_ACTION.HIDE) {
    await prisma.product.updateMany({
      where: { id: { in: sourceIds } },
      data: { deletedAt: new Date() },
    });
    originalsHandled = sourceIds.map((id) => ({ id, action: 'HIDE' }));
  } else if (originalsAction === ORIGINALS_ACTION.DELETE) {
    await prisma.product.updateMany({
      where: { id: { in: sourceIds } },
      data: { deletedAt: new Date() },
    });
    for (const id of sourceIds) {
      await prisma.product.delete({ where: { id } }).catch(() => {});
    }
    originalsHandled = sourceIds.map((id) => ({ id, action: 'DELETE' }));
  } else {
    originalsHandled = sourceIds.map((id) => ({ id, action: 'KEEP' }));
  }

  return {
    product: newProduct,
    variants: createdVariants,
    originalsHandled,
  };
}

module.exports = {
  ORIGINALS_ACTION,
  listDuplicateGroups,
  consolidateProducts,
  uniqueProductSlug,
  slugify,
};