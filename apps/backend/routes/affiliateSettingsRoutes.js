const express = require('express');
const router = express.Router();
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const verifyToken = require("../utils/verifyToken");

// Middleware to ensure user is agent/admin
router.use(verifyToken.authenticateToken);

const canManageAffiliateSettings = (userRole) =>
    ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole);

const VALID_COMMISSION_TYPES = new Set(['PERCENTAGE', 'MARKUP']);
const VALID_PLATFORM_MARGIN_TYPES = new Set(['FIXED', 'PERCENTAGE']);
const AFFILIATE_REQUIRED_APP_SLUGS = [
    'affiliate-pro',
    'order-core',
    'inventory-pro',
    'ecommerce-basic'
];

const parseBoundedNumber = (value, { fallback, min, max, label }) => {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : fallback;
    if (parsed < min || parsed > max) {
        throw new Error(`${label} يجب أن تكون بين ${min} و ${max}`);
    }
    return parsed;
};

const normalizeEnum = (value, validValues, fallback, label) => {
    const normalized = String(value || fallback).toUpperCase();
    if (!validValues.has(normalized)) {
        throw new Error(`${label} غير صالح`);
    }
    return normalized;
};

const parseOptionalBoolean = (value, fallback, label) => {
    if (value === undefined || value === null) {
        return fallback;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }

    throw new Error(`${label} يجب أن تكون true أو false`);
};

const ensureAffiliateRequiredApps = async (prisma, companyId, isActive) => {
    if (!isActive || !prisma.marketplaceApp?.findMany || !prisma.companyApp?.upsert) {
        return [];
    }

    const apps = await prisma.marketplaceApp.findMany({
        where: {
            slug: {
                in: AFFILIATE_REQUIRED_APP_SLUGS
            }
        },
        select: {
            id: true,
            slug: true
        }
    });

    await Promise.all(
        apps.map((app) =>
            prisma.companyApp.upsert({
                where: {
                    companyId_appId: {
                        companyId,
                        appId: app.id
                    }
                },
                update: {
                    status: 'ACTIVE'
                },
                create: {
                    companyId,
                    appId: app.id,
                    status: 'ACTIVE',
                    settings: {
                        installedBy: 'affiliate-settings',
                        reason: 'affiliate-program-core-tools'
                    }
                }
            })
        )
    );

    return apps.map((app) => app.slug);
};

/**
 * GET /affiliates/settings
 * Fetch affiliate program settings for the current company
 */
router.get('/', async (req, res) => {
    try {
        if (!canManageAffiliateSettings(req.user?.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لإدارة إعدادات برنامج المسوقين'
            });
        }

        const prisma = getSharedPrismaClient();
        const companyId = req.user.companyId;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company' });
        }

        let settings = await prisma.affiliateSetting.findUnique({
            where: { companyId }
        });

        // If no settings exist, return defaults (or create them)
        if (!settings) {
            settings = {
                commissionType: 'PERCENTAGE',
                commissionRate: 5.0,
                cookieDuration: 30,
                termsAndConditions: '',
                isActive: true,
                autoApproveAffiliates: false,
                defaultMinPayout: 100,
                defaultCanCreateOrdersForOthers: true,
                defaultCanViewCustomerData: true,
                requireIdentityDocument: false,
                identityDocumentLabel: 'مستند إثبات الهوية',
                payoutSlaDays: 3,
                platformMarginType: 'FIXED',
                platformMarginValue: 0
            };
        }

        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching affiliate settings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
});

/**
 * PUT /affiliates/settings
 * Update affiliate program settings
 */
