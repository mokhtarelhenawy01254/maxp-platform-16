const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../utils/verifyToken');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { checkAppAccess } = require('../middleware/checkAppAccess');

const DEFAULT_MINIMUM_ORDER_MESSAGE = 'الحد الأدنى للطلبات هو {amount} جنيه. أضف منتجات بقيمة {remaining} جنيه لإتمام الطلب.';

// Apply authentication middleware to all routes in this router
router.use(authenticateToken);
// Apply invoicing app access check to all routes in this router
router.use(checkAppAccess('order-invoicing'));

const normalizeIncompleteHours = (value) => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 720) {
        return 24;
    }
    return parsed;
};

const parseBooleanSetting = (value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return Boolean(value);
};

// GET /api/v1/order-settings - Get order numbering settings
router.get('/', async (req, res) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is missing from token'
            });
        }

        const prisma = getSharedPrismaClient();

        let settings = await prisma.orderInvoiceSettings.findUnique({
            where: { companyId }
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.orderInvoiceSettings.create({
                data: {
                    companyId,
                    enableSequentialOrders: false,
                    orderPrefix: 'ORD',
                    nextOrderNumber: 1,
                    orderNumberFormat: 'PREFIX-XXXXXX',
                    minimumOrderEnabled: false,
                    minimumOrderAmount: 0,
                    minimumOrderMessage: DEFAULT_MINIMUM_ORDER_MESSAGE
                }
            });
        }

        const orderService = require('../services/orderService');
        const exchangeReturnPolicy = await orderService.getExchangeReturnPolicy(companyId);
        const duplicateSettings = await orderService.getDuplicateSettings(companyId);

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });
        const companySettings = typeof company?.settings === 'string'
            ? JSON.parse(company.settings || '{}')
            : (company?.settings || {});

        const requireDiscountApproval = companySettings.requireDiscountApproval !== undefined
            ? Boolean(companySettings.requireDiscountApproval)
            : true;
        const disableAutoDiscountsWithoutApproval = companySettings.disableAutoDiscountsWithoutApproval !== undefined
            ? Boolean(companySettings.disableAutoDiscountsWithoutApproval)
            : true;

        res.json({
            success: true,
            data: {
                enableSequentialOrders: settings.enableSequentialOrders,
                orderPrefix: settings.orderPrefix,
                nextOrderNumber: settings.nextOrderNumber,
                orderNumberFormat: settings.orderNumberFormat,
                duplicateOrderAction: duplicateSettings.action === 'block' ? 'ignore' : (duplicateSettings.action === 'record_hidden' ? 'hidden' : 'filter'),
                duplicateOrderWindowMinutes: duplicateSettings.windowMinutes || settings.duplicateOrderWindowMinutes || 60,
                duplicateSettings,
                incompleteOrderLostAfterHours: normalizeIncompleteHours(settings.incompleteOrderLostAfterHours),
                showIncompleteCartsInOrders: Boolean(settings.showIncompleteCartsInOrders),
                minimumOrderEnabled: Boolean(settings.minimumOrderEnabled),
                minimumOrderAmount: Number(settings.minimumOrderAmount || 0),
                minimumOrderMessage: settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE,
                requireDiscountApproval,
                disableAutoDiscountsWithoutApproval,
                exchangeReturnPolicy
            }
        });
    } catch (error) {
        console.error('Error fetching order settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order settings',
            error: error.message
        });
    }
});

