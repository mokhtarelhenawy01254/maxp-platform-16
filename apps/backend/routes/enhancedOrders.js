const express = require('express');
const router = express.Router();
const EnhancedOrderService = require('../services/enhancedOrderService');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const { isProductVisibleToAffiliate } = require('../utils/affiliateProductVisibility');
const { isMerchantUser } = require('../utils/merchantAccountScope');
const customerBlocklistService = require('../services/customerBlocklistService');

// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

const verifyToken = require("../utils/verifyToken");
const { checkAppAccess } = require('../middleware/checkAppAccess');

const DEFAULT_MIGRATION_COMPANY_ID = 'cmdt8nrjq003vufuss47dqc45';
const { EGYPT_TIMEZONE } = require('../utils/dateUtils');

const _companyTimezoneCache = new Map();
const getCompanyTimezone = async (companyId) => {
  if (!companyId) return EGYPT_TIMEZONE;
  const cached = _companyTimezoneCache.get(companyId);
  if (cached && (Date.now() - cached.cachedAt < 5 * 60 * 1000)) {
    return cached.timezone;
  }
  try {
    const comp = await getSharedPrismaClient().company.findUnique({
      where: { id: companyId },
      select: { timezone: true }
    });
    const tz = comp?.timezone || EGYPT_TIMEZONE;
    _companyTimezoneCache.set(companyId, { timezone: tz, cachedAt: Date.now() });
    return tz;
  } catch (err) {
    return EGYPT_TIMEZONE;
  }
};

// أداة الطلب اليدوي (اشتراك): هي الوحيدة اللي تحدد انتهاء الاشتراك والتعليق
const MANUAL_ORDER_APP_SLUGS = ['manual-orders-pro', 'store-pro'];
const MANUAL_ORDER_ACTIVE_STATUSES = ['TRIAL', 'ACTIVE'];

/**
 * فحص وصول إنشاء الطلب اليدوي (الخيار 2):
 * - لا يوجد سجل اشتراك للأداة أصلًا → 403 (مقفول).
 * - يوجد سجل بحالة TRIAL/ACTIVE → يسمح ويُكمل عادي.
 * - يوجد سجل لكن منتهي/معلّق/ملغي → يسمح بالإنشاء ويضع علامة
 *   req.manualSubscriptionExpired لتُعلَّق الأوردرات الجديدة (مخفية + ماسكة).
 */
const manualOrderAccess = async (req, res, next) => {
  try {
    if (req.user?.role === 'SUPER_ADMIN') return next();

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    const prisma = getSharedPrismaClient();

    // 🌟 For AFFILIATE users: Order creation is governed by the Affiliate program (affiliate-pro or manual-orders-pro)
    if (req.user?.role === 'AFFILIATE') {
      if (!prisma?.companyApp?.findMany) return next();

      const installed = await prisma.companyApp.findMany({
        where: { companyId, app: { slug: { in: ['affiliate-pro', ...MANUAL_ORDER_APP_SLUGS] } } },
        select: { status: true },
      });

      const active = installed.some((r) => MANUAL_ORDER_ACTIVE_STATUSES.includes(r.status));
      if (installed.length > 0 && !active) {
        return res.status(403).json({
          success: false,
          message: 'نظام التسويق بالعمولة غير مفعّل أو منتهي لدى هذا التاجر',
          code: 'AFFILIATE_APP_INACTIVE'
        });
      }
      return next();
    }

    if (!prisma?.companyApp?.findMany) return next();

    const installed = await prisma.companyApp.findMany({
      where: { companyId, app: { slug: { in: MANUAL_ORDER_APP_SLUGS } } },
      select: { status: true },
    });

    if (installed.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'هذه الميزة تتطلب تفعيل: الطلبات اليدوية',
        needsActivation: true,
        app: { slug: 'manual-orders-pro', name: 'الطلبات اليدوية' },
      });
    }

    const active = installed.some((r) => MANUAL_ORDER_ACTIVE_STATUSES.includes(r.status));
    if (!active) {
      req.manualSubscriptionExpired = true;
    }

    next();
  } catch (error) {
    console.error('❌ [MANUAL-ACCESS] Error:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في التحقق من صلاحيات الطلب اليدوي' });
  }
};

// Apply authentication to all routes
router.use(verifyToken.authenticateToken);
router.use((req, res, next) => {
  if (isMerchantUser(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'حساب التاجر يستخدم شاشة الطلبات الأساسية المفلترة للتاجر فقط',
      code: 'MERCHANT_USE_SCOPED_SIMPLE_ORDERS'
    });
  }

  return next();
});

// دالة لتحويل payment method إلى القيم المطلوبة في schema
function mapPaymentMethod(method) {
  const mapping = {
    'cash': 'CASH',
    'cash_on_delivery': 'CASH',
    'CASH_ON_DELIVERY': 'CASH',
    'credit_card': 'CREDIT_CARD',
    'bank_transfer': 'BANK_TRANSFER',
    'paypal': 'PAYPAL',
    'stripe': 'STRIPE'
  };
  return mapping[method?.toLowerCase()] || 'CASH';
}

