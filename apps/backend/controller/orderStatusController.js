const { getSharedPrismaClient } = require('../services/sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues
const axios = require('axios');
// 🚨 PRODUCTION-FIX (notifications-fix-plan §2.3): البذر مستخرج إلى خدمة مشتركة
const { seedDefaultOrderTemplates } = require('../services/orderTemplateSeeding');
const { isNonNotifiableStatus } = require('../utils/orderStatusMeta');

// ═══════════════════════════════════════════════════════════════
// 🛡️ Validation Helpers
// ═══════════════════════════════════════════════════════════════

const MAX_NAME_LENGTH = 100;
const CODE_REGEX = /^[A-Z0-9_]{1,50}$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validate a single status field set and return an error message or null if valid.
 */
const validateStatusFields = ({ code, name, color }) => {
  if (!code || !name) {
    return 'الكود والاسم مطلوبان';
  }
  if (name.length > MAX_NAME_LENGTH) {
    return `اسم الحالة لا يمكن أن يتجاوز ${MAX_NAME_LENGTH} حرفًا`;
  }
  if (!CODE_REGEX.test(code.toUpperCase())) {
    return 'الكود يجب أن يحتوي فقط على أحرف إنجليزية كبيرة، أرقام، وشرطة سفلية (مثال: CONFIRMED أو SHIPPED_V2)';
  }
  if (color && !HEX_COLOR_REGEX.test(color)) {
    return 'لون الحالة يجب أن يكون كود hex صالح (مثال: #3B82F6)';
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════
// 🎨 Default System Statuses
// ═══════════════════════════════════════════════════════════════

const DEFAULT_ORDER_STATUSES = [
  { code: 'PENDING', name: 'قيد الانتظار', nameEn: 'Pending', color: '#F59E0B', icon: 'Clock', sortOrder: 1, wooCommerceStatus: 'pending' },
  { code: 'DRAFT', name: 'مسودة', nameEn: 'Draft', color: '#9CA3AF', icon: 'Tag', sortOrder: 2, wooCommerceStatus: 'checkout-draft' },
  { code: 'SCHEDULED', name: 'طلب مجدول', nameEn: 'Scheduled', color: '#FFA500', icon: 'Calendar', sortOrder: 3, wooCommerceStatus: 'pending' },
  { code: 'CONFIRMED', name: 'مؤكد', nameEn: 'Confirmed', color: '#3B82F6', icon: 'CheckCircle', sortOrder: 4, wooCommerceStatus: 'processing' },
  { code: 'ON_HOLD', name: 'معلق', nameEn: 'On Hold', color: '#F97316', icon: 'AlertCircle', sortOrder: 5, wooCommerceStatus: 'on-hold' },
  { code: 'PROCESSING', name: 'قيد التنفيذ', nameEn: 'Processing', color: '#8B5CF6', icon: 'Package', sortOrder: 6, wooCommerceStatus: 'processing' },
  { code: 'SHIPPED', name: 'تم الشحن', nameEn: 'Shipped', color: '#06B6D4', icon: 'Truck', sortOrder: 7, wooCommerceStatus: 'completed' },
  { code: 'DELIVERED', name: 'تم التسليم', nameEn: 'Delivered', color: '#10B981', icon: 'CheckCircle2', sortOrder: 8, wooCommerceStatus: 'completed' },
  { code: 'CANCELLED', name: 'ملغي', nameEn: 'Cancelled', color: '#EF4444', icon: 'XCircle', sortOrder: 9, wooCommerceStatus: 'cancelled' },
  { code: 'REFUNDED', name: 'مسترد', nameEn: 'Refunded', color: '#6B7280', icon: 'RotateCcw', sortOrder: 10, wooCommerceStatus: 'refunded' },
  { code: 'PARTIALLY_REFUNDED', name: 'مسترد جزئياً', nameEn: 'Partially Refunded', color: '#9CA3AF', icon: 'RotateCcw', sortOrder: 11, wooCommerceStatus: 'refunded' },
  { code: 'DUPLICATE_ORDER', name: 'طلب مكرر', nameEn: 'Duplicate Order', color: '#FBBF24', icon: 'AlertTriangle', sortOrder: 12, wooCommerceStatus: null },
  { code: 'RETURNED', name: 'مرتجع', nameEn: 'Returned', color: '#DC2626', icon: 'RotateCcw', sortOrder: 13, wooCommerceStatus: null },
  { code: 'PARTIALLY_RETURNED', name: 'مرتجع جزئي', nameEn: 'Partially Returned', color: '#F87171', icon: 'RotateCcw', sortOrder: 14, wooCommerceStatus: null },
  { code: 'PARTIALLY_DELIVERED', name: 'تسليم جزئي', nameEn: 'Partially Delivered', color: '#FBBF24', icon: 'Package', sortOrder: 15, wooCommerceStatus: null },
  { code: 'EXCHANGED', name: 'استبدال', nameEn: 'Exchanged', color: '#7C3AED', icon: 'ArrowLeftRight', sortOrder: 16, wooCommerceStatus: null },
  { code: 'TRASH', name: 'سلة المحذوفات', nameEn: 'Trash', color: '#6B7280', icon: 'Trash2', sortOrder: 17, wooCommerceStatus: 'trash' },
  { code: 'PENDING_CANCELLATION', name: 'إلغاء قيد التنفيذ', nameEn: 'Pending Cancellation', color: '#F43F5E', icon: 'AlertOctagon', sortOrder: 18, wooCommerceStatus: null },
  { code: 'SHORTAGE_FAILED', name: 'عجز نهائي', nameEn: 'Final Shortage', color: '#7C3AED', icon: 'XCircle', sortOrder: 19, wooCommerceStatus: null, notifyCustomer: true }
];

const DEFAULT_PAYMENT_STATUSES = [
  { code: 'PAYMENT_PENDING', name: 'في انتظار الدفع', nameEn: 'Pending', color: '#F59E0B', icon: 'Clock', sortOrder: 1 },
  { code: 'COMPLETED', name: 'مدفوع', nameEn: 'Completed', color: '#10B981', icon: 'CheckCircle', sortOrder: 2 },
  { code: 'PARTIALLY_PAID', name: 'مدفوع جزئياً', nameEn: 'Partially Paid', color: '#3B82F6', icon: 'CreditCard', sortOrder: 3 },
  { code: 'FAILED', name: 'فشل الدفع', nameEn: 'Failed', color: '#EF4444', icon: 'XCircle', sortOrder: 4 },
  { code: 'ON_HOLD', name: 'معلق', nameEn: 'On Hold', color: '#F97316', icon: 'AlertCircle', sortOrder: 5 },
  { code: 'REFUNDED', name: 'مسترد', nameEn: 'Refunded', color: '#6B7280', icon: 'RotateCcw', sortOrder: 6 },
  { code: 'PARTIALLY_REFUNDED', name: 'مسترد جزئياً', nameEn: 'Partially Refunded', color: '#9CA3AF', icon: 'RotateCcw', sortOrder: 7 }
];

const DEFAULT_SHIPPING_STATUSES = [
  { code: 'NOT_SHIPPED', name: 'لم يتم الشحن', nameEn: 'Not Shipped', color: '#6B7280', icon: 'Package', sortOrder: 1 },
  { code: 'READY_TO_SHIP', name: 'جاهز للشحن', nameEn: 'Ready to Ship', color: '#F59E0B', icon: 'Package', sortOrder: 2 },
  { code: 'SHIPPED', name: 'تم الشحن', nameEn: 'Shipped', color: '#3B82F6', icon: 'Truck', sortOrder: 3 },
  { code: 'OUT_FOR_DELIVERY', name: 'قيد التوصيل', nameEn: 'Out for Delivery', color: '#06B6D4', icon: 'Truck', sortOrder: 4 },
  { code: 'DELIVERED', name: 'تم التسليم', nameEn: 'Delivered', color: '#10B981', icon: 'CheckCircle', sortOrder: 5 },
  { code: 'RETURNED', name: 'تم الإرجاع', nameEn: 'Returned', color: '#EF4444', icon: 'RotateCcw', sortOrder: 6 },
  { code: 'LOST', name: 'مفقود', nameEn: 'Lost', color: '#DC2626', icon: 'AlertCircle', sortOrder: 7 },
  // 🚀 حالات شحن تربو التلقائية المحدثة (Official Turbo Shipping Statuses 1..13)
  { code: 'turbo_saved', name: 'تربو: محفوظة قبل الشحن', nameEn: 'Turbo: Saved', color: '#6366F1', icon: 'Clock', sortOrder: 8 },
  { code: 'turbo_sent', name: 'تربو: مرسلة لشركة تربو', nameEn: 'Turbo: Sent', color: '#3B82F6', icon: 'CheckCircle', sortOrder: 9 },
  { code: 'processing', name: 'تربو: قيد التنفيذ بالفرع', nameEn: 'Turbo: Processing', color: '#8B5CF6', icon: 'Package', sortOrder: 10 },
  { code: 'out_for_delivery', name: 'تربو: مع الكابتن / مسلمة للمندوب', nameEn: 'Turbo: Out for Delivery', color: '#06B6D4', icon: 'Truck', sortOrder: 11, mapsToSystem: 'SHIPPED' },
  { code: 'returned_to_company', name: 'تربو: مرتجعة مع الشركة', nameEn: 'Turbo: Returned With Company', color: '#991B1B', icon: 'RotateCcw', sortOrder: 12, mapsToSystem: 'RETURNED' },
  { code: 'cancelled', name: 'تربو: ملغي من الشحن', nameEn: 'Turbo: Cancelled', color: '#DC2626', icon: 'XCircle', sortOrder: 13, mapsToSystem: 'CANCELLED' },
  { code: 'delivered', name: 'تربو: تم التسليم', nameEn: 'Turbo: Delivered', color: '#10B981', icon: 'CheckCircle', sortOrder: 14, mapsToSystem: 'DELIVERED' },
  { code: 'remitted', name: 'تربو: تم التوريد وتحصيل المبلغ', nameEn: 'Turbo: Remitted', color: '#047857', icon: 'CheckCircle', sortOrder: 15, mapsToSystem: 'DELIVERED' },
  { code: 'archived', name: 'تربو: شحنة محذوفة في تربو', nameEn: 'Turbo: Archived', color: '#78716C', icon: 'Trash2', sortOrder: 16 },
  { code: 'returned_resent', name: 'تربو: معاد إرسالها', nameEn: 'Turbo: Resent', color: '#2563EB', icon: 'RotateCcw', sortOrder: 17, mapsToSystem: 'PROCESSING' },
  { code: 'returned_missing', name: 'تربو: مرتجع مفقود', nameEn: 'Turbo: Missing', color: '#7F1D1D', icon: 'AlertCircle', sortOrder: 18, mapsToSystem: 'RETURNED' },
  { code: 'returned_destroyed', name: 'تربو: مرتجع معدوم', nameEn: 'Turbo: Destroyed', color: '#451A03', icon: 'XCircle', sortOrder: 19, mapsToSystem: 'RETURNED' },
  { code: 'delayed', name: 'تربو: مؤجلة مع المندوب', nameEn: 'Turbo: Delayed', color: '#F97316', icon: 'Clock', sortOrder: 20, mapsToSystem: 'ON_HOLD' }
];

const DEFAULT_PREPARATION_STATUSES = [
  { code: 'PENDING_PREPARATION', name: 'في انتظار التجهيز', nameEn: 'Pending Preparation', color: '#F59E0B', icon: 'Clock', sortOrder: 1 },
  { code: 'PREPARING', name: 'قيد التجهيز', nameEn: 'Preparing', color: '#8B5CF6', icon: 'Package', sortOrder: 2 },
  { code: 'READY', name: 'جاهز', nameEn: 'Ready', color: '#10B981', icon: 'CheckCircle', sortOrder: 3 },
  { code: 'QUALITY_CHECK', name: 'فحص الجودة', nameEn: 'Quality Check', color: '#06B6D4', icon: 'CheckCircle', sortOrder: 4 },
  { code: 'PACKAGED', name: 'تم التغليف', nameEn: 'Packaged', color: '#3B82F6', icon: 'Package', sortOrder: 5 },
  { code: 'ON_HOLD_PREP', name: 'معلق', nameEn: 'On Hold', color: '#F97316', icon: 'AlertCircle', sortOrder: 6 },
  { code: 'STOCK_SHORTAGE', name: 'عجز مخزون', nameEn: 'Stock Shortage', color: '#E11D48', icon: 'AlertTriangle', sortOrder: 7, notifyCustomer: true }
];

// WooCommerce default statuses mapping
const WOOCOMMERCE_STATUSES = {
  'pending': { name: 'في انتظار الدفع', nameEn: 'Pending payment', color: '#F59E0B', mapsToSystem: 'PENDING' },
  'processing': { name: 'قيد التجهيز', nameEn: 'Processing', color: '#3B82F6', mapsToSystem: 'PROCESSING' },
  'on-hold': { name: 'معلق', nameEn: 'On hold', color: '#F97316', mapsToSystem: 'PENDING' },
  'completed': { name: 'مكتمل', nameEn: 'Completed', color: '#10B981', mapsToSystem: 'DELIVERED' },
  'cancelled': { name: 'ملغي', nameEn: 'Cancelled', color: '#EF4444', mapsToSystem: 'CANCELLED' },
  'refunded': { name: 'مسترد', nameEn: 'Refunded', color: '#6B7280', mapsToSystem: 'REFUNDED' },
  'failed': { name: 'فشل', nameEn: 'Failed', color: '#DC2626', mapsToSystem: 'CANCELLED' },
  'checkout-draft': { name: 'مسودة', nameEn: 'Draft', color: '#9CA3AF', mapsToSystem: 'PENDING' }
};

// ═══════════════════════════════════════════════════════════════
// 📋 Get All Status Configurations
// ═══════════════════════════════════════════════════════════════

const getRequestCompanyId = (req) =>
  req.user?.effectiveCompanyId || req.user?.companyId;

/**
 * GET /api/v1/order-status
 * جلب جميع حالات الطلبات للشركة
 */
const getAllStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    console.log('🏷️ [ORDER-STATUS] Getting statuses for company:', companyId);

    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    const { statusType } = req.query;

    // التحقق أولاً من وجود حالات لكل نوع وفحص الحالات الأساسية الإلزامية
    const allStatuses = await getSharedPrismaClient().orderStatusConfig.findMany({
      where: { companyId, isActive: true },
      select: { statusType: true, code: true }
    });

    const statusTypes = ['order', 'payment', 'shipping', 'preparation'];
    const existingTypes = new Set(allStatuses.map(s => s.statusType));
    const existingCodes = new Set(allStatuses.map(s => s.code));
    let needsInitialization = false;

    for (const type of statusTypes) {
      if (!existingTypes.has(type)) {
        console.log(`🏷️ [ORDER-STATUS] No ${type} statuses found, will initialize...`);
        needsInitialization = true;
      }
    }

    // التأكد من توفر حالة العجز النهائي الأساسية
    if (!existingCodes.has('SHORTAGE_FAILED')) {
      console.log('🏷️ [ORDER-STATUS] Missing SHORTAGE_FAILED status, will initialize...');
      needsInitialization = true;
    }

    // إذا كانت هناك أنواع ناقصة أو حالات أساسية مفقودة، أنشئ الحالات الافتراضية
    if (needsInitialization || allStatuses.length === 0) {
      try {
        console.log('🏷️ [ORDER-STATUS] Initializing default statuses...');
        await initializeDefaultStatuses(companyId);
      } catch (initError) {
        console.error('❌ [ORDER-STATUS] Error during initialization, continuing with existing statuses:', initError.message);
        // لا نوقف العملية - نكمل بجلب الحالات الموجودة
      }
    }

    // الآن اجلب الحالات المطلوبة (مع فلتر statusType إذا كان موجوداً)
    const where = { companyId, isActive: true };
    if (statusType) where.statusType = statusType;

    let statuses = await getSharedPrismaClient().orderStatusConfig.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });

    console.log('🏷️ [ORDER-STATUS] Found statuses:', statuses.length);

    res.json({
      success: true,
      data: statuses
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error getting statuses:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب الحالات',
      error: error.message
    });
  }
};