// PUT /api/v1/order-settings - Update order numbering settings
router.put('/', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const {
            enableSequentialOrders,
            orderPrefix,
            nextOrderNumber,
            orderNumberFormat,
            duplicateOrderAction,
            duplicateOrderWindowMinutes,
            incompleteOrderLostAfterHours,
            showIncompleteCartsInOrders,
            minimumOrderEnabled,
            minimumOrderAmount,
            minimumOrderMessage,
            exchangeReturnPolicy,
            requireDiscountApproval,
            disableAutoDiscountsWithoutApproval,
            duplicateSettings
        } = req.body;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is missing from token'
            });
        }

        const prisma = getSharedPrismaClient();
        const orderService = require('../services/orderService');

        let normalizedDuplicateSettings = null;
        if (duplicateSettings !== undefined) {
            normalizedDuplicateSettings = orderService.normalizeDuplicateSettings(duplicateSettings);
        } else if (duplicateOrderAction !== undefined || duplicateOrderWindowMinutes !== undefined) {
            normalizedDuplicateSettings = orderService.normalizeDuplicateSettings({
                action: duplicateOrderAction === 'ignore' ? 'block' : (duplicateOrderAction === 'hidden' ? 'record_hidden' : 'record_visible'),
                windowMinutes: duplicateOrderWindowMinutes
            });
        }

        // Validate inputs
        if (orderPrefix && orderPrefix.length > 10) {
            return res.status(400).json({
                success: false,
                message: 'Order prefix must be 10 characters or less'
            });
        }

        if (orderPrefix && /[^\x20-\x7E]/.test(orderPrefix)) {
            return res.status(400).json({
                success: false,
                message: 'Order prefix must only contain ASCII characters (English letters, numbers, and symbols). CODE128 barcode format does not support Arabic or special Unicode characters.'
            });
        }

        if (nextOrderNumber && nextOrderNumber < 1) {
            return res.status(400).json({
                success: false,
                message: 'Next order number must be at least 1'
            });
        }

        if (incompleteOrderLostAfterHours !== undefined) {
            const lostHours = parseInt(incompleteOrderLostAfterHours, 10);
            if (Number.isNaN(lostHours) || lostHours < 1 || lostHours > 720) {
                return res.status(400).json({
                    success: false,
                    message: 'مدة تحويل الطلب إلى مفقود يجب أن تكون بين 1 و 720 ساعة'
                });
            }
        }

        const parsedMinimumOrderAmount = minimumOrderAmount !== undefined && minimumOrderAmount !== null && minimumOrderAmount !== ''
            ? Number(minimumOrderAmount)
            : undefined;

        if (
            parsedMinimumOrderAmount !== undefined &&
            (!Number.isFinite(parsedMinimumOrderAmount) || parsedMinimumOrderAmount < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: 'قيمة الحد الأدنى للطلبات يجب أن تكون رقمًا صحيحًا أكبر من أو يساوي صفر'
            });
        }

        const currentSettings = await prisma.orderInvoiceSettings.findUnique({
            where: { companyId }
        });
        const parsedMinimumOrderEnabled = minimumOrderEnabled !== undefined
            ? parseBooleanSetting(minimumOrderEnabled)
            : undefined;
        const resolvedMinimumAmount = parsedMinimumOrderAmount !== undefined
            ? parsedMinimumOrderAmount
            : Number(currentSettings?.minimumOrderAmount || 0);

        if (parsedMinimumOrderEnabled === true && resolvedMinimumAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب إدخال قيمة أكبر من صفر عند تفعيل الحد الأدنى للطلبات'
            });
        }

        // Prepare update data
        const updateData = {};
        if (enableSequentialOrders !== undefined) updateData.enableSequentialOrders = enableSequentialOrders;
        if (orderPrefix) updateData.orderPrefix = orderPrefix;
        if (nextOrderNumber) updateData.nextOrderNumber = nextOrderNumber;
        if (orderNumberFormat) updateData.orderNumberFormat = orderNumberFormat;
        if (normalizedDuplicateSettings) {
            updateData.duplicateOrderWindowMinutes = normalizedDuplicateSettings.windowMinutes || 60;
            updateData.duplicateOrderAction = normalizedDuplicateSettings.action === 'block' ? 'ignore' : (normalizedDuplicateSettings.action === 'record_hidden' ? 'hidden' : 'filter');
        }
        if (incompleteOrderLostAfterHours !== undefined) {
            updateData.incompleteOrderLostAfterHours = parseInt(incompleteOrderLostAfterHours, 10);
        }
        if (showIncompleteCartsInOrders !== undefined) {
            updateData.showIncompleteCartsInOrders = parseBooleanSetting(showIncompleteCartsInOrders);
        }
        if (parsedMinimumOrderEnabled !== undefined) updateData.minimumOrderEnabled = parsedMinimumOrderEnabled;
        if (parsedMinimumOrderAmount !== undefined) updateData.minimumOrderAmount = parsedMinimumOrderAmount;
        if (minimumOrderMessage !== undefined) {
            updateData.minimumOrderMessage = String(minimumOrderMessage).trim() || DEFAULT_MINIMUM_ORDER_MESSAGE;
        }

        // Update or create settings
        const settings = await prisma.orderInvoiceSettings.upsert({
            where: { companyId },
            update: updateData,
            create: {
                companyId,
                enableSequentialOrders: enableSequentialOrders || false,
                orderPrefix: orderPrefix || 'ORD',
                nextOrderNumber: nextOrderNumber || 1,
                orderNumberFormat: orderNumberFormat || 'PREFIX-XXXXXX',
                duplicateOrderAction: 'filter',
                duplicateOrderWindowMinutes: duplicateOrderWindowMinutes ? parseInt(duplicateOrderWindowMinutes, 10) : 60,
                incompleteOrderLostAfterHours: incompleteOrderLostAfterHours !== undefined
                    ? parseInt(incompleteOrderLostAfterHours, 10)
                    : 24,
                showIncompleteCartsInOrders: showIncompleteCartsInOrders !== undefined
                    ? parseBooleanSetting(showIncompleteCartsInOrders)
                    : false,
                minimumOrderEnabled: parsedMinimumOrderEnabled || false,
                minimumOrderAmount: parsedMinimumOrderAmount || 0,
                minimumOrderMessage: minimumOrderMessage
                    ? String(minimumOrderMessage).trim()
                    : DEFAULT_MINIMUM_ORDER_MESSAGE
            }
        });

        // If user wants to apply to past orders, perform bulk update
        if (req.body.applyToPastOrders) {
            const orders = await prisma.order.findMany({
                where: { companyId },
                orderBy: { createdAt: 'asc' }
            });

            if (orders.length > 0) {
                // If sequential is enabled, re-number them all starting from 1
                if (settings.enableSequentialOrders) {
                    let counter = 1;
                    for (const order of orders) {
                        const paddedNumber = counter.toString();
                        const newNumber = `${settings.orderPrefix}-${paddedNumber}`;

                        // We use updateMany with id to avoid individual transaction overhead if possible,
                        // but since we need unique numbers, a loop or a more complex query is needed.
                        // For safety and uniqueness, we update them one by one.
                        await prisma.order.update({
                            where: { id: order.id },
                            data: { orderNumber: newNumber }
                        });
                        counter++;
                    }

                    // Update the next order number in settings to reflect the new state
                    await prisma.orderInvoiceSettings.update({
                        where: { companyId },
                        data: { nextOrderNumber: counter }
                    });

                    settings.nextOrderNumber = counter;
                } else {
                    // If not sequential, just update the prefix part of existing numbers
                    for (const order of orders) {
                        const parts = order.orderNumber.split('-');
                        if (parts.length > 1) {
                            parts[0] = settings.orderPrefix;
                            const newNumber = parts.join('-');
                            await prisma.order.update({
                                where: { id: order.id },
                                data: { orderNumber: newNumber }
                            });
                        }
                    }
                }
            }
        }

        let savedPolicy = null;
        let savedCompanySettings = null;
        if (
            exchangeReturnPolicy !== undefined ||
            requireDiscountApproval !== undefined ||
            disableAutoDiscountsWithoutApproval !== undefined ||
            normalizedDuplicateSettings !== null
        ) {
            try {
                const company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { settings: true }
                });
                const companySettings = typeof company?.settings === 'string'
                    ? JSON.parse(company.settings || '{}')
                    : (company?.settings || {});

                if (exchangeReturnPolicy !== undefined) {
                    savedPolicy = {
                        requirePreviousOrder: parseBooleanSetting(exchangeReturnPolicy.requirePreviousOrder),
                        allowedStatuses: Array.isArray(exchangeReturnPolicy.allowedStatuses) && exchangeReturnPolicy.allowedStatuses.length > 0
                            ? exchangeReturnPolicy.allowedStatuses
                            : ['DELIVERED'],
                        timeLimitDays: Number.isFinite(Number(exchangeReturnPolicy.timeLimitDays))
                            ? Number(exchangeReturnPolicy.timeLimitDays)
                            : 14,
                        requireExplicitOrderLink: parseBooleanSetting(exchangeReturnPolicy.requireExplicitOrderLink)
                    };
                    companySettings.exchangeReturnPolicy = savedPolicy;
                }

                if (requireDiscountApproval !== undefined) {
                    companySettings.requireDiscountApproval = parseBooleanSetting(requireDiscountApproval);
                }
                if (disableAutoDiscountsWithoutApproval !== undefined) {
                    companySettings.disableAutoDiscountsWithoutApproval = parseBooleanSetting(disableAutoDiscountsWithoutApproval);
                }
                if (normalizedDuplicateSettings !== null) {
                    companySettings.duplicateOrderSettings = normalizedDuplicateSettings;
                }

                await prisma.company.update({
                    where: { id: companyId },
                    data: { settings: JSON.stringify(companySettings) }
                });
                savedCompanySettings = companySettings;
            } catch (policyErr) {
                console.warn('⚠️ [COMPANY-SETTINGS] Error saving settings:', policyErr.message);
            }
        }

        if (!savedPolicy) {
            const orderService = require('../services/orderService');
            savedPolicy = await orderService.getExchangeReturnPolicy(companyId);
        }

        if (!savedCompanySettings) {
            try {
                const company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { settings: true }
                });
                savedCompanySettings = typeof company?.settings === 'string'
                    ? JSON.parse(company.settings || '{}')
                    : (company?.settings || {});
            } catch (_) {}
        }

        const effectiveRequireDiscountApproval = savedCompanySettings?.requireDiscountApproval !== undefined
            ? Boolean(savedCompanySettings.requireDiscountApproval)
            : true;
        const effectiveDisableAutoDiscounts = savedCompanySettings?.disableAutoDiscountsWithoutApproval !== undefined
            ? Boolean(savedCompanySettings.disableAutoDiscountsWithoutApproval)
            : true;
        const effectiveDuplicateSettings = normalizedDuplicateSettings || (await orderService.getDuplicateSettings(companyId));

        res.json({
            success: true,
            message: req.body.applyToPastOrders
                ? 'Order settings updated and all existing orders re-numbered successfully'
                : 'Order settings updated successfully (applied to future orders only)',
            data: {
                enableSequentialOrders: settings.enableSequentialOrders,
                orderPrefix: settings.orderPrefix,
                nextOrderNumber: settings.nextOrderNumber,
                orderNumberFormat: settings.orderNumberFormat,
                duplicateOrderAction: effectiveDuplicateSettings.action === 'block' ? 'ignore' : (effectiveDuplicateSettings.action === 'record_hidden' ? 'hidden' : 'filter'),
                duplicateOrderWindowMinutes: effectiveDuplicateSettings.windowMinutes || settings.duplicateOrderWindowMinutes || 60,
                duplicateSettings: effectiveDuplicateSettings,
                incompleteOrderLostAfterHours: normalizeIncompleteHours(settings.incompleteOrderLostAfterHours),
                showIncompleteCartsInOrders: Boolean(settings.showIncompleteCartsInOrders),
                minimumOrderEnabled: Boolean(settings.minimumOrderEnabled),
                minimumOrderAmount: Number(settings.minimumOrderAmount || 0),
                minimumOrderMessage: settings.minimumOrderMessage || DEFAULT_MINIMUM_ORDER_MESSAGE,
                requireDiscountApproval: effectiveRequireDiscountApproval,
                disableAutoDiscountsWithoutApproval: effectiveDisableAutoDiscounts,
                exchangeReturnPolicy: savedPolicy
            }
        });
    } catch (error) {
        console.error('Error updating order settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order settings',
            error: error.message
        });
    }
});