// تطبيقات صفحة الطلب اليدوي (اشتراك): وجود سجل لأي منها يسمح بفتح الصفحة

/**
 * حالة اشتراك الطلبات اليدوية للشركة
 * GET /api/v1/orders-enhanced/manual-access
 * - NONE    → لا يوجد سجل اشتراك → الواجهة تظهر شاشة التفعيل
 * - ACTIVE  → TRIAL/ACTIVE → الصفحة تعمل عادي
 * - EXPIRED → يوجد سجل لكن منتهي → الصفحة تعمل والأوردرات الجديدة تتعلق
 */
router.get('/manual-access', async (req, res) => {
  try {
    if (req.user?.role === 'SUPER_ADMIN') {
      return res.json({ success: true, data: { subscription: 'ACTIVE', installed: true } });
    }

    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(401).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    const prisma = getSharedPrismaClient();

    if (req.user?.role === 'AFFILIATE') {
      if (!prisma?.companyApp?.findMany) {
        return res.json({ success: true, data: { subscription: 'ACTIVE', installed: true } });
      }

      const installed = await prisma.companyApp.findMany({
        where: { companyId, app: { slug: { in: ['affiliate-pro', ...MANUAL_ORDER_APP_SLUGS] } } },
        select: { status: true, app: { select: { slug: true, name: true } } },
      });

      const active = installed.length === 0 || installed.some((r) => MANUAL_ORDER_ACTIVE_STATUSES.includes(r.status));
      return res.json({
        success: true,
        data: {
          subscription: active ? 'ACTIVE' : 'NONE',
          installed: installed.length > 0,
          status: active ? 'ACTIVE' : 'EXPIRED',
          app: installed[0]?.app || { slug: 'affiliate-pro', name: 'نظام الأفليت' },
        },
      });
    }

    if (!prisma?.companyApp?.findMany) {
      return res.json({ success: true, data: { subscription: 'NONE', installed: false } });
    }

    const installed = await prisma.companyApp.findMany({
      where: { companyId, app: { slug: { in: MANUAL_ORDER_APP_SLUGS } } },
      select: { status: true, app: { select: { slug: true, name: true } } },
    });

    if (installed.length === 0) {
      return res.json({ success: true, data: { subscription: 'NONE', installed: false } });
    }

    const active = installed.some((r) => MANUAL_ORDER_ACTIVE_STATUSES.includes(r.status));
    res.json({
      success: true,
      data: {
        subscription: active ? 'ACTIVE' : 'EXPIRED',
        installed: true,
        status: active ? 'ACTIVE' : installed[0].status,
        app: installed[0].app,
      },
    });
  } catch (error) {
    console.error('❌ [MANUAL-ACCESS] Error:', error.message);
    res.status(500).json({ success: false, message: 'خطأ في التحقق من وصول الطلب اليدوي' });
  }
});

/**
 * جلب الطلبات المحسنة
 * GET /api/v1/orders-enhanced
 */