/**
 * GET /api/v1/order-status/:id
 * جلب حالة محددة
 */
const getStatusById = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;

    const status = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!status) {
      return res.status(404).json({ success: false, message: 'الحالة غير موجودة' });
    }

    res.json({ success: true, data: status });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error getting status:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحالة', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 Sync Helper: Mirror status to OrderStatusDefinition (workflow)
// ═══════════════════════════════════════════════════════════════

/**
 * Sync a status from orderStatusConfig into orderStatusDefinition (workflow table).
 * This ensures any status added/edited from settings/orders automatically appears
 * in the TransitionRules on settings/order-workflow.
 */
const syncStatusToWorkflow = async (prisma, companyId, statusConfig) => {
  try {
    await prisma.orderStatusDefinition.upsert({
      where: { companyId_code: { companyId, code: statusConfig.code } },
      update: {
        name: statusConfig.name,
        color: statusConfig.color || '#6B7280',
        sortOrder: statusConfig.sortOrder || 0,
        description: statusConfig.description || null,
        notifyCustomer: statusConfig.notifyCustomer || false,
        isTerminal: false,
        lockAfterEntry: statusConfig.allowStatusEdit === false,
        requiresApprovalToExit: false,
      },
      create: {
        companyId,
        name: statusConfig.name,
        code: statusConfig.code,
        color: statusConfig.color || '#6B7280',
        sortOrder: statusConfig.sortOrder || 0,
        description: statusConfig.description || null,
        notifyCustomer: statusConfig.notifyCustomer || false,
        isTerminal: false,
        lockAfterEntry: statusConfig.allowStatusEdit === false,
        requiresApprovalToExit: false,
      }
    });
    console.log(`✅ [ORDER-STATUS-SYNC] Synced status "${statusConfig.code}" to workflow definitions for company ${companyId}`);
  } catch (syncErr) {
    // Non-fatal: log but don't fail the main request
    console.warn(`⚠️ [ORDER-STATUS-SYNC] Could not sync status "${statusConfig.code}" to workflow:`, syncErr.message);
  }
};