// POST /api/v1/order-settings/reset-counter - Reset order counter
router.post('/reset-counter', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        const { newStartNumber } = req.body;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'Company ID is missing from token'
            });
        }

        if (!newStartNumber || newStartNumber < 1) {
            return res.status(400).json({
                success: false,
                message: 'New start number must be at least 1'
            });
        }

        const prisma = getSharedPrismaClient();

        const settings = await prisma.orderInvoiceSettings.update({
            where: { companyId },
            data: { nextOrderNumber: newStartNumber }
        });

        res.json({
            success: true,
            message: `Order counter reset to ${newStartNumber}`,
            data: {
                nextOrderNumber: settings.nextOrderNumber
            }
        });
    } catch (error) {
        console.error('Error resetting order counter:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset order counter',
            error: error.message
        });
    }
});

// GET /api/v1/order-settings/duplicates - Get duplicate order settings
router.get('/duplicates', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is missing from token' });
        }
        const orderService = require('../services/orderService');
        const data = await orderService.getDuplicateSettings(companyId);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching duplicate order settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch duplicate order settings', error: error.message });
    }
});

// PUT /api/v1/order-settings/duplicates - Update duplicate order settings
router.put('/duplicates', async (req, res) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(403).json({ success: false, message: 'Company ID is missing from token' });
        }
        const orderService = require('../services/orderService');
        const prisma = getSharedPrismaClient();
        const normalized = orderService.normalizeDuplicateSettings(req.body);

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { settings: true }
        });
        const companySettings = typeof company?.settings === 'string'
            ? JSON.parse(company.settings || '{}')
            : (company?.settings || {});

        companySettings.duplicateOrderSettings = normalized;

        await prisma.company.update({
            where: { id: companyId },
            data: { settings: JSON.stringify(companySettings) }
        });

        await prisma.orderInvoiceSettings.upsert({
            where: { companyId },
            update: {
                duplicateOrderWindowMinutes: normalized.windowMinutes || 60,
                duplicateOrderAction: normalized.action === 'block' ? 'ignore' : (normalized.action === 'record_hidden' ? 'hidden' : 'filter')
            },
            create: {
                companyId,
                duplicateOrderWindowMinutes: normalized.windowMinutes || 60,
                duplicateOrderAction: normalized.action === 'block' ? 'ignore' : (normalized.action === 'record_hidden' ? 'hidden' : 'filter')
            }
        });

        res.json({
            success: true,
            message: 'تم حفظ إعدادات الطلبات المكررة بنجاح',
            data: normalized
        });
    } catch (error) {
        console.error('Error updating duplicate order settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update duplicate order settings', error: error.message });
    }
});

module.exports = router;