router.get('/', async (req, res) => {
  try {
    // التحقق من وجود المستخدم المصادق عليه
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }

    const enhancedOrderService = new EnhancedOrderService();

    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      customerId,
      conversationId,
      dateFrom,
      dateTo,
      minConfidence,
      extractionMethod,
      sourceType,
      onlyUnseen,
      search,
      export: isExport
    } = req.query;

    // استخدام companyId من المستخدم المسجل دخوله
    const companyId = req.user?.companyId;

    if (!companyId) {
      console.error('❌ [ENHANCED-ORDERS] Missing companyId:', {
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email,
        userRole: req.user?.role,
        companyId: req.user?.companyId
      });
      return res.status(403).json({
        success: false,
        message: 'معرف الشركة مطلوب',
        code: 'COMPANY_ID_REQUIRED',
        debug: process.env.NODE_ENV !== 'production' ? {
          hasUser: !!req.user,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.role,
          companyId: req.user?.companyId
        } : undefined
      });
    }

    const companyTimezone = await getCompanyTimezone(companyId);

    const result = await enhancedOrderService.getEnhancedOrders(companyId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      paymentStatus,
      customerId,
      conversationId,
      dateFrom,
      dateTo,
      timezone: companyTimezone,
      minConfidence: minConfidence ? parseFloat(minConfidence) : undefined,
      extractionMethod,
      sourceType,
      onlyUnseen: onlyUnseen === 'true',
      search,
      includeHeld: req.query.includeHeld === 'true',
    });

    await enhancedOrderService.disconnect();

    // إذا كان طلب تصدير، إنشاء ملف Excel
    if (isExport === 'true') {
      const XLSX = require('xlsx');

      // تحويل البيانات لتنسيق Excel
      const excelData = result.orders.map(order => {
        // دمج تفاصيل المنتجات في سطر واحد (اسم + لون + مقاس)
        const productDetails = (order.items || []).map(item => {
          let details = item.productName || 'منتج غير محدد';
          if (item.productColor) details += ` - ${item.productColor}`;
          if (item.productSize) details += ` - ${item.productSize}`;
          return details;
        }).join(', ');

        return {
          'رقم الطلب': order.orderNumber,
          'اسم العميل': order.customerName || 'غير محدد',
          'رقم الهاتف': order.customerPhone || 'غير محدد',
          'العنوان': order.customerAddress || 'غير محدد',
          'المدينة': order.city || 'غير محدد',
          'المنتج': productDetails || 'غير محدد',
          'الكمية': order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
          'السعر الإجمالي': order.total,
          'العملة': order.currency,
          'الحالة': order.status,
          'حالة الدفع': order.paymentStatus,
          'طريقة الاستخراج': order.extractionMethod,
          'مستوى الثقة': order.confidence ? `${(order.confidence * 100).toFixed(1)}%` : 'غير محدد',
          'تاريخ الإنشاء': new Date(order.createdAt).toLocaleString('ar-EG'),
          'تاريخ التحديث': new Date(order.updatedAt).toLocaleString('ar-EG')
        };
      });

      // إنشاء workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // تحسين عرض الأعمدة
      const colWidths = [
        { wch: 15 }, // رقم الطلب
        { wch: 20 }, // اسم العميل
        { wch: 15 }, // رقم الهاتف
        { wch: 30 }, // العنوان
        { wch: 15 }, // المدينة
        { wch: 25 }, // المنتج
        { wch: 10 }, // الكمية
        { wch: 15 }, // السعر
        { wch: 10 }, // العملة
        { wch: 15 }, // الحالة
        { wch: 15 }, // حالة الدفع
        { wch: 20 }, // طريقة الاستخراج
        { wch: 15 }, // مستوى الثقة
        { wch: 20 }, // تاريخ الإنشاء
        { wch: 20 }  // تاريخ التحديث
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'الطلبات المحسنة');

      // إنشاء buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // إرسال الملف
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="enhanced-orders-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    } else {
      res.json({
        success: true,
        data: result.orders,
        pagination: result.pagination,
        message: 'تم جلب الطلبات بنجاح'
      });
    }

  } catch (error) {
    console.error('❌ خطأ في جلب الطلبات المحسنة:', error);
    console.error('❌ [ENHANCED-ORDERS] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      hasUser: !!req.user,
      companyId: req.user?.companyId
    });
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الطلبات',
      ...(process.env.NODE_ENV !== 'production' && {
        stack: error.stack,
        details: {
          hasUser: !!req.user,
          companyId: req.user?.companyId
        }
      })
    });
  }
});

/**
 * نقل الطلبات من الملفات إلى قاعدة البيانات
 * POST /api/v1/orders-enhanced/migrate-from-files
 */