/**
 * Remove a status from orderStatusDefinition when it is deactivated/deleted from orderStatusConfig.
 * Only removes if no active workflow transitions reference it.
 */
const removeStatusFromWorkflow = async (prisma, companyId, code) => {
  try {
    const wfStatus = await prisma.orderStatusDefinition.findUnique({
      where: { companyId_code: { companyId, code } },
      include: { fromTransitions: true, toTransitions: true }
    });
    if (!wfStatus) return; // Already gone
    if (wfStatus.fromTransitions.length > 0 || wfStatus.toTransitions.length > 0) {
      // Has linked transition rules — keep it in workflow so existing rules still work
      console.log(`ℹ️ [ORDER-STATUS-SYNC] Skipped removing "${code}" from workflow — has active transition rules.`);
      return;
    }
    await prisma.orderStatusDefinition.delete({
      where: { companyId_code: { companyId, code } }
    });
    console.log(`🗑️ [ORDER-STATUS-SYNC] Removed status "${code}" from workflow definitions for company ${companyId}`);
  } catch (syncErr) {
    console.warn(`⚠️ [ORDER-STATUS-SYNC] Could not remove status "${code}" from workflow:`, syncErr.message);
  }
};

// ═══════════════════════════════════════════════════════════════
// ➕ Create Status
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/order-status
 * إنشاء حالة جديدة
 */
