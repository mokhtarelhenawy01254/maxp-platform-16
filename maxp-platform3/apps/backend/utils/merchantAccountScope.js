const { getSharedPrismaClient } = require('../services/sharedDatabase');

const MERCHANT_ROLE = 'MERCHANT';
const MERCHANT_WAREHOUSE_TYPE = 'merchant';
const SHARED_COMPANY_WAREHOUSE_TYPE = 'company';

const isMerchantUser = (user) => user?.role === MERCHANT_ROLE;

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

const buildStatusError = (message, statusCode = 403) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const resolveMerchantAccount = async (user, prisma = getSharedPrismaClient()) => {
  if (!isMerchantUser(user)) {
    return null;
  }

  const companyId = user.companyId || user.effectiveCompanyId;
  const email = normalizeEmail(user.email);

  if (!companyId || !email) {
    return null;
  }

  return prisma.merchant.findFirst({
    where: {
      companyId,
      email: {
        equals: email,
        mode: 'insensitive'
      }
    }
  });
};

const requireMerchantAccountForUser = async (
  user,
  prisma = getSharedPrismaClient()
) => {
  const merchant = await resolveMerchantAccount(user, prisma);

  if (!merchant || merchant.isActive === false) {
    throw buildStatusError('حساب التاجر غير مفعل أو غير مرتبط بهذه الشركة', 403);
  }

  return merchant;
};

const ensureMerchantWarehouse = async (
  prisma,
  merchant,
  { preferredWarehouseId } = {}
) => {
  if (!merchant?.id || !merchant.companyId) {
    throw buildStatusError('بيانات التاجر غير مكتملة لإنشاء المخزن', 400);
  }

  const candidateWarehouseId = preferredWarehouseId || merchant.defaultWarehouseId;

  if (candidateWarehouseId) {
    const candidate = await prisma.warehouse.findFirst({
      where: {
        id: candidateWarehouseId,
        companyId: merchant.companyId,
        OR: [
          { merchantId: merchant.id },
          { merchantId: null }
        ]
      }
    });

    if (candidate) {
      const updatedWarehouse = await prisma.warehouse.update({
        where: { id: candidate.id },
        data: {
          merchantId: merchant.id,
          type: MERCHANT_WAREHOUSE_TYPE
        }
      });

      if (merchant.defaultWarehouseId !== updatedWarehouse.id) {
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: { defaultWarehouseId: updatedWarehouse.id }
        });
      }

      return updatedWarehouse;
    }
  }

  const existingOwnedWarehouse = await prisma.warehouse.findFirst({
    where: {
      companyId: merchant.companyId,
      merchantId: merchant.id,
      isActive: true
    },
    orderBy: { createdAt: 'asc' }
  });

  if (existingOwnedWarehouse) {
    if (merchant.defaultWarehouseId !== existingOwnedWarehouse.id) {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { defaultWarehouseId: existingOwnedWarehouse.id }
      });
    }

    return existingOwnedWarehouse;
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      name: `مخزن ${merchant.name}`,
      location: merchant.address || null,
      type: MERCHANT_WAREHOUSE_TYPE,
      companyId: merchant.companyId,
      merchantId: merchant.id,
      isActive: true
    }
  });

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { defaultWarehouseId: warehouse.id }
  });

  return warehouse;
};

