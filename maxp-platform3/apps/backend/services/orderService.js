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

const getWhatsAppOrderEventType = (status) => {
  const normalizedStatus = normalizeWhatsAppOrderStatus(status);
  if (!normalizedStatus) {
    return null;
  }

  const mappedEventTypes = {
    CONFIRMED: 'ORDER_CONFIRMED',
    PROCESSING: 'ORDER_PROCESSING',
    PICKING: 'PICKING',
    PACKED: 'PACKED',
    SHIPPED: 'ORDER_SHIPPED',
    OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
    DELIVERED: 'ORDER_DELIVERED',
    CANCELLED: 'ORDER_CANCELLED'
  };

  return mappedEventTypes[normalizedStatus] || null;
};

const FAILURE_STATUSES_REQUIRING_CALLS = new Set(['DELIVERY_FAILED', 'NO_ANSWER']);

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

      const explicitShipping = toFiniteNumberOrNull(data.shippingAmount ?? data.shippingCost ?? data.shipping);
      const shipping = explicitShipping !== null
        ? explicitShipping
        : parseFloat(this.calculateShipping(city, subtotal, rewards));
      const total = finalSubtotal + shipping;

      // فحص التكرار قبل الإنشاء
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

      // إنشاء الطلب بدون items (سنضيفها لاحقاً)
      const orderLimitCheck = await ensureWithinPlanLimit(companyId, 'orders', 1);
      if (!orderLimitCheck.allowed) {
        throw createLimitExceededError(orderLimitCheck.payload);
      }

      const productId = productName
        ? await this.findOrCreateProduct(productName, companyId)
        : null;

      const orderItem = {
        productId,
        quantity,
        price: parseFloat(Number(productPrice).toFixed(2)),
        total: parseFloat(subtotal.toFixed(2)),
        productName: productName || null,
        productColor: productColor || null,
        productSize: productSize || null,
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
            orderItems: {
              create: [orderItem],
            },
          }
        });
      }, 5);

      // تحديث إحصائيات العميل
      await this.updateCustomerStats(resolvedCustomerId, parseFloat(total));

      // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية) - تجاهل للطلبات المكررة
      if (!isDuplicate) {
        try {
          const wooExportService = getWooCommerceAutoExportService();
          wooExportService.exportOrderAsync(order.id);
        } catch (wooError) {
          console.log('⚠️ [ORDER-SERVICE] WooCommerce auto-export skipped:', wooError.message);
        }

        // 🔄 Push order to consumer company if applicable
        internalSyncService.pushOrderToConsumer(order.id, companyId).catch(err => {
          console.error(`❌ Failed to push order ${order.id} to consumer:`, err.message);
        });

        // 🚀 Push order to provider(s) if it contains imported products
        internalSyncService.pushOrderToProvider(order.id, companyId).catch(err => {
          console.error(`❌ [INTERNAL-SYNC] Failed to push order ${order.id} to provider:`, err.message);
        });
      }

      // Trigger auto-distribution immediately
      try {
        const confirmationService = require('./orderConfirmationService');
        await confirmationService.autoAssignOnCreation(companyId, order.id, 'regular');
      } catch (distError) {
        console.error('❌ [ORDER-SERVICE] Error in auto-distribution:', distError.message);
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

  // إعدادات التكرار
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
      const phoneCandidates = [];
      if (customerPhone) phoneCandidates.push(String(customerPhone).trim());
      if (phone && !phoneCandidates.includes(phone)) phoneCandidates.push(phone);
      if (phoneCandidates.length > 0) {
        orderOr.push({ customerPhone: { in: phoneCandidates } });
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
        orderBy: { createdAt: 'desc' }
      });

      if (order) return { type: 'order', order };
    }

    if (!includeGuest) return null;

    const guestOr = [];
    if (phone || customerPhone) {
      const phoneCandidates = [];
      if (customerPhone) phoneCandidates.push(String(customerPhone).trim());
      if (phone && !phoneCandidates.includes(phone)) phoneCandidates.push(phone);
      if (phoneCandidates.length > 0) {
        guestOr.push({ guestPhone: { in: phoneCandidates } });
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
    console.log(`🔄 [ORDER-SERVICE-DEBUG] updateOrderStatus called:`);
    console.log(`   - Order Number: ${orderNumber}`);
    console.log(`   - New Status: ${status}`);
    console.log(`   - Notes: ${notes || 'None'}`);
    console.log(`   - Company ID: ${companyId}`);
    console.log(`   - User ID: ${userId || 'None'}`);
    console.log(`   - User Name: ${userName || 'None'}`);
    console.log(`   - Is Override: ${isOverride}`);

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
      if (currentStatus === status) {
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
              console.log(`⚠️ [ORDER-SERVICE-DEBUG] Intercepting cancellation for order ${order.orderNumber}. Changing to PENDING_CANCELLATION.`);
              status = 'PENDING_CANCELLATION';
              if (!notes) notes = 'تم طلب إلغاء الأوردر أثناء التجهيز';
            }
          }
        } catch (e) {
          console.error('❌ [ORDER-SERVICE-DEBUG] Error parsing company settings for late cancellation intercept:', e);
        }
      }
      
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
        console.log(`🔍 [ORDER-SERVICE-DEBUG] Calling orderWorkflowService.validateStatusChange...`);
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
          console.log(`✅ [ORDER-SERVICE-DEBUG] Action allowed by Workflow Service.`);
          workflowAuditLog = workflowResult.auditLog || null;
          if (workflowResult.nextStatusCode) {
            status = workflowResult.nextStatusCode;
          }
        }

        if (workflowResult && workflowResult.status === 'pending') {
          console.log(`ℹ️ [ORDER-SERVICE-DEBUG] Action pending approval.`);
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
      const updatedOrder = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.order.update({
          where: { id: order.id },
          data: {
            status: status,
            notes: notes || undefined,
            ...confirmationData,
            ...resetConfirmationData,
            updatedAt: new Date(),
            statusHistory: {
              create: {
                status: status,
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

      // 🚀 SPEED: Return result immediately to the user
      // All other operations (Turbo, Returns, Commissions, Notifications) happen in the background
      (async () => {
        try {
          // 🚚 Turbo Integration
          console.log(`🔍 [TURBO-DEBUG] Checking auto shipment for order ${orderNumber} in background:`);
          console.log(`   - New Status: ${status}`);
          console.log(`   - Company ID: ${order.companyId}`);
          console.log(`   - Turbo Enabled: ${order.company?.turboEnabled}`);
          console.log(`   - Auto Create: ${order.company?.turboAutoCreate}`);
          console.log(`   - Has API Key: ${order.company?.turboApiKey ? 'Yes' : 'No'}`);
          console.log(`   - Existing Shipment ID: ${order.turboShipmentId || 'None'}`);

          if (status === 'CONFIRMED' && order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey && !order.turboShipmentId) {
            console.log(`🚀 [TURBO] Backgrounding shipment creation for order ${orderNumber}`);
            const TurboService = require('./turboService');
            const turboService = new TurboService(order.company.turboApiKey, order.companyId);
            const orderData = turboService.formatOrderForTurbo(order, order.customer, order.orderItems);

            const shipmentResult = await turboService.createShipment(orderData);
            console.log(`📦 [TURBO-BG] Result for ${orderNumber}:`, shipmentResult.success);

            if (shipmentResult.success) {
              const prisma = this.getPrisma();
              await prisma.order.update({
                where: { id: order.id },
                data: {
                  turboShipmentId: String(shipmentResult.shipmentId || ''),
                  turboTrackingNumber: String(shipmentResult.trackingNumber || ''),
                  turboShipmentStatus: shipmentResult.status,
                  turboLabelUrl: shipmentResult.labelUrl,
                  turboMetadata: JSON.stringify(shipmentResult.data)
                }
              });
              console.log(`✅ [TURBO-BG] Database updated for ${orderNumber}`);
            }
          } else {
            console.log(`❌ [TURBO-DEBUG] Auto shipment conditions not met in background:`);
            if (status !== 'CONFIRMED') console.log(`   - Status is '${status}', not 'CONFIRMED'`);
            if (!order.company?.turboEnabled) console.log(`   - Turbo not enabled`);
            if (!order.company?.turboAutoCreate) console.log(`   - Auto create disabled`);
            if (!order.company?.turboApiKey) console.log(`   - No API key`);
            if (order.turboShipmentId) console.log(`   - Shipment already exists`);
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
                console.log(`🔄 [RETURNS-AUTO] Custom status '${status}' maps to '${newStatusConfig.mapsToSystem}', triggering return request in background.`);
              }
            } catch (configError) {
              console.warn('⚠️ [RETURNS-AUTO] Failed to check status config mapping in background:', configError.message);
            }
          }

          if (shouldCreateReturn) {
            console.log(`🔄 [RETURNS-AUTO] Triggering background return request for order ${orderNumber}`);
            await this.autoCreateReturnRequest(order, userId, status);
            console.log(`✅ [RETURNS-BG] Auto return created for ${orderNumber}`);
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
            });
            await commissionService.cancelMerchantCommissionsForOrder(order.id, {
              reason:
                notes ||
                `تم تغيير حالة الطلب ${orderNumber} إلى ${status}، لذلك أُلغيت مستحقات التاجر غير المصروفة`,
            });
          }

          if (status === 'CONFIRMED' || status === 'DELIVERED') {
            const dropshippingService = require('./dropshippingService');
            const prisma = this.getPrisma();

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
              console.log(`✅ [COMMISSION-BG] Calculated for order ${orderNumber}`);
            }
          }

          if (status === 'DELIVERED') {
            const cashbackService = require('./cashbackService');
            const loyaltyService = require('./hr/customerLoyaltyService');
            await cashbackService.applyCashbackForPaidOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
              console.error(`❌ [CASHBACK-BG-ERROR] Failed for ${orderNumber}:`, error.message);
            });
            console.log(`✅ [CASHBACK-BG] Applied for order ${orderNumber}`);

            await loyaltyService.applyLoyaltyPointsForOrder({ orderId: order.id, companyId: order.companyId, changedBy: userId }).catch(error => {
              console.error(`❌ [LOYALTY-BG-ERROR] Failed for ${orderNumber}:`, error.message);
            });
            console.log(`✅ [LOYALTY-BG] Applied for order ${orderNumber}`);
          }

          // 📱 WhatsApp Notification (with duplicate check)
          try {
            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

            const notificationStatus = normalizeWhatsAppOrderStatus(status);
            const eventType = getWhatsAppOrderEventType(status);

            if (!notificationStatus || !eventType) {
              console.log(`ℹ️ [WHATSAPP-STATUS] Skipping unsupported notification status for Order: ${order.orderNumber}, Status: ${status}`);
            } else {
              // ✅ Check for duplicate notification in last 10 seconds
              const prisma = this.getPrisma();
              const recentNotification = await prisma.whatsAppNotificationLog.findFirst({
                where: {
                  orderId: order.id,
                  eventType,
                  createdAt: { gte: new Date(Date.now() - 10000) } // Last 10 seconds
                }
              });

              if (recentNotification) {
                console.log(`⚠️ [WHATSAPP-STATUS] Duplicate notification blocked for Order: ${order.orderNumber}, Status: ${notificationStatus}`);
              } else {
                await WhatsAppNotificationService.sendOrderStatusNotification(order, notificationStatus);
                console.log(`✅ [WHATSAPP-STATUS] Background notification sent for Order: ${order.orderNumber}, Status: ${notificationStatus}`);
              }
            }
          } catch (whatsappError) {
            console.error('⚠️ [WHATSAPP-STATUS-ERROR] Background notification failed:', whatsappError.message);
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
                console.log(`✅ [INVOICE-AUTO] Auto-generated invoice for order ${order.orderNumber} on status ${normalizedStatus}`);
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
    console.log(`🔄 [GUEST-ORDER-SERVICE-DEBUG] updateGuestOrderStatus called:`);
    console.log(`   - Order Number: ${orderNumber}`);
    console.log(`   - New Status: ${status}`);
    console.log(`   - Notes: ${notes || 'None'}`);
    console.log(`   - Company ID: ${companyId}`);
    console.log(`   - User ID: ${userId || 'None'}`);
    console.log(`   - User Name: ${userName || 'None'}`);

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

      const updatedGuestOrder = await safeQuery(async () => {
        const prisma = this.getPrisma();
        return await prisma.guestOrder.update({
          where: { id: guestOrder.id },
          data: {
            status,
            notes: notes || undefined,
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
              console.log(`ℹ️ [WHATSAPP] Guest order ${orderNumber} has no phone number for status notifications.`);
              return;
            }

            const notificationStatus = normalizeWhatsAppOrderStatus(status);
            const eventType = getWhatsAppOrderEventType(status);

            if (!notificationStatus || !eventType) {
              console.log(`ℹ️ [WHATSAPP] Skipping unsupported notification status for guest order: ${orderNumber}, Status: ${status}`);
              return;
            }

            const prisma = this.getPrisma();
            const recentNotification = await prisma.whatsAppNotificationLog.findFirst({
              where: {
                recipientPhone: notificationOrder.customerPhone,
                eventType,
                createdAt: { gte: new Date(Date.now() - 10000) }
              },
              select: { id: true }
            });

            if (recentNotification) {
              console.log(`⚠️ [WHATSAPP] Duplicate notification blocked for guest order: ${orderNumber}, Status: ${notificationStatus}`);
              return;
            }

            const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');
            const notificationResult = await WhatsAppNotificationService.sendOrderStatusNotification(notificationOrder, notificationStatus);

            if (notificationResult?.success === false) {
              console.log(`ℹ️ [WHATSAPP] Guest order notification skipped for ${orderNumber}: ${notificationResult.reason || 'unknown_reason'}`);
            } else {
              console.log(`✅ [WHATSAPP] Notification sent for guest order direct update: ${orderNumber}`);
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
  async autoCreateReturnRequest(order, userId, status) {
    try {
      const prisma = this.getPrisma();

      // التحقق من عدم وجود طلب إرجاع مسبق
      const existingRequest = await prisma.returnRequest.findFirst({
        where: { orderId: order.id }
      });

      if (existingRequest) {
        console.log(`ℹ️ [RETURNS-AUTO] Return request already exists for order ${order.orderNumber}`);
        return;
      }

      // البحث عن سبب افتراضي أو إنشاء واحد
      let reason = await prisma.returnReason.findFirst({
        where: { companyId: order.companyId, isActive: true }
      });

      if (!reason) {
        console.log(`ℹ️ [RETURNS-AUTO] No return reasons found, creating a default one...`);
        reason = await prisma.returnReason.create({
          data: {
            reason: 'تغيير حالة تلقائي',
            description: 'تم إنشاء هذا السبب تلقائياً من نظام إدارة الطلبات',
            companyId: order.companyId
          }
        });
      }

      // إنشاء طلب الإرجاع
      const request = await prisma.returnRequest.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          companyId: order.companyId,
          reasonId: reason.id,
          status: 'PENDING',
          adminNotes: `تم إنشاء هذا الطلب تلقائياً عند تغيير حالة الطلب الأصلي إلى: ${status}`,
          responsibleParty: 'OTHER',
          isReviewed: false,
          refundAmount: order.total ? parseFloat(order.total) : undefined,
        }
      });

      // تسجيل هذا الإجراء في سجل نشاط المرتجع
      await prisma.returnActivityLog.create({
        data: {
          returnRequestId: request.id,
          userId: userId || undefined,
          action: 'AUTO_CREATED',
          details: `تم إنشاء الطلب تلقائياً بسبب تحديث حالة الطلب لـ ${status}`
        }
      });

      console.log(`✅ [RETURNS-AUTO] Return request ${request.id} created automatically for order ${order.orderNumber}`);
    } catch (error) {
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

      // 🚚 Turbo Integration: إنشاء شحنة تلقائياً إذا كان مفعّل
      if (order.company?.turboEnabled && order.company?.turboAutoCreate && order.company?.turboApiKey) {
        try {
          const TurboService = require('./turboService');
          const turboService = new TurboService(order.company.turboApiKey, order.companyId);

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
                turboMetadata: JSON.stringify(shipmentResult.data)
              }
            });
          }, 3);

          console.log(`✅ [TURBO] Shipment created automatically for order ${orderNumber}: ${shipmentResult.trackingNumber}`);
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
}

const orderService = new OrderService();
orderService.OrderService = OrderService;
orderService.orderService = orderService;

module.exports = orderService;