const createStatus = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    const {
      code,
      name,
      nameEn,
      description,
      color,
      icon,
      sortOrder,
      statusType,
      mapsToSystem,
      wooCommerceStatus,
      allowedNextStatuses,
      autoActions,
      notifyCustomer,
      notifyAdmin,
      emailTemplate,
      smsTemplate,
      allowStatusEdit
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'الكود والاسم مطلوبان' });
    }

    // 🛡️ Validate name length, code format, and color hex
    const validationError = validateStatusFields({ code, name, color });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    // التحقق من عدم تكرار الكود
    const finalCode = code.toUpperCase().replace(/\s+/g, '_');
    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { companyId, code: finalCode }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'هذا الكود موجود بالفعل' });
    }
    const status = await getSharedPrismaClient().orderStatusConfig.create({
      data: {
        companyId,
        code: finalCode,
        name,
        nameEn,
        description,
        color: color || '#6B7280',
        icon,
        sortOrder: sortOrder || 0,
        statusType: statusType || 'order',
        source: 'custom',
        isSystemStatus: false,
        mapsToSystem,
        wooCommerceStatus,
        allowedNextStatuses: allowedNextStatuses ? JSON.stringify(allowedNextStatuses) : null,
        autoActions: autoActions ? JSON.stringify(autoActions) : null,
        notifyCustomer: notifyCustomer || false,
        notifyAdmin: notifyAdmin || false,
        emailTemplate,
        smsTemplate,
        allowStatusEdit: allowStatusEdit !== undefined ? allowStatusEdit : true
      }
    });

    // 🔄 Auto-sync to workflow statuses so it appears in TransitionRules immediately
    await syncStatusToWorkflow(getSharedPrismaClient(), companyId, status);

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحالة بنجاح',
      data: status
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error creating status:', error);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحالة', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// ✏️ Update Status
// ═══════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/order-status/:id
 * تحديث حالة
 */