router.put('/', async (req, res) => {
    try {
        if (!canManageAffiliateSettings(req.user?.role)) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لإدارة إعدادات برنامج المسوقين'
            });
        }

        const prisma = getSharedPrismaClient();
        const companyId = req.user.companyId;
        const {
            commissionType,
            commissionRate,
            cookieDuration,
            termsAndConditions,
            isActive,
            autoApproveAffiliates,
            defaultMinPayout,
            defaultCanCreateOrdersForOthers,
            defaultCanViewCustomerData,
            requireIdentityDocument,
            identityDocumentLabel,
            payoutSlaDays,
            platformMarginType,
            platformMarginValue
        } = req.body;

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'User does not belong to a company' });
        }

        const normalizedCommissionType = normalizeEnum(
            commissionType,
            VALID_COMMISSION_TYPES,
            'PERCENTAGE',
            'نوع العمولة',
        );
        const normalizedPlatformMarginType = normalizeEnum(
            platformMarginType,
            VALID_PLATFORM_MARGIN_TYPES,
            'FIXED',
            'نوع هامش المنصة',
        );
        const parsedCommissionRate = parseBoundedNumber(commissionRate, {
            fallback: 5,
            min: 0,
            max: normalizedCommissionType === 'PERCENTAGE' ? 100 : 1000000,
            label: 'قيمة العمولة',
        });
        const parsedCookieDuration = parseBoundedNumber(cookieDuration, {
            fallback: 30,
            min: 1,
            max: 365,
            label: 'مدة الكوكيز',
        });
        const parsedPlatformMarginValue = parseBoundedNumber(platformMarginValue, {
            fallback: 0,
            min: 0,
            max: normalizedPlatformMarginType === 'PERCENTAGE' ? 1000 : 1000000,
            label: 'قيمة ربح المنصة',
        });
        const parsedDefaultMinPayout = parseBoundedNumber(defaultMinPayout, {
            fallback: 100,
            min: 0,
            max: 1000000,
            label: 'الحد الأدنى الافتراضي للسحب',
        });
        const parsedPayoutSlaDays = parseBoundedNumber(payoutSlaDays, {
            fallback: 3,
            min: 1,
            max: 60,
            label: 'مدة معالجة السحب',
        });
        if (!Number.isInteger(parsedPayoutSlaDays)) {
            throw new Error('مدة معالجة السحب يجب أن تكون رقمًا صحيحًا');
        }
        const normalizedIsActive = parseOptionalBoolean(
            isActive,
            true,
            'حالة نظام المسوقين',
        );
        const normalizedAutoApproveAffiliates = parseOptionalBoolean(
            autoApproveAffiliates,
            false,
            'التفعيل التلقائي للمسوقين',
        );
        const normalizedDefaultCanCreateOrdersForOthers = parseOptionalBoolean(
            defaultCanCreateOrdersForOthers,
            true,
            'صلاحية إنشاء الطلبات المباشرة',
        );
        const normalizedDefaultCanViewCustomerData = parseOptionalBoolean(
            defaultCanViewCustomerData,
            true,
            'صلاحية عرض بيانات العملاء',
        );
        const normalizedRequireIdentityDocument = parseOptionalBoolean(
            requireIdentityDocument,
            false,
            'إلزام مستند الاعتماد',
        );
        const normalizedIdentityDocumentLabel =
            typeof identityDocumentLabel === 'string' && identityDocumentLabel.trim()
                ? identityDocumentLabel.trim()
                : 'مستند إثبات الهوية';
        if (normalizedRequireIdentityDocument && normalizedIdentityDocumentLabel.length < 3) {
            throw new Error('اسم مستند الاعتماد يجب أن يحتوي على 3 أحرف على الأقل');
        }

        // Upsert settings
        const settings = await prisma.affiliateSetting.upsert({
            where: { companyId },
            update: {
                commissionType: normalizedCommissionType,
                commissionRate: parsedCommissionRate,
                cookieDuration: parsedCookieDuration,
                termsAndConditions,
                isActive: normalizedIsActive,
                autoApproveAffiliates: normalizedAutoApproveAffiliates,
                defaultMinPayout: parsedDefaultMinPayout,
                defaultCanCreateOrdersForOthers:
                    normalizedDefaultCanCreateOrdersForOthers,
                defaultCanViewCustomerData:
                    normalizedDefaultCanViewCustomerData,
                requireIdentityDocument: normalizedRequireIdentityDocument,
                identityDocumentLabel: normalizedIdentityDocumentLabel,
                payoutSlaDays: parsedPayoutSlaDays,
                platformMarginType: normalizedPlatformMarginType,
                platformMarginValue: parsedPlatformMarginValue
            },
            create: {
                companyId,
                commissionType: normalizedCommissionType,
                commissionRate: parsedCommissionRate,
                cookieDuration: parsedCookieDuration,
                termsAndConditions,
                isActive: normalizedIsActive,
                autoApproveAffiliates: normalizedAutoApproveAffiliates,
                defaultMinPayout: parsedDefaultMinPayout,
                defaultCanCreateOrdersForOthers:
                    normalizedDefaultCanCreateOrdersForOthers,
                defaultCanViewCustomerData:
                    normalizedDefaultCanViewCustomerData,
                requireIdentityDocument: normalizedRequireIdentityDocument,
                identityDocumentLabel: normalizedIdentityDocumentLabel,
                payoutSlaDays: parsedPayoutSlaDays,
                platformMarginType: normalizedPlatformMarginType,
                platformMarginValue: parsedPlatformMarginValue
            }
        });

        const enabledCoreApps = await ensureAffiliateRequiredApps(
            prisma,
            companyId,
            normalizedIsActive,
        );

        let recalculatedProducts = 0;
        if (prisma.merchantProduct?.findMany) {
            try {
                const merchantService = require('../services/merchantService');
                const affectedProducts = await prisma.merchantProduct.findMany({
                    where: {
                        isActive: true,
                        syncEnabled: true,
                        merchant: { companyId }
                    },
                    select: { productId: true },
                    distinct: ['productId']
                });

                await Promise.all(
                    affectedProducts.map(({ productId }) =>
                        merchantService.updateProductDropshippingPrice(productId),
                    ),
                );
                recalculatedProducts = affectedProducts.length;
            } catch (repriceError) {
                console.error('Error recalculating dropshipping prices after affiliate settings update:', repriceError);
            }
        }

        res.json({
            success: true,
            message: 'Settings updated successfully',
            data: settings,
            enabledCoreApps,
            recalculatedProducts
        });
    } catch (error) {
        const isValidationError = /غير صالح|يجب أن تكون/.test(error.message || '');
        if (!isValidationError) {
            console.error('Error updating affiliate settings:', error);
        }
        res.status(isValidationError ? 400 : 500).json({
            success: false,
            message: isValidationError ? error.message : 'Failed to update settings'
        });
    }
});

module.exports = router;
