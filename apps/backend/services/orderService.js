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
// metadata field ΓÇö otherwise the change never appears on the preparation page.
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
    //console.log('≡ƒ¢Æ OrderService initialized', companyId ? `for company ${companyId}` : 'without companyId');
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
        `┘ä╪º ┘è┘à┘â┘å ╪¬╪¡┘ê┘è┘ä ╪º┘ä╪╖┘ä╪¿ ┘ä┘ç╪░┘ç ╪º┘ä╪¡╪º┘ä╪⌐ ┘é╪¿┘ä ╪Ñ╪¼╪▒╪º╪í 3 ┘à╪¡╪º┘ê┘ä╪º╪¬ ╪º╪¬╪╡╪º┘ä ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä (╪º┘ä┘à╪¡╪º┘ê┘ä╪º╪¬ ╪º┘ä╪¡╪º┘ä┘è╪⌐: ${callAttempts})`,
        400
      );
    }
  }

  /**
   * ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º5.2):
   * ┘à╪▓╪º┘à┘å╪⌐ metadata.preparationStatus ┘ä╪¡╪º┘ä╪⌐ ┘à╪╣┘è┘æ┘å╪⌐ ΓÇö ┘à╪│╪¬╪«╪▒╪¼ ┘à┘å updateOrderStatus
   * (╪º┘ä┘à┘å╪╖┘é ╪º┘ä╪ú╪╡┘ä┘è ╪╣┘å╪» L1012-1021) ┘ä┘è┘Å╪│╪¬╪»╪╣┘ë ┘à┘å ╪«╪º╪▒╪¼ ╪º┘ä┘à╪│╪º╪▒ ╪º┘ä┘à┘ê╪¡┘æ╪» (┘à╪½┘ä ┘à╪│╪º╪▒╪º╪¬
   * ╪º┘ä╪┤╪║┘æ╪º┘ä╪⌐ ╪º┘ä┘à╪¬┘é╪»┘à╪⌐ ╪º┘ä╪¬┘è ╪¬╪│╪¬╪«╪»┘à prisma.order.update ╪«╪º┘à). Idempotent ΓÇö ┘ä╪º ┘è┘â╪¬╪¿
   * ╪┤┘è╪ª╪º┘ï ┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ ┘ä┘è╪│╪¬ ┘à┘å PREPARATION_PIPELINE_STATUSES.
   */
  async syncPreparationMetadata(orderId, status, prismaClient = null) {
    const normalized = String(status || '').toUpperCase();
    if (!PREPARATION_PIPELINE_STATUSES.has(normalized)) {
      return null;
    }
    const prisma = prismaClient || this.getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { metadata: true },
    });
    if (!order) return null;
    const currentMetadata = parsePreparationMetadata(order.metadata);
    const nextMetadata = JSON.stringify({
      ...currentMetadata,
      preparationStatus: normalized,
      preparationStatusUpdatedAt: new Date().toISOString(),
    });
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
      throw createOrderStatusError(`┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪º┘å╪¬┘é╪º┘ä ┘à┘å ╪º┘ä╪¡╪º┘ä╪⌐ ${normalizedCurrentStatus} ╪Ñ┘ä┘ë ${normalizedNextStatus}`);
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
   * ╪¡┘ü╪╕ ╪╣┘å┘ê╪º┘å ╪º┘ä╪╣┘à┘è┘ä ┘à┘å ╪º┘ä╪╖┘ä╪¿ (╪¿┘è╪¬╪¡┘ü╪╕ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘ü┘è metadata.address ╪╣╪┤╪º┘å ┘è╪╕┘ç╪▒ ┘ü┘è "╪¿┘è╪º┘å╪º╪¬┘è")
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
        ].filter(Boolean).join('╪î ').trim();
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
      console.log(`Γ£à [ORDER-SERVICE] Saved customer address (${customer.id})`);
    } catch (e) {
      console.error('ΓÜá∩╕Å [ORDER-SERVICE] Failed to save customer address:', e?.message || e);
    }
  }

  // ╪Ñ┘å╪┤╪º╪í ╪╖┘ä╪¿ ╪¼╪»┘è╪» ┘à┘å ╪º┘ä┘à╪¡╪º╪»╪½╪⌐ (┘å╪│╪«╪⌐ ┘à╪¿╪│╪╖╪⌐)
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

      //console.log('≡ƒ¢Æ Creating new order from conversation:', {
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

      // ╪Ñ┘å╪┤╪º╪í ╪▒┘é┘à ╪╖┘ä╪¿ ┘ü╪▒┘è╪»
      const orderNumber = await this.generateOrderNumber(companyId);

      // ╪¡╪│╪º╪¿ ╪º┘ä┘à╪¼┘à┘ê╪╣
      const subtotal = parseFloat(productPrice) * quantity;

      // ≡ƒÄü ╪¼┘ä╪¿ ┘à┘â╪º┘ü╪ó╪¬ ╪º┘ä┘ê┘ä╪º╪í ┘ê╪¬╪╖╪¿┘è┘é┘ç╪º
      let rewards = null;
      try {
        const loyaltyService = require('./hr/customerLoyaltyService');
        rewards = await loyaltyService.getCustomerActiveRewards(companyId, resolvedCustomerId);
      } catch (err) {
        console.error('ΓÜá∩╕Å Loyalty Rewards Fetch Failed:', err.message);
      }

      let finalSubtotal = subtotal;
      let appliedDiscount = 0;

      if (rewards && rewards.discountPercent > 0) {
        appliedDiscount = (subtotal * rewards.discountPercent) / 100;
        finalSubtotal = subtotal - appliedDiscount;
      }

      // ≡ƒÄü ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è: ┘ä┘ê ┘å╪╕╪º┘à ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è ┘à┘ü╪╣┘æ┘ä ┘ê╪º┘ä╪╣┘à┘è┘ä ╪╣┘å╪»┘ç ┘â┘ê╪¿┘ê┘å ╪«╪╡┘à ┘ü╪╣┘æ╪º┘ä╪î
      // ┘å╪╖╪¿┘é┘ç ╪╣┘ä┘ë ╪º┘ä╪╖┘ä╪¿ (┘à┘å ╪º┘ä┘à╪¡╪º╪»╪½╪⌐) ΓÇö ┘à╪┤ ╪¿╪│ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪¬╪¼╪▒.
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
            console.log(`Γ£à [AUTO-DISCOUNT] Applied ${voucherRes.discount} EGP discount to conversation order for customer ${resolvedCustomerId}`);
          }
        }
      } catch (autoDiscountError) {
        console.error('Γ¥î [AUTO-DISCOUNT] Failed to apply auto discount on conversation order:', autoDiscountError.message);
      }

      const explicitShipping = toFiniteNumberOrNull(data.shippingAmount ?? data.shippingCost ?? data.shipping);
      const shipping = explicitShipping !== null
        ? explicitShipping
        : parseFloat(this.calculateShipping(city, subtotal, rewards));
      const total = finalSubtotal + shipping;

      // ┘ü╪¡╪╡ ╪º┘ä╪¬┘â╪▒╪º╪▒ ┘é╪¿┘ä ╪º┘ä╪Ñ┘å╪┤╪º╪í
      const duplicateSettings = await this.getDuplicateSettings(companyId);
      let duplicateMatch = null;
      if (duplicateSettings && (customerPhone || data.customerEmail) && total > 0) {
        duplicateMatch = await this.findDuplicateOrder({
          companyId,
          customerPhone,
          customerEmail: data.customerEmail,
          total,
          windowMinutes: duplicateSettings.windowMinutes,
          includeGuest: false
        });
      }

      const isDuplicate = !!duplicateMatch;
      if (isDuplicate && duplicateSettings?.action === 'ignore') {
        const existingOrder = await safeQuery(async () => {
          return await this.getPrisma().order.findUnique({
            where: { id: duplicateMatch.order.id }
          });
        }, 3);
        return existingOrder ? { ...existingOrder, customer } : existingOrder;
      }

      // ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╖┘ä╪¿ ╪¿╪»┘ê┘å items (╪│┘å╪╢┘è┘ü┘ç╪º ┘ä╪º╪¡┘é╪º┘ï)
      const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
      if (!orderLimitCheck.allowed) {
        throw createLimitExceededError(orderLimitCheck.payload);
      }

      const productId = productName
        ? await this.findOrCreateProduct(productName, companyId)
        : null;

      let productSku = null;
      if (productId && productName) {
        const product = await this.getPrisma().product.findUnique({
          where: { id: productId },
          select: { sku: true }
        });
        productSku = product?.sku || null;
      }

      const orderItem = {
        productId,
        productSku,
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
        }),
      };

      const order = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.create({
          data: {
            orderNumber,
            company: { connect: { id: companyId } },
            customer: { connect: { id: resolvedCustomerId } },
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: 0,
            shipping: parseFloat(shipping.toFixed(2)),
            discount: parseFloat(appliedDiscount.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            currency: 'EGP',
            notes: `╪╖┘ä╪¿ ┘à┘å ╪º┘ä┘à╪¡╪º╪»╪½╪⌐\n╪º┘ä┘à┘å╪¬╪¼: ${productName}\n╪º┘ä┘ä┘ê┘å: ${productColor}\n╪º┘ä┘à┘é╪º╪│: ${productSize}\n╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä: ${customerName}\n╪º┘ä┘ç╪º╪¬┘ü: ${customerPhone}\n╪º┘ä┘à╪»┘è┘å╪⌐: ${city}\n╪º┘ä┘à╪¡╪º╪»╪½╪⌐: ${conversationId}\n${notes || ''}`,
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
            }),
            orderItems: {
              create: [orderItem],
            },
          }
        });
      }, 5);

      // ╪¡┘ü╪╕ ╪╣┘å┘ê╪º┘å ╪º┘ä╪╣┘à┘è┘ä ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à┘å ╪º┘ä╪╖┘ä╪¿ (┘è╪╕┘ç╪▒ ┘ü┘è "╪¿┘è╪º┘å╪º╪¬┘è")
      await this._saveCustomerAddress(
        resolvedCustomerId,
        companyId,
        data.shippingAddress || data.address || data.customerAddress || null
      );

      // ╪¬╪¡╪»┘è╪½ ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä
      await this.updateCustomerStats(resolvedCustomerId, parseFloat(total));

      // ≡ƒ¢Æ ╪¬╪╡╪»┘è╪▒ ╪¬┘ä┘é╪º╪ª┘è ┘ä┘Ç WooCommerce (┘ü┘è ╪º┘ä╪«┘ä┘ü┘è╪⌐) - ╪¬╪¼╪º┘ç┘ä ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à┘â╪▒╪▒╪⌐
      if (!isDuplicate) {
        try {
          const wooExportService = getWooCommerceAutoExportService();
          wooExportService.exportOrderAsync(order.id);
        } catch (wooError) {
          console.error('ΓÜá∩╕Å [ORDER-SERVICE] WooCommerce auto-export skipped:', wooError.message);
        }

        // ≡ƒöä Push order to consumer company if applicable
        internalSyncService.pushOrderToConsumer(order.id, companyId).catch(err => {
          console.error(`Γ¥î Failed to push order ${order.id} to consumer:`, err.message);
        });

        // ≡ƒÜÇ Push order to provider(s) if it contains imported products
        internalSyncService.pushOrderToProvider(order.id, companyId).catch(err => {
          console.error(`Γ¥î [INTERNAL-SYNC] Failed to push order ${order.id} to provider:`, err.message);
        });
      }

      // Trigger auto-distribution immediately
      try {
        const confirmationService = require('./orderConfirmationService');
        await confirmationService.autoAssignOnCreation(companyId, order.id, 'regular');
      } catch (distError) {
        console.error('Γ¥î [ORDER-SERVICE] Error in auto-distribution:', distError.message);
      }

      // ≡ƒÄü ╪¬╪│╪¼┘è┘ä ╪¬┘ä┘é╪º╪ª┘è ┘ü┘è ┘å╪╕╪º┘à ╪º┘ä┘ê┘ä╪º╪í + ╪¡╪│╪º╪¿ ╪º┘ä┘å┘é╪º╪╖ ┘ä╪ú┘è ╪╖┘ä╪¿ ╪¼╪»┘è╪» ┘à┘å ╪º┘ä┘à╪¡╪º╪»╪½╪⌐
      try {
        const customerLoyaltyService = require('./hr/customerLoyaltyService');
        await customerLoyaltyService.applyLoyaltyPointsForOrder({
          orderId: order.id,
          companyId,
          changedBy: data.createdBy
        }).catch((loyaltyError) => {
          console.error(`Γ¥î [LOYALTY-AUTO] Failed to award points for conversation order ${order.orderNumber}:`, loyaltyError.message);
        });
      } catch (loyaltyError) {
        console.error('Γ¥î [LOYALTY-AUTO] Loyalty service error:', loyaltyError.message);
      }

      //console.log('Γ£à Order created successfully:', order.orderNumber);
      return { ...order, customer };

    } catch (error) {
      console.error('Γ¥î Error creating order:', error);
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

  // ╪Ñ┘å╪┤╪º╪í ╪▒┘é┘à ╪╖┘ä╪¿ ┘ü╪▒┘è╪»
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

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get or create settings
      let settings = await tx.orderInvoiceSettings.findUnique({
        where: { companyId: effectiveCompanyId }
      });

      if (!settings) {
        // Create default settings if not exists
        settings = await tx.orderInvoiceSettings.create({
          data: {
            companyId: effectiveCompanyId,
            enableSequentialOrders: true,
            orderPrefix: 'ORD',
            nextOrderNumber: 1,
            orderNumberFormat: 'PREFIX-XXXXXX'
          }
        });
      }

      const currentNumber = settings.nextOrderNumber;
      const prefix = settings.orderPrefix || 'ORD';

      // Format number without leading zeros
      const paddedNumber = currentNumber.toString();
      const orderNumber = `${prefix}-${paddedNumber}`;

      // Increment for next order
      await tx.orderInvoiceSettings.update({
        where: { companyId: effectiveCompanyId },
        data: { nextOrderNumber: currentNumber + 1 }
      });

      return orderNumber;
    });

    return result;
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

  // ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪º┘ä╪¬┘â╪▒╪º╪▒
  async getDuplicateSettings(companyId = null) {
    const settings = await this.getOrderSettings(companyId);
    return {
      action: settings?.duplicateOrderAction || 'filter',
      windowMinutes: settings?.duplicateOrderWindowMinutes || 60
    };
  }

  normalizePhone(phone) {
    if (!phone) return null;
    const normalized = String(phone).replace(/\D/g, '');
    return normalized || null;
  }

  // ╪¬┘ê┘ä┘è╪» ┘â┘ä ╪º┘ä╪╡┘è╪║ ╪º┘ä┘à┘à┘â┘å╪⌐ ┘ä╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü (┘à╪╡╪▒/╪»┘ê┘ä┘è) ╪╣╪┤╪º┘å ┘â╪┤┘ü ╪º┘ä╪¬┘â╪▒╪º╪▒ ┘è┘à╪│┘â ┘å┘ü╪│ ╪º┘ä╪▒┘é┘à
  // ╪¿╪╡┘è╪║ ┘à╪«╪¬┘ä┘ü╪⌐ (012/20/+20/╪¿╪»┘ê┘å ╪¿╪º╪»╪ª╪⌐...). ┘å┘ü╪│ ┘à┘å╪╖┘é ╪º┘ä╪¿╪¡╪½ ┘ü┘è ╪º┘ä┘é╪º╪ª┘à╪⌐.
  getPhoneVariationsForDuplicate(input) {
    const clean = String(input || '').replace(/\D/g, '');
    if (!clean) return [];
    const variations = new Set([clean]);
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
    return Array.from(variations);
  }

  async findDuplicateOrder({
    prisma = null,
    companyId,
    customerPhone,
    customerEmail,
    total,
    windowMinutes = 60,
    includeGuest = false
  }) {
    if (!companyId) return null;
    if ((!customerPhone && !customerEmail) || total === undefined || total === null) return null;

    const client = prisma || this.getPrisma();
    const roundedTotal = parseFloat(Number(total).toFixed(2));
    const since = new Date(Date.now() - Number(windowMinutes) * 60 * 1000);

    const phone = this.normalizePhone(customerPhone);
    const email = customerEmail ? String(customerEmail).trim().toLowerCase() : null;

    const orderOr = [];
    if (phone || customerPhone) {
      const phoneCandidates = [
        String(customerPhone || '').trim(),
        ...this.getPhoneVariationsForDuplicate(phone || customerPhone)
      ];
      const uniquePhones = [...new Set(phoneCandidates.filter(Boolean))];
      if (uniquePhones.length > 0) {
        orderOr.push({ customerPhone: { in: uniquePhones, mode: 'insensitive' } });
      }
    }
    if (email) orderOr.push({ customerEmail: email });

    if (orderOr.length > 0) {
      const order = await client.order.findFirst({
        where: {
          companyId,
          total: roundedTotal,
          createdAt: { gte: since },
          status: { not: 'DUPLICATE_ORDER' },
          OR: orderOr
        },
        include: { orderItems: { select: { productName: true, quantity: true } } },
        orderBy: { createdAt: 'desc' }
      });

      if (order) return { type: 'order', order };
    }

    if (!includeGuest) return null;

    const guestOr = [];
    if (phone || customerPhone) {
      const phoneCandidates = [
        String(customerPhone || '').trim(),
        ...this.getPhoneVariationsForDuplicate(phone || customerPhone)
      ];
      const uniquePhones = [...new Set(phoneCandidates.filter(Boolean))];
      if (uniquePhones.length > 0) {
        guestOr.push({ guestPhone: { in: uniquePhones, mode: 'insensitive' } });
      }
    }
    if (email) guestOr.push({ guestEmail: email });

    if (guestOr.length === 0) return null;

    const guestOrder = await client.guestOrder.findFirst({
      where: {
        companyId,
        createdAt: { gte: since },
        status: { not: 'DUPLICATE_ORDER' },
        AND: [
          { OR: guestOr },
          { OR: [{ finalTotal: roundedTotal }, { total: roundedTotal }] }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (guestOrder) return { type: 'guest', order: guestOrder };
    return null;
  }

  // ╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪┤╪¡┘å
  calculateShipping(city, subtotal, rewards = null) {
    // ≡ƒÄü ╪¬┘é┘ä┘è┘ä ╪º┘ä╪ú┘ê┘ä┘ê┘è╪⌐ ┘ä┘ä┘à┘å╪╖┘é ╪º┘ä╪½╪º╪¿╪¬ ╪Ñ╪░╪º ┘â╪º┘å ┘ç┘å╪º┘â ┘à┘â╪º┘ü╪ú╪⌐ ╪┤╪¡┘å ┘à╪¼╪º┘å┘è ┘à┘å ╪¿╪▒┘å╪º┘à╪¼ ╪º┘ä┘ê┘ä╪º╪í
    if (rewards && rewards.freeShipping) {
      if (rewards.freeShippingThreshold === 0 || subtotal >= rewards.freeShippingThreshold) {
        return 0;
      }
    }

    // ╪┤╪¡┘å ┘à╪¼╪º┘å┘è ┘ä┘ä╪╖┘ä╪¿╪º╪¬ ╪ú┘â╪½╪▒ ┘à┘å 250 ╪¼┘å┘è┘ç (┘à┘å╪╖┘é ╪º┘ü╪¬╪▒╪º╪╢┘è)
    if (subtotal >= 250) {
      return 0;
    }

    // ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪┤╪¡┘å ╪¡╪│╪¿ ╪º┘ä┘à╪»┘è┘å╪⌐
    const shippingRates = {
      '╪º┘ä┘é╪º┘ç╪▒╪⌐': 50,
      '╪º┘ä╪Ñ╪│┘â┘å╪»╪▒┘è╪⌐': 50,
      '╪º┘ä╪¼┘è╪▓╪⌐': 50,
      'default': 75
    };

    return shippingRates[city] || shippingRates.default;
  }

  // ╪º┘ä╪¿╪¡╪½ ╪╣┘å ╪º┘ä┘à┘å╪¬╪¼ ╪ú┘ê ╪Ñ┘å╪┤╪º╪ñ┘ç
  async findOrCreateProduct(productName, companyId) {
    try {
      // ╪º┘ä╪¿╪¡╪½ ╪╣┘å ╪º┘ä┘à┘å╪¬╪¼ ╪º┘ä┘à┘ê╪¼┘ê╪»
      let product = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.product.findFirst({
          where: {
            name: productName,
            companyId
          }
        });
      }, 3);

      // ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à┘å╪¬╪¼ ╪Ñ╪░╪º ┘ä┘à ┘è┘â┘å ┘à┘ê╪¼┘ê╪»
      if (!product) {
        const productLimitCheck = await ensureWithinPlanLimit(companyId, 'products', 1);
        if (!productLimitCheck.allowed) {
          console.warn(
            `ΓÜá∩╕Å [ORDER-SERVICE] Skipping product auto-create for ${companyId}: ${productLimitCheck.payload?.message || 'Plan limit reached'}`
          );
          return null;
        }

        product = await safeQuery(async () => {
          const prisma = this.getPrisma();
          return await prisma.product.create({
            data: {
              name: productName,
              sku: `AUTO-${Date.now()}`, // ╪Ñ┘å╪┤╪º╪í SKU ╪¬┘ä┘é╪º╪ª┘è
              companyId,
              price: 0, // ╪│┘è╪¬┘à ╪¬╪¡╪»┘è╪½┘ç ┘ä╪º╪¡┘é╪º┘ï
              isActive: true,
              metadata: JSON.stringify({
                createdFromOrder: true,
                source: 'conversation_automation'
              })
            }
          });
        }, 5);
        //console.log('≡ƒôª Created new product:', productName);
      }

      return product.id;
    } catch (error) {
      console.error('Γ¥î Error finding/creating product:', error);
      // ╪Ñ╪▒╪¼╪º╪╣ null ╪Ñ╪░╪º ┘ü╪┤┘ä
      return null;
    }
  }

  // ╪¬╪¡╪»┘è╪½ ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä
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
      //console.log('≡ƒôè Customer stats updated');
    } catch (error) {
      console.error('Γ¥î Error updating customer stats:', error);
    }
  }

  // ╪º┘ä╪¡╪╡┘ê┘ä ╪╣┘ä┘ë ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣┘à┘è┘ä
  async getCustomerOrders(customerId, companyId, limit = 10) {
    try {
      const orders = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.findMany({
          where: {
            customerId,
            companyId // Γ£à SECURITY: Ensure company isolation
          },
          include: {
            items: {
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
      console.error('Γ¥î Error fetching customer orders:', error);
      return [];
    }
  }

  // ╪º┘ä╪¡╪╡┘ê┘ä ╪╣┘ä┘ë ╪╖┘ä╪¿ ╪¿╪º┘ä╪▒┘é┘à
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
      console.error('Γ¥î Error fetching order:', error);
      return null;
    }
  }

  // ╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿
  async updateOrderStatus(orderNumber, companyId, status, notes = null, userId = null, userName = null, existingOrderObject = null, isOverride = false, options = null) {

    try {
      const { skipCallAttemptGuard = false, skipTransitionValidation = false } = options || {};
      status = normalizeOrderStatusCode(status);

      // ΓÜí FIX: If status is an ID (CUIDs are typically >20 chars), resolve it to its Code
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

      // ≡ƒÜÇ SPEED OPTIMIZATION: Use pre-fetched order if available
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

      if (!order) throw createOrderStatusError("╪º┘ä╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»", 404);

      const currentStatus = normalizeOrderStatusCode(order.status);
      if (currentStatus === status) {
        return order;
      }

      // ≡ƒùæ∩╕Å Trash/Restore Logic
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
        if (!notes) notes = '╪¬┘à ╪º╪│╪¬╪╣╪º╪»╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘à┘å ╪│┘ä╪⌐ ╪º┘ä┘à╪¡╪░┘ê┘ü╪º╪¬';
      } else if (status === 'TRASH') {
        if (!notes) notes = '╪¬┘à ┘å┘é┘ä ╪º┘ä╪╖┘ä╪¿ ╪Ñ┘ä┘ë ╪│┘ä╪⌐ ╪º┘ä┘à╪¡╪░┘ê┘ü╪º╪¬';
      }

      // ≡ƒ¢í∩╕Å Late Cancellation Intercept
      if (status === 'CANCELLED' && order.company?.settings) {
        try {
          const settingsObj = typeof order.company.settings === 'string' 
            ? JSON.parse(order.company.settings) 
            : order.company.settings;
            
          if (settingsObj?.lateCancellationInterceptEnabled && Array.isArray(settingsObj?.lateCancellationTargetStatuses)) {
            if (settingsObj.lateCancellationTargetStatuses.includes(currentStatus)) {
              status = 'PENDING_CANCELLATION';
              if (!notes) notes = '╪¬┘à ╪╖┘ä╪¿ ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪ú╪½┘å╪º╪í ╪º┘ä╪¬╪¼┘ç┘è╪▓';
            }
          }
        } catch (e) {
          console.error('Γ¥î [ORDER-SERVICE-DEBUG] Error parsing company settings for late cancellation intercept:', e);
        }
      }
      
      // ≡ƒ¢í∩╕Å PRODUCTION-FIX (custom-status-enum): ╪╣┘à┘ê╪» order.status enum ┘à┘é┘ü┘ê┘ä ┘ü┘è ╪º┘ä╪»╪º╪¬╪º╪¿┘è╪▓╪î
      // ┘ê╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪«╪╡╪╡╪⌐ (┘à╪½┘ä DELAYED-WITH-CAPTAIN) ┘à╪┤ ╪¼╪▓╪í ┘à┘å┘ç. ╪¿┘å╪¡┘ä┘æ┘ç╪º ╪╣╪¿╪▒ mapsToSystem:
      // - storedStatus = ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä╪╡╪º┘ä╪¡╪⌐ ╪º┘ä┘ä┘è ╪¬╪¬╪«╪▓┘æ┘å ┘ü╪╣┘ä╪º┘ï ╪╣┘ä┘ë order.status.
      // - originalRequestedStatus = ╪º┘ä┘â┘ê╪» ╪º┘ä┘ä┘è ╪º┘ä┘à╪│╪¬╪«╪»┘à ╪╖┘ä╪¿┘ç (┘à╪«╪╡╪╡ ╪ú┘ê ┘å╪╕╪º┘à┘è) ΓÇö ┘å╪│╪¬╪«╪»┘à┘ç
      //   ┘ü┘è statusHistory + ╪Ñ╪┤╪╣╪º╪▒ WhatsApp (┘é╪º┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪«╪╡╪╡╪⌐).
      // ┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ ┘à╪┤ enum ┘ê┘à╪º┘ä┘ç╪º╪┤ mapsToSystem ╪╡╪º┘ä╪¡ ΓåÆ ┘å╪▒┘ü╪╢ ╪¿╪«╪╖╪ú ╪╣╪▒╪¿┘è ┘ê╪º╪╢╪¡ ╪¿╪»┘ä 500 Prisma.
      const { resolveOrderStatusForStorage } = require('../utils/orderStatusEnum');
      const { stored: storedStatus, notify: originalRequestedStatus } = await resolveOrderStatusForStorage(this.getPrisma(), companyId, status);
      if (!storedStatus) {
        throw createOrderStatusError(`╪º┘ä╪¡╪º┘ä╪⌐ "${status}" ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪⌐ ┘ê┘ä╪º ┘è┘à┘â┘å ╪¬╪╖╪¿┘è┘é┘ç╪º ╪╣┘ä┘ë ╪º┘ä╪╖┘ä╪¿`, 400);
      }
      if (currentStatus === storedStatus) {
        return order;
      }
      status = storedStatus;

      // ≡ƒÜ½ Block Scanner / Shipping Progression for PENDING_CANCELLATION
      if (currentStatus === 'PENDING_CANCELLATION' && ['PREPARING', 'QUALITY_CHECK', 'PACKAGED', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED'].includes(status)) {
        if (!isOverride) {
          throw createOrderStatusError("╪¬┘à ╪¡╪╕╪▒ ╪º┘ä╪Ñ╪│┘â╪º┘å╪▒: ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪¿┘ç ╪╖┘ä╪¿ ╪Ñ┘ä╪║╪º╪í ┘à╪╣┘ä┘é ┘ê┘è╪¼╪¿ ╪¡╪│┘à┘ç ╪ú┘ê┘ä╪º┘ï.");
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
            isOverride, // ΓÜí Pass correct override flag
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
        console.error('Γ¥î [ORDER-SERVICE] Invalid status transition:', transitionError.message);
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

      // ≡ƒöä [ORDER-SERVICE-UPDATE] Update the order
      // Sync metadata.preparationStatus so external status changes (quick-status,
      // orders page) are reflected on the preparation queue too.
      const isPrepPipelineStatus = PREPARATION_PIPELINE_STATUSES.has(status);
      let nextMetadata = null;
      if (isPrepPipelineStatus) {
        const currentMetadata = parsePreparationMetadata(order.metadata);
        nextMetadata = JSON.stringify({
          ...currentMetadata,
          preparationStatus: status,
          preparationStatusUpdatedAt: new Date().toISOString()
        });
      }

      const updatedOrder = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.update({
          where: { id: order.id },
          data: {
            status: status,
            notes: notes || undefined,
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
            orderItems: { include: { product: true } },
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

      // ≡ƒÜÇ SPEED: Return result immediately to the user
      // All other operations (Turbo, Returns, Commissions, Notifications) happen in the background
      (async () => {
        try {
          // ≡ƒÜÜ Turbo Integration

          if (status === 'CONFIRMED' && order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey && !order.turboShipmentId) {
            const TurboService = require('./turboService');
            const turboService = new TurboService(order.company.turboApiKey, order.companyId);
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

          // ≡ƒöä Returns Integration
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
              console.warn('ΓÜá∩╕Å [RETURNS-AUTO] Failed to check status config mapping in background:', configError.message);
            }
          }

          if (shouldCreateReturn) {
            // ≡ƒÜ¿ PRODUCTION-FIX (return-notification-gap): autoCreateReturnRequest ┘ä╪º╪▓┘à ┘è┘ü╪╢┘ä
            // ╪¼╪º┘å╪¿┘è ╪¬┘à╪º┘à╪º┘ï ΓÇö ╪ú┘è ┘ü╪┤┘ä ┘ü┘è┘ç (╪▓┘è FK ╪╣┘ä┘ë userId ╪¿╪¬╪º╪╣╪⌐ SYSTEM ┘à┘å ╪│┘è┘å┘â ╪¬╪▒╪¿┘ê) ┘â╪º┘å ╪¿┘è┘â╪│╪▒
            // ╪º┘ä┘Ç background block ┘â┘ä┘ç ┘ê┘é╪¿┘ä ┘ê╪╡┘ê┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘ä┘ä╪╣┘à┘è┘ä. ╪»┘ä┘ê┘é╪¬┘è ╪ú┘è ╪«╪╖╪ú ╪¿┘è╪¬╪│╪¼┘ä ╪¿╪│
            // ┘ê╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘è┘â┘à┘ä.
            await this.autoCreateReturnRequest(order, userId, status).catch(returnErr => {
              console.error(`Γ¥î [RETURNS-AUTO-BG] autoCreateReturnRequest failed for ${orderNumber}:`, returnErr.message);
            });
          }

          // ≡ƒÆ░ Affiliate & Commission & Cashback
          const commissionService = require('./commissionService');
          const shouldReverseAffiliateCommissions =
            status === 'CANCELLED' || shouldCreateReturn;

          if (shouldReverseAffiliateCommissions) {
            await commissionService.cancelAffiliateCommissionsForOrder(order.id, {
              reason:
                notes ||
                `╪¬┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ ${orderNumber} ╪Ñ┘ä┘ë ${status}╪î ┘ä╪░┘ä┘â ╪ú┘Å┘ä╪║┘è╪¬ ╪╣┘à┘ê┘ä╪º╪¬ ╪º┘ä┘à╪│┘ê┘é ╪║┘è╪▒ ╪º┘ä┘à╪╡╪▒┘ê┘ü╪⌐`,
            }).catch(commErr => {
              console.error(`Γ¥î [COMMISSION-BG] cancelAffiliateCommissionsForOrder failed for ${orderNumber}:`, commErr.message);
            });
            await commissionService.cancelMerchantCommissionsForOrder(order.id, {
              reason:
                notes ||
                `╪¬┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ ${orderNumber} ╪Ñ┘ä┘ë ${status}╪î ┘ä╪░┘ä┘â ╪ú┘Å┘ä╪║┘è╪¬ ┘à╪│╪¬╪¡┘é╪º╪¬ ╪º┘ä╪¬╪º╪¼╪▒ ╪║┘è╪▒ ╪º┘ä┘à╪╡╪▒┘ê┘ü╪⌐`,
            }).catch(commErr => {
              console.error(`Γ¥î [COMMISSION-BG] cancelMerchantCommissionsForOrder failed for ${orderNumber}:`, commErr.message);
            });
          }

          // ≡ƒÆ╕ ╪╣┘å╪» ╪Ñ┘ä╪║╪º╪í ╪╖┘ä╪¿ ╪º╪¬╪│┘ä┘à ΓÇö ╪▒╪¼┘æ╪╣ ╪º┘ä┘å┘é╪º╪╖ ┘ê╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ╪º┘ä┘ä┘è ╪º╪¬╪¡╪│╪¿┘ê╪º + ┘â┘ê╪¿┘ê┘å╪º╪¬ ╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è
          if (status === 'CANCELLED') {
            const cashbackService = require('./cashbackService');
            const loyaltyService = require('./hr/customerLoyaltyService');
            const autoDiscountService = require('./autoDiscountService');
            const cancelReason = notes || `╪Ñ┘ä╪║╪º╪í ╪º┘ä╪╖┘ä╪¿ ${orderNumber}`;
            await cashbackService.reverseCashbackForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
              console.error(`Γ¥î [CASHBACK-REVERSE] Failed for cancelled order ${orderNumber}:`, error.message);
            });
            await loyaltyService.reverseLoyaltyPointsForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId, reason: cancelReason }).catch(error => {
              console.error(`Γ¥î [LOYALTY-REVERSE] Failed for cancelled order ${orderNumber}:`, error.message);
            });
            await autoDiscountService.reverseVoucherForOrder({ orderId: order.id, companyId: order.companyId }).catch(error => {
              console.error(`Γ¥î [AUTO-DISCOUNT-REVERSE] Failed for cancelled order ${orderNumber}:`, error.message);
            });
            await autoDiscountService.restoreRedeemedPointsForOrder({ orderId: order.id, companyId: order.companyId }).catch(error => {
              console.error(`Γ¥î [AUTO-DISCOUNT-RESTORE-POINTS] Failed for cancelled order ${orderNumber}:`, error.message);
            });
          }

          if (status === 'CONFIRMED' || status === 'DELIVERED') {
            const dropshippingService = require('./dropshippingService');
            const prisma = this.getPrisma();

            // ┘é╪▒╪º╪í╪⌐ ╪º┘ä╪Ñ╪╣╪»╪º╪»: ┘ü┘è ╪ú┘è ╪¡╪º┘ä╪⌐ ╪¬╪¬╪¡╪│╪¿ ╪º┘ä╪╣┘à┘ê┘ä╪⌐
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

            // ┘å╪╕╪º┘à "╪º┘ä╪«╪╡┘à ╪º┘ä╪¬┘ä┘é╪º╪ª┘è": ╪¿╪»┘ä ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ╪º┘ä┘ü┘ê╪▒┘è ┘å┘Å╪╡╪»╪▒ ┘â┘ê╪¿┘ê┘å 10% ┘ä┘ä╪ú┘ê╪▒╪»╪▒ ╪º┘ä╪¼╪º┘è
            const autoActive = await autoDiscountService.isAutoDiscountActive(order.companyId).catch(() => false);
            if (!autoActive) {
              await cashbackService.applyCashbackForPaidOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
                console.error(`Γ¥î [CASHBACK-BG-ERROR] Failed for ${orderNumber}:`, error.message);
              });
            } else {
              await autoDiscountService.issueVoucherForDeliveredOrder({ orderId: order.id, companyId: order.companyId }).catch(error => {
                console.error(`Γ¥î [AUTO-DISCOUNT-BG-ERROR] Voucher issue failed for ${orderNumber}:`, error.message);
              });
            }

            await loyaltyService.applyLoyaltyPointsForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
              console.error(`Γ¥î [LOYALTY-BG-ERROR] Failed for ${orderNumber}:`, error.message);
            });

            // ≡ƒÜÇ ╪¬╪│╪¼┘è┘ä ╪º┘ä╪╣┘à┘è┘ä ┘ü┘è ╪│┘ä╪│┘ä╪⌐ ┘à╪º ╪¿╪╣╪» ╪º┘ä╪º╪│╪¬┘ä╪º┘à (╪¿╪╣╪» ╪ú╪│╪¿┘ê╪╣/╪ú╪│╪¿┘ê╪╣┘è┘å/╪¬╪º┘ä╪¬...) ╪╣┘å╪» ╪º┘ä╪¬╪│┘ä┘è┘à ╪º┘ä┘ü╪╣┘ä┘è
            try {
              const WhatsAppJourneyService = require('./whatsapp/WhatsAppJourneyService');
              await WhatsAppJourneyService.enrollCustomer(order.companyId, order.customerId, order.id).catch(error => {
                console.error(`Γ¥î [JOURNEY-BG-ERROR] Enroll failed for ${orderNumber}:`, error.message);
              });
            } catch (journeyError) {
              console.error(`Γ¥î [JOURNEY-ERROR] Enroll threw for ${orderNumber}:`, journeyError.message);
            }
          }

          // ≡ƒô▒ WhatsApp Notification (with duplicate check)
          try {
            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

            // ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.1):
            // ┘ä╪º ╪¬╪¡╪¼╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪║┘è╪▒ ╪º┘ä┘à╪▒╪│┘ê┘à╪⌐ ┘ç┘å╪º ΓÇö ╪»╪╣ sendOrderStatusNotification ┘è┘é╪▒╪▒ ╪╣╪¿╪▒
            // DB OrderStatusConfig.notifyCustomer + ╪«╪▒┘è╪╖╪¬┘ç ╪º┘ä╪ú┘ê╪│╪╣ + fallback isFallback.
            // ≡ƒ¢í∩╕Å PRODUCTION-FIX (custom-status-enum): ┘å╪│╪¬╪«╪»┘à ╪º┘ä┘â┘ê╪» ╪º┘ä╪ú╪╡┘ä┘è (originalRequestedStatus)
            // ΓÇö ┘à╪┤ ╪º┘ä┘Ç stored enum ΓÇö ╪╣╪┤╪º┘å ┘é╪º┘ä╪¿ ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪«╪╡╪╡╪⌐ (┘à╪½┘ä DELAYED-WITH-CAPTAIN) ┘è╪┤╪¬╪║┘ä.
            const notificationStatus = normalizeWhatsAppOrderStatus(originalRequestedStatus) || originalRequestedStatus;

            // Γ£à Check for duplicate notification (┘ê╪¡┘æ╪»╪¬ ╪╣╪¿╪▒ isDuplicateNotification ┬º3.1)
            // ≡ƒ¢í∩╕Å PRODUCTION-FIX (custom-status-enum-dedup): ╪º┘ä┘Ç dedup ┘ä╪º╪▓┘à ┘è╪│╪¬╪«╪»┘à ┘å┘ü╪│ ╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä┘ä┘è
            // ┘ç╪¬╪¬╪«╪▓┘å ┘ü╪╣┘ä╪º┘ï ┘ü┘è whatsAppNotificationLog.eventType ΓÇö ┘ä┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä┘à╪«╪╡╪╡╪⌐ ╪»┘è `mapsToSystem`
            // (┘à╪½┘ä ON_HOLD) ┘à╪┤ ╪º┘ä┘â┘ê╪» ╪º┘ä┘à╪«╪╡╪╡ ΓÇö ┘ê╪Ñ┘ä╪º ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘à┘â╪▒╪▒╪⌐ ┘à╪¬╪¬╪╣╪▒┘ü╪┤ (┘é╪» ╪¬╪│╪¿╪¿ ╪│╪¿╪º┘à ┘ä┘ä╪╣┘à┘è┘ä).
            const { getPersistedNotificationEventType } = require('./whatsapp/notificationTypes');
            const persistedEventForDedup = getPersistedNotificationEventType(storedStatus || notificationStatus);
            const recentNotification = await WhatsAppNotificationService.isDuplicateNotification({
              companyId: order.companyId,
              orderId: order.id,
              eventType: persistedEventForDedup,
            });

            if (recentNotification) {
            } else {
              await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
            }
          } catch (whatsappError) {
            console.error('ΓÜá∩╕Å [WHATSAPP-STATUS-ERROR] Background notification failed:', whatsappError.message);
          }

          // ≡ƒº╛ Auto Invoice Generation
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
            console.error('ΓÜá∩╕Å [INVOICE-AUTO-ERROR] Failed auto-generation:', invoiceError.message);
          }

        } catch (backgroundError) {
          console.error('ΓÜá∩╕Å [ORDER-STATUS-BG-ERROR]:', backgroundError.message);
        }
      })();

      return updatedOrder;
    } catch (error) {
      console.error('Γ¥î Error updating order status:', error);
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
        throw createOrderStatusError('╪º┘ä╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»', 404);
      }

      if (normalizeOrderStatusCode(guestOrder.status) === status) {
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
        if (!notes) notes = '├ÿ┬¬├ÖΓÇª ├ÿ┬º├ÿ┬│├ÿ┬¬├ÿ┬╣├ÿ┬º├ÿ┬»├ÿ┬⌐ ├ÿ┬º├ÖΓÇ₧├ÿ┬╖├ÖΓÇ₧├ÿ┬¿ ├ÖΓÇª├ÖΓÇá ├ÿ┬│├ÖΓÇ₧├ÿ┬⌐ ├ÿ┬º├ÖΓÇ₧├ÖΓÇª├ÿ┬¡├ÿ┬░├Ö╦å├Ö┬ü├ÿ┬º├ÿ┬¬';
      } else if (status === 'TRASH') {
        if (!notes) notes = '├ÿ┬¬├ÖΓÇª ├ÖΓÇá├ÖΓÇÜ├ÖΓÇ₧ ├ÿ┬º├ÖΓÇ₧├ÿ┬╖├ÖΓÇ₧├ÿ┬¿ ├ÿ┬Ñ├ÖΓÇ₧├ÖΓÇ░ ├ÿ┬│├ÖΓÇ₧├ÿ┬⌐ ├ÿ┬º├ÖΓÇ₧├ÖΓÇª├ÿ┬¡├ÿ┬░├Ö╦å├Ö┬ü├ÿ┬º├ÿ┬¬';
      }

      if (!skipCallAttemptGuard) {
        this.assertCallAttemptRequirement(guestOrder, status);
      }
      await this.validateConfiguredStatusTransition(guestOrder.companyId, guestOrder.status, status, {
        skipValidation: skipTransitionValidation
      });

      const isPrepPipelineStatus = PREPARATION_PIPELINE_STATUSES.has(status);
      let nextGuestMetadata = null;
      if (isPrepPipelineStatus) {
        const currentMetadata = parsePreparationMetadata(guestOrder.metadata);
        nextGuestMetadata = JSON.stringify({
          ...currentMetadata,
          preparationStatus: status,
          preparationStatusUpdatedAt: new Date().toISOString()
        });
      }

      const updatedGuestOrder = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.guestOrder.update({
          where: { id: guestOrder.id },
          data: {
            status,
            notes: notes || undefined,
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

      await (async () => {
        try {
          if (status === 'CONFIRMED' || status === 'PROCESSING') {
            internalSyncService.pushOrderToProvider(updatedGuestOrder.id, companyId).catch(err => {
              console.error(`Γ¥î [INTERNAL-SYNC] Failed to push guest order ${updatedGuestOrder.id} to provider:`, err.message);
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
              console.error('Γ¥î [CASHBACK] Failed to add cashback on guest order delivered:', cashbackError?.message);
            }
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
              customerPhone: updatedGuestOrder.guestPhone,
              customerName: updatedGuestOrder.guestName,
              items: guestItems,
              currency: 'EGP'
            };

            if (!notificationOrder.customerPhone) {
              return;
            }

            const notificationStatus = normalizeWhatsAppOrderStatus(status) || status;

            // ≡ƒÜ¿ PRODUCTION-FIX (notifications-fix-plan ┬º2.1):
            // ┘ä╪º ╪¬╪¡╪¼╪¿ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪║┘è╪▒ ╪º┘ä┘à╪▒╪│┘ê┘à╪⌐ ΓÇö ╪»╪╣ sendOrderStatusNotification ┘è┘é╪▒╪▒
            // (DB OrderStatusConfig.notifyCustomer + ╪«╪▒┘è╪╖╪¬┘ç ╪º┘ä╪ú┘ê╪│╪╣ + fallback).
            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
            // Γ£à Check for duplicate notification (┘ê╪¡┘æ╪»╪¬ ╪╣╪¿╪▒ isDuplicateNotification ┬º3.1)
            const recentNotification = await WhatsAppNotificationService.isDuplicateNotification({
              companyId,
              recipientPhone: notificationOrder.customerPhone,
              eventType: notificationStatus,
            });

            if (recentNotification) {
              return;
            }

            const notificationResult = await WhatsAppNotificationService.sendOrderStatusNotification(notificationOrder, notificationStatus);

            if (notificationResult?.success === false) {
            } else {
            }
          } catch (waError) {
            console.error(`ΓÜá∩╕Å [WHATSAPP] Failed to send notification for guest order: ${waError.message}`);
          }
        } catch (backgroundError) {
          console.error('ΓÜá∩╕Å [GUEST-ORDER-STATUS-BG-ERROR]:', backgroundError.message);
        }
      })();

      return updatedGuestOrder;
    } catch (error) {
      console.error('Γ¥î Error updating guest order status:', error);
      throw error;
    }
  }

  // ╪Ñ┘å╪┤╪º╪í ╪╖┘ä╪¿ ╪Ñ╪▒╪¼╪º╪╣ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï
  async autoCreateReturnRequest(order, userId, status) {
    try {
      const prisma = this.getPrisma();

      const existingRequest = await prisma.returnRequest.findFirst({
        where: { companyId: order.companyId, orderId: order.id }
      });

      if (existingRequest) {
        return;
      }

      let reason = await prisma.returnReason.findFirst({
        where: { companyId: order.companyId, isActive: true }
      });

      if (!reason) {
        reason = await prisma.returnReason.create({
          data: {
            reason: '╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪¬┘ä┘é╪º╪ª┘è',
            description: '╪¬┘à ╪Ñ┘å╪┤╪º╪í ┘ç╪░╪º ╪º┘ä╪│╪¿╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à┘å ┘å╪╕╪º┘à ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬',
            companyId: order.companyId
          }
        });
      }

      const request = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          companyId: order.companyId,
          reasonId: reason.id,
          status: 'PENDING',
          adminNotes: `╪¬┘à ╪Ñ┘å╪┤╪º╪í ┘ç╪░╪º ╪º┘ä╪╖┘ä╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪╣┘å╪» ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ ╪º┘ä╪ú╪╡┘ä┘è ╪Ñ┘ä┘ë: ${status}`,
          responsibleParty: 'OTHER',
          isReviewed: false,
          refundAmount: order.total ? parseFloat(order.total) : undefined,
        }
      });

      await prisma.returnActivityLog.create({
        data: {
          returnRequestId: request.id,
          // ≡ƒÜ¿ PRODUCTION-FIX (return-notification-gap): ╪│┘è┘å┘â ╪¬╪▒╪¿┘ê ╪¿┘è┘à╪▒╪▒ userId='SYSTEM'
          // (┘à╪┤ id ┘à╪│╪¬╪«╪»┘à ╪¡┘é┘è┘é┘è) ΓåÆ ┘â╪º┘å ╪¿┘è┘â╪│╪▒ FK return_activity_logs_userId_fkey ΓåÆ
          // ┘ü┘â╪º┘å ╪¿┘è┘à┘å╪╣ ╪Ñ╪┤╪╣╪º╪▒ ╪º┘ä┘à╪▒╪¬╪¼╪╣. ╪¿┘å┘à╪▒╪▒ userId ╪¿╪│ ┘ä┘ê ┘ç┘ê id ╪¡┘é┘è┘é┘è.
          userId: (userId && typeof userId === 'string' && !['SYSTEM', 'System', 'system', 'SYSTEM_SYNC', 'AUTO', 'Turbo Sync'].includes(String(userId))) ? userId : undefined,
          action: 'AUTO_CREATED',
          details: `╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪╖┘ä╪¿ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪¿╪│╪¿╪¿ ╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘ä┘Ç ${status}`
        }
      });

    } catch (error) {
      if (error.code === 'P2002') {
        return;
      }
      console.error('Γ¥î [RETURNS-AUTO] Error in autoCreateReturnRequest:', error);
      throw error;
    }
  }

  // ╪¬╪ú┘â┘è╪» ╪º┘ä╪╖┘ä╪¿
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
          throw new Error('╪º┘ä╪╖┘ä╪¿ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪» ╪ú┘ê ╪║┘è╪▒ ╪¬╪º╪¿╪╣ ┘ä┘ç╪░┘ç ╪º┘ä╪┤╪▒┘â╪⌐');
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
                product: true
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

      // ≡ƒÜÜ Turbo Integration: ╪Ñ┘å╪┤╪º╪í ╪┤╪¡┘å╪⌐ ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ╪Ñ╪░╪º ┘â╪º┘å ┘à┘ü╪╣┘æ┘ä
      if (order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey) {
        try {
          const TurboService = require('./turboService');
          const turboService = new TurboService(order.company.turboApiKey, order.companyId);

          // ╪¬╪¡╪╢┘è╪▒ ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╖┘ä╪¿
          const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

          // ╪Ñ┘å╪┤╪º╪í ╪º┘ä╪┤╪¡┘å╪⌐
          const shipmentResult = await turboService.createShipment(orderData);

          // ╪¡┘ü╪╕ ┘à╪╣┘ä┘ê┘à╪º╪¬ ╪º┘ä╪┤╪¡┘å╪⌐ ┘ü┘è ┘é╪º╪╣╪»╪⌐ ╪º┘ä╪¿┘è╪º┘å╪º╪¬
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

        } catch (turboError) {
          // ┘ä╪º ┘å┘ê┘é┘ü ╪º┘ä╪╣┘à┘ä┘è╪⌐ ╪Ñ╪░╪º ┘ü╪┤┘ä Turbo - ┘ü┘é╪╖ ┘å╪│╪¼┘ä ╪º┘ä╪«╪╖╪ú
          console.error(`Γ¥î [TURBO] Failed to create shipment for order ${orderNumber}:`, turboError.message);
        }
      }

      //console.log(`Γ£à Order ${orderNumber} confirmed`);
      return order;
    } catch (error) {
      console.error('Γ¥î Error confirming order:', error);
      throw error;
    }
  }

  // ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪╖┘ä╪¿
  async cancelOrder(orderNumber, companyId, reason = null) {
    return await this.updateOrderStatus(
      orderNumber,
      companyId,
      'CANCELLED',
      reason || '╪¬┘à ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪╖┘ä╪¿',
      null,
      null
    );
  }

  // ╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬
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
      console.error('Γ¥î Error fetching order stats:', error);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        period: `${days} days`
      };
    }
  }
}

const orderService = new OrderService();
orderService.OrderService = OrderService;
orderService.orderService = orderService;

module.exports = orderService;