const updateStatus = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;

    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الحالة غير موجودة' });
    }

    const {
      name,
      nameEn,
      description,
      color,
      icon,
      sortOrder,
      mapsToSystem,
      wooCommerceStatus,
      allowedNextStatuses,
      autoActions,
      notifyCustomer,
      notifyAdmin,
      emailTemplate,
      smsTemplate,
      isActive,
      allowStatusEdit
    } = req.body;

    // 🛡️ Validate optional fields if provided
    if (name !== undefined && name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ success: false, message: `اسم الحالة لا يمكن أن يتجاوز ${MAX_NAME_LENGTH} حرفًا` });
    }
    if (color !== undefined && !HEX_COLOR_REGEX.test(color)) {
      return res.status(400).json({ success: false, message: 'لون الحالة يجب أن يكون كود hex صالح (مثال: #3B82F6)' });
    }

    const status = await getSharedPrismaClient().orderStatusConfig.update({
      where: { id },
      data: {
        name: name || existing.name,
        nameEn,
        description,
        color: color || existing.color,
        icon,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        mapsToSystem,
        wooCommerceStatus,
        allowedNextStatuses: allowedNextStatuses ? JSON.stringify(allowedNextStatuses) : existing.allowedNextStatuses,
        autoActions: autoActions ? JSON.stringify(autoActions) : existing.autoActions,
        notifyCustomer: notifyCustomer !== undefined ? notifyCustomer : existing.notifyCustomer,
        notifyAdmin: notifyAdmin !== undefined ? notifyAdmin : existing.notifyAdmin,
        emailTemplate,
        smsTemplate,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        allowStatusEdit: allowStatusEdit !== undefined ? allowStatusEdit : existing.allowStatusEdit
      }
    });

    // 🔄 Auto-sync name/color/description to workflow so TransitionRules stay in sync
    if (status.isActive !== false) {
      await syncStatusToWorkflow(getSharedPrismaClient(), companyId, status);
    } else {
      // Status deactivated — try to remove from workflow if no transitions use it
      await removeStatusFromWorkflow(getSharedPrismaClient(), companyId, status.code);
    }

    res.json({
      success: true,
      message: 'تم تحديث الحالة بنجاح',
      data: status
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error updating status:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الحالة', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🗑️ Delete Status
// ═══════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/order-status/:id
 * حذف حالة (soft delete)
 */
const deleteStatus = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;

    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الحالة غير موجودة' });
    }

    await getSharedPrismaClient().orderStatusConfig.update({
      where: { id },
      data: { isActive: false }
    });

    // 🔄 Remove from workflow definitions if no transitions reference it
    await removeStatusFromWorkflow(getSharedPrismaClient(), companyId, existing.code);

    res.json({
      success: true,
      message: 'تم حذف الحالة بنجاح'
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error deleting status:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف الحالة', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 Sync with WooCommerce
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/order-status/sync-woocommerce
 * مزامنة واكتشاف الحالات من WooCommerce
 */
const syncWooCommerceStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    // جلب إعدادات WooCommerce
    const settings = await getSharedPrismaClient().woocommerceSettings.findFirst({
      where: { companyId }
    });

    if (!settings) {
      return res.status(400).json({
        success: false,
        message: 'إعدادات WooCommerce غير موجودة. يرجى ربط المتجر أولاً.'
      });
    }

    const baseURL = settings.storeUrl.replace(/\/$/, '');

    // جلب الحالات من WooCommerce
    let wooStatuses = [];

    try {
      // محاولة جلب الحالات من WooCommerce API
      const response = await axios.get(`${baseURL}/wp-json/wc/v3/orders`, {
        auth: {
          username: settings.consumerKey,
          password: settings.consumerSecret
        },
        params: { per_page: 100 },
        timeout: 30000
      });

      // استخراج الحالات الفريدة من الطلبات
      const uniqueStatuses = new Set();
      response.data.forEach(order => {
        if (order.status) {
          uniqueStatuses.add(order.status);
        }
      });

      wooStatuses = Array.from(uniqueStatuses);

    } catch (apiError) {
      console.log('⚠️ [ORDER-STATUS] Could not fetch orders, using default WooCommerce statuses');
      wooStatuses = Object.keys(WOOCOMMERCE_STATUSES);
    }

    // إضافة الحالات الافتراضية لـ WooCommerce
    Object.keys(WOOCOMMERCE_STATUSES).forEach(status => {
      if (!wooStatuses.includes(status)) {
        wooStatuses.push(status);
      }
    });

    const results = {
      discovered: [],
      existing: [],
      created: []
    };

    // معالجة كل حالة
    for (const wooStatus of wooStatuses) {
      const statusCode = `WOO_${wooStatus.toUpperCase().replace(/-/g, '_')}`;

      // التحقق من وجود الحالة
      const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
        where: {
          companyId,
          OR: [
            { code: statusCode },
            { wooCommerceStatus: wooStatus }
          ]
        }
      });

      if (existing) {
        results.existing.push({ code: wooStatus, localCode: existing.code });
        continue;
      }

      // إنشاء حالة جديدة
      const defaultInfo = WOOCOMMERCE_STATUSES[wooStatus] || {
        name: wooStatus,
        nameEn: wooStatus,
        color: '#6B7280',
        mapsToSystem: 'PENDING'
      };

      const newStatus = await getSharedPrismaClient().orderStatusConfig.create({
        data: {
          companyId,
          code: statusCode,
          name: defaultInfo.name,
          nameEn: defaultInfo.nameEn,
          color: defaultInfo.color,
          icon: 'Tag',
          sortOrder: 100 + results.created.length,
          statusType: 'order',
          source: 'woocommerce',
          isSystemStatus: false,
          mapsToSystem: defaultInfo.mapsToSystem,
          wooCommerceStatus: wooStatus
        }
      });

      results.discovered.push(wooStatus);
      results.created.push(newStatus);
    }

    res.json({
      success: true,
      message: `تم اكتشاف ${results.discovered.length} حالة جديدة من WooCommerce`,
      data: {
        discovered: results.discovered,
        existing: results.existing.length,
        created: results.created.length,
        statuses: results.created
      }
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error syncing WooCommerce statuses:', error);
    res.status(500).json({
      success: false,
      message: 'خطأ في مزامنة الحالات',
      error: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 Update Status Mapping
// ═══════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/order-status/:id/mapping
 * تحديث ربط الحالة
 */
const updateStatusMapping = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { id } = req.params;
    const { mapsToSystem, wooCommerceStatus } = req.body;

    const existing = await getSharedPrismaClient().orderStatusConfig.findFirst({
      where: { id, companyId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'الحالة غير موجودة' });
    }

    const status = await getSharedPrismaClient().orderStatusConfig.update({
      where: { id },
      data: { mapsToSystem, wooCommerceStatus }
    });

    res.json({
      success: true,
      message: 'تم تحديث الربط بنجاح',
      data: status
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error updating mapping:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الربط', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 Reorder Statuses
// ═══════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/order-status/reorder
 * إعادة ترتيب الحالات
 */
const reorderStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    const { statusIds } = req.body; // Array of status IDs in new order

    if (!statusIds || !Array.isArray(statusIds)) {
      return res.status(400).json({ success: false, message: 'قائمة الحالات مطلوبة' });
    }

    // تحديث الترتيب
    for (let i = 0; i < statusIds.length; i++) {
      await getSharedPrismaClient().orderStatusConfig.updateMany({
        where: { id: statusIds[i], companyId },
        data: { sortOrder: i + 1 }
      });
    }

    res.json({
      success: true,
      message: 'تم إعادة الترتيب بنجاح'
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error reordering:', error);
    res.status(500).json({ success: false, message: 'خطأ في إعادة الترتيب', error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔧 Initialize Default Statuses
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/order-status/initialize
 * تهيئة الحالات الافتراضية
 */
const initializeStatuses = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    await initializeDefaultStatuses(companyId);

    // 🔄 Sync all order statuses to workflow definitions (backfill)
    const prisma = getSharedPrismaClient();
    const orderStatuses = await prisma.orderStatusConfig.findMany({
      where: { companyId, isActive: true, statusType: 'order' },
      orderBy: { sortOrder: 'asc' }
    });
    for (const s of orderStatuses) {
      await syncStatusToWorkflow(prisma, companyId, s);
    }

    const statuses = await prisma.orderStatusConfig.findMany({
      where: { companyId },
      orderBy: { sortOrder: 'asc' }
    });

    res.json({
      success: true,
      message: 'تم تهيئة الحالات الافتراضية',
      data: statuses
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error initializing:', error);
    res.status(500).json({ success: false, message: 'خطأ في التهيئة', error: error.message });
  }
};

/**
 * Helper: تهيئة الحالات الافتراضية
 */
/**
 * ⚡ Refactored: one read + parallel upserts in a transaction.
 * Previously: 4 loops × (N × findFirst + N × create/update) = O(8N) sequential queries.
 * Now: 1 read + 1 transaction with N parallel upserts = O(1) round-trips.
 */
const initializeDefaultStatuses = async (companyId) => {
  const prisma = getSharedPrismaClient();

  // Single read: get all existing statuses for this company
  const existingStatuses = await prisma.orderStatusConfig.findMany({
    where: { companyId },
    select: { code: true, statusType: true, isSystemStatus: true, name: true }
  });
  const existingMap = new Map(existingStatuses.map(s => [s.code, s]));

  const makeUpsertData = (status, statusType, source) => ({
    companyId,
    ...status,
    statusType,
    source,
    isSystemStatus: true,
    isActive: true
  });

  const upsertOps = [
    ...DEFAULT_ORDER_STATUSES.map(s => ({
      code: s.code,
      statusType: 'order',
      source: 'system',
      data: makeUpsertData(s, 'order', 'system')
    })),
    ...DEFAULT_PAYMENT_STATUSES.map(s => ({
      code: s.code,
      statusType: 'payment',
      source: 'system',
      data: makeUpsertData(s, 'payment', 'system')
    })),
    ...DEFAULT_SHIPPING_STATUSES.map(s => ({
      code: s.code,
      statusType: 'shipping',
      source: s.code.startsWith('TURBO_') ? 'turbo' : 'system',
      data: makeUpsertData(s, 'shipping', s.code.startsWith('TURBO_') ? 'turbo' : 'system')
    })),
    ...DEFAULT_PREPARATION_STATUSES.map(s => ({
      code: s.code,
      statusType: 'preparation',
      source: 'system',
      data: makeUpsertData(s, 'preparation', 'system')
    }))
  ];

  // Upsert only if missing or stale (not system / wrong type / outdated name for shortage_failed)
  const needsUpdate = upsertOps.filter(op => {
    const existing = existingMap.get(op.code);
    if (!existing) return true;
    if (existing.statusType !== op.statusType || !existing.isSystemStatus) return true;
    if (op.code === 'SHORTAGE_FAILED' && existing.name !== 'عجز نهائي') return true;
    return false;
  });

  if (needsUpdate.length > 0) {
    // Single transaction for all writes — parallel via Promise.all
    await prisma.$transaction(async (tx) => {
      await Promise.all(needsUpdate.map(op =>
        tx.orderStatusConfig.upsert({
          where: { companyId_code: { companyId, code: op.code } },
          update: op.data,
          create: op.data
        })
      ));
    });
    console.log(`🏷️ [ORDER-STATUS] Initialized ${needsUpdate.length} default status(s) for company ${companyId}`);
  }

  // مزامنة حالة العجز النهائي مع جدول تعريفات سير العمل (orderStatusDefinition)
  await syncStatusToWorkflow(prisma, companyId, {
    code: 'SHORTAGE_FAILED',
    name: 'عجز نهائي',
    color: '#7C3AED',
    sortOrder: 19
  });
};

// ═══════════════════════════════════════════════════════════════
// 📊 Get Status Statistics
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/order-status/stats
 * إحصائيات الحالات
 */
const getStatusStats = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    // عدد الحالات حسب النوع
    const statusCounts = await getSharedPrismaClient().orderStatusConfig.groupBy({
      by: ['statusType', 'source'],
      where: { companyId, isActive: true },
      _count: true
    });

    // 🛡️ PRODUCTION-FIX (custom-status-persist): عدد الطلبات لكل "حالة فعلية"
    // (كود مخصص ← مرحلة تجهيز محوّلة ← enum) — نفس أولوية صفحة الطلبات، بدل
    // groupBy على الـ enum بس اللي كان بيخفي الحالات المخصصة نهائيًا.
    const { getEffectiveOrderStatusCounts } = require('../utils/orderEffectiveStatus');
    const effectiveCounts = await getEffectiveOrderStatusCounts(getSharedPrismaClient(), companyId);
    const ordersByStatus = Object.entries(effectiveCounts).map(([status, count]) => ({
      status,
      _count: count
    }));

    res.json({
      success: true,
      data: {
        statusCounts,
        ordersByStatus
      }
    });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error getting stats:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
  }
};

/**
 * GET /api/v1/order-status/with-templates
 * جلب جميع حالات الطلبات مع القوالب المرتبطة بكل حالة
 */
/**
 * تأكد أن كل حالة طلب نشطة لها قالب واتساب افتراضي في الداتابيز.
 * مصدر قوالب الطلبات الوحيد هو صفحة /orders/status-templates، لذا ننشئ
 * القوالب الافتراضية كصفوف DB قابلة للتعديل من الصفحة (وليس في الكود).
 * 🚨 PRODUCTION-FIX (§2.3): seedDefaultOrderTemplates مستوردة من services/orderTemplateSeeding.
 */

const getStatusesWithTemplates = async (req, res) => {
  try {
    const companyId = getRequestCompanyId(req);
    if (!companyId) {
      return res.status(403).json({ success: false, message: 'غير مصرح بالوصول' });
    }

    // Seed default order templates into DB (editable from this page)
    await seedDefaultOrderTemplates(companyId, getSharedPrismaClient());

    const EXTRA_ORDER_EVENTS = [
      { code: 'ORDER_CREATED', name: 'طلب جديد' },
      { code: 'ORDER_CANCELLED', name: 'إلغاء الطلب' },
      { code: 'PAYMENT_REMINDER', name: 'تذكير بالدفع' }
    ];

    const INCOMPLETE_CART_EVENT = {
      code: 'INCOMPLETE_CART_FIRST_APPEARANCE',
      name: 'رسالة أول ظهور - طلب غير مكتمل'
    };

    const incompleteSettings = await getSharedPrismaClient().whatsAppNotificationSettings.findUnique({
      where: { companyId },
      select: { incompleteCartImmediateMessage: true }
    });

    const statuses = await getSharedPrismaClient().orderStatusConfig.findMany({
      where: {
        companyId,
        isActive: true,
        statusType: { in: ['order', 'preparation', 'shipping', 'payment'] }
      },
      orderBy: [{ statusType: 'asc' }, { sortOrder: 'asc' }]
    });

    const allEventCodes = [
      ...statuses.map(s => s.code),
      ...EXTRA_ORDER_EVENTS.map(e => e.code),
      INCOMPLETE_CART_EVENT.code
    ];

    const templates = await getSharedPrismaClient().whatsAppNotificationTemplate.findMany({
      where: {
        companyId,
        eventType: { in: allEventCodes },
        isActive: true
      }
    });

    // كل حالة ليه قالبان مستقلان: template (واتساب عادي/تلقائي) + metaTemplate (قناة META_CLOUD).
    // 🚨 PRODUCTION-FIX (meta-bound-channel-2026-08-26): القالب المربوط بميتا بيتسجّل بـ channel=AUTO
    // (legacy) مع metaTemplateName معتمد — الـ sender بيلقطه بـ metaTemplateName+APPROVED بغض النظر
    // عن الـ channel (findNotificationTemplateForEvent). لكن العرض هنا كان بيفصل metaMap بالاعتماد على
    // channel==='META_CLOUD' فقط → القوالب المربوطة بتقع في regularMap وmetaMap تفضل فاضية → الصفحة
    // بتعرض "بدون قالب ميتا" رغم إنها مربوطة وبتتبعت. الحل: أي قالب عليه metaTemplateName يتحسب
    // قالب ميتا (legacy أو جديد)، ونفضّل المربوط المعتمد عند تكرار الصفوف لنفس الحالة.
    const regularMap = {};
    const metaMap = {};
    const isMetaBound = (t) => Boolean(t.metaTemplateName);
    const isApproved = (t) => String(t.metaTemplateStatus || '').toUpperCase() === 'APPROVED';
    const setPreferring = (map, key, t) => {
      const existing = map[key];
      if (!existing) { map[key] = t; return; }
      // فضّل الصف اللي عليه ربط ميتا على اللي من غيره، ثم المعتمد على اللي pending.
      const existingBound = isMetaBound(existing);
      const tBound = isMetaBound(t);
      if (tBound && !existingBound) { map[key] = t; return; }
      if (tBound === existingBound && isApproved(t) && !isApproved(existing)) { map[key] = t; }
    };
    for (const t of templates) {
      const isMeta = String(t.channel || '').toUpperCase() === 'META_CLOUD' || isMetaBound(t);
      setPreferring(isMeta ? metaMap : regularMap, t.eventType, t);
    }

    const buildStatus = (base, code) => {
      const regular = regularMap[code] || null;
      const meta = metaMap[code] || null;
      return {
        ...base,
        template: regular,
        metaTemplate: meta,
        hasTemplate: !!regular || !!meta,
        hasMetaTemplate: !!meta,
        isNonNotifiable: isNonNotifiableStatus(code)
      };
    };

    const result = [
      ...statuses.map(s => buildStatus(s, s.code)),
      // أحداث الطلبات العامة (غير مرتبطة بحالة orderStatusConfig) تظهر هنا
      // حتى يمكن إدارتها من صفحة قوالب الطلبات بدلاً من القوالب المثبتة في الكود.
      ...EXTRA_ORDER_EVENTS.map(e => buildStatus({
        id: `extra-${e.code}`,
        code: e.code,
        name: e.name,
        color: '#6B7280',
        sortOrder: 999,
        statusType: 'order',
        notifyCustomer: true,
        isSystemStatus: true
      }, e.code)),
      buildStatus({
        id: `extra-${INCOMPLETE_CART_EVENT.code}`,
        code: INCOMPLETE_CART_EVENT.code,
        name: INCOMPLETE_CART_EVENT.name,
        color: '#7C3AED',
        sortOrder: 999,
        statusType: 'incomplete',
        notifyCustomer: incompleteSettings?.incompleteCartImmediateMessage === true,
        isSystemStatus: true
      }, INCOMPLETE_CART_EVENT.code)
    ];

    res.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ [ORDER-STATUS] Error getting statuses with templates:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات', error: error.message });
  }
};

module.exports = {
  getAllStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
  syncWooCommerceStatuses,
  updateStatusMapping,
  reorderStatuses,
  initializeStatuses,
  getStatusStats,
  initializeDefaultStatuses,
  DEFAULT_ORDER_STATUSES,
  getStatusesWithTemplates
};