const resolveCompanyWarehouseForMerchant = async (
  prisma,
  merchant,
  { preferredWarehouseId } = {}
) => {
  if (!merchant?.id || !merchant.companyId) {
    throw buildStatusError('بيانات التاجر غير مكتملة لتحديد مخزن الشركة', 400);
  }

  const candidateWarehouseId = preferredWarehouseId || merchant.defaultWarehouseId;

  if (candidateWarehouseId) {
    const candidate = await prisma.warehouse.findFirst({
      where: {
        id: candidateWarehouseId,
        companyId: merchant.companyId,
        isActive: true,
        OR: [
          { merchantId: null },
          { merchantId: merchant.id }
        ]
      }
    });

    if (!candidate) {
      throw buildStatusError('مخزن الشركة الافتراضي غير موجود أو غير متاح لهذا التاجر', 400);
    }

    if (merchant.defaultWarehouseId !== candidate.id) {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { defaultWarehouseId: candidate.id }
      });
    }

    return candidate;
  }

  const existingSharedWarehouse = await prisma.warehouse.findFirst({
    where: {
      companyId: merchant.companyId,
      merchantId: null,
      isActive: true
    },
    orderBy: [
      { type: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  if (existingSharedWarehouse) {
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { defaultWarehouseId: existingSharedWarehouse.id }
    });

    return existingSharedWarehouse;
  }

  const warehouse = await prisma.warehouse.create({
    data: {
      name: 'مخزن الشركة للتجار',
      location: merchant.address || null,
      type: SHARED_COMPANY_WAREHOUSE_TYPE,
      companyId: merchant.companyId,
      merchantId: null,
      isActive: true
    }
  });

  await prisma.merchant.update({
    where: { id: merchant.id },
    data: { defaultWarehouseId: warehouse.id }
  });

  return warehouse;
};

const getMerchantWarehouseWhere = (merchant, extra = {}) => ({
  ...extra,
  companyId: merchant.companyId,
  merchantId: merchant.id
});

const getMerchantProductWhere = (merchant, extra = {}) => ({
  ...extra,
  companyId: merchant.companyId,
  merchantProducts: {
    some: {
      merchantId: merchant.id,
      isActive: true
    }
  }
});

const assertMerchantProductAccess = async (
  prisma,
  merchant,
  productId
) => {
  const merchantProduct = await prisma.merchantProduct.findFirst({
    where: {
      merchantId: merchant.id,
      productId,
      isActive: true,
      product: {
        companyId: merchant.companyId,
        deletedAt: null
      }
    },
    select: {
      id: true,
      productId: true
    }
  });

  if (!merchantProduct) {
    throw buildStatusError('غير مصرح لك بالوصول إلى هذا المنتج', 403);
  }

  return merchantProduct;
};

const assertMerchantWarehouseAccess = async (
  prisma,
  merchant,
  warehouseId
) => {
  const warehouse = await prisma.warehouse.findFirst({
    where: {
      id: warehouseId,
      companyId: merchant.companyId,
      merchantId: merchant.id,
      isActive: true
    }
  });

  if (!warehouse) {
    throw buildStatusError('غير مصرح لك باستخدام هذا المخزن', 403);
  }

  return warehouse;
};

const sumMerchantProductAvailableStock = async (prisma, merchant, productId) => {
  const stock = await prisma.inventory.aggregate({
    where: {
      productId,
      warehouse: {
        companyId: merchant.companyId,
        merchantId: merchant.id,
        isActive: true
      }
    },
    _sum: {
      available: true
    }
  });

  return Number(stock._sum.available || 0);
};

const syncMerchantProductStock = async (prisma, merchant, productId) => {
  if (!merchant?.id || !productId) {
    return null;
  }

  const available = await sumMerchantProductAvailableStock(prisma, merchant, productId);

  return prisma.merchantProduct.updateMany({
    where: {
      merchantId: merchant.id,
      productId
    },
    data: {
      stock: available,
      lastSyncedAt: new Date()
    }
  });
};

module.exports = {
  MERCHANT_ROLE,
  MERCHANT_WAREHOUSE_TYPE,
  assertMerchantProductAccess,
  assertMerchantWarehouseAccess,
  buildStatusError,
  ensureMerchantWarehouse,
  resolveCompanyWarehouseForMerchant,
  getMerchantProductWhere,
  getMerchantWarehouseWhere,
  isMerchantUser,
  requireMerchantAccountForUser,
  resolveMerchantAccount,
  syncMerchantProductStock
};