router.post('/migrate-from-files', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');

    //console.log('🚀 بدء نقل الطلبات من الملفات...');

    const ordersDir = path.join(__dirname, '../../orders');

    if (!fs.existsSync(ordersDir)) {
      return res.status(404).json({
        success: false,
        error: 'مجلد الطلبات غير موجود'
      });
    }

    const files = fs.readdirSync(ordersDir).filter(file => file.endsWith('.json'));
    //console.log(`📁 تم العثور على ${files.length} ملف طلب`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // نقل آخر 10 طلبات فقط للاختبار
    const recentFiles = files.slice(-10);

    for (const file of recentFiles) {
      try {
        const filePath = path.join(ordersDir, file);
        const orderData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // تحقق من وجود الطلب
        const existingOrder = await getSharedPrismaClient().order.findUnique({
          where: { orderNumber: orderData.orderNumber }
        });

        if (existingOrder) {
          //console.log(`⏭️  تم تخطي ${orderData.orderNumber}`);
          skippedCount++;
          continue;
        }

        // إنشاء عميل
        const orderLimitCheck = await ensureWithinPlanLimit(
          DEFAULT_MIGRATION_COMPANY_ID,
          'orders',
          1,
        );
        if (!orderLimitCheck.allowed) {
          skippedCount++;
          errors.push({
            file,
            error: orderLimitCheck.payload?.message || 'Plan limit reached',
            code: orderLimitCheck.payload?.error || 'LIMIT_EXCEEDED',
          });
          continue;
        }

        let customer = null;
        if (orderData.customerPhone) {
          const { findCustomerByPhone } = require('../utils/customerIdentity');
          customer = await findCustomerByPhone(getSharedPrismaClient(), orderData.customerPhone, DEFAULT_MIGRATION_COMPANY_ID);
        }

        if (!customer) {
          customer = await getSharedPrismaClient().customer.create({
            data: {
              firstName: orderData.customerName || 'عميل غير محدد',
              lastName: '',
              phone: orderData.customerPhone || '',
              phoneNormalized: orderData.customerPhone ? require('../utils/phoneNormalization').toCanonicalE164(orderData.customerPhone) : null,
              email: orderData.customerEmail || '',
              companyId: DEFAULT_MIGRATION_COMPANY_ID
            }
          });
        }

        // إنشاء الطلب
        const newOrder = await getSharedPrismaClient().order.create({
          data: {
            orderNumber: orderData.orderNumber,
            customerId: customer.id,
            companyId: DEFAULT_MIGRATION_COMPANY_ID, // Company ID الافتراضي
            total: orderData.total || 0,
            subtotal: orderData.subtotal || 0,
            status: (orderData.status || 'pending').toUpperCase(),
            paymentStatus: (orderData.paymentStatus || 'pending').toUpperCase(),
            paymentMethod: mapPaymentMethod(orderData.paymentMethod || 'cash'),
            shippingAddress: typeof orderData.shippingAddress === 'object'
              ? JSON.stringify(orderData.shippingAddress)
              : orderData.shippingAddress || '',
            notes: orderData.notes || '',
            extractionMethod: 'file_migration',
            confidence: 0.8,
            sourceType: 'migrated',
            conversationId: orderData.items?.[0]?.metadata?.conversationId || null,
            createdAt: new Date(orderData.createdAt || Date.now())
          }
        });

        // إضافة عناصر الطلب
        if (orderData.items && orderData.items.length > 0) {
          for (const item of orderData.items) {
            await getSharedPrismaClient().orderItem.create({
              data: {
                orderId: newOrder.id,
                productName: item.name || 'منتج غير محدد',
                productColor: item.metadata?.color ? String(item.metadata.color) : '',
                productSize: item.metadata?.size != null ? String(item.metadata.size) : '',
                productSku: item.sku || item.productSku || item.metadata?.sku || null,
                productId: item.productId || null,
                price: item.price || 0,
                quantity: item.quantity || 1,
                total: item.total || 0
              }
            });
          }
        }

        //console.log(`✅ تم نقل ${orderData.orderNumber}`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ خطأ في ${file}:`, error.message);
        errorCount++;
        errors.push({ file, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'تم نقل الطلبات بنجاح',
      stats: {
        total: recentFiles.length,
        migrated: migratedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      errors
    });

  } catch (error) {
    console.error('❌ خطأ في نقل الطلبات:', error);
    res.status(500).json({
      success: false,
      error: 'فشل في نقل الطلبات',
      details: error.message
    });
  }
});

/**
 * جلب إحصائيات الطلبات المحسنة
 * GET /api/v1/orders-enhanced/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const { dateFrom, dateTo } = req.query;
    const companyId = req.user.companyId;
    const companyTimezone = await getCompanyTimezone(companyId);

    const stats = await enhancedOrderService.getOrderStats(companyId, dateFrom, dateTo, companyTimezone);

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب الإحصائيات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات الطلبات:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب الإحصائيات'
    });
  }
});

/**
 * جلب طلب محدد
 * GET /api/v1/orders-enhanced/:id
 */
// Duplicate route removed - see lines 649+ for the correct implementation using getOrderById service method

/**
 * إنشاء طلب محسن يدوياً
 * POST /api/v1/orders-enhanced
 */
console.log('🚧 [ENHANCED-ORDERS] Route initialization');
router.post('/', manualOrderAccess, async (req, res) => {
  try {
    console.log('📝 [ENHANCED-ORDERS] Received POST / request');
    // Auth check handled by middleware
    // console.log('👤 [ENHANCED-ORDERS] User:', req.user ? `${req.user.email} (${req.user.companyId})` : 'UNDEFINED');

    const enhancedOrderService = new EnhancedOrderService();

    // 🔍 Attach affiliate attribution only when the request is explicitly an affiliate flow.
    // Owners/admins can have an affiliate profile for testing; that must not turn every
    // manual admin order into an affiliate commission.
    let affiliateId = null;
    let orderSource = 'manual';

    try {
      const { getSharedPrismaClient } = require('../services/sharedDatabase');
      const wantsAffiliateAttribution =
        req.user.role === 'AFFILIATE' ||
        req.body?.orderSource === 'AFFILIATE_DIRECT' ||
        req.body?.createAsAffiliate === true;

      if (wantsAffiliateAttribution) {
        const affiliate = await getSharedPrismaClient().affiliate.findFirst({
          where: {
            userId: req.user.id,
            companyId: req.user.companyId
          }
        });

        if (!affiliate) {
          return res.status(403).json({
            success: false,
            code: 'AFFILIATE_PROFILE_REQUIRED',
            message: 'لا يوجد حساب مسوق نشط لهذه الشركة',
          });
        }

        if (affiliate.status !== 'ACTIVE') {
          return res.status(403).json({
            success: false,
            code: 'AFFILIATE_INACTIVE',
            message: 'حساب المسوق غير نشط',
          });
        }

        if (!affiliate.canCreateOrdersForOthers) {
          return res.status(403).json({
            success: false,
            code: 'AFFILIATE_DIRECT_ORDERS_DISABLED',
            message: 'هذا المسوق غير مسموح له بإنشاء طلبات مباشرة للعملاء',
          });
        }

        affiliateId = affiliate.id;
        orderSource = 'AFFILIATE_DIRECT';
        console.log('✅ [ENHANCED-ORDERS] Affiliate detected:', { affiliateId, userId: req.user.id });
      }
    } catch (affiliateError) {
      console.error('⚠️ [ENHANCED-ORDERS] Error fetching affiliate:', affiliateError);
      return res.status(500).json({
        success: false,
        message: 'فشل في التحقق من صلاحيات المسوق',
      });
    }

    const possibleFacebookId =
      req.body?.customerId && /^\d+$/.test(String(req.body.customerId))
        ? String(req.body.customerId)
        : null;
    const blockEvaluation = await customerBlocklistService.evaluateCustomerBlock(
      getSharedPrismaClient(),
      {
        companyId: req.user.companyId,
        customerId: possibleFacebookId ? null : req.body?.customerId,
        phone: req.body?.customerPhone,
        email: req.body?.customerEmail,
        facebookId: req.body?.facebookId || possibleFacebookId,
        whatsappId: req.body?.whatsappId,
        source: 'manual',
        userRole: req.user.role,
        paymentMethod: req.body?.paymentMethod,
        allowOverride: req.body?.allowBlockedCustomerOverride === true,
      },
    );

    if (blockEvaluation.blocked) {
      return customerBlocklistService.sendBlockedResponse(res, blockEvaluation);
    }

    // 🔄 التحقق من سياسة الاستبدال والاسترجاع (اشتراط وجود طلب سابق)
    const isExchangeOrReturn =
      req.body?.requestType === 'exchange' ||
      req.body?.requestType === 'return' ||
      String(req.body?.status || '').toUpperCase() === 'EXCHANGED' ||
      String(req.body?.status || '').toUpperCase() === 'RETURNED';

    let validatedOriginalOrder = null;
    if (isExchangeOrReturn) {
      const orderService = require('../services/orderService');
      const policy = await orderService.getExchangeReturnPolicy(req.user.companyId);

      if (policy.requirePreviousOrder) {
        const eligibleOrders = await orderService.findEligiblePreviousOrders({
          companyId: req.user.companyId,
          customerId: possibleFacebookId ? null : req.body?.customerId,
          customerPhone: req.body?.customerPhone,
          policy
        });

        if (!eligibleOrders || eligibleOrders.length === 0) {
          const isReturn = req.body?.requestType === 'return' || String(req.body?.status || '').toUpperCase() === 'RETURNED';
          const typeLabel = isReturn ? 'مرتجع' : 'استبدال';
          return res.status(400).json({
            success: false,
            code: 'PREVIOUS_ORDER_REQUIRED',
            message: `لا يمكن إنشاء طلب ${typeLabel}: لا يوجد أي طلب سابق مؤهل لهذا العميل وفقاً لسياسة المتجر.`
          });
        }

        const requestedOriginalId = req.body?.originalOrderId || req.body?.originalOrderNumber;
        if (requestedOriginalId) {
          validatedOriginalOrder = eligibleOrders.find(
            o => o.id === requestedOriginalId || o.orderNumber === requestedOriginalId
          );
          if (!validatedOriginalOrder && policy.requireExplicitOrderLink) {
            return res.status(400).json({
              success: false,
              code: 'INVALID_PREVIOUS_ORDER',
              message: 'الطلب السابق المحدد غير مؤهل للاستبدال أو المرتجع وفقاً لسياسة المتجر.'
            });
          }
        }

        if (!validatedOriginalOrder) {
          validatedOriginalOrder = eligibleOrders[0];
        }
      }
    }

    if (affiliateId) {
      const productIds = Array.from(
        new Set(
          (Array.isArray(req.body?.products) ? req.body.products : [])
            .map((item) => item?.productId)
            .filter(Boolean),
        ),
      );

      if (productIds.length > 0) {
        const products = await getSharedPrismaClient().product.findMany({
          where: {
            id: { in: productIds },
            companyId: req.user.companyId,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            metadata: true,
          },
        });

        const productMap = new Map(products.map((product) => [product.id, product]));
        const missingProductId = productIds.find((productId) => !productMap.has(productId));

        if (missingProductId) {
          return res.status(400).json({
            success: false,
            code: 'PRODUCT_NOT_AVAILABLE',
            message: 'أحد المنتجات غير موجود أو غير متاح لهذه الشركة',
            productId: missingProductId,
          });
        }

        const hiddenProduct = products.find(
          (product) => !isProductVisibleToAffiliate(product, affiliateId),
        );

        if (hiddenProduct) {
          return res.status(403).json({
            success: false,
            code: 'AFFILIATE_PRODUCT_NOT_VISIBLE',
            message: 'هذا المنتج غير متاح لهذا المسوق',
            productId: hiddenProduct.id,
            productName: hiddenProduct.name,
          });
        }
      }
    }

    if (affiliateId && Array.isArray(req.body?.products) && req.body.products.length > 0) {
      const productIds = Array.from(
        new Set(
          req.body.products
            .map((item) => item?.productId)
            .filter(Boolean)
            .map((productId) => String(productId)),
        ),
      );

      if (productIds.length > 0) {
        const products = await getSharedPrismaClient().product.findMany({
          where: {
            id: { in: productIds },
            companyId: req.user.companyId,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            metadata: true,
          },
        });
        const productById = new Map(products.map((product) => [product.id, product]));

        for (const productId of productIds) {
          const product = productById.get(productId);

          if (!product) {
            return res.status(400).json({
              success: false,
              message: 'منتج غير متاح لهذا الطلب',
              code: 'PRODUCT_NOT_AVAILABLE',
              productId,
            });
          }

          if (!isProductVisibleToAffiliate(product, affiliateId)) {
            return res.status(403).json({
              success: false,
              message: 'هذا المنتج غير متاح لهذا المسوق',
              code: 'AFFILIATE_PRODUCT_NOT_VISIBLE',
              productId,
            });
          }
        }
      }
    }

    // تحويل المنتجات (متوافق مع EnhancedOrderService)
    const rawProducts = req.body.products || req.body.items || [];
    const products = Array.isArray(rawProducts) ? rawProducts.map(item => ({
      productId: item.productId || null,
      productName: item.productName || item.name || '',
      productColor: item.productColor ? String(item.productColor) : (item.color ? String(item.color) : null),
      productSize: item.productSize != null ? String(item.productSize) : (item.size != null ? String(item.size) : null),
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity, 10) || 1,
      total: parseFloat(item.total || ((parseFloat(item.price) || 0) * (parseInt(item.quantity, 10) || 1))),
      variantId: item.variantId || null,
      sku: item.sku || item.productSku || null,
      productSku: item.productSku || item.sku || null,
      productImage: item.productImage || item.image || null,
      image: item.image || item.productImage || null,
      attributes: item.attributes || item.productAttributes || null,
    })) : [];

    // Map address field to customerAddress for the order service
    if (req.body.address && !req.body.customerAddress) {
      req.body.customerAddress = req.body.address;
    }

    const orderData = {
      ...req.body,
      products,
      productId: req.body.productId || products[0]?.productId || null,
      productName: req.body.productName || products.map(p => p.productName).filter(Boolean).join(', ') || null,
      productPrice: req.body.productPrice || products[0]?.price || 0,
      productColor: req.body.productColor || products[0]?.productColor || null,
      productSize: req.body.productSize || products[0]?.productSize || null,
      productImage: req.body.productImage || req.body.image || products[0]?.productImage || null,
      productSku: req.body.productSku || req.body.sku || products[0]?.productSku || null,
      quantity: req.body.quantity || products.reduce((sum, p) => sum + (p.quantity || 1), 0),
      companyId: req.user.companyId,
      extractionMethod: req.body.extractionMethod || 'manual',

      // Affiliate info
      ...(affiliateId && { affiliateId, orderSource }),

      // Creator info
      createdBy: req.user.id,
      createdByName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
      createdByRole: req.user.role,

      // Previous order link for exchange / return
      ...(validatedOriginalOrder ? {
        originalOrderId: validatedOriginalOrder.id,
        originalOrderNumber: validatedOriginalOrder.orderNumber,
      } : (req.body?.originalOrderId ? {
        originalOrderId: req.body.originalOrderId,
        originalOrderNumber: req.body.originalOrderNumber || null,
      } : {})),
    };

    console.log('📦 [ENHANCED-ORDERS] Processing order data:', JSON.stringify(orderData.products || orderData.productName, null, 2));

    const result = await enhancedOrderService.createEnhancedOrder(orderData);

    if (result.success) {
      // 🚧 تعليق الطلب اليدوي (مخفي + ماسك) فقط عندما:
      // اشتراك الطلبات اليدوية منتهي + المحفظة بدون رصيد (مفيش فلوس للتجديد).
      // الطلب مش بيتحاسب بفلوس (مجاني) — بيتحرر تلقائيًا لما الاشتراك يتفعّل.
      if (req.manualSubscriptionExpired && result.order?.id) {
        try {
          const wallet = await getSharedPrismaClient().companyWallet.findUnique({
            where: { companyId: req.user.companyId },
          });
          const balance = wallet ? Number(wallet.balance) : 0;

          if (balance <= 0) {
            const { holdOrderForExpiredSubscription } = require('../services/pendingBillingService');
            await holdOrderForExpiredSubscription({
              companyId: req.user.companyId,
              orderId: result.order.id,
              orderNumber: result.order.orderNumber,
            });
            result.held = true;
            result.holdReason = 'subscription_expired';
            result.message = `${result.message || 'تم إنشاء الطلب بنجاح'}. اشتراك الطلبات اليدوية منتهي ورصيد المحفظة صفر، الطلب معلّق وسيظهر في صفحة الطلبات بعد تجديد الاشتراك.`;
          }
        } catch (holdError) {
          console.error('❌ [ENHANCED-ORDERS] Failed to hold order for expired subscription:', holdError.message);
        }
      }

      // 📱 إرسال إشعار WhatsApp تلقائي للطلب الجديد
      try {
        const WhatsAppNotificationService = require('../services/whatsapp/WhatsAppNotificationService');

        const orderForNotification = {
          id: result.order.id,
          orderNumber: result.order.orderNumber,
          companyId: req.user.companyId,
          status: result.order.status,
          customerPhone: result.order.customerPhone,
          customerName: result.order.customerName,
          customer: {
            firstName: result.order.customerName?.split(' ')[0] || result.order.customerName,
            phone: result.order.customerPhone
          },
          total: result.order.total,
          currency: 'EGP',
          items: result.order.items || [] // ✅ Include items for WhatsApp notification
        };

        await WhatsAppNotificationService.sendOrderCreationNotification(orderForNotification);
        console.log('✅ [WHATSAPP] Order notification sent for:', result.order.orderNumber);
      } catch (whatsappError) {
        console.log('⚠️ [WHATSAPP] Failed to send notification:', whatsappError.message);
      }

      res.status(201).json(result);
    } else {
      console.log('❌ [ENHANCED-ORDERS] Order creation failed:', {
        success: result.success,
        error: result.error,
        message: result.message,
        validation: result.validation
      });
      res.status(result.statusCode || 400).json({
        ...result,
        details: process.env.NODE_ENV !== 'production' ? result.validation : undefined
      });
    }
  } catch (error) {
    console.error('❌ خطأ في إنشاء الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في إنشاء الطلب'
    });
  }
});

