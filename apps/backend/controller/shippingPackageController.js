/**
 * Shipping Client Pricing Package Controller (SHIP-W14)
 * Handles monthly volume packages CRUD and package quotes
 */

const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { quotePrice, parseList } = require('../services/shipping/policyService');

/**
 * Helper to serialize array/list fields to JSON string
 */
function serializeList(val) {
  if (!val) return null;
  if (Array.isArray(val)) return JSON.stringify(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed;
    const items = trimmed.split(/[,،]+/).map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(items);
  }
  return null;
}

/**
 * Format package item for API responses
 */
function formatPackage(pkg, merchant = null) {
  return {
    id: pkg.id,
    companyId: pkg.companyId,
    merchantId: pkg.merchantId,
    name: pkg.name,
    monthlyVolumeFrom: pkg.monthlyVolumeFrom || 0,
    monthlyVolumeTo: pkg.monthlyVolumeTo !== null && pkg.monthlyVolumeTo !== undefined ? Number(pkg.monthlyVolumeTo) : null,
    pricingMode: pkg.pricingMode || 'PER_SHIPMENT',
    flatMonthlyPrice: pkg.flatMonthlyPrice !== null && pkg.flatMonthlyPrice !== undefined ? Number(pkg.flatMonthlyPrice) : null,
    perShipmentPrice: pkg.perShipmentPrice !== null && pkg.perShipmentPrice !== undefined ? Number(pkg.perShipmentPrice) : null,
    coverageMode: pkg.coverageMode || 'BOTH',
    governorates: pkg.governorates || null,
    cities: pkg.cities || null,
    governoratesList: parseList(pkg.governorates),
    citiesList: parseList(pkg.cities),
    overagePricePerShipment: pkg.overagePricePerShipment !== null && pkg.overagePricePerShipment !== undefined ? Number(pkg.overagePricePerShipment) : null,
    isActive: Boolean(pkg.isActive),
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
    merchant: merchant || (pkg.merchant ? { id: pkg.merchant.id, name: pkg.merchant.name, email: pkg.merchant.email } : null),
  };
}

/**
 * GET /api/v1/shipping-portal/packages
 */
async function listPackages(req, res) {
  try {
    const { companyId } = req.user;
    const { merchantId, isActive } = req.query;
    const prisma = getSharedPrismaClient();

    const where = { companyId };
    if (merchantId) where.merchantId = merchantId;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

    const packages = await prisma.clientPricingPackage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Also get merchants for names
    const merchantIds = [...new Set(packages.map((p) => p.merchantId))];
    const merchants = await prisma.merchant.findMany({
      where: { id: { in: merchantIds }, companyId },
      select: { id: true, name: true, email: true },
    });
    const merchantMap = new Map(merchants.map((m) => [m.id, m]));

    const formatted = packages.map((p) => formatPackage(p, merchantMap.get(p.merchantId)));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('[ShippingPackageController] listPackages error:', error);
    return res.status(500).json({ success: false, error: 'تعذر جلب باقات الأسعار' });
  }
}

/**
 * GET /api/v1/shipping-portal/packages/:id
 */
async function getPackageById(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const pkg = await prisma.clientPricingPackage.findFirst({
      where: { id, companyId },
    });

    if (!pkg) {
      return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });
    }

    const merchant = await prisma.merchant.findFirst({
      where: { id: pkg.merchantId, companyId },
      select: { id: true, name: true, email: true },
    });

    return res.json({
      success: true,
      data: formatPackage(pkg, merchant),
    });
  } catch (error) {
    console.error('[ShippingPackageController] getPackageById error:', error);
    return res.status(500).json({ success: false, error: 'تعذر جلب بيانات الباقة' });
  }
}

/**
 * POST /api/v1/shipping-portal/packages
 */
