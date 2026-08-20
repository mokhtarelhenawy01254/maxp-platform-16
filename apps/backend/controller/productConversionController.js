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
 * ┘è╪¡┘ê┘æ┘ä ┘à┘å╪¬╪¼╪º┘ï ┘ê╪º╪¡╪»╪º┘ï (┘à┘â╪▒╪▒) ╪Ñ┘ä┘ë ╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è ╪¬╪º╪¿╪╣ ┘ä┘à┘å╪¬╪¼ ┘ç╪»┘ü.
 * ╪¿┘è╪»┘æ┘è { success, data } ╪ú┘ê { success: false, error: { status, message } }.
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
    return { success: false, error: { status: 404, message: '╪º┘ä┘à┘å╪¬╪¼ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' } };
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
    return { success: false, error: { status: 404, message: '╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä┘ç╪»┘ü ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' } };
  }

  if (source.id === target.id) {
    return { success: false, error: { status: 400, message: '┘ä╪º ┘è┘à┘â┘å ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à┘å╪¬╪¼ ╪Ñ┘ä┘ë ┘å┘ü╪│┘ç' } };
  }

  // ╪¼┘à┘è╪╣ ╪º┘ä╪«╪╖┘ê╪º╪¬ ╪»╪º╪«┘ä ┘à╪╣╪º┘à┘ä╪⌐ ┘ê╪º╪¡╪»╪⌐ ╪¡╪¬┘ë ┘ä╪º ╪¬╪¿┘é┘ë ╪¿┘è╪º┘å╪º╪¬ ┘è╪¬┘è┘à╪⌐ ┘ä┘ê ┘ü╪┤┘ä ╪ú┘è ╪«╪╖┘ê╪⌐
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
            `ΓÜá∩╕Å [convertProductToPresentation] No inventory rows to merge for merchant-managed source ${source.id}`,
          );
        }
      }
    } catch (stockError) {
      console.error('ΓÜá∩╕Å [convertProductToPresentation] Stock merge skipped:', stockError.message);
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
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä - ┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à╪╖┘ä┘ê╪¿' });
    }

    const { id } = req.params;
    const { targetProductId } = req.body || {};

    if (!targetProductId) {
      return res.status(400).json({ success: false, message: '┘à╪╣╪▒┘ü ╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä┘ç╪»┘ü ┘à╪╖┘ä┘ê╪¿' });
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
      message: '╪¬┘à ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à┘å╪¬╪¼ ╪Ñ┘ä┘ë ╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è ╪¿┘å╪¼╪º╪¡',
      data: outcome.data,
    });
  } catch (error) {
    console.error('Γ¥î [convertProductToPresentation] Error:', error);
    return res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à┘å╪¬╪¼' });
  }
};

/**
 * ╪¬╪¡┘ê┘è┘ä ╪¼┘à╪º╪╣┘è: ┘â┘ä ┘à┘å╪¬╪¼ ┘à┘å ╪º┘ä┘é╪º╪ª┘à╪⌐ ┘è╪¬╪¡┘ê┘ä ┘ä╪╣╪▒╪╢ ╪¬┘é╪»┘è┘à┘è ╪¬╪º╪¿╪╣ ┘ä┘ä┘à┘å╪¬╪¼ ╪º┘ä┘ç╪»┘ü.
 * ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ╪║┘è╪▒ ╪º┘ä╪╡╪º┘ä╪¡╪⌐ ╪¬┘Å╪¬╪«╪╖┘ë ┘ê╪¬┘Å╪│╪¼┘æ┘ä ┘ü┘è ╪º┘ä╪¬┘é╪▒┘è╪▒ (┘ä╪º ╪¬┘ê┘é┘ü ╪º┘ä╪¿╪º┘é┘è).
 */
const convertBulkProductsToPresentations = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ success: false, message: '╪║┘è╪▒ ┘à╪╡╪▒╪¡ ╪¿╪º┘ä┘ê╪╡┘ê┘ä - ┘à╪╣╪▒┘ü ╪º┘ä╪┤╪▒┘â╪⌐ ┘à╪╖┘ä┘ê╪¿' });
    }

    const { sourceProductIds, targetProductId } = req.body || {};

    if (!Array.isArray(sourceProductIds) || sourceProductIds.length === 0) {
      return res.status(400).json({ success: false, message: '╪º╪«╪¬╪▒ ┘à┘å╪¬╪¼╪º┘ï ┘ê╪º╪¡╪»╪º┘ï ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä ┘ä┘ä╪¬╪¡┘ê┘è┘ä' });
    }

    if (!targetProductId) {
      return res.status(400).json({ success: false, message: '┘à╪╣╪▒┘ü ╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä┘ç╪»┘ü ┘à╪╖┘ä┘ê╪¿' });
    }

    const prisma = getSharedPrismaClient();
    const target = await prisma.product.findFirst({
      where: { id: targetProductId, companyId, deletedAt: null },
      select: { id: true, slug: true },
    });
    if (!target) {
      return res.status(404).json({ success: false, message: '╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä┘ç╪»┘ü ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }

    const uniqueIds = Array.from(new Set(sourceProductIds.map(String)));
    const converted = [];
    const skipped = [];

    for (const sourceId of uniqueIds) {
      if (sourceId === targetProductId) {
        skipped.push({ productId: sourceId, reason: '┘ä╪º ┘è┘à┘â┘å ╪¬╪¡┘ê┘è┘ä ╪º┘ä┘à┘å╪¬╪¼ ╪Ñ┘ä┘ë ┘å┘ü╪│┘ç' });
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
          reason: err?.message || '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪º┘ä╪¬╪¡┘ê┘è┘ä',
        });
      }
    }

    return res.json({
      success: true,
      message: `╪¬┘à ╪¬╪¡┘ê┘è┘ä ${converted.length} ┘à┘å╪¬╪¼ ╪Ñ┘ä┘ë ╪╣╪▒┘ê╪╢ ╪¬┘é╪»┘è┘à┘è╪⌐╪î ┘ê╪¬┘à ╪¬╪«╪╖┘è ${skipped.length}`,
      data: {
        converted,
        skipped,
        convertedCount: converted.length,
        skippedCount: skipped.length,
        targetProductId: target.id,
      },
    });
  } catch (error) {
    console.error('Γ¥î [convertBulkProductsToPresentations] Error:', error);
    return res.status(500).json({ success: false, message: '╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪º┘ä╪¬╪¡┘ê┘è┘ä ╪º┘ä╪¼┘à╪º╪╣┘è' });
  }
};

module.exports = {
  convertProductToPresentation,
  convertBulkProductsToPresentations,
};