/**
 * تحديث حالة الطلب
 * PATCH /api/v1/orders-enhanced/:id/status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const { id } = req.params;
    const { status, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // ✅ SECURITY FIX: Ensure order belongs to company
    const order = await enhancedOrderService.getPrisma().order.findFirst({
      where: {
        id,
        companyId: companyId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود أو غير مصرح به'
      });
    }

    const updatedOrder = await enhancedOrderService.getPrisma().order.update({
      where: { id },
      data: {
        status,
        notes: notes ? `${notes}\n---\nتحديث الحالة: ${new Date().toLocaleString('ar-EG')}` : undefined,
        updatedAt: new Date()
      },
      include: {
        customer: true,
        conversation: true,
        orderItems: true
      }
    });

    // 🔄 إنشاء طلب إرجاع تلقائياً إذا كانت الحالة الجديدة تشير إلى مرتجع
    if (['REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED'].includes(status)) {
      try {
        const orderService = require('../services/orderService');
        await orderService.autoCreateReturnRequest(updatedOrder, req.user?.id, status);
        console.log(`✅ [RETURNS-AUTO] Return request created for order ${updatedOrder.orderNumber} via status change`);
      } catch (returnError) {
        console.error('❌ [RETURNS-AUTO] Failed to auto-create return request:', returnError.message);
      }
    }

    // 🚚 إنشاء شحنة تربو تلقائياً إذا تم تأكيد الطلب
    if (String(status || '').trim().toUpperCase() === 'CONFIRMED') {
      try {
        const orderService = require('../services/orderService');
        orderService.autoCreateTurboShipmentForOrder(updatedOrder, companyId).catch(turboErr => {
          console.warn(`⚠️ [TURBO-AUTO] enhancedOrders route error:`, turboErr.message);
        });
      } catch (err) {}
    }

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: updatedOrder,
      message: 'تم تحديث حالة الطلب بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في تحديث حالة الطلب'
    });
  }
});

/**
 * تحديث validation status
 * PATCH /api/v1/orders-enhanced/:id/validation
 */