async function createPackage(req, res) {
  try {
    const { companyId } = req.user;
    const {
      merchantId,
      name,
      monthlyVolumeFrom = 0,
      monthlyVolumeTo = null,
      pricingMode = 'PER_SHIPMENT',
      flatMonthlyPrice = null,
      perShipmentPrice = null,
      coverageMode = 'BOTH',
      governorates = null,
      cities = null,
      overagePricePerShipment = null,
      isActive = true,
    } = req.body || {};

    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'العميل/التاجر مطلوب لإنشاء الباقة' });
    }
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'اسم الباقة مطلوب' });
    }

    const validModes = ['PACKAGE_FLAT', 'PER_SHIPMENT'];
    if (!validModes.includes(pricingMode)) {
      return res.status(400).json({ success: false, error: 'نوع التسعير غير صالح (PACKAGE_FLAT أو PER_SHIPMENT)' });
    }

    const validCoverage = ['GOVERNORATES', 'CITIES', 'BOTH'];
    if (!validCoverage.includes(coverageMode)) {
      return res.status(400).json({ success: false, error: 'نوع التغطية غير صالح (GOVERNORATES أو CITIES أو BOTH)' });
    }

    const prisma = getSharedPrismaClient();

    // Verify merchant belongs to company
    const merchant = await prisma.merchant.findFirst({
      where: { id: merchantId, companyId },
    });
    if (!merchant) {
      return res.status(400).json({ success: false, error: 'العميل/التاجر غير موجود أو لا يتبع هذه الشركة' });
    }

    const created = await prisma.clientPricingPackage.create({
      data: {
        companyId,
        merchantId,
        name: String(name).trim(),
        monthlyVolumeFrom: Math.max(0, parseInt(monthlyVolumeFrom, 10) || 0),
        monthlyVolumeTo: monthlyVolumeTo !== null && monthlyVolumeTo !== undefined && monthlyVolumeTo !== ''
          ? Math.max(1, parseInt(monthlyVolumeTo, 10))
          : null,
        pricingMode,
        flatMonthlyPrice: flatMonthlyPrice !== null && flatMonthlyPrice !== undefined && flatMonthlyPrice !== ''
          ? Number(flatMonthlyPrice)
          : null,
        perShipmentPrice: perShipmentPrice !== null && perShipmentPrice !== undefined && perShipmentPrice !== ''
          ? Number(perShipmentPrice)
          : null,
        coverageMode,
        governorates: serializeList(governorates),
        cities: serializeList(cities),
        overagePricePerShipment: overagePricePerShipment !== null && overagePricePerShipment !== undefined && overagePricePerShipment !== ''
          ? Number(overagePricePerShipment)
          : null,
        isActive: isActive !== false,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء باقة العميل بنجاح',
      data: formatPackage(created, merchant),
    });
  } catch (error) {
    console.error('[ShippingPackageController] createPackage error:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء إنشاء الباقة' });
  }
}

/**
 * PUT /api/v1/shipping-portal/packages/:id
 */
async function updatePackage(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.clientPricingPackage.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });
    }

    const {
      name,
      monthlyVolumeFrom,
      monthlyVolumeTo,
      pricingMode,
      flatMonthlyPrice,
      perShipmentPrice,
      coverageMode,
      governorates,
      cities,
      overagePricePerShipment,
      isActive,
    } = req.body || {};

    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (monthlyVolumeFrom !== undefined) data.monthlyVolumeFrom = Math.max(0, parseInt(monthlyVolumeFrom, 10) || 0);
    if (monthlyVolumeTo !== undefined) {
      data.monthlyVolumeTo = monthlyVolumeTo !== null && monthlyVolumeTo !== ''
        ? Math.max(1, parseInt(monthlyVolumeTo, 10))
        : null;
    }
    if (pricingMode !== undefined) data.pricingMode = pricingMode;
    if (flatMonthlyPrice !== undefined) {
      data.flatMonthlyPrice = flatMonthlyPrice !== null && flatMonthlyPrice !== '' ? Number(flatMonthlyPrice) : null;
    }
    if (perShipmentPrice !== undefined) {
      data.perShipmentPrice = perShipmentPrice !== null && perShipmentPrice !== '' ? Number(perShipmentPrice) : null;
    }
    if (coverageMode !== undefined) data.coverageMode = coverageMode;
    if (governorates !== undefined) data.governorates = serializeList(governorates);
    if (cities !== undefined) data.cities = serializeList(cities);
    if (overagePricePerShipment !== undefined) {
      data.overagePricePerShipment = overagePricePerShipment !== null && overagePricePerShipment !== ''
        ? Number(overagePricePerShipment)
        : null;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.clientPricingPackage.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      message: 'تم تحديث الباقة بنجاح',
      data: formatPackage(updated),
    });
  } catch (error) {
    console.error('[ShippingPackageController] updatePackage error:', error);
    return res.status(500).json({ success: false, error: error.message || 'حدث خطأ أثناء تحديث الباقة' });
  }
}

/**
 * DELETE /api/v1/shipping-portal/packages/:id
 */
async function deletePackage(req, res) {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const prisma = getSharedPrismaClient();

    const existing = await prisma.clientPricingPackage.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'الباقة غير موجودة' });
    }

    await prisma.clientPricingPackage.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'تم حذف الباقة بنجاح',
    });
  } catch (error) {
    console.error('[ShippingPackageController] deletePackage error:', error);
    return res.status(500).json({ success: false, error: 'تعذر حذف الباقة' });
  }
}

/**
 * GET /api/v1/shipping-portal/packages/quote?merchantId&city&governorate&weightKg&codAmount
 */
async function getPackageQuote(req, res) {
  try {
    const { companyId } = req.user;
    const { merchantId, city, governorate, weightKg, codAmount } = req.query;

    if (!merchantId) {
      return res.status(400).json({ success: false, error: 'معرف التاجر/العميل مطلوب' });
    }

    const prisma = getSharedPrismaClient();

    const quote = await quotePrice({
      companyId,
      merchantId,
      governorate: governorate || city || '',
      city: city || null,
      destinationCity: city || null,
      weightKg: weightKg ? Number(weightKg) : 1,
      codAmount: codAmount ? Number(codAmount) : 0,
      prisma,
    });

    return res.json({
      success: true,
      data: quote,
    });
  } catch (error) {
    console.error('[ShippingPackageController] getPackageQuote error:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: error.message || 'تعذر احتساب سعر الشحن للباقة',
    });
  }
}

module.exports = {
  listPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  getPackageQuote,
  formatPackage,
};
