const { randomUUID } = require('crypto');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const {
  buildMetadataWithVolumeDiscounts,
  getVolumeDiscountsFromMetadata,
  normalizeVolumeDiscount,
} = require('../utils/volumeDiscountUtils');

const getScopedProduct = async (companyId, productId) => {
  const prisma = await getSharedPrismaClientAsync();
  return prisma.product.findFirst({
    where: {
      id: productId,
      companyId,
    },
    select: {
      id: true,
      metadata: true,
    },
  });
};

const validateDiscountPayload = (body, existingId = null) => {
  const discount = normalizeVolumeDiscount(
    {
      ...body,
      id: existingId || body?.id || randomUUID(),
    },
    0,
  );

  if (!discount) {
    return {
      error:
        'Invalid volume discount payload. Check min quantity, max quantity, and discount value.',
    };
  }

  return { discount };
};

const getVolumeDiscounts = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب',
      });
    }

    const product = await getScopedProduct(companyId, req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود',
      });
    }

    return res.json({
      success: true,
      data: getVolumeDiscountsFromMetadata(product.metadata, { activeOnly: false }),
    });
  } catch (error) {
    console.error('❌ [VOLUME-DISCOUNTS] Failed to load discounts:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في جلب خصومات الكميات',
      error: error.message,
    });
  }
};

const createVolumeDiscount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب',
      });
    }

    const product = await getScopedProduct(companyId, req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود',
      });
    }

    const { discount, error } = validateDiscountPayload(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const existingDiscounts = getVolumeDiscountsFromMetadata(product.metadata, {
      activeOnly: false,
    });
    const nextDiscounts = [...existingDiscounts, discount];
    const prisma = await getSharedPrismaClientAsync();

    await prisma.product.update({
      where: { id: product.id },
      data: {
        metadata: buildMetadataWithVolumeDiscounts(product.metadata, nextDiscounts),
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      data: discount,
      message: 'تم إضافة خصم الكمية بنجاح',
    });
  } catch (error) {
    console.error('❌ [VOLUME-DISCOUNTS] Failed to create discount:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في إضافة خصم الكمية',
      error: error.message,
    });
  }
};

const updateVolumeDiscount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب',
      });
    }

    const product = await getScopedProduct(companyId, req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود',
      });
    }

    const existingDiscounts = getVolumeDiscountsFromMetadata(product.metadata, {
      activeOnly: false,
    });
    const targetDiscount = existingDiscounts.find(
      (discount) => discount.id === req.params.discountId,
    );

    if (!targetDiscount) {
      return res.status(404).json({
        success: false,
        message: 'خصم الكمية غير موجود',
      });
    }

    const { discount, error } = validateDiscountPayload(req.body, targetDiscount.id);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const nextDiscounts = existingDiscounts.map((existingDiscount) =>
      existingDiscount.id === targetDiscount.id ? discount : existingDiscount,
    );
    const prisma = await getSharedPrismaClientAsync();

    await prisma.product.update({
      where: { id: product.id },
      data: {
        metadata: buildMetadataWithVolumeDiscounts(product.metadata, nextDiscounts),
        updatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      data: discount,
      message: 'تم تحديث خصم الكمية بنجاح',
    });
  } catch (error) {
    console.error('❌ [VOLUME-DISCOUNTS] Failed to update discount:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في تحديث خصم الكمية',
      error: error.message,
    });
  }
};

const deleteVolumeDiscount = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح بالوصول - معرف الشركة مطلوب',
      });
    }

    const product = await getScopedProduct(companyId, req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'المنتج غير موجود',
      });
    }

    const existingDiscounts = getVolumeDiscountsFromMetadata(product.metadata, {
      activeOnly: false,
    });
    const nextDiscounts = existingDiscounts.filter(
      (discount) => discount.id !== req.params.discountId,
    );

    if (nextDiscounts.length === existingDiscounts.length) {
      return res.status(404).json({
        success: false,
        message: 'خصم الكمية غير موجود',
      });
    }

    const prisma = await getSharedPrismaClientAsync();
    await prisma.product.update({
      where: { id: product.id },
      data: {
        metadata: buildMetadataWithVolumeDiscounts(product.metadata, nextDiscounts),
        updatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: 'تم حذف خصم الكمية بنجاح',
    });
  } catch (error) {
    console.error('❌ [VOLUME-DISCOUNTS] Failed to delete discount:', error);
    return res.status(500).json({
      success: false,
      message: 'فشل في حذف خصم الكمية',
      error: error.message,
    });
  }
};

module.exports = {
  createVolumeDiscount,
  deleteVolumeDiscount,
  getVolumeDiscounts,
  updateVolumeDiscount,
};
