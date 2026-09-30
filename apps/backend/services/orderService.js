const { randomUUID } = require('crypto');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getWooCommerceAutoExportService } = require('./wooCommerceAutoExportService');
const WalletService = require('./walletService');
const internalSyncService = require('./internalSyncService');
const customerBlocklistService = require('./customerBlocklistService');
const {
  ensureWithinPlanLimit,
  createLimitExceededError,
} = require('../utils/planLimitPayloads');
const { serializeTurboMetadata } = require('../utils/turbo/turboMetadata');
const { VALID_ORDER_STATUS_ENUM } = require('../utils/orderStatusEnum');

const normalizeWhatsAppOrderStatus = (status) => {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (!normalizedStatus) {
    return null;
  }

  const statusAliases = {
    PREPARING: 'PICKING',
    PACKAGED: 'PACKED'
  };

  return statusAliases[normalizedStatus] || normalizedStatus;
};

const FAILURE_STATUSES_REQUIRING_CALLS = new Set(['DELIVERY_FAILED', 'NO_ANSWER']);

// Statuses that can appear as preparation stages. The preparation queue reads
// metadata.preparationStatus as its source of truth (with order.status as a
// fallback), so any external status change to one of these MUST also sync the
// metadata field — otherwise the change never appears on the preparation page.
// This set mirrors the stages of normalizePreparationStage (WAITING/PREPARING/
// QUALITY_CHECK/PACKAGED/STOCK_SHORTAGE/READY_TO_SHIP/PENDING_CANCELLATION/
// ON_HOLD_PREP) so moves to e.g. CONFIRMED (from PREPARING) also sync.
const PREPARATION_PIPELINE_STATUSES = new Set([
  'PENDING',
  'CONFIRMED',
  'SCHEDULED',
  'PENDING_PREPARATION',
  'PREPARING',
  'PROCESSING',
  'QUALITY_CHECK',
  'PACKAGED',
  'PACKED',
  'READY',
  'READY_TO_SHIP',
  'STOCK_SHORTAGE',
  'PENDING_STOCK',
  'ON_HOLD_STOCK',
  'PENDING_CANCELLATION',
  'ON_HOLD_PREP'
]);

// 🛡️ PRODUCTION-FIX (stale-prep-hijack): المراحل الحقيقية لطابور التجهيز فقط —
// اللي يُسمح بكتابتها في metadata.preparationStatus. الحالات النظامية العادية
// (PENDING/CONFIRMED/SCHEDULED/PROCESSING) خارجها عمدًا: التغيير ليها لازم يمسح
// أي مرحلة تجهيز قديمة بدل ما يكتبها ويخطف العرض (كانت بتترجم PROCESSING دايمًا).
const PREP_METADATA_STATUSES = new Set([
  'PENDING_PREPARATION',
  'PREPARING',
  'QUALITY_CHECK',
  'PACKAGED',
  'PACKED',
  'READY',
  'READY_TO_SHIP',
  'STOCK_SHORTAGE',
  'PENDING_STOCK',
  'ON_HOLD_STOCK',
  'ON_HOLD_PREP'
]);

const parsePreparationMetadata = (rawValue) => {
  if (!rawValue) return {};
  if (typeof rawValue === 'object' && !Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (_error) { /* fall through */ }
  }
  return {};
};

const normalizeOrderStatusCode = (status) => String(status || '').trim().toUpperCase();

const createOrderStatusError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const isWorkflowConfigEnabled = (config) => Boolean(config?.enabled || config?.isEnabled);

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

class OrderService {
  constructor(companyId = null) {
    this.companyId = companyId;
    //console.log('🛒 OrderService initialized', companyId ? `for company ${companyId}` : 'without companyId');
  }

  setCompanyId(companyId) {
    this.companyId = companyId;
    return this;
  }

  getPrisma() {
    return getSharedPrismaClient();
  }

  assertCallAttemptRequirement(order, status) {
    const targetStatus = normalizeOrderStatusCode(status);
    const currentStatus = normalizeOrderStatusCode(order?.status);

    if (targetStatus === currentStatus) {
      return;
    }

    if (!FAILURE_STATUSES_REQUIRING_CALLS.has(targetStatus)) {
      return;
    }

    const callAttempts = Number(order?.callAttempts || 0);
    if (callAttempts < 3) {
      throw createOrderStatusError(
        `لا يمكن تحويل الطلب لهذه الحالة قبل إجراء 3 محاولات اتصال على الأقل (المحاولات الحالية: ${callAttempts})`,
        400
      );
    }
  }

