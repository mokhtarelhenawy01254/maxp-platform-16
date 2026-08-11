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

    const source = await prisma.product.findFirst({
      where: { id, companyId, deletedAt: null },
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
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
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
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    if (source.id === target.id) {
      return res.status(400).json({ success: false, message: 'لا يمكن تحويل المنتج إلى نفسه' });
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
        const merchantUser = isMerchantUser(req.user);
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
              const merchant = await requireMerchantAccountForUser(req.user, tx);
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

    return res.json({
      success: true,
      message: 'تم تحويل المنتج إلى عرض تقديمي بنجاح',
      data: {
        presentation: buildPresentationResponse(result.presentation),
        targetProductId: target.id,
        presentationSlug: presentationPath,
        movedOrderItems: result.movedOrderItems,
        mergedStock: result.mergedStock,
      },
    });
  } catch (error) {
    console.error('❌ [convertProductToPresentation] Error:', error);
    return res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحويل المنتج' });
  }
};

module.exports = {
  convertProductToPresentation,
};
