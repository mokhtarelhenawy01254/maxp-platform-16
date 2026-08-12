const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { sanitizeImageCollection } = require('../utils/productMediaUtils');
const {
  buildPresentationResponse,
  findUniquePresentationSlug,
  slugify,
} = require('../utils/presentationConversion');
const {
  isMerchantUser,
  requireMerchantAccountForUser,
  syncMerchantProductStock,
} = require('../utils/merchantAccountScope');

/**
 * يحوّل منتجاً واحداً (مكرر) إلى عرض تقديمي تابع لمنتج هدف.
 * بيدّي { success, data } أو { success: false, error: { status, message } }.
 */
async function performSingleConversion(prisma, companyId, sourceId, targetProductId, user) {
  const source = await prisma.product.findFirst({
    where: { id: sourceId, companyId, deletedAt: null },
    select: {
      id: true,
      companyId: true,
      name: true,
      slug: true,
      sku: true,
      description: true,
      images: true,
      mainImage: true,
      stock: true,
      isDropshipped: true,
      merchantProductId: true,
    },
  });
  if (!source) {
    return { success: false, error: { status: 404, message: 'المنتج غير موجود' } };
  }

  const target = await prisma.product.findFirst({
    where: { id: targetProductId, companyId, deletedAt: null },
    select: {
      id: true,
      slug: true,
      stock: true,
    },
  });
  if (!target) {
    return { success: false, error: { status: 404, message: 'المنتج الهدف غير موجود' } };
  }

  if (source.id === target.id) {
    return { success: false, error: { status: 400, message: 'لا يمكن تحويل المنتج إلى نفسه' } };
  }

  // جميع الخطوات داخل معاملة واحدة حتى لا تبقى بيانات يتيمة لو فشل أي خطوة
  const result = await prisma.$transaction(async (tx) => {
    const presentationSlug = await findUniquePresentationSlug(
      tx,
      target.id,
      source.slug || slugify(source.name),
    );
    const imagesStr = JSON.stringify(sanitizeImageCollection(source.images));
    const presentationCount = await tx.productPresentation.count({
      where: { productId: target.id },
    });

    const presentation = await tx.productPresentation.create({
      data: {
        productId: target.id,
        name: source.name,
        slug: presentationSlug,
        images: imagesStr,
        mainImage: source.mainImage || null,
        title: source.name,
        description: source.description || null,
        isActive: true,
        sortOrder: presentationCount,
        metadata: JSON.stringify({
          convertedFromProductId: source.id,
          convertedFromSku: source.sku,
          convertedAt: new Date().toISOString(),
        }),
      },
    });

    let mergedStock = false;
    try {
      const merchantUser = isMerchantUser(user);
      const merchantManaged = Boolean(source.isDropshipped || source.merchantProductId || merchantUser);

      if (!merchantManaged) {
        const sourceStock = Number(source.stock) || 0;
        if (sourceStock > 0) {
          await tx.product.update({
            where: { id: target.id },
            data: { stock: (Number(target.stock) || 0) + sourceStock },
          });
          mergedStock = true;
        }
      } else {
        const sourceInventories = await tx.inventory.findMany({
          where: { productId: source.id },
          select: {
            id: true,
            warehouseId: true,
            quantity: true,
            available: true,
            batchNumber: true,
          },
        });

        let mergedRows = 0;
        for (const inv of sourceInventories) {
          if (!inv.warehouseId || (Number(inv.quantity) || 0) <= 0) {
            continue;
          }

          await tx.inventory.upsert({
            where: {
              productId_warehouseId_batchNumber: {
                productId: target.id,
                warehouseId: inv.warehouseId,
                batchNumber: inv.batchNumber,
              },
            },
            update: {
              quantity: { increment: Number(inv.quantity) || 0 },
              available: { increment: Number(inv.available) || 0 },
              updatedAt: new Date(),
            },
            create: {
              productId: target.id,
              warehouseId: inv.warehouseId,
              quantity: Number(inv.quantity) || 0,
              available: Number(inv.available) || 0,
              reserved: 0,
            },
          });

          mergedRows += 1;
        }

        if (mergedRows > 0) {
          if (merchantUser) {
            const merchant = await requireMerchantAccountForUser(user, tx);
            await syncMerchantProductStock(tx, merchant, target.id);
          }
          mergedStock = true;
        } else {
          console.warn(
            `⚠️ [convertProductToPresentation] No inventory rows to merge for merchant-managed source ${source.id}`,
          );
        }
      }
    } catch (stockError) {
      console.error('⚠️ [convertProductToPresentation] Stock merge skipped:', stockError.message);
    }

    const movedOrderItems = await tx.orderItem.updateMany({
      where: { productId: source.id },
      data: { productId: target.id },
    });

    if (source.sku) {
      await tx.product.update({
        where: { id: source.id },
        data: { sku: null },
      });
    }

    await tx.product.update({
      where: { id: source.id },
      data: { deletedAt: new Date() },
    });

    return { presentation, mergedStock, movedOrderItems: movedOrderItems.count };
  });

  const presentationPath = [target.slug, result.presentation.slug].filter(Boolean).join('/');

  return {
    success: true,
    data: {
      presentation: buildPresentationResponse(result.presentation),
      targetProductId: target.id,
      presentationSlug: presentationPath,
      movedOrderItems: result.movedOrderItems,
      mergedStock: result.mergedStock,
    },
  };
}