router.patch('/:id/validation', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const { id } = req.params;
    const { validationStatus, notes } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // ✅ SECURITY FIX: Ensure order belongs to company
    const order = await enhancedOrderService.getPrisma().order.findFirst({
      where: {
        id,
        companyId: companyId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود أو غير مصرح به'
      });
    }

    // 🔒 قفل تعديل بيانات الأوردر (لكل حالة): تحديث التحقق/الملاحظات يعدّل بيانات الطلب.
    const { assertOrderStatusEditable } = require('../utils/orderStatusLock');
    await assertOrderStatusEditable(enhancedOrderService.getPrisma(), companyId, order.customStatusCode || order.status);

    const updatedOrder = await enhancedOrderService.getPrisma().order.update({
      where: { id },
      data: {
        validationStatus,
        notes: notes ? `${notes}\n---\nتحديث التحقق: ${new Date().toLocaleString('ar-EG')}` : undefined,
        updatedAt: new Date()
      }
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: updatedOrder,
      message: 'تم تحديث حالة التحقق بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في تحديث حالة التحقق:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message,
      message: statusCode === 403 ? error.message : 'فشل في تحديث حالة التحقق'
    });
  }
});

/**
 * حذف طلب
 * DELETE /api/v1/orders-enhanced/:id
 */