  /**
   * 🚨 PRODUCTION-FIX (notifications-fix-plan §5.2):
   * مزامنة metadata.preparationStatus لحالة معيّنة — مستخرج من updateOrderStatus
   * (المنطق الأصلي عند L1012-1021) ليُستدعى من خارج المسار الموحّد (مثل مسارات
   * الشغّالة المتقدمة التي تستخدم prisma.order.update خام). Idempotent — لا يكتب
   * شيئاً لو الحالة ليست من PREPARATION_PIPELINE_STATUSES.
   */
  async syncPreparationMetadata(orderId, status, prismaClient = null) {
    const normalized = String(status || '').toUpperCase();
    const prisma = prismaClient || this.getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { metadata: true },
    });
    if (!order) return null;
    const currentMetadata = parsePreparationMetadata(order.metadata);

    let nextMetadata;
    if (PREP_METADATA_STATUSES.has(normalized)) {
      nextMetadata = JSON.stringify({
        ...currentMetadata,
        preparationStatus: normalized,
        preparationStatusUpdatedAt: new Date().toISOString(),
      });
    } else if (currentMetadata.preparationStatus) {
      // Clear stale preparationStatus when transitioning to a non-prep status
      const { preparationStatus, preparationStatusUpdatedAt, ...rest } = currentMetadata;
      nextMetadata = JSON.stringify(rest);
    } else {
      return null;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { metadata: nextMetadata },
    });
    return nextMetadata;
  }

  async validateConfiguredStatusTransition(companyId, currentStatus, nextStatus, options = {}) {
    const { skipValidation = false } = options;
    if (skipValidation) return;

    const normalizedCurrentStatus = normalizeOrderStatusCode(currentStatus);
    const normalizedNextStatus = normalizeOrderStatusCode(nextStatus);

    // If status is unchanged (e.g. updating notes or return reason in-place), skip transition check
    if (normalizedCurrentStatus === normalizedNextStatus) {
      return;
    }

    const prisma = this.getPrisma();
    const statusConfig = await prisma.orderStatusConfig.findFirst({
      where: {
        companyId,
        code: normalizedCurrentStatus,
        statusType: 'order',
        isActive: true
      }
    });

    if (!statusConfig?.allowedNextStatuses) {
      return;
    }

    let allowed = null;
    try {
      allowed = JSON.parse(statusConfig.allowedNextStatuses);
    } catch (error) {
      allowed = null;
    }

    const normalizedAllowedStatuses = Array.isArray(allowed)
      ? allowed.map((value) => normalizeOrderStatusCode(value))
      : [];

    if (normalizedAllowedStatuses.length > 0 && !normalizedAllowedStatuses.includes(normalizedNextStatus)) {
      throw createOrderStatusError(`لا يمكن الانتقال من الحالة ${normalizedCurrentStatus} إلى ${normalizedNextStatus}`);
    }
  }

  async logWorkflowAuditIfNeeded(companyId, orderId, workflowAuditLog, fallbackUserId = null, fallbackReason = null) {
    if (!workflowAuditLog?.toStatusId) {
      return;
    }

    const orderWorkflowService = require('./orderWorkflowService');
    await orderWorkflowService.logAudit(
      companyId,
      orderId,
      workflowAuditLog.fromStatusId || null,
      workflowAuditLog.toStatusId,
      workflowAuditLog.changedBy || fallbackUserId,
      workflowAuditLog.changeType || 'normal',
      workflowAuditLog.reason ?? fallbackReason
    );
  }

  /**
   * حفظ عنوان العميل من الطلب (بيتحفظ تلقائياً في metadata.address عشان يظهر في "بياناتي")
   */
  async _saveCustomerAddress(customerId, companyId, rawAddress) {
    if (!customerId || !companyId || !rawAddress) return;
    let address = '';
    if (typeof rawAddress === 'string') {
      address = rawAddress.trim();
    } else if (typeof rawAddress === 'object') {
      try {
        address = [
          rawAddress.street || rawAddress.address || rawAddress.details || '',
          rawAddress.city || rawAddress.governorate || rawAddress.state || '',
          rawAddress.country || '',
        ].filter(Boolean).join('، ').trim();
        if (!address) address = JSON.stringify(rawAddress);
      } catch (e) {
        address = '';
      }
    }
    if (!address) return;

    try {
      const prisma = this.getPrisma();
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: { id: true, metadata: true }
      });
      if (!customer) return;
      let meta = {};
      try {
        meta = customer.metadata ? JSON.parse(customer.metadata) : {};
      } catch (e) {
        meta = {};
      }
      if (meta.address === address) return;
      meta.address = address;
      await prisma.customer.update({
        where: { id: customer.id },
        data: { metadata: JSON.stringify(meta) }
      });
      console.log(`✅ [ORDER-SERVICE] Saved customer address (${customer.id})`);
    } catch (e) {
      console.error('⚠️ [ORDER-SERVICE] Failed to save customer address:', e?.message || e);
    }
  }

  // إنشاء طلب جديد من المحادثة (نسخة مبسطة)
  async createOrderFromConversation(data) {
    try {
      const {
        conversationId,
        customerId,
        companyId,
        productName,
        productColor,
        productSize,
        productPrice,
        quantity = 1,
        customerName,
        customerPhone,
        city,
        notes
      } = data;

      //console.log('🛒 Creating new order from conversation:', {
      //   conversationId,
      //   customerId,
      //   productName,
      //   productColor,
      //   productSize,
      //   productPrice,
      //   quantity
      // });

      const blockEvaluation = await customerBlocklistService.evaluateCustomerBlock(
        this.getPrisma(),
        {
          companyId,
          customerId,
          phone: customerPhone,
          email: data.customerEmail,
          source: 'ai',
          paymentMethod: data.paymentMethod || 'CASH',
        },
      );

      if (blockEvaluation.blocked) {
        const error = new Error(blockEvaluation.payload.message);
        error.statusCode = 403;
        error.payload = {
          success: false,
          code: blockEvaluation.payload.code,
          message: blockEvaluation.payload.message,
          error: blockEvaluation.payload.message,
          customerBlock: blockEvaluation.payload,
        };
        throw error;
      }

      const customer = await this.findOrCreateConversationCustomer({
        companyId,
        customerId,
        customerName,
        customerPhone,
        customerEmail: data.customerEmail,
      });
      const resolvedCustomerId = customer?.id || customerId;
      if (!resolvedCustomerId) {
        throw createOrderStatusError('Customer is required to create an order');
      }

      // إنشاء رقم طلب فريد
      const orderNumber = await this.generateOrderNumber(companyId);

      // حساب المجموع
      const subtotal = parseFloat(productPrice) * quantity;

      // 🎁 جلب مكافآت الولاء وتطبيقها
      let rewards = null;
      try {
        const loyaltyService = require('./hr/customerLoyaltyService');
        rewards = await loyaltyService.getCustomerActiveRewards(companyId, resolvedCustomerId);
      } catch (err) {
        console.error('⚠️ Loyalty Rewards Fetch Failed:', err.message);
      }

      let finalSubtotal = subtotal;
      let appliedDiscount = 0;

      if (rewards && rewards.discountPercent > 0) {
        appliedDiscount = (subtotal * rewards.discountPercent) / 100;
        finalSubtotal = subtotal - appliedDiscount;
      }

      // 🎁 الخصم التلقائي: لو نظام الخصم التلقائي مفعّل والعميل عنده كوبون خصم فعّال،
      // نطبقه على الطلب (من المحادثة) — مش بس طلبات المتجر.
      let autoDiscountVoucherId = null;
      let autoDiscountAppliedValue = 0;
      try {
        const autoDiscountService = require('./autoDiscountService');
        const autoActive = await autoDiscountService.isAutoDiscountActive(companyId);
        if (autoActive && resolvedCustomerId) {
          const voucherRes = await autoDiscountService.applyVoucherDiscount({
            companyId,
            customerId: resolvedCustomerId,
            cartTotal: finalSubtotal
          });
          if (voucherRes.discount > 0 && voucherRes.voucher) {
            appliedDiscount += voucherRes.discount;
            finalSubtotal = subtotal - appliedDiscount;
            autoDiscountVoucherId = voucherRes.voucher.id;
            autoDiscountAppliedValue = voucherRes.discount;
            await autoDiscountService.markVoucherUsed(voucherRes.voucher.id);
            console.log(`✅ [AUTO-DISCOUNT] Applied ${voucherRes.discount} EGP discount to conversation order for customer ${resolvedCustomerId}`);
          }
        }
      } catch (autoDiscountError) {
        console.error('❌ [AUTO-DISCOUNT] Failed to apply auto discount on conversation order:', autoDiscountError.message);
      }

      let conversationDiscountReason = null;
      if (appliedDiscount > 0) {
        const reasons = [];
        if (rewards && rewards.discountPercent > 0) {
          reasons.push(`مكافأة ولاء (${rewards.discountPercent}%)`);
        }
        if (autoDiscountVoucherId) {
          reasons.push('كوبون خصم تلقائي');
        }
        conversationDiscountReason = reasons.length > 0 ? reasons.join(' + ') : 'خصم خاص';
      }

      const explicitShipping = toFiniteNumberOrNull(data.shippingAmount ?? data.shippingCost ?? data.shipping);
      const shipping = explicitShipping !== null
        ? explicitShipping
        : parseFloat(this.calculateShipping(city, subtotal, rewards));
      const total = finalSubtotal + shipping;

      // فحص التكرار قبل الإنشاء
      const duplicateSettings = await this.getDuplicateSettings(companyId);
      let duplicateMatch = null;
      if (duplicateSettings?.enabled !== false && (customerPhone || data.customerEmail)) {
        duplicateMatch = await this.findDuplicateOrder({
          companyId,
          customerPhone,
          customerEmail: data.customerEmail,
          total,
          items: [{ productId: productName, productName, quantity: Number(quantity) || 1, price: productPrice }],
          settings: duplicateSettings,
          includeGuest: duplicateSettings.includeStoreOrders
        });
      }

      const isDuplicate = !!duplicateMatch;

      if (isDuplicate && duplicateSettings?.action === 'block') {
        return {
          success: true,
          duplicate: true,
          duplicateOf: duplicateMatch.order.id,
          order: duplicateMatch.order,
          message: 'تم تجاهل الطلب المكرر'
        };
      }

      // إنشاء الطلب بدون items (سنضيفها لاحقاً)
      const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
      if (!orderLimitCheck.allowed) {
        throw createLimitExceededError(orderLimitCheck.payload);
      }

      const productId = productName
        ? await this.findOrCreateProduct(productName, companyId)
        : null;

      let productSku = null;
      let productImage = data.productImage || data.image || null;
      if (productId) {
        const product = await this.getPrisma().product.findUnique({
          where: { id: productId },
          select: { sku: true, mainImage: true, images: true }
        });
        productSku = product?.sku || null;
        if (!productImage) {
          productImage = product?.mainImage || (product?.images ? (typeof product.images === 'string' ? JSON.parse(product.images)[0] : product.images[0]) : null);
        }
      }

      const orderItem = {
        productId,
        productSku,
        productImage,
        quantity,
        price: parseFloat(Number(productPrice).toFixed(2)),
        total: parseFloat(subtotal.toFixed(2)),
        productName: productName || null,
        productColor: productColor ? String(productColor) : null,
        productSize: productSize != null ? String(productSize) : null,
        extractionSource: 'ai',
        confidence: 1,
        metadata: JSON.stringify({
          source: 'conversation_automation',
          conversationId: conversationId || null,
          image: productImage || null,
        }),
      };

      // جلب بيانات المحادثة وتوريث attribution إذا كان الطلب من محادثة
      let conversationAttribution = null;
      if (conversationId) {
        try {
          const conv = await this.getPrisma().conversation.findUnique({
            where: { id: conversationId },
            select: { id: true, channel: true, metadata: true }
          });
          if (conv) {
            let convMeta = {};
            try { convMeta = typeof conv.metadata === 'string' ? JSON.parse(conv.metadata) : (conv.metadata || {}); } catch (_) {}
            const convPlatform = (conv.channel || convMeta.platform || 'facebook').toLowerCase();
            const adId = convMeta.adId || null;
            const adTitle = convMeta.adsContextData?.ad_title || null;
            const campaignName = adTitle || (adId ? `إعلان فيسبوك (${adId})` : `محادثة ${convPlatform === 'whatsapp' ? 'واتساب' : 'فيسبوك'}`);
            conversationAttribution = {
              channel: 'inbox',
              platform: convPlatform,
              source: `${convPlatform}_inbox`,
              medium: adId ? 'click_to_messenger' : 'chat_inbox',
              campaignName,
              campaignId: convMeta.campaignId || null,
              adId,
              adRef: convMeta.adRef || null,
              postId: convMeta.postId || null,
              pageId: convMeta.pageId || null,
              conversationId: conv.id,
              capturedAt: new Date().toISOString()
            };
          }
        } catch (convErr) {
          console.warn('⚠️ [ORDER-SERVICE] Failed to resolve conversation attribution:', convErr.message);
        }
      }

      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.create({
          data: {
            orderNumber,
            company: { connect: { id: companyId } },
            customer: { connect: { id: resolvedCustomerId } },
            conversationId: conversationId || null,
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: 0,
            shipping: parseFloat(shipping.toFixed(2)),
            discount: parseFloat(appliedDiscount.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            currency: 'EGP',
            notes: `طلب من المحادثة\nالمنتج: ${productName}\nاللون: ${productColor}\nالمقاس: ${productSize}\nاسم العميل: ${customerName}\nالهاتف: ${customerPhone}\nالمدينة: ${city}\nالمحادثة: ${conversationId}\n${notes || ''}`,
            status: isDuplicate ? 'DUPLICATE_ORDER' : 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod: 'CASH',
            isViewed: false,
            customerName,
            customerPhone,
            customerEmail: data.customerEmail || null,
            city,
            governorate: data.governorate || null,
            customerAddress: data.customerAddress || data.address || null,
            shippingAddress: data.shippingAddress || data.address || null,
            sourceType: data.sourceType || 'ai_conversation',
            extractionMethod: data.extractionMethod || 'ai_tool',
            metadata: JSON.stringify({
              ...(autoDiscountVoucherId && { autoDiscountVoucherId }),
              ...(autoDiscountVoucherId && { autoDiscountApplied: autoDiscountAppliedValue }),
              ...(conversationId && { conversationId }),
              ...(conversationAttribution && { attribution: conversationAttribution }),
              ...(conversationDiscountReason && { discountReason: conversationDiscountReason }),
              ...(isDuplicate && duplicateMatch && {
                duplicate: {
                  duplicateOfId: duplicateMatch.order.id,
                  duplicateOfOrderNumber: duplicateMatch.order.orderNumber,
                  duplicateOfType: duplicateMatch.type,
                  detectedAt: new Date().toISOString(),
                  windowMinutes: duplicateSettings?.windowEnabled ? duplicateSettings.windowMinutes : null,
                  criteria: duplicateSettings?.criteria,
                  originalStatus: 'PENDING'
                }
              }),
            }),
            orderItems: {
              create: [orderItem],
            },
          }
        });
      }, 5);

      // تنبيه الفريق عند وجود مكرر
      if (isDuplicate && duplicateSettings?.alertTeam) {
        this.alertTeamAboutDuplicate(companyId, customerPhone, duplicateMatch.order, orderNumber);
      }

      // حفظ عنوان العميل تلقائياً من الطلب (يظهر في "بياناتي")
      await this._saveCustomerAddress(
        resolvedCustomerId,
        companyId,
        data.shippingAddress || data.address || data.customerAddress || null
      );

      // تحديث إحصائيات العميل
      await this.updateCustomerStats(resolvedCustomerId, parseFloat(total));

      // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية) - تجاهل للطلبات المكررة
      if (!isDuplicate) {
        try {
          const wooExportService = getWooCommerceAutoExportService();
          wooExportService.exportOrderAsync(order.id);
        } catch (wooError) {
          console.error('⚠️ [ORDER-SERVICE] WooCommerce auto-export skipped:', wooError.message);
        }

        // 🔄 Push order to consumer company if applicable
        internalSyncService.pushOrderToConsumer(order.id, companyId).catch(err => {
          console.error(`❌ Failed to push order ${order.id} to consumer:`, err.message);
        });

        // 🚀 Push order to provider(s) if it contains imported products
        internalSyncService.pushOrderToProvider(order.id, companyId).catch(err => {
          console.error(`❌ [INTERNAL-SYNC] Failed to push order ${order.id} to provider:`, err.message);
        });

        // ⚡ إرسال الويب هوك الصادر للطلبات (Outgoing Webhook)
        try {
          const orderWebhookService = require('./orderWebhookService');
          orderWebhookService.triggerOrderCreated(order.id, companyId);
        } catch (webhookErr) {
          console.warn('⚠️ [ORDER-SERVICE] Failed to trigger order webhook:', webhookErr.message);
        }
      }

      // Trigger auto-distribution immediately
      try {
        const confirmationService = require('./orderConfirmationService');
        await confirmationService.autoAssignOnCreation(companyId, order.id, 'regular');
      } catch (distError) {
        console.error('❌ [ORDER-SERVICE] Error in auto-distribution:', distError.message);
      }

      // 🎁 الولاء: المنح فقط عند التسليم (DELIVERED) — لا تمنح نقاط عند إنشاء طلب المحادثة (PENDING)
      if (order.status === 'DELIVERED') {
        try {
          const customerLoyaltyService = require('./hr/customerLoyaltyService');
          await customerLoyaltyService.applyLoyaltyPointsForOrder({
            orderId: order.id,
            companyId,
            changedBy: data.createdBy
          }).catch((loyaltyError) => {
            console.error(`❌ [LOYALTY-AUTO] Failed to award points for conversation order ${order.orderNumber}:`, loyaltyError.message);
          });
        } catch (loyaltyError) {
          console.error('❌ [LOYALTY-AUTO] Loyalty service error:', loyaltyError.message);
        }
      }

      //console.log('✅ Order created successfully:', order.orderNumber);
      return { ...order, customer };

    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  }

  async findOrCreateConversationCustomer({
    companyId,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
  }) {
    const prisma = this.getPrisma();
    const selectCustomerSql = (rows) => {
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return null;
      return {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        status: row.status,
      };
    };

    if (customerId) {
      const existingById = selectCustomerSql(await safeQuery(async () => {
        return await prisma.$queryRaw`
          SELECT id, "firstName", "lastName", email, phone, status
          FROM customers
          WHERE id = ${customerId} AND "companyId" = ${companyId}
          LIMIT 1
        `;
      }, 3));
      if (existingById) return existingById;
    }

    const phone = customerPhone ? String(customerPhone).trim() : '';
    const normalizedPhone = this.normalizePhone(phone);
    const phoneCandidates = [...new Set([phone, normalizedPhone].filter(Boolean))];
    const email = customerEmail ? String(customerEmail).trim().toLowerCase() : '';
    for (const phoneCandidate of phoneCandidates) {
      const existingByPhone = selectCustomerSql(await safeQuery(async () => {
        return await prisma.$queryRaw`
          SELECT id, "firstName", "lastName", email, phone, status
          FROM customers
          WHERE "companyId" = ${companyId} AND phone = ${phoneCandidate}
          LIMIT 1
        `;
      }, 3));
      if (existingByPhone) return existingByPhone;
    }

    if (email) {
      const existingByEmail = selectCustomerSql(await safeQuery(async () => {
        return await prisma.$queryRaw`
          SELECT id, "firstName", "lastName", email, phone, status
          FROM customers
          WHERE "companyId" = ${companyId} AND email = ${email}
          LIMIT 1
        `;
      }, 3));
      if (existingByEmail) return existingByEmail;
    }

    const displayName = String(customerName || phone || email || 'Customer').trim();
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const firstName = nameParts.shift() || displayName || 'Customer';
    const lastName = nameParts.join(' ');

    const id = `cust_${randomUUID()}`;
    const metadata = JSON.stringify({
      source: 'ai_conversation_order',
    });

    const insertedCustomer = selectCustomerSql(await safeQuery(async () => {
      return await prisma.$queryRaw`
        INSERT INTO customers (
          id,
          "firstName",
          "lastName",
          email,
          phone,
          status,
          metadata,
          "companyId",
          "createdAt",
          "updatedAt",
          "customerRating",
          "successScore",
          "deliveryRate",
          "totalDelivered",
          "totalOrdersCount"
        )
        VALUES (
          ${id},
          ${firstName},
          ${lastName},
          ${email || null},
          ${phone || null},
          'LEAD'::customers_status,
          ${metadata},
          ${companyId},
          NOW(),
          NOW(),
          'UNKNOWN'::"customers_customerRating",
          0,
          0,
          0,
          0
        )
        RETURNING id, "firstName", "lastName", email, phone, status
      `;
    }, 5));

    return insertedCustomer || {
      id,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      status: 'LEAD',
    };
  }

  // إنشاء رقم طلب فريد
  async generateOrderNumber(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;

    // Check if sequential numbering is enabled
    if (effectiveCompanyId) {
      const settings = await this.getOrderSettings(effectiveCompanyId);
      if (settings?.enableSequentialOrders) {
        return await this.getNextSequentialOrderNumber(effectiveCompanyId);
      }
    }

    // Fallback to timestamp-based numbering
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  // Get next sequential order number with atomic increment
  async getNextSequentialOrderNumber(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;
    if (!effectiveCompanyId) throw new Error('Company ID is required for sequential numbering');

    const prisma = this.getPrisma();

    // 🚀 Fast atomic allocation (single round-trip, zero interactive lock queueing)
    try {
      const rows = await prisma.$queryRaw`
        UPDATE "order_invoice_settings"
        SET "nextOrderNumber" = "nextOrderNumber" + 1, "updatedAt" = NOW()
        WHERE "companyId" = ${effectiveCompanyId}
        RETURNING "orderPrefix", ("nextOrderNumber" - 1) AS "allocatedNumber"
      `;

      if (rows && rows.length > 0) {
        const prefix = rows[0].orderPrefix || 'ORD';
        const allocated = rows[0].allocatedNumber;
        return `${prefix}-${allocated}`;
      }
    } catch (atomicErr) {
      console.warn('⚠️ [ORDER-NUMBER] Atomic sequential update fallback:', atomicErr?.message);
    }

    // Fallback: create or retrieve if settings row didn't exist yet
    const settings = await prisma.orderInvoiceSettings.upsert({
      where: { companyId: effectiveCompanyId },
      create: {
        companyId: effectiveCompanyId,
        enableSequentialOrders: true,
        orderPrefix: 'ORD',
        nextOrderNumber: 2,
        orderNumberFormat: 'PREFIX-XXXXXX'
      },
      update: {
        nextOrderNumber: { increment: 1 }
      }
    });

    const prefix = settings.orderPrefix || 'ORD';
    const orderNumber = `${prefix}-${settings.nextOrderNumber - 1}`;
    return orderNumber;
  }

  // Get order settings
  async getOrderSettings(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;
    if (!effectiveCompanyId) return null;

    const prisma = this.getPrisma();
    return await prisma.orderInvoiceSettings.findUnique({
      where: { companyId: effectiveCompanyId }
    });
  }

  // إعدادات التكرار الافتراضية
  getDefaultDuplicateSettings() {
    return {
      enabled: true,
      criteria: 'phone', // 'phone' | 'phone_amount' | 'phone_items'
      activeStatuses: ['PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPED', 'ON_HOLD'],
      windowEnabled: false,
      windowMinutes: 60,
      action: 'record_visible', // 'record_visible' | 'record_hidden' | 'block'
      alertTeam: true,
      includeStoreOrders: true,
      reportTreatment: 'separate', // 'separate' | 'cancelled'
      exemptPhones: []
    };
  }

  // تطبيع وتوحيد إعدادات التكرار مع التوافق التراجعي
  normalizeDuplicateSettings(rawSettings, invoiceSettings = null) {
    const defaults = this.getDefaultDuplicateSettings();
    const raw = rawSettings || {};

    let resolvedAction = raw.action;
    if (!resolvedAction && invoiceSettings?.duplicateOrderAction) {
      if (invoiceSettings.duplicateOrderAction === 'ignore') resolvedAction = 'block';
      else if (invoiceSettings.duplicateOrderAction === 'hidden') resolvedAction = 'record_hidden';
      else resolvedAction = 'record_visible';
    } else if (resolvedAction === 'filter') {
      resolvedAction = 'record_visible';
    } else if (resolvedAction === 'ignore') {
      resolvedAction = 'block';
    } else if (resolvedAction === 'hidden') {
      resolvedAction = 'record_hidden';
    } else if (!resolvedAction) {
      resolvedAction = defaults.action;
    }
    if (!['record_visible', 'record_hidden', 'block'].includes(resolvedAction)) {
      resolvedAction = 'record_visible';
    }

    let windowEnabled = raw.windowEnabled !== undefined ? Boolean(raw.windowEnabled) : defaults.windowEnabled;
    let windowMinutes = Number(raw.windowMinutes || invoiceSettings?.duplicateOrderWindowMinutes || defaults.windowMinutes);
    if (isNaN(windowMinutes) || windowMinutes < 5 || windowMinutes > 10080) windowMinutes = 60;

    let criteria = raw.criteria;
    if (!['phone', 'phone_amount', 'phone_items'].includes(criteria)) {
      criteria = defaults.criteria;
    }

    let activeStatuses = Array.isArray(raw.activeStatuses) && raw.activeStatuses.length > 0
      ? raw.activeStatuses
      : defaults.activeStatuses;

    let exemptPhones = [];
    if (Array.isArray(raw.exemptPhones)) {
      exemptPhones = raw.exemptPhones.map(p => this.normalizePhone(p)).filter(Boolean);
    } else if (typeof raw.exemptPhones === 'string') {
      exemptPhones = raw.exemptPhones.split(/[\n,;]+/).map(p => this.normalizePhone(p)).filter(Boolean);
    }

    return {
      enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : defaults.enabled,
      criteria,
      activeStatuses,
      windowEnabled,
      windowMinutes,
      action: resolvedAction,
      alertTeam: raw.alertTeam !== undefined ? Boolean(raw.alertTeam) : defaults.alertTeam,
      includeStoreOrders: raw.includeStoreOrders !== undefined ? Boolean(raw.includeStoreOrders) : defaults.includeStoreOrders,
      reportTreatment: raw.reportTreatment === 'cancelled' ? 'cancelled' : 'separate',
      exemptPhones
    };
  }

  // إعدادات التكرار لكل شركة
  async getDuplicateSettings(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;
    if (!effectiveCompanyId) return this.getDefaultDuplicateSettings();

    try {
      const prisma = this.getPrisma();
      const [company, invoiceSettings] = await Promise.all([
        prisma.company.findUnique({
          where: { id: effectiveCompanyId },
          select: { settings: true }
        }),
        this.getOrderSettings(effectiveCompanyId)
      ]);

      const companySettings = typeof company?.settings === 'string'
        ? JSON.parse(company.settings || '{}')
        : (company?.settings || {});

      return this.normalizeDuplicateSettings(companySettings.duplicateOrderSettings, invoiceSettings);
    } catch (err) {
      console.warn('⚠️ [DUPLICATE-SETTINGS] Error fetching duplicate settings:', err.message);
      return this.getDefaultDuplicateSettings();
    }
  }

  // سياسة الاستبدال والاسترجاع
  async getExchangeReturnPolicy(companyId = null) {
    const effectiveCompanyId = companyId || this.companyId;
    const defaultPolicy = {
      requirePreviousOrder: false,
      allowedStatuses: ['DELIVERED'],
      timeLimitDays: 14,
      requireExplicitOrderLink: false
    };

    if (!effectiveCompanyId) return defaultPolicy;

    try {
      const prisma = this.getPrisma();
      const company = await prisma.company.findUnique({
        where: { id: effectiveCompanyId },
        select: { settings: true }
      });
      const companySettings = typeof company?.settings === 'string'
        ? JSON.parse(company.settings || '{}')
        : (company?.settings || {});

      const policy = companySettings?.exchangeReturnPolicy;
      if (!policy) return defaultPolicy;

      return {
        requirePreviousOrder: Boolean(policy.requirePreviousOrder),
        allowedStatuses: Array.isArray(policy.allowedStatuses) && policy.allowedStatuses.length > 0
          ? policy.allowedStatuses
          : ['DELIVERED'],
        timeLimitDays: policy.timeLimitDays !== undefined && policy.timeLimitDays !== null
          ? Number(policy.timeLimitDays)
          : 14,
        requireExplicitOrderLink: Boolean(policy.requireExplicitOrderLink)
      };
    } catch (err) {
      console.warn('⚠️ [EXCHANGE-RETURN-POLICY] Error reading policy:', err.message);
      return defaultPolicy;
    }
  }

  // البحث عن الطلبات السابقة المؤهلة للاستبدال أو المرتجع
  async findEligiblePreviousOrders({ companyId, customerId, customerPhone, policy = null }) {
    const effectiveCompanyId = companyId || this.companyId;
    if (!effectiveCompanyId) return [];

    try {
      const prisma = this.getPrisma();
      const resolvedPolicy = policy || await this.getExchangeReturnPolicy(effectiveCompanyId);

      const conditions = [];
      if (customerId) {
        conditions.push({ customerId });
      }
      if (customerPhone) {
        const phoneVariations = this.getPhoneVariationsForDuplicate(customerPhone);
        if (phoneVariations.length > 0) {
          conditions.push({
            OR: phoneVariations.map(p => ({ customerPhone: { contains: p } }))
          });
        }
      }

      if (conditions.length === 0) return [];

      // 🚨 PRODUCTION-FIX (2026-09-29): نفس فخ الـenum المقفول — سياسة الاستبدال/المرتجع
      // بتتظبط من إعدادات التاجر، وأي قيمة مش عضو في OrderStatus بتوقف الاستعلام كله
      // بـ PrismaClientValidationError. ننقّيها ونرجع للافتراضي الصالح لو فضيت.
      const allowedStatuses = this._toValidOrderStatuses(resolvedPolicy.allowedStatuses);
      if (allowedStatuses.length === 0) allowedStatuses.push('DELIVERED');

      const where = {
        companyId: effectiveCompanyId,
        OR: conditions,
        status: { in: allowedStatuses }
      };

      if (resolvedPolicy.timeLimitDays && resolvedPolicy.timeLimitDays > 0) {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - resolvedPolicy.timeLimitDays);
        where.createdAt = { gte: minDate };
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          status: true,
          total: true,
          createdAt: true,
          orderItems: {
            select: {
              id: true,
              productName: true,
              productColor: true,
              productSize: true,
              quantity: true,
              price: true,
              total: true
            }
          }
        }
      });

      return orders;
    } catch (err) {
      console.error('⚠️ [ELIGIBLE-ORDERS] Error finding eligible previous orders:', err.message);
      return [];
    }
  }

  normalizePhone(phone) {
    if (!phone) return null;
    const str = String(phone)
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
    const normalized = str.replace(/\D/g, '');
    return normalized || null;
  }

  // توليد كل الصيغ الممكنة لرقم الهاتف (مصر/دولي) عشان كشف التكرار يمسك نفس الرقم
  // بصيغ مختلفة (012/20/+20/بدون بادئة...). يدعم الأرقام العربية والإنجليزية.
  getPhoneVariationsForDuplicate(input) {
    if (!input) return [];
    const rawStr = String(input);
    const toEnglishDigits = (str) => String(str || '')
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
    const toArabicDigits = (str) => {
      const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return String(str || '').replace(/[0-9]/g, d => ar[Number(d)]);
    };

    const convertedInput = toEnglishDigits(rawStr);
    const clean = convertedInput.replace(/\D/g, '');
    if (!clean) return [];
    const variations = new Set([clean, convertedInput, rawStr]);
    if (clean.startsWith('0') && clean.length === 11) {
      const withoutZero = clean.slice(1);
      variations.add(withoutZero);
      variations.add('+20' + withoutZero);
      variations.add('20' + withoutZero);
    } else if (clean.startsWith('20') && clean.length === 12) {
      const withoutPrefix = clean.slice(2);
      variations.add(withoutPrefix);
      variations.add('0' + withoutPrefix);
      variations.add('+' + clean);
    } else if (clean.startsWith('1') && clean.length === 10) {
      variations.add('0' + clean);
      variations.add('+20' + clean);
      variations.add('20' + clean);
    } else if (clean.length >= 7) {
      if (clean.startsWith('0')) {
        variations.add(clean.slice(1));
      } else {
        variations.add('0' + clean);
      }
    }

    const allVariations = Array.from(variations);
    allVariations.forEach(v => {
      const ar = toArabicDigits(v);
      if (ar) variations.add(ar);
    });

    return Array.from(variations);
  }

  // استخراج قائمة الحالات النشطة المؤهلة للفحص واستبعاد الحالات المنتهية تماماً
  _resolveActiveStatuses(activeStatuses) {
    if (!Array.isArray(activeStatuses) || activeStatuses.length === 0) {
      return ['PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPED', 'ON_HOLD'];
    }

    const resolved = new Set();
    for (const st of activeStatuses) {
      const u = String(st || '').toUpperCase();
      resolved.add(u);
      if (u === 'PREPARING') {
        resolved.add('PENDING_PREPARATION');
        resolved.add('READY_FOR_PROCESSING');
        resolved.add('READY_TO_SHIP');
        resolved.add('PACKAGED');
        resolved.add('QUALITY_CHECK');
        resolved.add('READY');
        resolved.add('ON_HOLD_PREP');
        resolved.add('WOO_TAGHEZ');
      } else if (u === 'SHIPPED') {
        resolved.add('OUT_FOR_DELIVERY');
        resolved.add('turbo_sent');
        resolved.add('out_for_delivery');
        resolved.add('processing');
      } else if (u === 'PROCESSING') {
        resolved.add('READY_FOR_PROCESSING');
        resolved.add('processing');
      } else if (u === 'PENDING') {
        resolved.add('turbo_saved');
      } else if (u === 'ON_HOLD') {
        resolved.add('delayed');
        resolved.add('ON_HOLD_PREP');
      }
    }

    // استبعاد الحالات المنتهية (تم التسليم، مرتجع، ملغي، إلخ) نهائياً من الفحص
    const terminalStatuses = [
      'DELIVERED', 'delivered', 'remitted',
      'RETURNED', 'returned_to_company', 'returned_missing', 'returned_destroyed',
      'PARTIALLY_RETURNED', 'REFUNDED', 'PARTIALLY_REFUNDED',
      'CANCELLED', 'cancelled', 'LOST', 'FAILED', 'TRASH', 'DRAFT', 'DUPLICATE_ORDER'
    ];
    for (const term of terminalStatuses) {
      resolved.delete(term);
      resolved.delete(term.toUpperCase());
      resolved.delete(term.toLowerCase());
    }

    // 🚨 PRODUCTION-FIX (2026-09-29 — PrismaClientValidationError on checkout):
    // الـSet فوق بيخلط قيم enum صالحة (UPPERCASE) مع أسماء قديمة بحروف صغيرة
    // (turbo_saved / processing / turbo_sent / out_for_delivery / delayed)، و`order.status`
    // عمود enum مقفول — أي قيمة مش عضو فيه بتخلي Prisma يرمي PrismaClientValidationError
    // قبل ما ينفّذ الاستعلام أصلاً، فالنتيجة 500 على POST /api/v1/public/orders
    // والعميل مش قادر يخلّص طلبه (حصل فعليًا مع ترافيك إعلانات مدفوع).
    // التنقية: نرفع الحروف ونصفّي على أعضاء enum فقط. الأسماء القديمة اللي بتقابل عضو صالح
    // بتترجع بصيغة العضو الصح (processing → PROCESSING)، واللي مش ليها مقابل بتتشال
    // (turbo_saved / turbo_sent / delayed) — وهي أصلاً مستحيل تطابق عمود enum.
    const validStatuses = this._toValidOrderStatuses(Array.from(resolved));
    if (validStatuses.length === 0) {
      return ['PENDING', 'CONFIRMED', 'PROCESSING', 'PREPARING', 'SHIPPED', 'ON_HOLD'];
    }

    return validStatuses;
  }

  /**
   * 🚨 PRODUCTION-FIX (2026-09-29): بيرجّع بس أعضاء `OrderStatus` الصالحة، بحروف كبيرة،
   * وبلا تكرار. أي قائمة حالات بتروح لـ Prisma (`order.status` / policy) لازم تعدّي من هنا،
   * وإلا استعلام واحد بقيمة غلط يرمي PrismaClientValidationError ويوقف الـ POST كله.
   */
  _toValidOrderStatuses(list) {
    const out = [];
    for (const raw of (Array.isArray(list) ? list : [])) {
      const up = String(raw || '').trim().toUpperCase();
      if (!up || !VALID_ORDER_STATUS_ENUM.has(up)) continue;
      if (!out.includes(up)) out.push(up);
    }
    return out;
  }

  // مقارنة الأصناف مع الطلب السابق لمعيار (موبايل + نفس المنتجات)
  _compareItemsMatch(existingItems, incomingItems) {
    if (!Array.isArray(incomingItems) || incomingItems.length === 0) return false;
    if (!Array.isArray(existingItems) || existingItems.length === 0) return false;

    const normalizeList = (list) => {
      return list.map(item => {
        const id = item.productId || item.variantId || item.id || null;
        const name = (item.productName || item.name || '').trim().toLowerCase();
        const key = id ? String(id) : name;
        const qty = Number(item.quantity || 1);
        return { key, qty };
      }).filter(i => i.key).sort((a, b) => a.key.localeCompare(b.key));
    };

    const norm1 = normalizeList(existingItems);
    const norm2 = normalizeList(incomingItems);

    if (norm1.length !== norm2.length) return false;

    for (let i = 0; i < norm1.length; i++) {
      if (norm1[i].key !== norm2[i].key || norm1[i].qty !== norm2[i].qty) {
        return false;
      }
    }
    return true;
  }

  // مقارنة إجمالي الطلب لمعيار (موبايل + نفس المبلغ)
  _compareAmountMatch(existingTotal, incomingTotal) {
    if (incomingTotal === undefined || incomingTotal === null || isNaN(Number(incomingTotal))) return false;
    const rounded1 = Math.round(Number(existingTotal) * 100);
    const rounded2 = Math.round(Number(incomingTotal) * 100);
    return rounded1 === rounded2;
  }

  // إرسال تنبيه للفريق عند اكتشاف طلب مكرر
  async alertTeamAboutDuplicate(companyId, customerPhone, matchedOrder, newOrderNumber = null) {
    if (!companyId) return;
    try {
      const prisma = this.getPrisma();
      const managers = await prisma.user.findMany({
        where: {
          companyId,
          role: { in: ['COMPANY_ADMIN', 'MANAGER', 'ADMIN'] },
          isActive: true
        },
        select: { id: true }
      });

      const title = 'تنبيه: طلب مكرر';
      const message = newOrderNumber
        ? `تم رصد طلب مكرر (${newOrderNumber}) للعميل ${customerPhone || ''} مطابق للطلب (${matchedOrder?.orderNumber || ''})`
        : `تم رصد طلب مكرر للعميل ${customerPhone || ''} مطابق للطلب (${matchedOrder?.orderNumber || ''})`;

      for (const manager of managers) {
        await prisma.notification.create({
          data: {
            userId: manager.id,
            companyId,
            title,
            message,
            type: 'duplicate_order',
            data: JSON.stringify({
              newOrderNumber,
              matchedOrderId: matchedOrder?.id,
              matchedOrderNumber: matchedOrder?.orderNumber,
              customerPhone
            })
          }
        }).catch(err => console.warn('⚠️ [DUPLICATE-ALERT] Notification create error:', err.message));
      }

      try {
        const socketService = require('./socketService');
        if (socketService?.emitToCompany) {
          socketService.emitToCompany(companyId, 'order:duplicate_alert', {
            newOrderNumber,
            matchedOrderNumber: matchedOrder?.orderNumber,
            customerPhone
          });
        }
      } catch (_) {}
    } catch (e) {
      console.warn('⚠️ [DUPLICATE-ALERT] Error notifying team:', e.message);
    }
  }

  async findDuplicateOrder({
    prisma = null,
    companyId,
    customerPhone,
    customerEmail,
    total,
    items = [],
    settings = null,
    includeGuest = null
  }) {
    if (!companyId) return null;

    const dupSettings = settings || await this.getDuplicateSettings(companyId);
    if (dupSettings.enabled === false) return null;

    const phone = this.normalizePhone(customerPhone);
    const email = customerEmail ? String(customerEmail).trim().toLowerCase() : null;

    if (!phone && !email) return null;

    // فحص الاستثناءات (تجّار الجملة وVIP)
    if (phone && Array.isArray(dupSettings.exemptPhones) && dupSettings.exemptPhones.length > 0) {
      const isExempt = dupSettings.exemptPhones.some(exempt => {
        const normExempt = this.normalizePhone(exempt);
        return normExempt && (normExempt === phone || phone.endsWith(normExempt) || normExempt.endsWith(phone));
      });
      if (isExempt) {
        return null;
      }
    }

    const client = prisma || this.getPrisma();
    const activeStatuses = this._resolveActiveStatuses(dupSettings.activeStatuses);
    if (!activeStatuses || activeStatuses.length === 0) return null;

    const phoneCandidates = phone ? [
      String(customerPhone || '').trim(),
      ...this.getPhoneVariationsForDuplicate(phone || customerPhone)
    ] : [];
    const uniquePhones = [...new Set(phoneCandidates.filter(Boolean))];

    // 1. فحص جدول الطلبات الأساسي (Order)
    const orderOr = [];
    if (uniquePhones.length > 0) {
      orderOr.push({ customerPhone: { in: uniquePhones, mode: 'insensitive' } });
    }
    if (email) {
      orderOr.push({ customerEmail: { equals: email, mode: 'insensitive' } });
    }

    if (orderOr.length > 0) {
      const orderWhere = {
        companyId,
        status: { in: activeStatuses },
        OR: orderOr
      };

      if (dupSettings.windowEnabled && Number(dupSettings.windowMinutes) > 0) {
        orderWhere.createdAt = {
          gte: new Date(Date.now() - Number(dupSettings.windowMinutes) * 60 * 1000)
        };
      }

      const recentOrders = await client.order.findMany({
        where: orderWhere,
        include: {
          orderItems: {
            select: {
              productId: true,
              productName: true,
              quantity: true,
              price: true,
              total: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      for (const order of recentOrders) {
        if (dupSettings.criteria === 'phone') {
          return { type: 'order', order, settings: dupSettings };
        }
        if (dupSettings.criteria === 'phone_amount') {
          if (this._compareAmountMatch(order.total, total)) {
            return { type: 'order', order, settings: dupSettings };
          }
        }
        if (dupSettings.criteria === 'phone_items') {
          if (this._compareItemsMatch(order.orderItems, items)) {
            return { type: 'order', order, settings: dupSettings };
          }
        }
      }
    }

    // 2. فحص طلبات المتجر (GuestOrder) إذا كان الخيار مفعل
    const shouldCheckGuest = includeGuest !== null ? includeGuest : Boolean(dupSettings.includeStoreOrders);
    if (!shouldCheckGuest) return null;

    const guestOr = [];
    if (uniquePhones.length > 0) {
      guestOr.push({ guestPhone: { in: uniquePhones, mode: 'insensitive' } });
    }
    if (email) {
      guestOr.push({ guestEmail: { equals: email, mode: 'insensitive' } });
    }

    if (guestOr.length > 0) {
      const guestStatuses = Array.from(new Set([
        ...activeStatuses,
        ...activeStatuses.map(s => s.toLowerCase())
      ]));
      const guestWhere = {
        companyId,
        status: { in: guestStatuses },
        OR: guestOr
      };

      if (dupSettings.windowEnabled && Number(dupSettings.windowMinutes) > 0) {
        guestWhere.createdAt = {
          gte: new Date(Date.now() - Number(dupSettings.windowMinutes) * 60 * 1000)
        };
      }

      const recentGuestOrders = await client.guestOrder.findMany({
        where: guestWhere,
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      for (const guest of recentGuestOrders) {
        if (dupSettings.criteria === 'phone') {
          return { type: 'guest', order: guest, settings: dupSettings };
        }
        if (dupSettings.criteria === 'phone_amount') {
          const guestTotal = guest.finalTotal !== null && guest.finalTotal !== undefined ? guest.finalTotal : guest.total;
          if (this._compareAmountMatch(guestTotal, total)) {
            return { type: 'guest', order: guest, settings: dupSettings };
          }
        }
        if (dupSettings.criteria === 'phone_items') {
          let guestParsedItems = [];
          try {
            guestParsedItems = typeof guest.items === 'string' ? JSON.parse(guest.items) : (guest.items || []);
          } catch (_) {
            guestParsedItems = [];
          }
          if (this._compareItemsMatch(guestParsedItems, items)) {
            return { type: 'guest', order: guest, settings: dupSettings };
          }
        }
      }
    }

    return null;
  }

  // حساب تكلفة الشحن
  calculateShipping(city, subtotal, rewards = null) {
    // 🎁 تقليل الأولوية للمنطق الثابت إذا كان هناك مكافأة شحن مجاني من برنامج الولاء
    if (rewards && rewards.freeShipping) {
      if (rewards.freeShippingThreshold === 0 || subtotal >= rewards.freeShippingThreshold) {
        return 0;
      }
    }

    // شحن مجاني للطلبات أكثر من 250 جنيه (منطق افتراضي)
    if (subtotal >= 250) {
      return 0;
    }

    // تكلفة الشحن حسب المدينة
    const shippingRates = {
      'القاهرة': 50,
      'الإسكندرية': 50,
      'الجيزة': 50,
      'default': 75
    };

    return shippingRates[city] || shippingRates.default;
  }

  // البحث عن المنتج أو إنشاؤه
  async findOrCreateProduct(productName, companyId) {
    try {
      // البحث عن المنتج الموجود
      let product = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.product.findFirst({
          where: {
            name: productName,
            companyId
          }
        });
      }, 3);

      // إنشاء المنتج إذا لم يكن موجود
      if (!product) {
        const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
        if (!productLimitCheck.allowed) {
          console.warn(
            `⚠️ [ORDER-SERVICE] Skipping product auto-create for ${companyId}: ${productLimitCheck.payload?.message || 'Plan limit reached'}`
          );
          return null;
        }

        product = await safeQuery(async () => {
          const prisma = this.getPrisma();
          return await prisma.product.create({
            data: {
              name: productName,
              sku: `AUTO-${Date.now()}`, // إنشاء SKU تلقائي
              companyId,
              price: 0, // سيتم تحديثه لاحقاً
              isActive: true,
              metadata: JSON.stringify({
                createdFromOrder: true,
                source: 'conversation_automation'
              })
            }
          });
        }, 5);
        //console.log('📦 Created new product:', productName);
      }

      return product.id;
    } catch (error) {
      console.error('❌ Error finding/creating product:', error);
      // إرجاع null إذا فشل
      return null;
    }
  }

  // تحديث إحصائيات العميل
  async updateCustomerStats(customerId, orderTotal) {
    try {
      await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.$executeRaw`
          UPDATE customers
          SET
            status = CASE
              WHEN status = 'LEAD'::customers_status THEN 'ACTIVE'::customers_status
              ELSE status
            END,
            "totalOrdersCount" = COALESCE("totalOrdersCount", 0) + 1,
            "updatedAt" = NOW()
          WHERE id = ${customerId}
        `;
      }, 5);
      //console.log('📊 Customer stats updated');
    } catch (error) {
      console.error('❌ Error updating customer stats:', error);
    }
  }

  // الحصول على طلبات العميل
  async getCustomerOrders(customerId, companyId, limit = 10) {
    try {
      const orders = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.findMany({
          where: {
            customerId,
            companyId // ✅ SECURITY: Ensure company isolation
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        });
      }, 3);

      return orders;
    } catch (error) {
      console.error('❌ Error fetching customer orders:', error);
      return [];
    }
  }

  // الحصول على طلب بالرقم
  async getOrderByNumber(orderNumber, companyId) {
    try {
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();
        // Search by id OR orderNumber
        return await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            },
            customer: true
          }
        });
      }, 3);

      return order;
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      return null;
    }
  }

  // تحديث حالة الطلب
  async updateOrderStatus(orderNumber, companyId, status, notes = null, userId = null, userName = null, existingOrderObject = null, isOverride = false, options = null) {

    try {
      const { skipCallAttemptGuard = false, skipTransitionValidation = false } = options || {};
      status = normalizeOrderStatusCode(status);

      // ⚡ FIX: If status is an ID (CUIDs are typically >20 chars), resolve it to its Code
      // This prevents saving an uppercased CUID to the database and fixes workflow validation.
      if (status && status.length > 20) {
        const prisma = this.getPrisma();
        const statusDef = await prisma.orderStatusDefinition.findUnique({
          where: { id: status.toLowerCase() }
        }).catch(() => null);
        if (statusDef && statusDef.code) {
          status = statusDef.code.toUpperCase();
        }
      }

      // 🚀 SPEED OPTIMIZATION: Use pre-fetched order if available
      const order = existingOrderObject || await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          },
          include: {
            company: { include: { orderWorkflowConfig: true } },
            customer: true,
            orderItems: { include: { product: true } }
          }
        });
      }, 3);

      if (!order) throw createOrderStatusError("الطلب غير موجود", 404);

      const currentStatus = normalizeOrderStatusCode(order.status);
      // 🛡️ PRODUCTION-FIX (custom-status-noop): لو عليه كود مخصص، نفس الحالة النظامية
      // المطلوبة صراحةً مش no-op — التاجر عايز يرجّع للحالة النظامية ويشيل الكود المخصص.
      // وإذا كان هناك ملاحظات أو سبب إرجاع جديد، لا نتجاهل التعديل.
      if (currentStatus === status && !order.customStatusCode && (!notes || !String(notes).trim())) {
        return order;
      }

      // 🗑️ Trash/Restore Logic
      if (status === 'RESTORE') {
        // Find last status that wasn't TRASH from history
        const lastStatus = await this.getPrisma().orderStatusHistory.findFirst({
          where: {
            orderId: order.id,
            status: { notIn: ['TRASH', 'trash', 'deleted'] }
          },
          orderBy: { createdAt: 'desc' }
        });
        
        status = normalizeOrderStatusCode(lastStatus ? lastStatus.status : 'PENDING');
        if (!notes) notes = 'تم استعادة الطلب من سلة المحذوفات';
      } else if (status === 'TRASH') {
        if (!notes) notes = 'تم نقل الطلب إلى سلة المحذوفات';
      }

      // 🛡️ Late Cancellation Intercept
      if (status === 'CANCELLED' && order.company?.settings) {
        try {
          const settingsObj = typeof order.company.settings === 'string' 
            ? JSON.parse(order.company.settings) 
            : order.company.settings;
            
          if (settingsObj?.lateCancellationInterceptEnabled && Array.isArray(settingsObj?.lateCancellationTargetStatuses)) {
            if (settingsObj.lateCancellationTargetStatuses.includes(currentStatus)) {
              status = 'PENDING_CANCELLATION';
              if (!notes) notes = 'تم طلب إلغاء الأوردر أثناء التجهيز';
            }
          }
        } catch (e) {
          console.error('❌ [ORDER-SERVICE-DEBUG] Error parsing company settings for late cancellation intercept:', e);
        }
      }
      
      // 🛡️ PRODUCTION-FIX (custom-status-enum): عمود order.status enum مقفول في الداتابيز،
      // والحالات المخصصة (مثل DELAYED-WITH-CAPTAIN) مش جزء منه. بنحلّها عبر mapsToSystem:
      // - storedStatus = القيمة الصالحة اللي تتخزّن فعلاً على order.status.
      // - originalRequestedStatus = الكود اللي المستخدم طلبه (مخصص أو نظامي) — نستخدمه
      //   في statusHistory + إشعار WhatsApp (قالب الحالة المخصصة).
      // 🛡️ PRODUCTION-FIX (custom-status-persist): الكود المخصص بيتخزن دلوقتي في
      // order.customStatusCode جنب الـ enum — عشان العرض والفلتر والإحصائيات يشوفوه.
      // لو الحالة مش enum ومالهاش mapsToSystem صالح → نرفض بخطأ عربي واضح بدل 500 Prisma.
      const { resolveOrderStatusForStorage, isValidOrderStatusEnum } = require('../utils/orderStatusEnum');
      let { stored: storedStatus, notify: originalRequestedStatus } = await resolveOrderStatusForStorage(this.getPrisma(), companyId, status);
      if (!storedStatus) {
        throw createOrderStatusError(`الحالة "${status}" غير صالحة ولا يمكن تطبيقها على الطلب`, 400);
      }
      // 🛡️ PRODUCTION-FIX (custom-status-noop): الـ no-op لازم يقارن "الحالة الفعلية"
      // (customStatusCode لو موجود) — مش الـ enum بس. قبل الإصلاح ده، تطبيق حالة مخصصة
      // على طلب قاعد بالفعل في قيمة mapsToSystem كان بيرجع مبكرًا: من غير تاريخ ولا
      // إشعار ولا تحديث للكود المخصص (تحديث صامت لا يعمل شيء).
      const requestedIsCustom = originalRequestedStatus !== storedStatus;
      // (mutable — بيتعاد حسابه لو الـ workflow غيّر الحالة لكود مخصص مختلف)
      let isRequestedCustom = requestedIsCustom;
      const currentCustomCode = order.customStatusCode
        ? normalizeOrderStatusCode(order.customStatusCode)
        : null;
      const isEffectiveNoOp = requestedIsCustom
        ? currentCustomCode === originalRequestedStatus
        : !currentCustomCode && currentStatus === storedStatus;
      if (isEffectiveNoOp) {
        return order;
      }
      status = storedStatus;

      // 🚫 Block Scanner / Shipping Progression for PENDING_CANCELLATION
      if (currentStatus === 'PENDING_CANCELLATION' && ['PREPARING', 'QUALITY_CHECK', 'PACKAGED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(status)) {
        if (!isOverride) {
          throw createOrderStatusError("تم حظر الإسكانر: الأوردر به طلب إلغاء معلق ويجب حسمه أولاً.");
        }
      }

      if (!skipCallAttemptGuard) {
        this.assertCallAttemptRequirement(order, status);
      }

      // Check for Advanced Workflow config
      const isWorkflowEnabled = isWorkflowConfigEnabled(order.company?.orderWorkflowConfig);
      let workflowAuditLog = null;

      if (isWorkflowEnabled && !skipTransitionValidation) {
        const orderWorkflowService = require('./orderWorkflowService');
        let workflowResult;
        try {
          workflowResult = await orderWorkflowService.validateStatusChange(
            companyId,
            order.id,
            userId,
            status,
            notes,
            isOverride, // ⚡ Pass correct override flag
            order
          );
        } catch (workflowError) {
          if (!workflowError.statusCode) {
            workflowError.statusCode = 400;
          }
          throw workflowError;
        }

        if (workflowResult && workflowResult.status === 'allowed') {
          workflowAuditLog = workflowResult.auditLog || null;
          if (workflowResult.nextStatusCode) {
            status = workflowResult.nextStatusCode;
            // 🛡️ PRODUCTION-FIX (custom-status-enum): الـ workflow بيرجّع أكواد من
            // orderStatusDefinition — ممكن تكون أكواد مخصصة. من غير إعادة الحل دي
            // الكود المخصص بيوصל لـ prisma.order.update فيكسر الـ enum.
            if (!isValidOrderStatusEnum(status)) {
              const reResolved = await resolveOrderStatusForStorage(this.getPrisma(), companyId, status);
              if (reResolved.stored) {
                originalRequestedStatus = reResolved.notify;
                status = reResolved.stored;
                isRequestedCustom = originalRequestedStatus !== status;
              } else {
                status = storedStatus;
                isRequestedCustom = requestedIsCustom;
              }
            }
          }
        }

        if (workflowResult && workflowResult.status === 'pending') {
          return { ...order, workflowStatus: 'pending', workflowRequestId: workflowResult.requestId };
        }
      }

      // Enforce allowed transitions if configured
      try {
        await this.validateConfiguredStatusTransition(order.companyId, order.status, status, {
          skipValidation: skipTransitionValidation || isOverride
        });
      } catch (transitionError) {
        console.error('❌ [ORDER-SERVICE] Invalid status transition:', transitionError.message);
        throw transitionError;
      }

      // Keep confirmation reporting fields aligned with status changes.
      const isConfirmingOrder = status.toUpperCase() === 'CONFIRMED';
      const confirmationData = isConfirmingOrder ? {
        confirmedAt: new Date(),
        confirmedBy: userId || null,
        confirmationNotes: notes || null
      } : {};

      // Check if we need to reset confirmation data when reverting to pending
      const isRevertingToPending = ['PENDING', 'WOO_TAGHEZ'].includes(status.toUpperCase());
      const resetConfirmationData = isRevertingToPending ? {
        confirmedAt: null,
        confirmedBy: null,
        confirmationNotes: null
      } : {};

      // 🔄 [ORDER-SERVICE-UPDATE] Update the order
      // Sync metadata.preparationStatus so external status changes (quick-status,
      // orders page) are reflected on the preparation queue too.
      // 🛡️ PRODUCTION-FIX (stale-prep-hijack): المراحل الحقيقية للتجهيز بس اللي
      // تتكتب في metadata.preparationStatus — كان PREPARATION_PIPELINE_STATUSES
      // شايل PENDING/CONFIRMED/SCHEDULED/PROCESSING (حالات نظامية عادية) فتغيير
      // الحالة لـ CONFIRMED من التفاصيل كان بيكتب preparationStatus=CONFIRMED
      // والعرض بيرجّعها PROCESSING للأبد — "بغيّر الحالة ومش بتتغير".
      const isPrepPipelineStatus = PREP_METADATA_STATUSES.has(status);
      const currentMetadata = parsePreparationMetadata(order.metadata);
      let nextMetadata = null;
      if (isPrepPipelineStatus) {
        nextMetadata = JSON.stringify({
          ...currentMetadata,
          preparationStatus: status,
          preparationStatusUpdatedAt: new Date().toISOString()
        });
      } else if (currentMetadata.preparationStatus) {
        // Clear stale preparationStatus when transitioning to a non-prep status
        // (e.g. SHIPPED, DELIVERED, CANCELLED) so the COALESCE filter in the
        // orders list doesn't match on leftover prep data.
        const { preparationStatus, preparationStatusUpdatedAt, ...rest } = currentMetadata;
        nextMetadata = JSON.stringify(rest);
      }

      const updatedOrder = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.update({
          where: { id: order.id },
          data: {
            status: status,
            // 🛡️ PRODUCTION-FIX (custom-status-persist): الكود المخصص بيتخزن جنب الـ enum،
            // وبيتمسح لما التاجر يرجّع لحالة نظامية مباشرة (مش مخصصة).
            ...(prisma._dmmf?.modelMap?.Order?.fields?.some((f) => f.name === 'customStatusCode')
              ? { customStatusCode: isRequestedCustom ? originalRequestedStatus : null }
              : {}),
            notes: notes || undefined,
            ...((status === 'RETURNED' || status === 'PARTIALLY_RETURNED' || String(originalRequestedStatus || '').toUpperCase().includes('RETURN')) && notes ? { turboReturnReason: notes } : {}),
            ...(nextMetadata ? { metadata: nextMetadata } : {}),
            ...confirmationData,
            ...resetConfirmationData,
            updatedAt: new Date(),
            statusHistory: {
              create: {
                status: originalRequestedStatus,
                oldStatus: order.status,
                changedBy: userId,
                userName: userName,
                reason: notes || undefined
              }
            }
          },
          include: {
            customer: true,
            orderItems: { include: { product: true, productVariant: true } },
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true,
                turboAutoCreate: true
              }
            }
          }
        });
      }, 5);

      if (workflowAuditLog) {
        await this.logWorkflowAuditIfNeeded(companyId, order.id, workflowAuditLog, userId, notes || null);
      }

      // 🛡️ CRITICAL FIX: Synchronize status to twin guest order if it exists
      if (order.orderNumber) {
        try {
          const prisma = this.getPrisma();
          await prisma.guestOrder.updateMany({
            where: {
              companyId: order.companyId,
              orderNumber: order.orderNumber
            },
            data: {
              status: status,
              notes: notes || undefined,
              updatedAt: new Date()
            }
          });
        } catch (syncErr) {
          console.warn(`⚠️ [ORDER-SERVICE] Failed to sync status to twin guestOrder for #${order.orderNumber}:`, syncErr.message);
        }
      }

      // 🚀 SPEED: Return result immediately to the user
      // All other operations (Turbo, Returns, Commissions, Notifications) happen in the background
      (async () => {
        try {
          // 🎯 GOAL-METRIC-ENGINE: Auto-advance goals on order events
          try {
            const goalMetricEngine = require("./goalMetricEngine");
            if (status === "CONFIRMED") {
              goalMetricEngine
                .recordGoalMetricEvent({
                  companyId: order.companyId,
                  userId: userId || null,
                  metricKey: "ORDER_CONFIRMED",
                  incrementValue: 1,
                  metadata: { orderId: order.id, orderNumber: order.orderNumber },
                })
                .catch((err) =>
                  console.warn("⚠️ [GOAL-HOOK] Order confirmed error:", err.message)
                );
            } else if (status === "DELIVERED") {
              goalMetricEngine
                .recordGoalMetricEvent({
                  companyId: order.companyId,
                  userId: userId || null,
                  metricKey: "ORDER_DELIVERED",
                  incrementValue: 1,
                  metadata: { orderId: order.id, orderNumber: order.orderNumber },
                })
                .catch((err) =>
                  console.warn("⚠️ [GOAL-HOOK] Order delivered error:", err.message)
                );

              const revenue = Number(order.totalAmount || order.total || 0);
              if (revenue > 0) {
                goalMetricEngine
                  .recordGoalMetricEvent({
                    companyId: order.companyId,
                    userId: userId || null,
                    metricKey: "REVENUE_COLLECTED",
                    incrementValue: revenue,
                    metadata: { orderId: order.id, amount: revenue },
                  })
                  .catch((err) =>
                    console.warn("⚠️ [GOAL-HOOK] Revenue error:", err.message)
                  );
              }
            }
          } catch (goalHookErr) {
            console.warn("⚠️ [GOAL-HOOK] Failed to trigger goal event:", goalHookErr.message);
          }

          let shouldAutoCreateTurbo = Boolean(
            order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey
          );
          let turboApiKey = order.company?.turboApiKey;

          // 🛡️ Fallback: Check ShippingCompany table if autoCreate not enabled on Company directly
          if (!shouldAutoCreateTurbo && status === 'CONFIRMED' && !order.turboShipmentId) {
            try {
              const prisma = this.getPrisma();
              const turboCarrier = await prisma.shippingCompany.findFirst({
                where: {
                  companyId: order.companyId,
                  providerKey: 'TURBO',
                  isActive: true
                }
              });
              if (turboCarrier) {
                let s = {};
                try {
                  s = typeof turboCarrier.settings === 'string' ? JSON.parse(turboCarrier.settings) : (turboCarrier.settings || {});
                } catch {}
                const carrierKey = turboCarrier.apiKey || s.apiKey || order.company?.turboApiKey;
                const carrierAutoCreate = Boolean(s.autoCreateShipments);
                if (carrierKey && carrierAutoCreate) {
                  shouldAutoCreateTurbo = true;
                  turboApiKey = carrierKey;
                }
              }
            } catch (carrierErr) {
              console.warn('⚠️ [TURBO] Non-blocking fallback carrier check error:', carrierErr.message);
            }
          }

          if (status === 'CONFIRMED' && shouldAutoCreateTurbo && turboApiKey && !order.turboShipmentId) {
            const existingActiveShipment = await this.checkDuplicateActiveTurboShipment(order.companyId, order);
            if (existingActiveShipment) {
              console.warn(`⚠️ [TURBO] Skipping automatic shipment creation for order ${order.orderNumber}: Customer already has active Turbo shipment ${existingActiveShipment.turboShipmentId} on order ${existingActiveShipment.orderNumber}`);
              try {
                const prisma = this.getPrisma();
                const skipNote = `[تم تخطي الشحن التلقائي: شحنة تربو نشطة للعميل #${existingActiveShipment.turboShipmentId} بالطلب ${existingActiveShipment.orderNumber}]`;
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    notes: order.notes ? `${order.notes}\n${skipNote}` : skipNote
                  }
                });
              } catch (e) {}
            } else {
              const TurboService = require('./turboService');
              const turboService = new TurboService(turboApiKey, order.companyId);
              const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

              const shipmentResult = await turboService.createShipment(orderData);

              if (shipmentResult.success) {
                const prisma = this.getPrisma();
                await prisma.order.update({
                  where: { id: order.id },
                  data: {
                    turboShipmentId: String(shipmentResult.shipmentId || ''),
                    turboTrackingNumber: String(shipmentResult.trackingNumber || ''),
                    turboShipmentStatus: shipmentResult.status,
                    turboLabelUrl: shipmentResult.labelUrl,
                    turboMetadata: serializeTurboMetadata(order.turboMetadata, shipmentResult.data)
                  }
                });
              }
            }
          }

          // 🔄 Returns Integration
          const returnStatuses = ['REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED'];
          let shouldCreateReturn = returnStatuses.includes(status);

          if (!shouldCreateReturn) {
            try {
              const prisma = this.getPrisma();
              const newStatusConfig = await prisma.orderStatusConfig.findFirst({
                where: { companyId: order.companyId, code: status, statusType: 'order', isActive: true }
              });
              if (newStatusConfig && newStatusConfig.mapsToSystem && returnStatuses.includes(newStatusConfig.mapsToSystem)) {
                shouldCreateReturn = true;
              }
            } catch (configError) {
              console.warn('⚠️ [RETURNS-AUTO] Failed to check status config mapping in background:', configError.message);
            }
          }

          if (shouldCreateReturn) {
            // 🚨 PRODUCTION-FIX (return-notification-gap): autoCreateReturnRequest لازم يفضل
            // جانبي تماماً — أي فشل فيه (زي FK على userId بتاعة SYSTEM من سينك تربو) كان بيكسر
            // الـ background block كله وقبل وصول الإشعار للعميل. دلوقتي أي خطأ بيتسجل بس
            // والإشعار يكمل.
            await this.autoCreateReturnRequest(order, userId, status, notes).catch(returnErr => {
              console.error(`❌ [RETURNS-AUTO-BG] autoCreateReturnRequest failed for ${orderNumber}:`, returnErr.message);
            });
          }

          // 💰 Affiliate & Commission & Cashback
          const commissionService = require('./commissionService');
          const shouldReverseAffiliateCommissions =
            status === 'CANCELLED' || shouldCreateReturn;

          if (shouldReverseAffiliateCommissions) {
            await commissionService.cancelAffiliateCommissionsForOrder(order.id, {
              reason:
                notes ||
                `تم تغيير حالة الطلب ${orderNumber} إلى ${status}، لذلك أُلغيت عمولات المسوق غير المصروفة`,
            }).catch(commErr => {
              console.error(`❌ [COMMISSION-BG] cancelAffiliateCommissionsForOrder failed for ${orderNumber}:`, commErr.message);
            });
            await commissionService.cancelMerchantCommissionsForOrder(order.id, {
              reason:
                notes ||
                `تم تغيير حالة الطلب ${orderNumber} إلى ${status}، لذلك أُلغيت مستحقات التاجر غير المصروفة`,
            }).catch(commErr => {
              console.error(`❌ [COMMISSION-BG] cancelMerchantCommissionsForOrder failed for ${orderNumber}:`, commErr.message);
            });
          }

          // 💸 عند إلغاء طلب اتسلم — رجّع النقاط والكاش باك اللي اتحسبوا + كوبونات الخصم التلقائي
          if (status === 'CANCELLED') {
            const cashbackService = require('./cashbackService');
            const loyaltyService = require('./hr/customerLoyaltyService');
            const autoDiscountService = require('./autoDiscountService');
            const cancelReason = notes || `إلغاء الطلب ${orderNumber}`;
            await cashbackService.reverseCashbackForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
              console.error(`❌ [CASHBACK-REVERSE] Failed for cancelled order ${orderNumber}:`, error.message);
            });
            await loyaltyService.reverseLoyaltyPointsForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId, reason: cancelReason }).catch(error => {
              console.error(`❌ [LOYALTY-REVERSE] Failed for cancelled order ${orderNumber}:`, error.message);
            });
            await autoDiscountService.reverseVoucherForOrder({ orderId: order.id, companyId: order.companyId }).catch(error => {
              console.error(`❌ [AUTO-DISCOUNT-REVERSE] Failed for cancelled order ${orderNumber}:`, error.message);
            });
            await autoDiscountService.restoreRedeemedPointsForOrder({ orderId: order.id, companyId: order.companyId }).catch(error => {
              console.error(`❌ [AUTO-DISCOUNT-RESTORE-POINTS] Failed for cancelled order ${orderNumber}:`, error.message);
            });
          }

          if (status === 'CONFIRMED' || status === 'DELIVERED') {
            const dropshippingService = require('./dropshippingService');
            const prisma = this.getPrisma();

            // ─── أكاديمية: تسجيل تلقائي عند تأكيد طلب منتج مرتبط بكورس ─────
            try {
              const academyService = require('./academyService');
              const orderItems = order.orderItems || [];
              for (const item of orderItems) {
                const productId = item.productId || item.product?.id;
                if (productId) {
                  await academyService.autoEnrollFromPaidOrder({
                    companyId: order.companyId,
                    customerId: order.customerId || null,
                    storeProductId: productId,
                    orderId: order.id,
                    customerName: order.customerName || order.customer?.name || null,
                    customerPhone: order.customerPhone || order.customer?.phone || null,
                    customerEmail: order.customerEmail || order.customer?.email || null,
                  }).catch(e => console.warn('[academy-hook] auto-enroll failed:', e.message));
                }
              }
            } catch (academyErr) {
              console.warn('[academy-hook] error:', academyErr.message);
            }
            // ─── نهاية hook الأكاديمية ────────────────────────────────────────

            // قراءة الإعداد: في أي حالة تتحسب العمولة
            const affSetting = await prisma.affiliateSetting.findUnique({
              where: { companyId: order.companyId },
              select: { commissionOnStatus: true },
            });
            const triggerStatus = affSetting?.commissionOnStatus || 'CONFIRMED';

            if (status === triggerStatus) {
              const existingCommissions = await prisma.commission.findMany({
                where: { orderId: order.id },
              });
              const hasActiveCommissions = existingCommissions.some(
                (commission) => commission.status !== 'CANCELLED',
              );

              if (!hasActiveCommissions) {
                if (order.isDropshipped || order.orderItems?.some(item => item.product?.isDropshipped)) {
                  await dropshippingService.routeOrderToMerchant(order.id);
                }
                await commissionService.calculateCommissions(order.id);
              }
            }
          }

          if (status === 'DELIVERED') {
            const cashbackService = require('./cashbackService');
            const loyaltyService = require('./hr/customerLoyaltyService');
            const autoDiscountService = require('./autoDiscountService');

            // نظام "الخصم التلقائي": بدل الكاش باك الفوري نُصدر كوبون 10% للأوردر الجاي
            const autoActive = await autoDiscountService.isAutoDiscountActive(order.companyId).catch(() => false);
            if (!autoActive) {
              await cashbackService.applyCashbackForPaidOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
                console.error(`❌ [CASHBACK-BG-ERROR] Failed for ${orderNumber}:`, error.message);
              });
            } else {
              await autoDiscountService.issueVoucherForDeliveredOrder({ orderId: order.id, companyId: order.companyId }).catch(error => {
                console.error(`❌ [AUTO-DISCOUNT-BG-ERROR] Voucher issue failed for ${orderNumber}:`, error.message);
              });
            }

            await loyaltyService.applyLoyaltyPointsForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
              console.error(`❌ [LOYALTY-BG-ERROR] Failed for ${orderNumber}:`, error.message);
            });

            // 🎁 Milestone / Gift Engine: هدية الطلب 2 + Milestone 3 + Anniversary
            try {
              const milestoneService = require('./milestoneService');
              await milestoneService.handleOrderMilestones({ orderId: order.id, companyId: order.companyId, customerId: order.customerId }).catch(err => {
                console.warn(`⚠️ [MILESTONE] Failed for ${orderNumber}:`, err.message);
              });
            } catch (mErr) { console.warn('Milestone require failed', mErr.message); }

            // 🚀 تسجيل العميل في سلسلة ما بعد الاستلام (بعد أسبوع/أسبوعين/تالت...) عند التسليم الفعلي
            try {
              const WhatsAppJourneyService = require('./whatsapp/WhatsAppJourneyService');
              await WhatsAppJourneyService.enrollCustomer(order.companyId, order.customerId, order.id).catch(error => {
                console.error(`❌ [JOURNEY-BG-ERROR] Enroll failed for ${orderNumber}:`, error.message);
              });
            } catch (journeyError) {
              console.error(`❌ [JOURNEY-ERROR] Enroll threw for ${orderNumber}:`, journeyError.message);
            }
          }

          // ⭐ إعادة حساب وتصنيف مستوى العميل آلياً (ضعيف - جيد - ممتاز)
          const terminalRatingStatuses = ['DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'PARTIALLY_RETURNED', 'CANCELLED', 'REFUNDED', 'LOST'];
          if (order.customerId && (terminalRatingStatuses.includes(status) || terminalRatingStatuses.includes(order.status))) {
            try {
              const { recalculateCustomerRating } = require('./customerRatingService');
              recalculateCustomerRating(order.customerId, order.companyId).catch(err => {
                console.warn(`⚠️ [CUSTOMER-RATING-BG] Failed for order ${orderNumber}:`, err.message);
              });
            } catch (ratingErr) {
              console.warn('CustomerRatingService require failed:', ratingErr.message);
            }
          }

          // 📱 WhatsApp Notification (with duplicate check)
          try {
            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

            // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.1):
            // لا تحجب الحالات غير المرسومة هنا — دع sendOrderStatusNotification يقرر عبر
            // DB OrderStatusConfig.notifyCustomer + خريطته الأوسع + fallback isFallback.
            // 🛡️ PRODUCTION-FIX (custom-status-enum): نستخدم الكود الأصلي (originalRequestedStatus)
            // — مش الـ stored enum — عشان قالب الحالة المخصصة (مثل DELAYED-WITH-CAPTAIN) يشتغل.
            // 🛡️ PRODUCTION-FIX (prep-stage-alias): من غير normalizeWhatsAppOrderStatus هنا —
            // التحويل PACKAGED→PACKED كان بيكسر لقط قالب التاجر المسجّل باسم PACKAGED
            // (وPREPARING→PICKING مقابل PREPARING) فكانت الرسالة بتتخطّى بصمت no_template.
            // الـ persistence بيتظبط جوّه الخدمة عبر getPersistedNotificationEventType.
            const notificationStatus = originalRequestedStatus
              || normalizeWhatsAppOrderStatus(originalRequestedStatus)
              || status;

            // ✅ Check for duplicate notification (وحّدت عبر isDuplicateNotification §3.1)
            // 🛡️ PRODUCTION-FIX (custom-status-dedup-identity): بنمرّر الكود الأصلي
            // (rawEventType) — التطابق بقى على هوية الحالة المخصصة نفسها، مش قيمة
            // mapsToSystem المشتركة اللي كانت بتبلع رسالة حالتين مختلفتين خلال 10 ثوانٍ.
            const { getPersistedNotificationEventType } = require('./whatsapp/notificationTypes');
            const persistedEventForDedup = getPersistedNotificationEventType(notificationStatus);
            const recentNotification = await WhatsAppNotificationService.isDuplicateNotification({
              companyId: order.companyId,
              orderId: order.id,
              eventType: persistedEventForDedup,
              rawEventType: notificationStatus,
            });

            if (recentNotification) {
            } else {
              await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
            }
          } catch (whatsappError) {
            console.error('⚠️ [WHATSAPP-STATUS-ERROR] Background notification failed:', whatsappError.message);
          }

          // 🔔 Mobile / Web Push Notification for Order Status Changed
          try {
            const { sendBrowserPushToCompany } = require('./browserPushService');
            void sendBrowserPushToCompany({
              companyId: order.companyId,
              typeId: 'order_status_changed',
              title: `تحديث حالة الطلب #${order.orderNumber || orderNumber}`,
              body: `تغيرت حالة الطلب إلى: ${status}`,
              compactBody: `تغيرت حالة الطلب #${order.orderNumber || orderNumber}`,
              url: `/orders?orderId=${order.id}`,
              data: {
                source: 'order_status_changed',
                orderId: order.id,
                orderNumber: order.orderNumber || orderNumber,
                status,
                typeId: 'order_status_changed',
              },
            }).catch((pushErr) => {
              console.warn('⚠️ [PUSH-STATUS] Error:', pushErr?.message || pushErr);
            });
          } catch (pushImportErr) {
            console.warn('⚠️ [PUSH-STATUS] Failed to bootstrap:', pushImportErr?.message || pushImportErr);
          }

          // 🌐 Dispatch Outgoing Webhook for Order Status Update
          try {
            const { triggerOrderStatusUpdated } = require('./orderWebhookService');
            triggerOrderStatusUpdated(order.id, order.companyId, currentStatus, status, notes);
          } catch (webhookErr) {
            console.warn('⚠️ [ORDER-WEBHOOK] Status update hook error:', webhookErr?.message || webhookErr);
          }

          // 🧾 Auto Invoice Generation
          try {
            const prisma = this.getPrisma();
            const invoiceSettings = await prisma.orderInvoiceSettings.findUnique({
              where: { companyId: order.companyId }
            });

            if (invoiceSettings && invoiceSettings.autoGenerate && invoiceSettings.autoGenerateOnStatus) {
              const targetStatuses = invoiceSettings.autoGenerateOnStatus.split(',').map(s => s.trim().toUpperCase());
              const normalizedStatus = status.toUpperCase();

              if (targetStatuses.includes(normalizedStatus) || targetStatuses.includes('*')) {
                const { generateInvoiceForOrder } = require('./orderInvoiceService');
                await generateInvoiceForOrder(order.id, userId);
              }
            }
          } catch (invoiceError) {
            console.error('⚠️ [INVOICE-AUTO-ERROR] Failed auto-generation:', invoiceError.message);
          }

        } catch (backgroundError) {
          console.error('⚠️ [ORDER-STATUS-BG-ERROR]:', backgroundError.message);
        }
      })();

      return updatedOrder;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  async updateGuestOrderStatus(orderNumber, companyId, status, notes = null, userId = null, userName = null, existingGuestOrderObject = null, options = null) {

    try {
      const { skipCallAttemptGuard = false, skipTransitionValidation = false } = options || {};
      status = normalizeOrderStatusCode(status);

      const guestOrder = existingGuestOrderObject || await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.guestOrder.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber, companyId }
            ]
          }
        });
      }, 3);

      if (!guestOrder) {
        throw createOrderStatusError('الطلب غير موجود', 404);
      }

      if (normalizeOrderStatusCode(guestOrder.status) === status && (!notes || !String(notes).trim())) {
        return guestOrder;
      }

      if (status === 'RESTORE') {
        const lastStatus = await this.getPrisma().orderStatusHistory.findFirst({
          where: {
            guestOrderId: guestOrder.id,
            status: { notIn: ['TRASH', 'trash', 'deleted'] }
          },
          orderBy: { createdAt: 'desc' }
        });

        status = normalizeOrderStatusCode(lastStatus ? lastStatus.status : 'PENDING');
        if (!notes) notes = 'ØªÙ… Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø§Ù„Ø·Ù„Ø¨ Ù…Ù† Ø³Ù„Ø© Ø§Ù„Ù…Ø­Ø°ÙˆÙØ§Øª';
      } else if (status === 'TRASH') {
        if (!notes) notes = 'ØªÙ… Ù†Ù‚Ù„ Ø§Ù„Ø·Ù„Ø¨ Ø¥Ù„Ù‰ Ø³Ù„Ø© Ø§Ù„Ù…Ø­Ø°ÙˆÙØ§Øª';
      }

      if (!skipCallAttemptGuard) {
        this.assertCallAttemptRequirement(guestOrder, status);
      }
      await this.validateConfiguredStatusTransition(guestOrder.companyId, guestOrder.status, status, {
        skipValidation: skipTransitionValidation
      });

      // 🛡️ PRODUCTION-FIX (stale-prep-hijack): نفس إصلاح الطلبات العادية — المراحل
      // الحقيقية بس، والحالات النظامية تمسح أي مرحلة قديمة.
      const isPrepPipelineStatus = PREP_METADATA_STATUSES.has(status);
      const currentGuestMetadata = parsePreparationMetadata(guestOrder.metadata);
      let nextGuestMetadata = null;
      if (isPrepPipelineStatus) {
        nextGuestMetadata = JSON.stringify({
          ...currentGuestMetadata,
          preparationStatus: status,
          preparationStatusUpdatedAt: new Date().toISOString()
        });
      } else if (currentGuestMetadata.preparationStatus) {
        const { preparationStatus, preparationStatusUpdatedAt, ...rest } = currentGuestMetadata;
        nextGuestMetadata = JSON.stringify(rest);
      }

      const updatedGuestOrder = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.guestOrder.update({
          where: { id: guestOrder.id },
          data: {
            status,
            notes: notes || undefined,
            ...((status === 'RETURNED' || status === 'PARTIALLY_RETURNED' || String(status || '').toUpperCase().includes('RETURN')) && notes ? { turboReturnReason: notes } : {}),
            ...(nextGuestMetadata ? { metadata: nextGuestMetadata } : {}),
            OrderStatusHistory: {
              create: {
                status,
                oldStatus: guestOrder.status,
                reason: notes || undefined,
                changedBy: userId,
                userName
              }
            },
            updatedAt: new Date()
          }
        });
      }, 5);

      // 🛡️ CRITICAL FIX: Synchronize status to twin regular order if it exists
      if (guestOrder.orderNumber) {
        try {
          const prisma = this.getPrisma();
          await prisma.order.updateMany({
            where: {
              companyId: guestOrder.companyId,
              orderNumber: guestOrder.orderNumber
            },
            data: {
              status: status,
              notes: notes || undefined,
              ...((status === 'RETURNED' || status === 'PARTIALLY_RETURNED' || String(status || '').toUpperCase().includes('RETURN')) && notes ? { turboReturnReason: notes } : {}),
              updatedAt: new Date()
            }
          });
        } catch (syncErr) {
          console.warn(`⚠️ [ORDER-SERVICE] Failed to sync status to twin regular order for #${guestOrder.orderNumber}:`, syncErr.message);
        }
      }

      await (async () => {
        try {
          if (status === 'CONFIRMED' || status === 'PROCESSING') {
            internalSyncService.pushOrderToProvider(updatedGuestOrder.id, companyId).catch(err => {
              console.error(`❌ [INTERNAL-SYNC] Failed to push guest order ${updatedGuestOrder.id} to provider:`, err.message);
            });
          }

          if (status === 'DELIVERED') {
            try {
              let meta = {};
              try {
                meta = updatedGuestOrder.metadata ? JSON.parse(updatedGuestOrder.metadata) : {};
              } catch (error) {
                meta = {};
              }

              const walletCustomerId = meta.walletCustomerId;
              if (walletCustomerId) {
                const prisma = this.getPrisma();
                await WalletService.createWallet(walletCustomerId, companyId);

                const already = await prisma.walletTransaction.findFirst({
                  where: {
                    wallet: { customerId: walletCustomerId },
                    type: 'CASHBACK',
                    metadata: { contains: updatedGuestOrder.id }
                  }
                });

                if (!already) {
                  const baseAmount = Math.max(0, (Number(updatedGuestOrder.total) || 0) - (Number(updatedGuestOrder.discountAmount) || 0));
                  if (baseAmount > 0) {
                    const result = await WalletService.addToWallet(
                      walletCustomerId,
                      baseAmount * 0.05,
                      'CASHBACK',
                      `Cashback from storefront order ${updatedGuestOrder.orderNumber}`,
                      { guestOrderId: updatedGuestOrder.id, orderNumber: updatedGuestOrder.orderNumber, baseAmount, cashbackRate: 0.05, excludesShipping: true, trigger: 'delivered' }
                    );

                    try {
                      await prisma.walletTransaction.update({
                        where: { id: result.transaction.id },
                        data: { orderId: null }
                      });
                    } catch (error) {
                    }
                  }
                }
              }
            } catch (cashbackError) {
              console.error('❌ [CASHBACK] Failed to add cashback on guest order delivered:', cashbackError?.message);
            }
          }

          // ⭐ إعادة حساب وتصنيف مستوى العميل لطلبات الضيوف المرتبطة برقم الهاتف
          const terminalGuestRatingStatuses = ['DELIVERED', 'PARTIALLY_DELIVERED', 'RETURNED', 'PARTIALLY_RETURNED', 'CANCELLED', 'REFUNDED', 'LOST'];
          if (terminalGuestRatingStatuses.includes(status) || terminalGuestRatingStatuses.includes(guestOrder.status)) {
            try {
              const targetPhone = updatedGuestOrder.guestPhone || guestOrder.guestPhone;
              if (targetPhone) {
                const { findCustomerByPhone } = require('../utils/customerIdentity');
                const { recalculateCustomerRating } = require('./customerRatingService');
                findCustomerByPhone(this.getPrisma(), targetPhone, companyId).then(cust => {
                  if (cust?.id) recalculateCustomerRating(cust.id, companyId);
                }).catch(() => {});
              }
            } catch (rErr) {}
          }

          try {
            let guestItems = [];
            try {
              guestItems = typeof updatedGuestOrder.items === 'string'
                ? JSON.parse(updatedGuestOrder.items)
                : (updatedGuestOrder.items || []);
            } catch (error) {
              guestItems = [];
            }

            const notificationOrder = {
              ...updatedGuestOrder,
              // 🛡️ PRODUCTION-FIX (guest-order-fk): علّمة كضيف عشان اللوج يتخزن
              // بـ orderId=null — الضيوف ملهمش صف في orders وكان الـ FK بيقتل الإرسال
              isGuestOrder: true,
              customerPhone: updatedGuestOrder.guestPhone,
              customerName: updatedGuestOrder.guestName,
              items: guestItems,
              currency: 'EGP'
            };

            if (!notificationOrder.customerPhone) {
              return;
            }

            // 🛡️ PRODUCTION-FIX (prep-stage-alias): الكود الأصلي من غير تحويل — نفس منطق
            // المسار العادي فوق؛ القوالب مسجّلة بالكود الأصلي (PACKAGED/PREPARING).
            const notificationStatus = status;

            // 🚨 PRODUCTION-FIX (notifications-fix-plan §2.1):
            // لا تحجب الحالات غير المرسومة — دع sendOrderStatusNotification يقرر
            // (DB OrderStatusConfig.notifyCustomer + خريطته الأوسع + fallback).
            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
            const { getPersistedNotificationEventType } = require('./whatsapp/notificationTypes');
            // ✅ Check for duplicate notification (وحّدت عبر isDuplicateNotification §3.1)
            const recentNotification = await WhatsAppNotificationService.isDuplicateNotification({
              companyId,
              recipientPhone: notificationOrder.customerPhone,
              eventType: getPersistedNotificationEventType(notificationStatus),
            });

            if (recentNotification) {
              return;
            }

            const notificationResult = await WhatsAppNotificationService.sendOrderStatusNotification(notificationOrder, notificationStatus);

            if (notificationResult?.success === false) {
            } else {
            }
          } catch (waError) {
            console.error(`⚠️ [WHATSAPP] Failed to send notification for guest order: ${waError.message}`);
          }
        } catch (backgroundError) {
          console.error('⚠️ [GUEST-ORDER-STATUS-BG-ERROR]:', backgroundError.message);
        }
      })();

      return updatedGuestOrder;
    } catch (error) {
      console.error('❌ Error updating guest order status:', error);
      throw error;
    }
  }

  // إنشاء طلب إرجاع تلقائياً
  async autoCreateReturnRequest(order, userId, status, notes = null) {
    try {
      const prisma = this.getPrisma();

      const existingRequest = await prisma.returnRequest.findFirst({
        where: { companyId: order.companyId, orderId: order.id }
      });

      if (existingRequest) {
        if (notes && !existingRequest.adminNotes?.includes(notes)) {
          await prisma.returnRequest.update({
            where: { id: existingRequest.id },
            data: {
              adminNotes: existingRequest.adminNotes ? `${existingRequest.adminNotes} - ${notes}` : `سبب المرتجع: ${notes}`,
              customerNotes: existingRequest.customerNotes || notes
            }
          }).catch(() => null);
        }
        return;
      }

      const request = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          companyId: order.companyId,
          reasonId: null,
          status: 'PENDING',
          adminNotes: notes ? `تم إنشاء هذا الطلب تلقائياً عند تغيير حالة الطلب الأصلي إلى: ${status} - سبب المرتجع: ${notes}` : `تم إنشاء هذا الطلب تلقائياً عند تغيير حالة الطلب الأصلي إلى: ${status}`,
          customerNotes: notes || null,
          responsibleParty: null,
          isReviewed: false,
          refundAmount: order.total ? parseFloat(order.total) : undefined,
        }
      });

      await prisma.returnActivityLog.create({
        data: {
          returnRequestId: request.id,
          // 🚨 PRODUCTION-FIX (return-notification-gap): سينك تربو بيمرر userId='SYSTEM'
          // (مش id مستخدم حقيقي) → كان بيكسر FK return_activity_logs_userId_fkey →
          // فكان بيمنع إشعار المرتجع. بنمرر userId بس لو هو id حقيقي.
          userId: (userId && typeof userId === 'string' && !['SYSTEM', 'System', 'system', 'SYSTEM_SYNC', 'AUTO', 'Turbo Sync'].includes(String(userId))) ? userId : undefined,
          action: 'AUTO_CREATED',
          details: `تم إنشاء الطلب تلقائياً بسبب تحديث حالة الطلب لـ ${status}`
        }
      });

    } catch (error) {
      if (error.code === 'P2002') {
        return;
      }
      console.error('❌ [RETURNS-AUTO] Error in autoCreateReturnRequest:', error);
      throw error;
    }
  }

  // تأكيد الطلب
  async confirmOrder(orderNumber, companyId, shippingAddress = null) {
    try {
      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();

        // Find order first to ensure it belongs to company (search by id OR orderNumber)
        const existingOrder = await prisma.order.findFirst({
          where: {
            OR: [
              { id: orderNumber, companyId },
              { orderNumber: orderNumber, companyId }
            ]
          }
        });

        if (!existingOrder) {
          throw new Error('الطلب غير موجود أو غير تابع لهذه الشركة');
        }

        return await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status: 'CONFIRMED',
            shippingAddress: shippingAddress || undefined,
            updatedAt: new Date(),
            statusHistory: {
              create: {
                status: 'CONFIRMED',
                oldStatus: existingOrder.status,
                changedBy: null,
                userName: null,
                reason: 'Order confirmed'
              }
            }
          },
          include: {
            customer: true,
            orderItems: {
              include: {
                product: true,
                productVariant: true
              }
            },
            company: {
              select: {
                id: true,
                turboApiKey: true,
                turboEnabled: true,
                turboAutoCreate: true
              }
            }
          }
        });
      }, 5);

      // 🚚 Turbo Integration: إنشاء شحنة تلقائياً إذا كان مفعّل
      let shouldAutoCreateTurbo = Boolean(
        order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey
      );
      let turboApiKey = order.company?.turboApiKey;

      if (!shouldAutoCreateTurbo && !order.turboShipmentId) {
        try {
          const prisma = this.getPrisma();
          const turboCarrier = await prisma.shippingCompany.findFirst({
            where: {
              companyId: order.companyId,
              providerKey: 'TURBO',
              isActive: true
            }
          });
          if (turboCarrier) {
            let s = {};
            try {
              s = typeof turboCarrier.settings === 'string' ? JSON.parse(turboCarrier.settings) : (turboCarrier.settings || {});
            } catch {}
            const carrierKey = turboCarrier.apiKey || s.apiKey || order.company?.turboApiKey;
            const carrierAutoCreate = Boolean(s.autoCreateShipments);
            if (carrierKey && carrierAutoCreate) {
              shouldAutoCreateTurbo = true;
              turboApiKey = carrierKey;
            }
          }
        } catch (carrierErr) {
          console.warn('⚠️ [TURBO] Non-blocking fallback carrier check error in confirmOrder:', carrierErr.message);
        }
      }

      if (shouldAutoCreateTurbo && turboApiKey && !order.turboShipmentId) {
        try {
          const existingActiveShipment = await this.checkDuplicateActiveTurboShipment(order.companyId, order);
          if (existingActiveShipment) {
            console.warn(`⚠️ [TURBO] Skipping automatic shipment creation in confirmOrder for order ${order.orderNumber}: Customer already has active Turbo shipment ${existingActiveShipment.turboShipmentId} on order ${existingActiveShipment.orderNumber}`);
            try {
              const prisma = this.getPrisma();
              const skipNote = `[تم تخطي الشحن التلقائي: شحنة تربو نشطة للعميل #${existingActiveShipment.turboShipmentId} بالطلب ${existingActiveShipment.orderNumber}]`;
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  notes: order.notes ? `${order.notes}\n${skipNote}` : skipNote
                }
              });
            } catch (e) {}
          } else {
            const TurboService = require('./turboService');
            const turboService = new TurboService(turboApiKey, order.companyId);

            // تحضير بيانات الطلب
            const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

            // إنشاء الشحنة
            const shipmentResult = await turboService.createShipment(orderData);

            // حفظ معلومات الشحنة في قاعدة البيانات
            await safeQuery(async () => {
              const prisma = this.getPrisma();
              return await prisma.order.update({
                where: { id: order.id },
                data: {
                  turboShipmentId: String(shipmentResult.shipmentId || ''),
                  turboTrackingNumber: String(shipmentResult.trackingNumber || ''),
                  turboShipmentStatus: shipmentResult.status,
                  turboLabelUrl: shipmentResult.labelUrl,
                  turboMetadata: serializeTurboMetadata(order.turboMetadata, shipmentResult.data)
                }
              });
            }, 3);
          }
        } catch (turboError) {
          // لا نوقف العملية إذا فشل Turbo - فقط نسجل الخطأ
          console.error(`❌ [TURBO] Failed to create shipment for order ${orderNumber}:`, turboError.message);
        }
      }

      //console.log(`✅ Order ${orderNumber} confirmed`);
      return order;
    } catch (error) {
      console.error('❌ Error confirming order:', error);
      throw error;
    }
  }

  // إلغاء الطلب
  async cancelOrder(orderNumber, companyId, reason = null) {
    return await this.updateOrderStatus(
      orderNumber,
      companyId,
      'CANCELLED',
      reason || 'تم إلغاء الطلب',
      null,
      null
    );
  }

  // إحصائيات الطلبات
  async getOrderStats(companyId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.aggregate({
          where: {
            companyId,
            createdAt: { gte: startDate }
          },
          _count: { id: true },
          _sum: { total: true },
          _avg: { total: true }
        });
      }, 3);

      return {
        totalOrders: stats._count.id || 0,
        totalRevenue: parseFloat(stats._sum.total || 0),
        averageOrderValue: parseFloat(stats._avg.total || 0),
        period: `${days} days`
      };
    } catch (error) {
      console.error('❌ Error fetching order stats:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        period: `${days} days`
      };
    }
  }

  async checkDuplicateActiveTurboShipment(companyId, order) {
    try {
      const prisma = this.getPrisma();
      const rawPhone = order.customerPhone || order.customer?.phone || (order.shippingAddress && typeof order.shippingAddress === 'object' ? order.shippingAddress.phone : null);
      if (!rawPhone) return null;

      const cleanPhone = String(rawPhone)
        .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
        .replace(/\D/g, '')
        .slice(-10);

      if (!cleanPhone || cleanPhone.length < 8) return null;

      // Check if there is another recent order (within last 48 hours) with an active Turbo shipment for this customer
      const existing = await prisma.order.findFirst({
        where: {
          companyId,
          id: { not: order.id },
          turboShipmentId: { not: null },
          customerPhone: { contains: cleanPhone },
          createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'TRASH', 'LOST'] }
        },
        select: { id: true, orderNumber: true, turboShipmentId: true, createdAt: true }
      });

      return existing || null;
    } catch (err) {
      console.warn('⚠️ [TURBO] Error checking duplicate active shipment:', err.message);
      return null;
    }
  }
}

const orderService = new OrderService();
orderService.OrderService = OrderService;
orderService.orderService = orderService;

module.exports = orderService;