const convertProductToPresentation = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { id } = req.params;
    const { targetProductId } = req.body || {};

    if (!targetProductId) {
      return res.status(400).json({ success: false, message: 'معرف المنتج الهدف مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const outcome = await performSingleConversion(prisma, companyId, id, targetProductId, req.user);

    if (!outcome.success) {
      return res.status(outcome.error.status).json({
        success: false,
        message: outcome.error.message,
      });
    }

    return res.json({
      success: true,
      message: 'تم تحويل المنتج إلى عرض تقديمي بنجاح',
      data: outcome.data,
    });
  } catch (error) {
    console.error('❌ [convertProductToPresentation] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحويل المنتج' });
  }
};

/**
 * تحويل جماعي: كل منتج من القائمة يتحول لعرض تقديمي تابع للمنتج الهدف.
 * المنتجات غير الصالحة تُتخطى وتُسجّل في التقرير (لا توقف الباقي).
 */
const convertBulkProductsToPresentations = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول - معرف الشركة مطلوب' });
    }

    const { sourceProductIds, targetProductId } = req.body || {};

    if (!Array.isArray(sourceProductIds) || sourceProductIds.length === 0) {
      return res.status(400).json({ success: false, message: 'اختر منتجاً واحداً على الأقل للتحويل' });
    }

    if (!targetProductId) {
      return res.status(400).json({ success: false, message: 'معرف المنتج الهدف مطلوب' });
    }

    const prisma = getSharedPrismaClient();
    const target = await prisma.product.findFirst({
      where: { id: targetProductId, companyId, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, message: 'المنتج الهدف غير موجود' });
    }

    const uniqueIds = Array.from(new Set(sourceProductIds.map(String)));
    const converted = [];
    const skipped = [];

    for (const sourceId of uniqueIds) {
      if (sourceId === targetProductId) {
        skipped.push({ productId: sourceId, reason: 'لا يمكن تحويل المنتج إلى نفسه' });
        continue;
      }

      try {
        const outcome = await performSingleConversion(
          prisma,
          companyId,
          sourceId,
          targetProductId,
          req.user,
        );

        if (outcome.success) {
          converted.push(outcome.data);
        } else {
          skipped.push({
            productId: sourceId,
            reason: outcome.error.message,
          });
        }
      } catch (err) {
        skipped.push({
          productId: sourceId,
          reason: err?.message || 'حدث خطأ أثناء التحويل',
        });
      }
    }

    return res.json({
      success: true,
      message: `تم تحويل ${converted.length} منتج إلى عروض تقديمية، وتم تخطي ${skipped.length}`,
      data: {
        converted,
        skipped,
        convertedCount: converted.length,
        skippedCount: skipped.length,
        targetProductId: target.id,
      },
    });
  } catch (error) {
    console.error('❌ [convertBulkProductsToPresentations] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء التحويل الجماعي' });
  }
};

module.exports = {
  convertProductToPresentation,
  convertBulkProductsToPresentations,
};