router.delete('/:id', verifyToken.requireRole(['OWNER', 'COMPANY_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const { id } = req.params;

    // FIXED: Add company isolation for security
    // حذف عناصر الطلب أولاً
    // SECURITY WARNING: Ensure companyId filter is included

    // First verify the order belongs to the user's company
    const order = await enhancedOrderService.getPrisma().order.findFirst({
      where: {
        id,
        companyId: req.user.companyId
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'الطلب غير موجود أو غير مصرح به'
      });
    }

    // حذف عناصر الطلب أولاً
    await enhancedOrderService.getPrisma().orderItem.deleteMany({
      where: {
        orderId: id
      }
    });

    // حذف الطلب
    await enhancedOrderService.getPrisma().order.delete({
      where: { id }
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      message: 'تم حذف الطلب بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في حذف الطلب:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في حذف الطلب'
    });
  }
});

/**
 * إحصائيات المحادثات المكتملة
 * GET /api/v1/orders-enhanced/conversations/stats
 */
router.get('/conversations/stats', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const { dateFrom, dateTo } = req.query;
    const companyId = req.user.companyId;
    const companyTimezone = await getCompanyTimezone(companyId);

    const stats = await enhancedOrderService.getConversationCompletionStats(companyId, dateFrom, dateTo, companyTimezone);

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: stats,
      message: 'تم جلب إحصائيات المحادثات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب إحصائيات المحادثات:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب إحصائيات المحادثات'
    });
  }
});

