const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
    MERCHANT_WAREHOUSE_TYPE,
    getMerchantWarehouseWhere,
    isMerchantUser,
    requireMerchantAccountForUser
} = require('../utils/merchantAccountScope');

const resolveWarehouseScope = async (req) => {
    const companyId = req.user.companyId || req.user.effectiveCompanyId;

    if (isMerchantUser(req.user)) {
        const merchant = await requireMerchantAccountForUser(req.user);
        return {
            companyId: merchant.companyId,
            merchant,
            isMerchantScope: true,
            where: getMerchantWarehouseWhere(merchant)
        };
    }

    return {
        companyId,
        merchant: null,
        isMerchantScope: false,
        where: { companyId }
    };
};

exports.getWarehouses = async (req, res) => {
    try {
        const scope = await resolveWarehouseScope(req);
        const warehouses = await getSharedPrismaClient().warehouse.findMany({
            where: scope.where,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data: warehouses });
    } catch (error) {
        console.error('Error fetching warehouses:', error);
        res.status(500).json({ success: false, message: 'فشل في جلب المخازن' });
    }
};

exports.createWarehouse = async (req, res) => {
    try {
        const scope = await resolveWarehouseScope(req);
        const { name, location, type, capacity } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'اسم المخزن مطلوب' });
        }

        const warehouse = await getSharedPrismaClient().warehouse.create({
            data: {
                name,
                location,
                type: scope.isMerchantScope ? MERCHANT_WAREHOUSE_TYPE : (type || 'main'),
                capacity: capacity ? parseInt(capacity) : null,
                companyId: scope.companyId,
                merchantId: scope.merchant?.id || null,
            },
        });

        res.status(201).json({ success: true, data: warehouse, message: 'تم إنشاء المخزن بنجاح' });
    } catch (error) {
        console.error('Error creating warehouse:', error);
        res.status(500).json({ success: false, message: 'فشل في إنشاء المخزن' });
    }
};

exports.updateWarehouse = async (req, res) => {
    try {
        const scope = await resolveWarehouseScope(req);
        const { id } = req.params;
        const { name, location, type, capacity, isActive } = req.body;

        const warehouse = await getSharedPrismaClient().warehouse.updateMany({
            where: { id, ...scope.where },
            data: {
                name,
                location,
                type: scope.isMerchantScope ? MERCHANT_WAREHOUSE_TYPE : type,
                capacity: capacity ? parseInt(capacity) : undefined,
                isActive,
            },
        });

        if (warehouse.count === 0) {
            return res.status(404).json({ success: false, message: 'المخزن غير موجود' });
        }

        res.json({ success: true, message: 'تم تحديث المخزن بنجاح' });
    } catch (error) {
        console.error('Error updating warehouse:', error);
        res.status(500).json({ success: false, message: 'فشل في تحديث المخزن' });
    }
};

exports.deleteWarehouse = async (req, res) => {
    try {
        const scope = await resolveWarehouseScope(req);
        const { id } = req.params;

        // Check if warehouse has inventory
        const inventoryCount = await getSharedPrismaClient().inventory.count({
            where: {
                warehouseId: id,
                quantity: { gt: 0 },
                warehouse: scope.where
            }
        });

        if (inventoryCount > 0) {
            return res.status(400).json({
                success: false,
                message: 'لا يمكن حذف المخزن لأنه يحتوي على منتجات. يرجى نقل المخزون أولاً.'
            });
        }

        const warehouse = await getSharedPrismaClient().warehouse.deleteMany({
            where: { id, ...scope.where },
        });

        if (warehouse.count === 0) {
            return res.status(404).json({ success: false, message: 'المخزن غير موجود' });
        }

        res.json({ success: true, message: 'تم حذف المخزن بنجاح' });
    } catch (error) {
        console.error('Error deleting warehouse:', error);
        res.status(500).json({ success: false, message: 'فشل في حذف المخزن' });
    }
};