/**
 * جلب المحادثات المرتبطة بالطلبات
 * GET /api/v1/orders-enhanced/conversations
 */
router.get('/conversations', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();

    const {
      page = 1,
      limit = 20,
      status = 'RESOLVED',
      hasOrder = true
    } = req.query;

    const companyId = req.user.companyId;

    const result = await enhancedOrderService.getOrderConversations(companyId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      hasOrder: hasOrder === 'true'
    });

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: result.conversations,
      pagination: result.pagination,
      message: 'تم جلب المحادثات بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في جلب المحادثات:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في جلب المحادثات'
    });
  }
});

/**
 * مقارنة الطلبات (قديم vs جديد)
 * GET /api/v1/orders-enhanced/compare
 */
router.get('/compare/systems', async (req, res) => {
  try {
    const enhancedOrderService = new EnhancedOrderService();
    const SimpleOrderService = require('../services/simpleOrderService');
    const simpleOrderService = new SimpleOrderService();

    const companyId = req.user.companyId;

    // جلب إحصائيات النظام المحسن
    const enhancedStats = await enhancedOrderService.getOrderStats(companyId);

    // جلب إحصائيات النظام القديم
    const simpleStats = await simpleOrderService.getDataQualityStats();

    await enhancedOrderService.disconnect();

    res.json({
      success: true,
      data: {
        enhanced: enhancedStats,
        simple: simpleStats,
        comparison: {
          totalOrdersImprovement: enhancedStats.totalOrders - (simpleStats?.totalOrders || 0),
          avgConfidenceImprovement: enhancedStats.avgConfidence - 0.5, // متوسط النظام القديم
          dataQualityImprovement: 'محسن بشكل كبير'
        }
      },
      message: 'تم جلب مقارنة الأنظمة بنجاح'
    });

  } catch (error) {
    console.error('❌ خطأ في مقارنة الأنظمة:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'فشل في مقارنة الأنظمة'
    });
  }
});

// Get single order details
router.get('/:id', async (req, res) => {
  try {
    // التحقق من وجود المستخدم المصادق عليه
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح - يجب تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }

    const { id } = req.params;
    const companyId = req.user.companyId;
    const enhancedOrderService = new EnhancedOrderService();

    const result = await enhancedOrderService.getOrderById(id, companyId);

    await enhancedOrderService.disconnect();

    if (result.success) {
      res.json({
        success: true,
        data: result.order,
        message: 'تم جلب تفاصيل الطلب بنجاح'
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'الطلب غير موجود'
      });
    }
  } catch (error) {
    console.error('❌ Error fetching order details:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الطلب'
    });
  }
});

module.exports = router;

