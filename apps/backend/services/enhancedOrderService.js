const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { buildDateRangeFilter, EGYPT_TIMEZONE } = require('../utils/dateUtils');
const { getWooCommerceAutoExportService } = require('./wooCommerceAutoExportService');
const orderService = require('./orderService');
const internalSyncService = require('./internalSyncService');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const customerBlocklistService = require('./customerBlocklistService');
const { resolveVariantAttributes } = require('../utils/productNormalizationUtils');
const { normalizeOrderPaymentMethod } = require('../utils/paymentMethodNormalization');
const { toCanonicalE164 } = require('../utils/phoneNormalization');
const { findCustomerByPhone, safeCreateCustomer, buildPhoneWhere } = require('../utils/customerIdentity');
const { splitCustomerName } = require('../utils/customerName');
const { serializeTurboMetadata } = require('../utils/turbo/turboMetadata');
const { isValidOrderStatusEnum } = require('../utils/orderStatusEnum');

const buildSourceCondition = (source) => {
  switch (String(source).toLowerCase()) {
    case 'manual':
      return {
        OR: [
          { extractionMethod: { startsWith: 'manual' } },
          { extractionMethod: { in: ['manual_order_modal', 'manual_admin'] } },
          { sourceType: 'manual' },
          { createdBy: { not: null } },
          { createdByName: { not: null } },
          { conversationId: 'manual' }
        ]
      };
    case 'ai_conversation':
      return {
        AND: [
          { sourceType: 'ai_conversation' },
          { NOT: { extractionMethod: { startsWith: 'manual' } } },
          { NOT: { extractionMethod: 'manual_admin' } },
          { NOT: { extractionMethod: 'manual_order_modal' } },
          { NOT: { conversationId: 'manual' } }
        ]
      };
    case 'storefront':
      return {
        OR: [
          { sourceType: 'storefront' },
          { metadata: { contains: '"source":"storefront"' } },
          { metadata: { contains: 'storefront', mode: 'insensitive' } }
        ]
      };
    case 'woocommerce':
      return {
        OR: [
          { sourceType: { in: ['woocommerce', 'woocommerce_webhook', 'woo'] } },
          { wooCommerceId: { not: null } },
          { syncedFromWoo: true }
        ]
      };
    case 'pos':
      return {
        OR: [
          { sourceType: 'pos' },
          { metadata: { contains: 'pos_terminal', mode: 'insensitive' } }
        ]
      };
    case 'api':
      return {
        OR: [
          { sourceType: { in: ['api', 'public_api'] } },
          { metadata: { contains: '"source":"api"' } },
          { metadata: { contains: 'api', mode: 'insensitive' } }
        ]
      };
    case 'import':
      return {
        OR: [
          { extractionMethod: 'import' },
          { sourceType: { in: ['import', 'easy-orders', 'internal_import'] } },
          { orderSource: 'INTERNAL_IMPORT' }
        ]
      };
    case 'unknown':
      return {
        OR: [
          { sourceType: null },
          { sourceType: 'unknown' }
        ]
      };
    default:
      return { sourceType: String(source).toLowerCase() };
  }
};

class EnhancedOrderService {
  constructor() {
    // ❌ Removed: this.prisma = getSharedPrismaClient() - causes early loading issues
    // Use getPrisma() method instead to get prisma client on-demand
    this.safeQuery = safeQuery; // Use safe query wrapper with retry logic
  }

  // Get prisma client on-demand to avoid early loading issues
  getPrisma() {
    return getSharedPrismaClient();
  }

  normalizeOrderAttributeKey(attributeName) {
    const normalized = String(attributeName || '').trim().toLowerCase();
    const aliases = {
      color: 'Color',
      colour: 'Color',
      colors: 'Color',
      metal_color: 'Color',
      size: 'Size',
      sizes: 'Size',
      shoe_size: 'Size',
      capacity: 'Capacity',
      storage: 'Storage',
      memory: 'Storage',
      volume: 'Volume',
      scent: 'Scent',
      fragrance: 'Scent',
      concentration: 'Concentration',
      model: 'Model',
      pack: 'Pack',
      weight: 'Weight',
      option: 'Option',
      'اللون': 'Color',
      'المقاس': 'Size',
      'الحجم': 'Size',
      'السعة': 'Capacity',
      'السعة التخزينية': 'Storage',
      'الرائحة': 'Scent',
      'التركيز': 'Concentration',
      'الموديل': 'Model',
      'العبوة': 'Pack',
      'الوزن': 'Weight',
    };

    return aliases[normalized] || String(attributeName || '').trim();
  }

  normalizeOrderItemAttributes(attributes = {}) {
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
      return {};
    }

    return Object.entries(attributes).reduce((acc, [attributeName, attributeValue]) => {
      const key = this.normalizeOrderAttributeKey(attributeName);
      const value =
        attributeValue === null || attributeValue === undefined
          ? ''
          : String(attributeValue).trim();
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  /**
   * إنشاء طلب محسن مع دمج قاعدة البيانات
   */
  async createEnhancedOrder(data) {
    try {
      //console.log('🚀 [ENHANCED-ORDER] بدء إنشاء طلب محسن...');
      //console.log('📋 [ENHANCED-ORDER] البيانات المستلمة:', {
      //   conversationId: data.conversationId,
      //   customerId: data.customerId,
      //   productName: data.productName,
      //   customerName: data.customerName,
      //   confidence: data.confidence
      // });

      const possibleFacebookId =
        data.customerId && /^\d+$/.test(String(data.customerId))
          ? String(data.customerId)
          : null;
      const blockEvaluation = await customerBlocklistService.evaluateCustomerBlock(
        this.getPrisma(),
        {
          companyId: data.companyId,
          customerId: possibleFacebookId ? null : data.customerId,
          phone: data.customerPhone,
          email: data.customerEmail,
          facebookId: data.facebookId || possibleFacebookId,
          whatsappId: data.whatsappId,
          source: data.extractionMethod === 'ai_enhanced' ? 'ai' : 'manual',
          userRole: data.createdByRole,
          paymentMethod: data.paymentMethod,
          allowOverride: data.allowBlockedCustomerOverride === true,
        },
      );

      if (blockEvaluation.blocked) {
        return {
          success: false,
          statusCode: 403,
          code: blockEvaluation.payload.code,
          message: blockEvaluation.payload.message,
          error: blockEvaluation.payload.message,
          customerBlock: blockEvaluation.payload,
        };
      }

      // التحقق من وجود العميل
      const customer = await this.findOrCreateCustomer(data);

      // التحقق من وجود المحادثة
      const conversation = await this.findConversation(data.conversationId);

      // إنشاء رقم الطلب
      const orderNumber = await this.generateOrderNumber(data.companyId);

      // توحيد الحالات
      const normalizedStatus = (data.status || 'CONFIRMED').toUpperCase();
      data.status = isValidOrderStatusEnum(normalizedStatus) ? normalizedStatus : 'CONFIRMED';
      data.paymentMethod = normalizeOrderPaymentMethod(data.paymentMethod, 'CASH');
      data.paymentStatus = (data.paymentStatus || 'PENDING').toUpperCase();

      // 🎁 الخصم التلقائي: لو نظام الخصم التلقائي مفعّل والعميل عنده كوبون خصم فعّال،
      // نطبقه على أي طلب (يدوي/محادثة/متجر) — مش بس طلبات المتجر.
      try {
        const autoDiscountService = require('./autoDiscountService');
        const autoActive = await autoDiscountService.isAutoDiscountActive(data.companyId);
        if (autoActive && customer?.id) {
          const cartTotalForDiscount =
            parseFloat(data.subtotal) > 0
              ? parseFloat(data.subtotal)
              : (Array.isArray(data.products) && data.products.length > 0
                  ? data.products.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1)), 0)
                  : (parseFloat(data.productPrice) || 0) * (parseInt(data.quantity) || 1));
          const voucherRes = await autoDiscountService.applyVoucherDiscount({
            companyId: data.companyId,
            customerId: customer.id,
            cartTotal: cartTotalForDiscount
          });
          if (voucherRes.discount > 0 && voucherRes.voucher) {
            data.autoDiscountVoucherId = voucherRes.voucher.id;
            data.autoDiscountApplied = voucherRes.discount;
            // نجمع خصم الكوبون التلقائي مع أي خصم موجود (يدوي/كوبون)
            const existingDiscount =
              (parseFloat(data.manualDiscount) || 0) + (parseFloat(data.couponDiscount) || 0) + (parseFloat(data.discount) || 0);
            data.autoDiscountTotal = existingDiscount + voucherRes.discount;
            await autoDiscountService.markVoucherUsed(voucherRes.voucher.id);
            console.log(`✅ [AUTO-DISCOUNT] Applied ${voucherRes.discount} EGP discount to order for customer ${customer.id}`);
          }
        }
      } catch (autoDiscountError) {
        console.error('❌ [AUTO-DISCOUNT] Failed to apply auto discount:', autoDiscountError.message);
      }

      // حساب التكاليف (أو استخدام التكاليف المرسلة يدوياً)
      const costs = await this.calculateOrderCosts(data);

      // فحص التكرار قبل إنشاء الطلب
      const duplicateSettings = await orderService.getDuplicateSettings(data.companyId);
      let duplicateMatch = null;
      const customerPhoneToCheck = customer?.phone || data.customerPhone;
      const customerEmailToCheck = customer?.email || data.customerEmail;
      if (
        duplicateSettings?.enabled !== false &&
        (customerPhoneToCheck || customerEmailToCheck)
      ) {
        duplicateMatch = await orderService.findDuplicateOrder({
          companyId: data.companyId,
          customerPhone: customerPhoneToCheck,
          customerEmail: customerEmailToCheck,
          total: costs?.total,
          items: data.orderItems || data.items || [],
          settings: duplicateSettings,
          includeGuest: duplicateSettings.includeStoreOrders
        });
      }

      if (duplicateMatch && (duplicateSettings?.action === 'block' || duplicateSettings?.action === 'ignore')) {
        const existingOrder = await this.getPrisma().order.findUnique({
          where: { id: duplicateMatch.order.id },
          include: { customer: true, conversation: true, orderItems: true }
        });

        return {
          success: true,
          order: existingOrder ? this.transformOrderForResponse(existingOrder) : duplicateMatch.order,
          duplicate: true,
          duplicateOf: duplicateMatch.order.id,
          message: 'تم تجاهل الطلب المكرر'
        };
      }

      if (duplicateMatch) {
        const originalStatus = data.status || 'PENDING';
        data.status = 'DUPLICATE_ORDER';
        data.duplicateInfo = {
          duplicateOfId: duplicateMatch.order.id,
          duplicateOfOrderNumber: duplicateMatch.order.orderNumber,
          detectedAt: new Date().toISOString(),
          windowMinutes: duplicateSettings?.windowEnabled ? duplicateSettings.windowMinutes : null,
          criteria: duplicateSettings?.criteria,
          originalStatus
        };
        if (duplicateSettings?.alertTeam) {
          orderService.alertTeamAboutDuplicate(data.companyId, customerPhoneToCheck, duplicateMatch.order, null);
        }
      }

      // تحضير بيانات الطلب
      const orderLimitCheck = await ensureWithinPlanLimit(data.companyId, 'orders', 1);
      if (!orderLimitCheck.allowed) {
        return orderLimitCheck.payload;
      }

      const orderData = await this.prepareOrderData({
        ...data,
        customer,
        conversation,
        orderNumber,
        costs
      });

      // إنشاء الطلب في قاعدة البيانات
      const order = await this.createOrderInDatabase(orderData);
      // تسجيل الإحصائيات
      await this.logOrderCreation(order);

      // تحديث وقت تعديل العميل ليظهر في أعلى القائمة وتغيير حالته لعميل نشط
      if (customer && customer.id) {
        await this.safeQuery(() =>
          this.getPrisma().customer.update({
            where: { id: customer.id },
            data: {
              updatedAt: new Date(),
              status: 'ACTIVE' // ترقية العميل لحالة نشط بمجرد عمل أوردر
            }
          })
        ).catch(err => console.log('⚠️ [ENHANCED-ORDER] Failed to update customer:', err.message));
      }

      const isDuplicate = order.status === 'DUPLICATE_ORDER';
      let affiliateMerchantPostProcess = null;

      if (!isDuplicate) {
        affiliateMerchantPostProcess = await this.runAffiliateMerchantPostCreation(order);
      }

      // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية)
      // ملاحظة: order هنا هو completeOrder الذي يحتوي على items بالفعل
      if (!isDuplicate) {
        try {
          console.log('🔄 [ENHANCED-ORDER] Initiating WooCommerce auto-export for order:', order.orderNumber);
          const wooExportService = getWooCommerceAutoExportService();
          wooExportService.exportOrderAsync(order.id);
          console.log('✅ [ENHANCED-ORDER] WooCommerce export queued successfully');
        } catch (wooError) {
          console.error('❌ [ENHANCED-ORDER] WooCommerce auto-export error:', wooError.message);
          console.error('❌ [ENHANCED-ORDER] Error stack:', wooError.stack);
        }

        // 🚀 Push order to provider(s) via sync queue
        const syncQueueService = require('./syncQueueService');
        syncQueueService.enqueue(order.id, data.companyId);
      }

      // 🚚 Turbo Integration: إنشاء شحنة تلقائياً إذا كان الطلب CONFIRMED و Turbo مفعّل
      if (order.status === 'CONFIRMED') {
        try {
          const company = await this.safeQuery(async () => {
            return await this.getPrisma().company.findUnique({
              where: { id: data.companyId },
              select: {
                turboApiKey: true,
                turboEnabled: true,
                turboAutoCreate: true
              }
            });
          }, 2);

          if (company?.turboEnabled && company?.turboAutoCreate && company?.turboApiKey) {
            const TurboService = require('./turboService');
            const turboService = new TurboService(company.turboApiKey, data.companyId);

            // جلب بيانات الطلب الكاملة
            const fullOrder = await this.safeQuery(async () => {
              return await this.getPrisma().order.findUnique({
                where: { id: order.id },
                include: {
                  customer: true,
                  orderItems: true
                }
              });
            }, 2);

            if (fullOrder) {
              // تحضير بيانات الطلب
              const orderData = turboService.formatOrderForTurbo(fullOrder, fullOrder.customer, fullOrder.orderItems);

              // إنشاء الشحنة
              const shipmentResult = await turboService.createShipment(orderData);

              // حفظ معلومات الشحنة في قاعدة البيانات
              await this.safeQuery(async () => {
                return await this.getPrisma().order.update({
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

              console.log(`✅ [TURBO] Shipment created automatically for order ${order.orderNumber}: ${shipmentResult.trackingNumber}`);
            }
          }
        } catch (turboError) {
          // لا نوقف العملية إذا فشل Turbo - فقط نسجل الخطأ
          console.error(`❌ [TURBO] Failed to create shipment for order ${order.orderNumber}:`, turboError.message);
        }
      }

      // Trigger auto-distribution immediately
      try {
        const confirmationService = require('./orderConfirmationService');
        await confirmationService.autoAssignOnCreation(data.companyId, order.id, 'regular');
      } catch (distError) {
        console.error('❌ [ENHANCED-ORDER] Error in auto-distribution:', distError.message);
      }

      console.log('✅ [ENHANCED-ORDER] تم إنشاء الطلب بنجاح:', order.orderNumber);

      // 🎁 الولاء: المنح فقط عند التسليم (DELIVERED) — لا تمنح نقاط/مستوى عند إنشاء الطلب (PENDING)
      // السبب: computeTierMetric يحسب SPENT/ITEMS على DELIVERED فقط، والمنح المبكر كان يسبب رسالة مستوى قبل التأكيد.
      if (order.status === 'DELIVERED') {
        try {
          const customerLoyaltyService = require('./hr/customerLoyaltyService');
          await customerLoyaltyService.applyLoyaltyPointsForOrder({
            orderId: order.id,
            companyId: data.companyId,
            changedBy: data.createdBy
          }).catch((loyaltyError) => {
            console.error(`❌ [LOYALTY-AUTO] Failed to award points for ${order.orderNumber}:`, loyaltyError.message);
          });
        } catch (loyaltyError) {
          console.error('❌ [LOYALTY-AUTO] Loyalty service error:', loyaltyError.message);
        }
      }

      // 🛒 تصدير تلقائي لـ WooCommerce (في الخلفية) - تجاهل للطلبات المكررة
      if (!isDuplicate) {
        try {
          const { getWooCommerceAutoExportService } = require('./wooCommerceAutoExportService');
          const wooExportService = getWooCommerceAutoExportService();
          wooExportService.exportOrderAsync(order.id);
          console.log('✅ [WOO-EXPORT] Order queued for WooCommerce export:', order.orderNumber);
        } catch (wooError) {
          console.log('⚠️ [WOO-EXPORT] WooCommerce auto-export skipped:', wooError.message);
        }

        try {
          const WhatsAppNotificationService = require('./whatsapp/WhatsAppNotificationService');

          // تجهيز بيانات الطلب للإشعار
          const orderForNotification = {
            id: order.id,
            orderNumber: order.orderNumber,
            companyId: order.companyId,
            status: order.status,
            customerPhone: order.customerPhone,
            customerName: order.customerName,
            customer: order.customer,
            total: parseFloat(order.total),
            subtotal: parseFloat(order.subtotal),
            shipping: parseFloat(order.shipping),
            currency: order.currency || 'EGP',
            createdAt: order.createdAt,
            items: order.orderItems || order.items || []
          };

          await WhatsAppNotificationService.sendOrderCreationNotification(orderForNotification);
          console.log('✅ [WHATSAPP] Order notification sent for:', order.orderNumber);
        } catch (whatsappError) {
          // لا نوقف العملية إذا فشل WhatsApp
          console.log('⚠️ [WHATSAPP] Failed to send notification:', whatsappError.message);
        }
      }

      // 🔄 إنشاء طلب إرجاع تلقائياً إذا كانت حالة الطلب تشير إلى مرتجع
      if (!isDuplicate && ['REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED'].includes(order.status)) {
        try {
          const orderService = require('./orderService');
          await orderService.autoCreateReturnRequest(order, data.createdBy, order.status);
          console.log(`✅ [RETURNS-AUTO] Return request created for order ${order.orderNumber} during enhanced creation`);
        } catch (returnError) {
          console.error('❌ [RETURNS-AUTO] Failed to auto-create return request:', returnError.message);
        }
      }

      // تحويل الـ Decimal fields لـ numbers قبل الإرجاع
      const transformedOrder = this.transformOrderForResponse(order);

      // 📡 إرسال تنبيه بالسوكت والـ Web Push لغرفة الشركة
      if (!isDuplicate) {
        try {
          const socketService = require('./socketService');
          const io = socketService && typeof socketService.getIO === 'function' ? socketService.getIO() : null;
          if (io) {
            io.to(`company_${data.companyId}`).emit('order:created', transformedOrder || order);
            console.log(`📡 [SOCKET] Emitted order:created for company_${data.companyId}`);
          }
          const { sendBrowserPushToCompany } = require('./browserPushService');
          void sendBrowserPushToCompany({
            companyId: data.companyId,
            typeId: 'order_created',
            title: `طلب جديد #${order.orderNumber}`,
            body: `${order.customerName || data.customerName || 'عميل'} • ${order.total} ج.م`,
            compactBody: 'تم استلام طلب جديد',
            url: `/orders?search=${encodeURIComponent(order.orderNumber)}`,
            requireInteraction: true,
            data: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          }).catch((pushErr) => {
            console.error('❌ [WEB-PUSH] Error in enhanced order push:', pushErr.message);
          });
        } catch (notifyErr) {
          console.error('❌ [ORDER-NOTIFY] Failed to broadcast order creation:', notifyErr.message);
        }
      }

      return {
        success: true,
        order: transformedOrder,
        duplicate: isDuplicate,
        postProcessing: affiliateMerchantPostProcess,
        message: isDuplicate ? 'تم إنشاء الطلب مع وسم "مكرر"' : 'تم إنشاء الطلب بنجاح'
      };

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في إنشاء الطلب:', error);
      return {
        success: false,
        error: error.message,
        message: 'فشل في إنشاء الطلب'
      };
    }
  }

  /**
   * البحث عن العميل أو إنشاؤه
   */
  async findOrCreateCustomer(data) {
    try {
      let customer = null;

      // البحث بـ customerId أولاً
      if (data.customerId) {
        customer = await this.safeQuery(() =>
          this.getPrisma().customer.findUnique({
            where: { id: data.customerId }
          })
        );
      }

      // البحث بـ facebookId إذا لم نجد العميل
      if (!customer && data.customerId && data.customerId.match(/^\d+$/)) {
        customer = await this.safeQuery(() =>
          this.getPrisma().customer.findUnique({
            where: { facebookId: data.customerId }
          })
        );
      }

      // البحث برقم الهاتف
      if (!customer && data.customerPhone) {
        customer = await this.safeQuery(() =>
          findCustomerByPhone(this.getPrisma(), data.customerPhone, data.companyId)
        );
      }

      // إنشاء عميل جديد إذا لم نجده
      if (!customer) {
        const customerName = this.parseCustomerName(data.customerName);

        customer = await safeCreateCustomer(
          this.getPrisma(),
          {
            data: {
              firstName: customerName.firstName,
              lastName: customerName.lastName,
              phone: data.customerPhone || null,
              phoneNormalized: data.customerPhone ? toCanonicalE164(data.customerPhone) : null,
              email: data.customerEmail || null,
              facebookId: data.customerId && data.customerId.match(/^\d+$/) ? data.customerId : null,
              status: 'LEAD',
              companyId: data.companyId,
              metadata: JSON.stringify({
                source: 'ai_conversation',
                conversationId: data.conversationId,
                extractionMethod: data.extractionMethod || 'ai_enhanced',
                confidence: data.confidence || 0.5,
                createdFromOrder: true
              })
            }
          },
          data.customerPhone ? buildPhoneWhere(data.customerPhone, data.companyId) : (data.customerEmail ? { companyId: data.companyId, email: data.customerEmail } : null)
        );
      } else {
        const updateData = {};
        if (customer.status === 'LEAD') updateData.status = 'ACTIVE';
        if (!customer.phone && data.customerPhone) {
          updateData.phone = data.customerPhone;
          updateData.phoneNormalized = toCanonicalE164(data.customerPhone);
        } else if (!customer.phoneNormalized && customer.phone) {
          updateData.phoneNormalized = toCanonicalE164(customer.phone);
        }
        if (Object.keys(updateData).length > 0) {
          try {
            customer = await this.safeQuery(() =>
              this.getPrisma().customer.update({
                where: { id: customer.id },
                data: updateData
              })
            );
          } catch (updateErr) {
            console.error('⚠️ [ENHANCED-ORDER] فشل تحديث حالة العميل:', updateErr.message);
            if (updateData.status) {
              try {
                customer = await this.safeQuery(() =>
                  this.getPrisma().customer.update({
                    where: { id: customer.id },
                    data: { status: updateData.status }
                  })
                );
              } catch (_) {}
            }
          }
        }
      }

      return customer;

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في البحث عن العميل:', error);
      throw error;
    }
  }

  /**
   * تحليل اسم العميل
   */
  parseCustomerName(fullName) {
    return splitCustomerName(fullName);
  }

  /**
   * البحث عن المحادثة
   */
  async findConversation(conversationId) {
    if (!conversationId) return null;

    try {
      const conversation = await this.safeQuery(async () => {
        const prisma = getSharedPrismaClient();
        return await prisma.conversation.findUnique({
          where: { id: conversationId }
        });
      }, 5);

      if (conversation) {
        //console.log('💬 [ENHANCED-ORDER] تم العثور على المحادثة:', conversationId);
      } else {
        //console.log('⚠️ [ENHANCED-ORDER] لم يتم العثور على المحادثة:', conversationId);
      }

      return conversation;
    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في البحث عن المحادثة:', error);
      return null;
    }
  }

  async generateOrderNumber(companyId) {
    try {
      // Use the shared OrderService with explicit companyId for thread-safety
      return await orderService.generateOrderNumber(companyId);
    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] Error generating order number via OrderService:', error);

      // Fallback to simple numbering if shared service fails
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const timestamp = Date.now();
      return `ORD-${dateStr}-${timestamp.toString().slice(-6)}`;
    }
  }

  /**
   * حساب تكاليف الطلب
   */
  async calculateOrderCosts(data) {
    let subtotal = 0;
    let quantity = 0;
    let productPrice = 0; // For legacy return structure

    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
      // Calculate from products array
      subtotal = data.products.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        return sum + (price * qty);
      }, 0);
      quantity = data.products.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
      productPrice = subtotal; // Just a placeholder for return object
    } else {
      // Legacy single product
      productPrice = parseFloat(data.productPrice) || 349;
      quantity = parseInt(data.quantity) || 1;
      subtotal = productPrice * quantity;
    }

    // Use provided subtotal if available (manual override)
    // Only trust it if it's greater than 0, otherwise rely on the calculated one
    if (data.subtotal !== undefined && data.subtotal !== null && parseFloat(data.subtotal) > 0) {
      subtotal = parseFloat(data.subtotal);
    }

    console.log(`💰 [COSTS-CALC] بدء حساب التكاليف - المحافظة: "${data.governorate || data.city}" | المجموع الفرعي: ${subtotal} | الكمية: ${quantity}`);

    // ربط الشحن: استخدم المرسل يدوياً أو احسبه
    let shipping = 0;
    const hasProvidedShipping =
      data.shippingCost !== undefined &&
      data.shippingCost !== null &&
      data.shippingCost !== '';
    const shippingLocation = data.governorate || data.city;

    if (hasProvidedShipping) {
      shipping = parseFloat(data.shippingCost) || 0;
      console.log(`📦 [COSTS-CALC] استخدام سعر الشحن اليدوي: ${shipping} جنيه`);

      if (shipping <= 0 && shippingLocation && data.companyId) {
        const recoveredShipping = await this.calculateShipping(
          shippingLocation,
          subtotal,
          data.companyId,
          { fallbackToDefault: false }
        );

        if (recoveredShipping > 0) {
          shipping = recoveredShipping;
          console.log(`🔁 [COSTS-CALC] تم استرجاع الشحن من المناطق المحفوظة: ${shipping} جنيه`);
        }
      }
    } else {
      shipping = await this.calculateShipping(shippingLocation, subtotal, data.companyId);
      console.log(`📦 [COSTS-CALC] نتيجة حساب الشحن التلقائي: ${shipping} جنيه`);
    }

    // 🎁 فحص وتطبيق مزايا مستوى الولاء (شحن مجاني + خصم نسبة المستوى)
    let loyaltyRewards = null;
    try {
      const customerLoyaltyService = require('./hr/customerLoyaltyService');
      let targetCustomerId = data.customerId;
      if (!targetCustomerId && (data.customerPhone || data.phone) && data.companyId) {
        const { findCustomerByPhone } = require('../utils/customerIdentity');
        const cust = await findCustomerByPhone(this.getPrisma(), data.customerPhone || data.phone, data.companyId);
        if (cust) targetCustomerId = cust.id;
      }
      if (targetCustomerId && data.companyId) {
        loyaltyRewards = await customerLoyaltyService.getCustomerActiveRewards(data.companyId, targetCustomerId);
      }
    } catch (loyaltyErr) {
      console.warn('⚠️ [COSTS-CALC] Could not fetch loyalty rewards:', loyaltyErr.message);
    }

    if (loyaltyRewards?.freeShipping) {
      shipping = 0;
      console.log(`📦 [COSTS-CALC] تم تطبيق شحن مجاني بناءً على مستوى ولاء العميل`);
    }

    // حساب الضرائب (0% حالياً)
    const tax = parseFloat(data.tax) || 0;

    // حساب الخصم (يدوي + كوبون + الخصم التلقائي + خصم المستوى)
    const manualDiscount = parseFloat(data.manualDiscount) || 0;
    const couponDiscount = parseFloat(data.couponDiscount) || 0;
    const autoDiscount = parseFloat(data.autoDiscountApplied) || 0;
    let loyaltyTierDiscount = 0;
    if (loyaltyRewards && Number(loyaltyRewards.discountPercent) > 0) {
      loyaltyTierDiscount = (subtotal * Number(loyaltyRewards.discountPercent)) / 100;
      console.log(`💰 [COSTS-CALC] تم تطبيق خصم مستوى الولاء (${loyaltyRewards.discountPercent}%): ${loyaltyTierDiscount} جنيه`);
    }
    const discount = manualDiscount + couponDiscount + autoDiscount + loyaltyTierDiscount || parseFloat(data.discount) || 0;

    const total = subtotal + shipping + tax - discount;

    console.log(`✅ [COSTS-CALC] النتيجة النهائية - المجموع: ${subtotal} | الشحن: ${shipping} | الخصم: ${discount} | الإجمالي: ${total}`);

    return {
      productPrice,
      quantity,
      subtotal,
      shipping,
      tax,
      discount,
      total
    };
  }

  /**
   * حساب تكلفة الشحن من قاعدة البيانات
   * @param {string} governorate - المحافظة (أو المدينة كـ fallback)
   */
  async calculateShipping(governorate, subtotal, companyId, options = {}) {
    const { fallbackToDefault = true } = options;

    console.log(`\n🚚 [SHIPPING-CALC] ===== بدء حساب الشحن =====`);
    console.log(`📍 [SHIPPING-CALC] المحافظة: "${governorate}"`);
    console.log(`💰 [SHIPPING-CALC] المبلغ: ${subtotal} جنيه`);
    console.log(`🏢 [SHIPPING-CALC] الشركة: ${companyId}`);

    if (!governorate || governorate === 'غير محدد') {
      console.log(
        `⚠️ [SHIPPING-CALC] المحافظة غير محددة، استخدام السعر ${fallbackToDefault ? 'الافتراضي: 50' : 'الصِفري'} جنيه`
      );
      console.log(`🚚 [SHIPPING-CALC] ===== انتهى الحساب =====\n`);
      return fallbackToDefault ? 50 : 0;
    }

    // ⚠️ تعطيل الشحن المجاني مؤقتاً للتحقق من المشكلة
    // if (subtotal >= 500) {
    //   console.log(`🎁 [SHIPPING-CALC] شحن مجاني للطلبات أكثر من 500 جنيه`);
    //   return 0;
    // }

    try {
      // استخدام خدمة الشحن للبحث في قاعدة البيانات
      const shippingService = require('./shippingService');
      console.log(`🔍 [SHIPPING-CALC] البحث في قاعدة البيانات...`);

      const shippingInfo = await shippingService.findShippingInfo(governorate, companyId);

      console.log(`📦 [SHIPPING-CALC] نتيجة البحث:`, JSON.stringify(shippingInfo, null, 2));

      if (shippingInfo && shippingInfo.found) {
        const finalPrice = parseFloat(shippingInfo.price);
        console.log(`✅ [SHIPPING-CALC] تم العثور على سعر الشحن: ${finalPrice} جنيه`);
        console.log(`⏰ [SHIPPING-CALC] مدة التوصيل: ${shippingInfo.deliveryTime}`);
        console.log(`🚚 [SHIPPING-CALC] ===== انتهى الحساب =====\n`);

        // حفظ مدة التوصيل لاستخدامها لاحقاً
        this.lastShippingInfo = shippingInfo;

        return finalPrice;
      } else {
        console.log(`⚠️ [SHIPPING-CALC] لم يتم العثور على المدينة في قاعدة البيانات`);
        console.log(
          `⚠️ [SHIPPING-CALC] استخدام السعر ${fallbackToDefault ? 'الافتراضي: 50' : 'الصِفري'} جنيه`
        );
        console.log(`🚚 [SHIPPING-CALC] ===== انتهى الحساب =====\n`);
        return fallbackToDefault ? 50 : 0;
      }
    } catch (error) {
      console.error(`❌ [SHIPPING-CALC] خطأ في حساب الشحن:`, error);
      console.error(`❌ [SHIPPING-CALC] تفاصيل الخطأ:`, error.message);
      console.error(`❌ [SHIPPING-CALC] Stack:`, error.stack);
      console.log(
        `⚠️ [SHIPPING-CALC] استخدام السعر ${fallbackToDefault ? 'الافتراضي: 50' : 'الصِفري'} جنيه`
      );
      console.log(`🚚 [SHIPPING-CALC] ===== انتهى الحساب =====\n`);
      return fallbackToDefault ? 50 : 0;
    }
  }

  /**
   * تحضير بيانات الطلب
   */
  async prepareOrderData({ customer, conversation, orderNumber, costs, ...data }) {
    console.log('📋 [PREPARE-ORDER] تحضير بيانات الطلب - التكاليف:', costs);

    // استخراج عنوان محدد إذا كان customerAddress JSON
    let parsedAddress = null;
    if (typeof data.customerAddress === 'string' && data.customerAddress.trim().startsWith('{')) {
      try { parsedAddress = JSON.parse(data.customerAddress); } catch (e) { /* ignore */ }
    } else if (typeof data.customerAddress === 'object' && !Array.isArray(data.customerAddress)) {
      parsedAddress = data.customerAddress;
    }

    const addrGov = parsedAddress?.governorate || data.governorate || data.city || 'غير محدد';
    const addrCity = parsedAddress?.city || data.city || data.area || 'غير محدد';
    const addrArea = parsedAddress?.area || parsedAddress?.district || parsedAddress?.neighborhood || data.area || data.district || '';
    const addrText = parsedAddress?.address || (typeof data.customerAddress === 'string' && !data.customerAddress.trim().startsWith('{') ? data.customerAddress : '') || '';
    const addrPhone = parsedAddress?.phone || data.customerPhone || customer.phone;

    // استخراج attribution تلقائياً لو الطلب من محادثة
    let attribution = null;
    if (data.attribution) {
      attribution = typeof data.attribution === 'string' ? safeJsonParse(data.attribution) : data.attribution;
    } else if (conversation || data.conversation) {
      const conv = conversation || data.conversation;
      let convMeta = {};
      if (typeof conv.metadata === 'string') {
        try { convMeta = JSON.parse(conv.metadata) || {}; } catch (_) { convMeta = {}; }
      } else if (conv.metadata && typeof conv.metadata === 'object') {
        convMeta = conv.metadata;
      }

      const convPlatform = (conv.channel || convMeta.platform || 'facebook').toLowerCase();
      const adId = convMeta.adId || null;
      const adTitle = convMeta.adsContextData?.ad_title || null;
      const campaignName = adTitle || (adId ? `إعلان فيسبوك (${adId})` : `محادثة ${convPlatform === 'whatsapp' ? 'واتساب' : 'فيسبوك'}`);

      attribution = {
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
        conversationId: conv.id || data.conversationId || null,
        capturedAt: new Date().toISOString()
      };
    }

    return {
      orderNumber,
      customerId: customer.id,
      conversationId: conversation?.id || null,
      companyId: data.companyId,

      // حالة الطلب
      status: (data.status && isValidOrderStatusEnum(data.status)) ? data.status : 'CONFIRMED',
      paymentStatus: data.paymentStatus || 'PENDING',
      paymentMethod: data.paymentMethod || 'CASH',

      // التكاليف - تحويل لـ numbers صريح
      subtotal: parseFloat(costs.subtotal) || 0,
      tax: parseFloat(costs.tax) || 0,
      shipping: parseFloat(costs.shipping) || 0,
      discount: parseFloat(costs.discount) || 0,
      total: parseFloat(costs.total) || 0,
      currency: 'EGP',

      // حالة المشاهدة
      isViewed: false,

      // معلومات العميل من الاستخراج التلقائي
      customerName: data.customerName || `${customer.firstName} ${customer.lastName}`,
      customerPhone: data.customerPhone || customer.phone,
      customerEmail: data.customerEmail || customer.email,
      governorate: addrGov,
      city: addrCity,
      customerAddress: data.customerAddress || '',

      // عناوين الشحن والفواتير
      shippingAddress: JSON.stringify({
        governorate: addrGov,
        city: addrCity,
        area: addrArea,
        address: addrText,
        phone: addrPhone,
        country: 'مصر'
      }),
      billingAddress: JSON.stringify({
        governorate: addrGov,
        city: addrCity,
        area: addrArea,
        address: addrText,
        phone: addrPhone,
        country: 'مصر'
      }),

      // معلومات جودة البيانات
      dataQuality: JSON.stringify(data.dataQuality || {}),
      extractionMethod: data.extractionMethod || 'ai_enhanced',
      confidence: data.confidence || 0.5,
      validationStatus: 'pending',
      sourceType: 'ai_conversation',
      extractionTimestamp: new Date(),

      // Affiliate support
      ...(data.affiliateId && {
        affiliateId: data.affiliateId,
        orderSource: data.orderSource || 'AFFILIATE_DIRECT'
      }),

      // Creator info
      createdBy: data.createdBy,
      createdByName: data.createdByName,

      // ملاحظات
      notes: this.buildOrderNotes(data),

      // ✅ تمرير بيانات المنتج لـ createOrderItems
      productId: data.productId || (Array.isArray(data.products) && data.products[0]?.productId) || null,
      productName: data.productName || (Array.isArray(data.products) ? data.products.map(p => p.productName).filter(Boolean).join(', ') : null),
      productColor: data.productColor || (Array.isArray(data.products) ? data.products[0]?.productColor : null),
      productSize: data.productSize || (Array.isArray(data.products) ? data.products[0]?.productSize : null),
      productPrice: costs.productPrice || (Array.isArray(data.products) ? data.products[0]?.price : null),
      productImage: data.productImage || data.image || (Array.isArray(data.products) ? (data.products[0]?.productImage || data.products[0]?.image) : null) || null,
      productSku: data.productSku || data.sku || (Array.isArray(data.products) ? (data.products[0]?.productSku || data.products[0]?.sku) : null) || null,
      productAttributes: data.productAttributes || data.attributes || (Array.isArray(data.products) ? (data.products[0]?.attributes || data.products[0]?.productAttributes) : null) || null,
      quantity: data.quantity || (Array.isArray(data.products) ? data.products.reduce((sum, p) => sum + (parseInt(p.quantity, 10) || 1), 0) : 1),
      products: data.products, // ✅ تمرير مصفوفة المنتجات
      easyWarehouseMode: data.easyWarehouseMode,

      // metadata
      metadata: JSON.stringify({
        conversationId: data.conversationId,
        source: data.source,
        requestType: data.requestType || 'delivery',
        returnAmount: data.returnAmount || null,
        ...(data.originalOrderId ? { originalOrderId: data.originalOrderId } : {}),
        ...(data.originalOrderNumber ? { originalOrderNumber: data.originalOrderNumber } : {}),
        ...(data.autoDiscountVoucherId && { autoDiscountVoucherId: data.autoDiscountVoucherId }),
        ...(data.autoDiscountApplied && { autoDiscountApplied: data.autoDiscountApplied }),
        ...(attribution && { attribution }),
        originalData: {
          productName: data.productName,
          productColor: data.productColor,
          productSize: data.productSize
        },
        aiExtraction: {
          confidence: data.confidence,
          extractionMethod: data.extractionMethod,
          validation: data.validation
        },
        timestamps: {
          extracted: new Date(),
          created: new Date()
        },
        ...(data.duplicateInfo ? { duplicate: data.duplicateInfo } : {})
      }),

      // Scheduled Order Fields
      ...(data.isScheduled && {
        isScheduled: true,
        scheduledDeliveryDate: (data.scheduledDeliveryDate || data.scheduledDate) ? new Date(data.scheduledDeliveryDate || data.scheduledDate) : null,
        scheduledNotes: data.scheduledNotes || null,
        autoTransitionEnabled: data.autoTransitionEnabled !== false,
        scheduledTransitionedAt: null
      })
    };
  }

  hasRoutableMerchantProducts(order) {
    return (order?.orderItems || []).some((item) => {
      const product = item.product;
      if (!product) {
        return false;
      }

      if (product.isDropshipped) {
        return true;
      }

      return (product.merchantProducts || []).some((merchantProduct) => (
        merchantProduct?.isActive &&
        merchantProduct?.syncEnabled &&
        merchantProduct?.merchant?.isActive
      ));
    });
  }

  async runAffiliateMerchantPostCreation(order) {
    if (!order?.id || order.status === 'DUPLICATE_ORDER') {
      return null;
    }

    const fullOrder = await this.safeQuery(() =>
      this.getPrisma().order.findUnique({
        where: { id: order.id },
        include: {
          commissions: true,
          merchantOrders: true,
          orderItems: {
            include: {
              product: {
                include: {
                  merchantProducts: {
                    where: {
                      isActive: true,
                      syncEnabled: true
                    },
                    include: {
                      merchant: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    );

    if (!fullOrder) {
      throw new Error('الطلب غير موجود بعد الإنشاء');
    }

    const shouldRouteToMerchant = this.hasRoutableMerchantProducts(fullOrder);
    const hasMerchantOrders = (fullOrder.merchantOrders || []).length > 0;
    const hasActiveCommissions = (fullOrder.commissions || []).some(
      (commission) => commission.status !== 'CANCELLED'
    );

    let merchantOrders = [];
    let commissions = [];

    try {
      if (shouldRouteToMerchant && !hasMerchantOrders) {
        const dropshippingService = require('./dropshippingService');
        merchantOrders = await dropshippingService.routeOrderToMerchant(fullOrder.id);
      }

      if ((fullOrder.affiliateId || shouldRouteToMerchant) && !hasActiveCommissions) {
        const commissionService = require('./commissionService');
        commissions = await commissionService.calculateCommissions(fullOrder.id);
      }

      return {
        routedToMerchant: shouldRouteToMerchant,
        merchantOrdersCount: hasMerchantOrders
          ? fullOrder.merchantOrders.length
          : merchantOrders.length,
        commissionsCount: hasActiveCommissions
          ? fullOrder.commissions.length
          : commissions.length
      };
    } catch (error) {
      await this.safeQuery(() =>
        this.getPrisma().order.update({
          where: { id: fullOrder.id },
          data: {
            validationStatus: 'merchant_routing_failed',
            notes: `${fullOrder.notes || ''}\n\nتعذر ربط الطلب بالتاجر/العمولات تلقائياً: ${error.message}`.trim()
          }
        })
      ).catch((updateError) => {
        console.error(
          '⚠️ [ENHANCED-ORDER] Failed to mark merchant routing failure:',
          updateError.message
        );
      });

      throw error;
    }
  }

  /**
   * بناء ملاحظات الطلب
   */
  buildOrderNotes(data) {
    let notes = `طلب تلقائي من المحادثة\n`;
    notes += `معرف المحادثة: ${data.conversationId}\n`;

    if (data.confidence) {
      notes += `مستوى الثقة: ${(data.confidence * 100).toFixed(0)}%\n`;
    }

    if (data.notes) {
      notes += `ملاحظات إضافية: ${data.notes}\n`;
    }

    if (data.validation && data.validation.warnings && data.validation.warnings.length > 0) {
      notes += `تحذيرات: ${data.validation.warnings.join(', ')}\n`;
    }

    notes += `تاريخ الإنشاء: ${new Date().toLocaleString('ar-EG')}`;

    return notes;
  }

  /**
   * إنشاء الطلب في قاعدة البيانات
   */
  async createOrderInDatabase(orderData) {
    try {
      console.log('💾 [ENHANCED-ORDER] حفظ الطلب في قاعدة البيانات...');

      // ✅ حفظ بيانات المنتج قبل إزالتها من orderData
      const productData = {
        productId: orderData.productId,
        productName: orderData.productName,
        productColor: orderData.productColor,
        productSize: orderData.productSize,
        productPrice: orderData.productPrice,
        productImage: orderData.productImage,
        productSku: orderData.productSku,
        productAttributes: orderData.productAttributes,
        quantity: orderData.quantity,
        products: orderData.products // ✅ تمرير مصفوفة المنتجات
      };

      // ✅ إزالة حقول المنتج من orderData لأنها مش جزء من Order schema
      const {
        products,
        productId,
        productName,
        productColor,
        productSize,
        productPrice,
        productImage,
        productSku,
        productAttributes,
        quantity,
        easyWarehouseMode,
        autoDiscountVoucherId,
        autoDiscountApplied,
        autoDiscountTotal,
        ...cleanOrderData
      } = orderData;

      // 🎁 تسجيل كوبون الخصم التلقائي في الـ metadata (لو الطلب استخدم كوبون)
      if (orderData.autoDiscountVoucherId || orderData.autoDiscountApplied) {
        let existingMetadata = {};
        if (typeof cleanOrderData.metadata === 'string') {
          try { existingMetadata = JSON.parse(cleanOrderData.metadata) || {}; } catch (e) { existingMetadata = {}; }
        } else if (cleanOrderData.metadata && typeof cleanOrderData.metadata === 'object') {
          existingMetadata = cleanOrderData.metadata;
        }
        existingMetadata = {
          ...existingMetadata,
          ...(orderData.autoDiscountVoucherId && { autoDiscountVoucherId: orderData.autoDiscountVoucherId }),
          ...(orderData.autoDiscountApplied && { autoDiscountApplied: orderData.autoDiscountApplied })
        };
        cleanOrderData.metadata = JSON.stringify(existingMetadata);
      }

      console.log('💸 [DB-SAVE] التكاليف قبل الحفظ:', {
        subtotal: cleanOrderData.subtotal,
        shipping: cleanOrderData.shipping,
        tax: cleanOrderData.tax,
        discount: cleanOrderData.discount,
        total: cleanOrderData.total
      });

      const order = await this.safeQuery(() =>
        this.getPrisma().order.create({
          data: cleanOrderData,
          include: {
            customer: true,
            conversation: true,
            orderItems: true
          }
        })
      );

      console.log('💸 [DB-SAVE] التكاليف بعد الحفظ:', {
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        discount: order.discount,
        total: order.total
      });

      // إنشاء عناصر الطلب باستخدام البيانات المحفوظة
      await this.createOrderItems(order.id, { ...productData, companyId: orderData.companyId, easyWarehouseMode: orderData.easyWarehouseMode });

      // إعادة جلب الطلب مع العناصر
      const completeOrder = await this.safeQuery(() =>
        this.getPrisma().order.findUnique({
          where: { id: order.id },
          include: {
            customer: true,
            conversation: true,
            orderItems: {
              include: {
                product: true,
                productVariant: true
              }
            }
          }
        })
      );

      //console.log('✅ [ENHANCED-ORDER] تم حفظ الطلب في قاعدة البيانات');
      return completeOrder;

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في حفظ الطلب:', error);
      throw error;
    }
  }

  /**
   * إنشاء عناصر الطلب
   */
  async createOrderItems(orderId, orderData) {
    try {
      // ✅ دعم المنتجات المتعددة
      if (orderData.products && Array.isArray(orderData.products)) {
        console.log('📦 [ENHANCED-ORDER] إنشاء عناصر متعددة:', orderData.products.length);

        const createdItems = [];
        for (const productItem of orderData.products) {
          // البحث عن المنتج في الكتالوج
          let product = null;
          if (productItem.productId) {
            product = await this.safeQuery(() =>
              this.getPrisma().product.findUnique({
                where: { id: productItem.productId },
                include: {
                  productVariants: true,
                  merchantProducts: {
                    where: {
                      isActive: true,
                      syncEnabled: true
                    },
                    include: {
                      merchant: true
                    },
                    orderBy: [
                      { merchantPrice: 'asc' },
                      { stock: 'desc' },
                      { createdAt: 'asc' }
                    ]
                  }
                }
              })
            );
          } else if (productItem.sku || productItem.productSku) {
            product = await this.safeQuery(() =>
              this.getPrisma().product.findFirst({
                where: {
                  sku: productItem.sku || productItem.productSku,
                  companyId: orderData.companyId,
                  deletedAt: null
                },
                include: {
                  productVariants: true,
                  merchantProducts: {
                    where: { isActive: true, syncEnabled: true },
                    include: { merchant: true }
                  }
                }
              })
            );
          }
          if (!product && productItem.productName) {
            product = await this.findProductByName(productItem.productName, orderData.companyId);
          }

          // ✨ الوضع السهل: استيراد المنتج تلقائيًا إذا لم يكن موجودًا في الكتالوج
          if (!product && orderData.easyWarehouseMode && productItem.productName) {
            const easyWarehouseService = require('./easyWarehouseService');
            product = await easyWarehouseService.ensureProductsForItems(orderData.companyId, [productItem])
              .then((result) => {
                const created = result.created[0];
                return created ? this.getPrisma().product.findUnique({ where: { id: created.productId }, include: { productVariants: true } }) : null;
              })
              .catch(() => null);
          }

          // ✨ جلب بيانات الـ variant إذا كان موجود
          let variant = null;
          let extractedColor = productItem.productColor;
          let extractedSize = productItem.productSize;
          let selectedAttributes = this.normalizeOrderItemAttributes(
            productItem.attributes || productItem.productAttributes || productItem.variantAttributes
          );
          if (selectedAttributes.Color && !extractedColor) {
            extractedColor = selectedAttributes.Color;
          }
          if (selectedAttributes.Size && !extractedSize) {
            extractedSize = selectedAttributes.Size;
          }

          console.log(`🔍 [VARIANT-CHECK] Checking for variant:`, {
            variantId: productItem.variantId,
            receivedColor: productItem.productColor,
            receivedSize: productItem.productSize
          });

          if (productItem.variantId) {
            variant = await this.safeQuery(() =>
              this.getPrisma().productVariant.findUnique({
                where: { id: productItem.variantId }
              })
            );

            if (variant) {
              console.log(`✨ [VARIANT-FOUND] Variant data:`, {
                id: variant.id,
                name: variant.name,
                type: variant.type,
                price: variant.price
              });

              const variantAttributes = this.normalizeOrderItemAttributes(
                resolveVariantAttributes(variant)
              );
              selectedAttributes = {
                ...variantAttributes,
                ...selectedAttributes,
              };
              if (selectedAttributes.Color && !extractedColor) {
                extractedColor = selectedAttributes.Color;
              }
              if (selectedAttributes.Size && !extractedSize) {
                extractedSize = selectedAttributes.Size;
              }

              // استخراج اللون والمقاس من الـ variant
              if ((!extractedColor || !extractedSize) && variant.name) {
                const nameParts = variant.name.split(/\s*[\/|–-]\s*/).map(p => p.trim()).filter(Boolean);
                if (nameParts.length >= 2) {
                  const [p1, p2] = nameParts;
                  const isP1Size = /\d+/.test(p1) || /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-5]xl)$/i.test(p1);
                  const isP2Size = /\d+/.test(p2) || /^(xxs|xs|s|m|l|xl|xxl|xxxl|[2-5]xl)$/i.test(p2);
                  if (isP1Size && !isP2Size) {
                    if (!extractedSize) extractedSize = p1;
                    if (!extractedColor) extractedColor = p2;
                  } else if (!isP1Size && isP2Size) {
                    if (!extractedColor) extractedColor = p1;
                    if (!extractedSize) extractedSize = p2;
                  } else {
                    if (!extractedColor) extractedColor = p1;
                    if (!extractedSize) extractedSize = p2;
                  }
                }
              }

              if (variant.type === 'color' && !extractedColor) {
                extractedColor = variant.name;
                console.log(`   ✅ Extracted color from variant: ${extractedColor}`);
              } else if (variant.type === 'size' && !extractedSize) {
                extractedSize = variant.name;
                console.log(`   ✅ Extracted size from variant: ${extractedSize}`);
              } else if (!extractedColor && !extractedSize && Object.keys(selectedAttributes).length === 0) {
                // إذا كان النوع "other" أو غير محدد، حاول استخراج من الاسم
                if (variant.name.match(/\d+/)) {
                  extractedSize = variant.name;
                  console.log(`   ✅ Extracted size from variant name (contains number): ${extractedSize}`);
                } else {
                  extractedColor = variant.name;
                  console.log(`   ✅ Extracted color from variant name: ${extractedColor}`);
                }
              }
            } else {
              console.log(`   ⚠️ Variant not found in database for ID: ${productItem.variantId}`);
            }
          } else {
            console.log(`   ℹ️ No variantId provided, attempting auto-match or extraction`);
            if (product?.productVariants?.length > 0) {
              const checkColor = (extractedColor || '').trim().toLowerCase();
              const checkSize = (extractedSize || '').trim().toLowerCase();
              if (checkColor || checkSize) {
                const matched = product.productVariants.find(v => {
                  const vAttrs = resolveVariantAttributes(v);
                  const vColor = (vAttrs.Color || v.color || '').trim().toLowerCase();
                  const vSize = (vAttrs.Size || v.size || '').trim().toLowerCase();
                  const colorMatches = !checkColor || vColor === checkColor || v.name?.toLowerCase().includes(checkColor);
                  const sizeMatches = !checkSize || vSize === checkSize || v.name?.toLowerCase().includes(checkSize);
                  return colorMatches && sizeMatches;
                });
                if (matched) {
                  variant = matched;
                  productItem.variantId = matched.id;
                  console.log(`✨ [ENHANCED-ORDER] Auto-matched variantId ${matched.id} from color/size (${checkColor}, ${checkSize})`);
                }
              }
            }
          }

          // ✨ إذا لم نجد بيانات، حاول استخراج من اسم المنتج
          if (!extractedColor && !extractedSize && product) {
            const productName = productItem.productName || product.name;

            // استخراج المقاس من اسم المنتج
            const sizeMatch = productName.match(/(\d+\/\d+|\d+\-\d+|\b\d{2,3}\b)/);
            if (sizeMatch) {
              extractedSize = sizeMatch[0];
              console.log(`✨ [AUTO-EXTRACT] Extracted size from product name: ${extractedSize}`);
            }

            // استخراج اللون من اسم المنتج
            const colorPatterns = [
              'أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'بني', 'رمادي', 'وردي', 'بنفسجي',
              'black', 'white', 'red', 'blue', 'green', 'yellow', 'brown', 'gray', 'grey', 'pink', 'purple',
              'بيج', 'كحلي', 'سماوي', 'برتقالي', 'فضي', 'ذهبي', 'نيلي'
            ];

            for (const color of colorPatterns) {
              if (productName.toLowerCase().includes(color.toLowerCase())) {
                extractedColor = color;
                console.log(`✨ [AUTO-EXTRACT] Extracted color from product name: ${color}`);
                break;
              }
            }
          }

          console.log(`🔍 [ENHANCED-ORDER-DEBUG] Creating OrderItem for product:`, {
            productName: productItem.productName,
            productColor: extractedColor,
            productSize: extractedSize,
            variantId: productItem.variantId,
            variantFound: !!variant
          });

          const itemQuantity = Math.max(1, parseInt(productItem.quantity, 10) || 1);
          const itemPrice = Number(
            productItem.price ??
            variant?.price ??
            product?.basePrice ??
            product?.price ??
            0
          );
          const activeMerchantProducts = (product?.merchantProducts || []).filter((merchantProduct) => (
            merchantProduct?.isActive &&
            merchantProduct?.syncEnabled &&
            merchantProduct?.merchant?.isActive
          ));
          const selectedMerchantProduct =
            activeMerchantProducts.find(
              (merchantProduct) => Number(merchantProduct.stock || 0) >= itemQuantity
            ) ||
            activeMerchantProducts[0] ||
            null;
          const basePrice = Number(
            productItem.basePrice ??
            product?.basePrice ??
            product?.price ??
            itemPrice
          );
          const merchantPrice = Number(
            productItem.merchantPrice ??
            selectedMerchantProduct?.merchantPrice ??
            variant?.cost ??
            product?.cost ??
            basePrice
          );

          let resolvedItemImage = productItem.productImage || productItem.image || null;
          if (!resolvedItemImage && variant?.images) {
            try {
              const vImgs = typeof variant.images === 'string' ? JSON.parse(variant.images) : variant.images;
              if (Array.isArray(vImgs) && vImgs.length > 0) resolvedItemImage = vImgs[0];
              else if (typeof vImgs === 'string') resolvedItemImage = vImgs;
            } catch (_) {
              if (typeof variant.images === 'string') resolvedItemImage = variant.images;
            }
          }
          if (!resolvedItemImage && product?.mainImage) {
            resolvedItemImage = product.mainImage;
          }
          if (!resolvedItemImage && product?.images) {
            try {
              const pImgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
              if (Array.isArray(pImgs) && pImgs.length > 0) resolvedItemImage = pImgs[0];
              else if (typeof pImgs === 'string') resolvedItemImage = pImgs;
            } catch (_) {
              if (typeof product.images === 'string') resolvedItemImage = product.images;
            }
          }

          const itemData = {
            orderId: orderId,
            productId: product?.id || productItem.productId || null,
            variantId: productItem.variantId || null, // ✨ حفظ variantId
            quantity: itemQuantity,
            price: Number.isFinite(itemPrice) ? itemPrice : 0,
            total: productItem.total || ((Number.isFinite(itemPrice) ? itemPrice : 0) * itemQuantity),

            productName: productItem.productName || product?.name || null,
            productColor: extractedColor || null, // ✨ استخدام البيانات المستخرجة
            productSize: extractedSize != null ? String(extractedSize) : null, // ✨ استخدام البيانات المستخرجة
            productImage: resolvedItemImage || null,
            productSku: productItem.sku || productItem.productSku || variant?.sku || product?.sku || `MANUAL-${Date.now()}`,
            basePrice: Number.isFinite(basePrice) ? basePrice : null,
            merchantPrice: Number.isFinite(merchantPrice) ? merchantPrice : null,

            extractionSource: 'manual',
            confidence: 1.0,

            metadata: JSON.stringify({
              manualEntry: true,
              catalogMatch: !!product,
              image: resolvedItemImage || null,
              productId: product?.id || null,
              variantId: productItem.variantId || null,
              variantName: variant?.name || null,
              attributes: selectedAttributes,
              merchantProductId: selectedMerchantProduct?.id || null
            })
          };

          console.log(`✅ [ENHANCED-ORDER-DEBUG] ItemData prepared:`, {
            productName: itemData.productName,
            productColor: itemData.productColor,
            productSize: itemData.productSize
          });

          const orderItem = await this.safeQuery(() =>
            this.getPrisma().orderItem.create({
              data: itemData
            })
          );

          console.log(`✅ [ENHANCED-ORDER-DEBUG] OrderItem created in DB:`, {
            id: orderItem.id,
            productName: orderItem.productName,
            productColor: orderItem.productColor,
            productSize: orderItem.productSize
          });

          createdItems.push(orderItem);
        }

        console.log('✅ [ENHANCED-ORDER] تم إنشاء', createdItems.length, 'عنصر');
        return createdItems;
      }

      // ✅ منتج واحد (الطريقة القديمة)
      // البحث عن المنتج في الكتالوج
      let product = null;
      if (orderData.productId) {
        product = await this.safeQuery(() =>
          this.getPrisma().product.findUnique({
            where: { id: orderData.productId },
            include: {
              productVariants: true,
              merchantProducts: {
                where: {
                  isActive: true,
                  syncEnabled: true
                },
                include: {
                  merchant: true
                },
                orderBy: [
                  { merchantPrice: 'asc' },
                  { stock: 'desc' },
                  { createdAt: 'asc' }
                ]
              }
            }
          })
        );
      } else if (orderData.productSku || orderData.sku) {
        product = await this.safeQuery(() =>
          this.getPrisma().product.findFirst({
            where: {
              sku: orderData.productSku || orderData.sku,
              companyId: orderData.companyId,
              deletedAt: null
            },
            include: {
              productVariants: true,
              merchantProducts: {
                where: {
                  isActive: true,
                  syncEnabled: true
                },
                include: {
                  merchant: true
                },
                orderBy: [
                  { merchantPrice: 'asc' },
                  { stock: 'desc' },
                  { createdAt: 'asc' }
                ]
              }
            }
          })
        );
      }
      if (!product && orderData.productName) {
        product = await this.findProductByName(orderData.productName, orderData.companyId);
      }

      // ✅ استخدام السعر من المنتج في الكتالوج إذا وُجد
      const activeMerchantProducts = (product?.merchantProducts || []).filter((merchantProduct) => (
        merchantProduct?.isActive &&
        merchantProduct?.syncEnabled &&
        merchantProduct?.merchant?.isActive
      ));
      const selectedMerchantProduct = activeMerchantProducts[0] || null;
      const productPrice = orderData.productPrice || product?.basePrice || product?.price || null;
      const quantity = orderData.quantity || 1;
      const total = productPrice ? productPrice * quantity : null;
      const selectedAttributes = this.normalizeOrderItemAttributes(
        orderData.productAttributes || orderData.attributes || orderData.variantAttributes
      );

      let resolvedSingleImage = orderData.productImage || orderData.image || null;
      if (!resolvedSingleImage && product?.mainImage) {
        resolvedSingleImage = product.mainImage;
      }
      if (!resolvedSingleImage && product?.images) {
        try {
          const pImgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
          if (Array.isArray(pImgs) && pImgs.length > 0) resolvedSingleImage = pImgs[0];
          else if (typeof pImgs === 'string') resolvedSingleImage = pImgs;
        } catch (_) {
          if (typeof product.images === 'string') resolvedSingleImage = product.images;
        }
      }

      const itemData = {
        orderId: orderId,
        productId: product?.id || orderData.productId || null,
        quantity: quantity,
        price: productPrice,
        total: total,

        // ✅ معلومات المنتج من الاستخراج التلقائي - بدون قيم افتراضية
        productName: orderData.productName || product?.name || null,
        productColor: orderData.productColor || selectedAttributes.Color || null,
        productSize: orderData.productSize != null ? String(orderData.productSize) : (selectedAttributes.Size != null ? String(selectedAttributes.Size) : null),
        productImage: resolvedSingleImage || null,
        productSku: product?.sku || orderData.productSku || orderData.sku || `AUTO-${Date.now()}`,
        basePrice: product?.basePrice || product?.price || null,
        merchantPrice: selectedMerchantProduct?.merchantPrice || product?.cost || null,

        extractionSource: 'ai',
        confidence: orderData.confidence || 0.5,

        metadata: JSON.stringify({
          aiExtracted: true,
          image: resolvedSingleImage || null,
          originalData: {
            productName: orderData.productName,
            productColor: orderData.productColor,
            productSize: orderData.productSize,
            productAttributes: selectedAttributes,
            productPrice: orderData.productPrice
          },
          catalogMatch: !!product,
          productId: product?.id || orderData.productId || null,
          catalogProduct: product ? {
            name: product.name,
            price: product.price,
            sku: product.sku
          } : null
        })
      };

      const orderItem = await this.safeQuery(() =>
        this.getPrisma().orderItem.create({
          data: itemData
        })
      );

      //console.log('📦 [ENHANCED-ORDER] تم إنشاء عنصر الطلب');
      return orderItem;

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في إنشاء عناصر الطلب:', error);
      throw error;
    }
  }

  /**
   * البحث عن المنتج بالاسم
   */
  async findProductByName(productName, companyId) {
    try {
      if (!productName || !companyId) return null;

      // البحث المباشر بدون mode
      let product = await this.safeQuery(() =>
        this.getPrisma().product.findFirst({
          where: {
            name: {
              contains: productName
            },
            companyId: companyId,
            isActive: true
          },
          include: {
            merchantProducts: {
              where: {
                isActive: true,
                syncEnabled: true
              },
              include: {
                merchant: true
              },
              orderBy: [
                { merchantPrice: 'asc' },
                { stock: 'desc' },
                { createdAt: 'asc' }
              ]
            }
          }
        })
      );

      // البحث بالكلمات المفتاحية
      if (!product) {
        const keywords = productName.split(' ').filter(word => word.length > 2);

        for (const keyword of keywords) {
          product = await this.safeQuery(() =>
            this.getPrisma().product.findFirst({
              where: {
                OR: [
                  {
                    name: {
                      contains: keyword
                    }
                  },
                  {
                    tags: {
                      contains: keyword
                    }
                  }
                ],
                companyId: companyId,
                isActive: true
              },
              include: {
                merchantProducts: {
                  where: {
                    isActive: true,
                    syncEnabled: true
                  },
                  include: {
                    merchant: true
                  },
                  orderBy: [
                    { merchantPrice: 'asc' },
                    { stock: 'desc' },
                    { createdAt: 'asc' }
                  ]
                }
              }
            })
          );

          if (product) break;
        }
      }

      if (product) {
        //console.log(`🔍 [ENHANCED-ORDER] تم العثور على منتج مطابق: ${product.name}`);
      } else {
        //console.log(`⚠️ [ENHANCED-ORDER] لم يتم العثور على منتج مطابق لـ: ${productName}`);
      }

      return product;

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في البحث عن المنتج:', error);
      return null;
    }
  }

  /**
   * إضافة ملاحظة عن الطلب للمحادثة بدون إنهائها
   */
  async addOrderNoteToConversation(conversationId, orderNumber) {
    try {
      const updateData = {
        lastMessagePreview: `تم إنشاء الطلب ${orderNumber} بنجاح - المحادثة مستمرة`,
        updatedAt: new Date()
      };

      const updatedConversation = await this.safeQuery(() =>
        this.getPrisma().conversation.update({
          where: { id: conversationId },
          data: updateData,
          include: {
            customer: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
      );

      //console.log(`💬 [ENHANCED-ORDER] تم إضافة ملاحظة الطلب للمحادثة: ${orderNumber}`);

      // إضافة رسالة نظام للمحادثة
      await this.addSystemMessageToConversation(conversationId, orderNumber);

      return updatedConversation;

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في إضافة ملاحظة الطلب:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة المحادثة مع تفاصيل إضافية
   */
  async updateConversationStatus(conversationId, status, orderNumber = null) {
    try {
      const updateData = {
        status: status,
        updatedAt: new Date()
      };

      // إضافة ملاحظة عن الطلب إذا تم إنشاؤه
      if (orderNumber && status === 'RESOLVED') {
        updateData.lastMessagePreview = `تم إنشاء الطلب ${orderNumber} بنجاح`;
      }

      const updatedConversation = await this.safeQuery(() =>
        this.getPrisma().conversation.update({
          where: { id: conversationId },
          data: updateData,
          include: {
            customer: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        })
      );

      //console.log(`💬 [ENHANCED-ORDER] تم تحديث حالة المحادثة إلى: ${status}`);

      // إضافة رسالة نظام للمحادثة
      if (orderNumber) {
        await this.safeQuery(() =>
          this.addSystemMessageToConversation(conversationId, orderNumber)
        );
      }

      // إشعار المستخدمين المعنيين
      await this.notifyUsersAboutOrderCreation(updatedConversation, orderNumber);

      return updatedConversation;

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في تحديث حالة المحادثة:', error);
      return null;
    }
  }

  /**
   * إضافة رسالة نظام للمحادثة
   */
  async addSystemMessageToConversation(conversationId, orderNumber) {
    try {
      await this.safeQuery(() =>
        this.getPrisma().message.create({
          data: {
            conversationId: conversationId,
            content: `🎉 تم إنشاء الطلب ${orderNumber} بنجاح! يمكنك الاستمرار في المحادثة لأي استفسارات إضافية.`,
            type: 'TEXT',
            isFromCustomer: false,
            metadata: JSON.stringify({
              type: 'system_order_notification',
              orderNumber: orderNumber,
              timestamp: new Date().toISOString(),
              source: 'enhanced_order_service'
            })
          }
        })
      );

      //console.log(`📝 [ENHANCED-ORDER] تم إضافة رسالة نظام للمحادثة: ${conversationId}`);

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في إضافة رسالة النظام:', error);
    }
  }

  /**
   * إشعار المستخدمين عن إنشاء الطلب
   */
  async notifyUsersAboutOrderCreation(conversation, orderNumber) {
    try {
      if (!orderNumber || !conversation) return;

      // إنشاء إشعار للمستخدم المسؤول عن المحادثة
      if (conversation.assignedUserId) {
        await this.safeQuery(() =>
          this.getPrisma().notification.create({
            data: {
              userId: conversation.assignedUserId,
              companyId: conversation.companyId,
              title: 'تم إنشاء طلب جديد',
              message: `تم إنشاء الطلب ${orderNumber} من محادثة العميل ${conversation.customer?.firstName || 'غير محدد'}`,
              type: 'order_created',
              data: JSON.stringify({
                orderId: orderNumber,
                conversationId: conversation.id,
                customerId: conversation.customerId,
                source: 'ai_agent'
              })
            }
          })
        );
      }

      // إنشاء إشعار عام لجميع المديرين
      const managers = await this.safeQuery(() =>
        this.getPrisma().user.findMany({
          where: {
            companyId: conversation.companyId,
            role: { in: ['COMPANY_ADMIN', 'MANAGER'] },
            isActive: true
          }
        })
      );

      for (const manager of managers) {
        if (manager.id !== conversation.assignedUserId) {
          await this.safeQuery(() =>
            this.getPrisma().notification.create({
              data: {
                userId: manager.id,
                companyId: conversation.companyId,
                title: 'طلب جديد من المحادثات',
                message: `تم إنشاء الطلب ${orderNumber} تلقائياً من المحادثة`,
                type: 'automated_order_created',
                data: JSON.stringify({
                  orderId: orderNumber,
                  conversationId: conversation.id,
                  customerId: conversation.customerId,
                  source: 'conversation_automation',
                  automated: true
                })
              }
            })
          );
        }
      }

      //console.log(`🔔 [ENHANCED-ORDER] تم إرسال إشعارات عن الطلب: ${orderNumber}`);

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في إرسال الإشعارات:', error);
    }
  }

  /**
   * تسجيل إحصائيات إنشاء الطلب
   */
  async logOrderCreation(order) {
    try {
      //console.log('\n📊 [ENHANCED-ORDER] تقرير إنشاء الطلب:');
      //console.log(`   رقم الطلب: ${order.orderNumber}`);
      //console.log(`   العميل: ${order.customerName}`);
      //console.log(`   الهاتف: ${order.customerPhone || 'غير متوفر'}`);
      //console.log(`   المدينة: ${order.city}`);
      //console.log(`   الإجمالي: ${order.total} ${order.currency}`);
      //console.log(`   مستوى الثقة: ${order.confidence ? (order.confidence * 100).toFixed(0) + '%' : 'غير محدد'}`);
      //console.log(`   طريقة الاستخراج: ${order.extractionMethod}`);
      //console.log(`   المحادثة: ${order.conversationId || 'غير مربوطة'}`);

      if (order.orderItems && order.orderItems.length > 0) {
        //console.log(`   المنتجات:`);
        order.orderItems.forEach((item, index) => {
          //console.log(`     ${index + 1}. ${item.productName} - ${item.productColor} - مقاس ${item.productSize} - ${item.price} جنيه`);
        });
      }

      //console.log(`   تاريخ الإنشاء: ${order.createdAt.toLocaleString('ar-EG')}\n`);

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في تسجيل الإحصائيات:', error);
    }
  }

  /**
   * جلب الطلبات المحسنة
   */
  async getEnhancedOrders(companyId, options = {}) {
    try {
      console.log('🔍 [ENHANCED-ORDER] Starting getEnhancedOrders with:', { companyId, options });

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
        search
      } = options;

      const where = {
        companyId: companyId
      };

      // 🚧 الطلبات المعلّقة لسبب تحصيل الرصيد (billing hold) مخفية افتراضياً
      if (options.includeHeld !== true) {
        where.billingHoldAt = null;
      }

      // فلاتر إضافية
      if (status && status !== 'all') {
        const statuses = String(status)
          .split(',')
          .map((s) => String(s).trim().toUpperCase())
          .filter(Boolean);
        where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
      } else {
        const hiddenStatuses = ['TRASH'];
        where.status = { notIn: hiddenStatuses };
      }
      if (customerId) where.customerId = customerId;
      if (conversationId) where.conversationId = conversationId;
      if (minConfidence) where.confidence = { gte: parseFloat(minConfidence) };
      if (extractionMethod) where.extractionMethod = extractionMethod;
      if (onlyUnseen === 'true' || onlyUnseen === true) where.isViewed = false;

      // 🔍 Search implementation
      if (search) {
        const searchTerms = String(search).trim();
        const words = searchTerms.split(/\s+/).filter(Boolean);

        // Helper function to generate variations of Egypt/generic phone numbers to match stored phone format in database
        const getPhoneVariations = (input) => {
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

          // Add Arabic/Indic digits counterpart for every variation so database matches either representation
          const allVariations = Array.from(variations);
          allVariations.forEach(v => {
            const ar = toArabicDigits(v);
            if (ar) variations.add(ar);
          });

          return Array.from(variations);
        };

        const phoneVariations = getPhoneVariations(searchTerms);

        // Base fields that we search with "contains" for regular orders
        const regularOrFields = [
          { orderNumber: { contains: searchTerms, mode: 'insensitive' } },
          { customerEmail: { contains: searchTerms, mode: 'insensitive' } }
        ];

        // Add phone variations to regular orders
        phoneVariations.forEach(val => {
          regularOrFields.push({ customerPhone: { contains: val, mode: 'insensitive' } });
          regularOrFields.push({ customer: { phone: { contains: val, mode: 'insensitive' } } });
        });

        // Name search logic for regular orders
        if (words.length > 0) {
          if (words.length === 1) {
            regularOrFields.push({ customerName: { contains: words[0], mode: 'insensitive' } });
            regularOrFields.push({ customer: { firstName: { contains: words[0], mode: 'insensitive' } } });
            regularOrFields.push({ customer: { lastName: { contains: words[0], mode: 'insensitive' } } });
          } else {
            // Check if customerName matches full search terms
            regularOrFields.push({ customerName: { contains: searchTerms, mode: 'insensitive' } });
            
            if (words.length === 2) {
              // First name matches first word, last name matches second word
              regularOrFields.push({
                AND: [
                  { customer: { firstName: { contains: words[0], mode: 'insensitive' } } },
                  { customer: { lastName: { contains: words[1], mode: 'insensitive' } } }
                ]
              });
              // Reverse name matches
              regularOrFields.push({
                AND: [
                  { customer: { firstName: { contains: words[1], mode: 'insensitive' } } },
                  { customer: { lastName: { contains: words[0], mode: 'insensitive' } } }
                ]
              });
            } else {
              // 3+ words: check first word against firstName, remaining words against lastName
              const firstWord = words[0];
              const remainingWords = words.slice(1).join(' ');
              regularOrFields.push({
                AND: [
                  { customer: { firstName: { contains: firstWord, mode: 'insensitive' } } },
                  { customer: { lastName: { contains: remainingWords, mode: 'insensitive' } } }
                ]
              });
            }
          }
        }

        where.OR = regularOrFields;
      }

      if (dateFrom || dateTo) {
        const dateRangeFilter = buildDateRangeFilter(dateFrom, dateTo, options.timezone || EGYPT_TIMEZONE);
        if (dateRangeFilter.gte || dateRangeFilter.lte) {
          where.createdAt = dateRangeFilter;
        }
      }

      if (sourceType) {
        const sourceTypes = String(sourceType)
          .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        const sourceConditions = sourceTypes.map(buildSourceCondition).filter(Boolean);
        if (sourceConditions.length > 0) {
          if (!where.AND) where.AND = [];
          where.AND.push(
            sourceConditions.length === 1 ? sourceConditions[0] : { OR: sourceConditions }
          );
        }
      }

      if (paymentStatus && paymentStatus !== 'all') {
        const paymentStatuses = String(paymentStatus)
          .split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
        if (paymentStatuses.length > 0) {
          where.paymentStatus = paymentStatuses.length === 1
            ? paymentStatuses[0]
            : { in: paymentStatuses };
        }
      }

      console.log('🔍 [ENHANCED-ORDER] Query where clause:', JSON.stringify(where, null, 2));

      // Use safeQuery for better error handling
      const orders = await this.safeQuery(async () => {
        return await this.getPrisma().order.findMany({
          where,
          include: {
            customer: true,
            conversation: true,
            orderItems: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit
        });
      }, 3);

      console.log('✅ [ENHANCED-ORDER] Orders fetched:', orders.length);

      // Count total for pagination metadata — use count() first (efficient),
      // fall back to an id scan only if the engine connection is flaky.
      let total = 0;
      try {
        total = await this.safeQuery(async () => {
          return await this.getPrisma().order.count({ where });
        }, 3);
      } catch (error) {
        // Fallback: use an id scan (lower bound) rather than failing the whole request
        console.error('❌ [ENHANCED-ORDER] Count query failed, using id-scan fallback:', error.message);
        try {
          await this.getPrisma().$connect().catch(() => { }); // Ensure connection
          const allOrderIds = await this.getPrisma().order.findMany({
            where,
            select: { id: true },
            take: 100000 // large enough for realistic volumes; avoids OOM on extreme datasets
          });
          total = allOrderIds.length;
        } catch (fallbackError) {
          console.error('❌ [ENHANCED-ORDER] Fallback count failed, using current page length:', fallbackError.message);
          total = orders.length;
        }
      }

      console.log('✅ [ENHANCED-ORDER] Total count:', total);

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في جلب الطلبات:', error);
      console.error('❌ [ENHANCED-ORDER] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        companyId: companyId,
        options: options
      });
      throw error;
    }
  }

  /**
   * إحصائيات الطلبات المحسنة
   */
  async getOrderStats(companyId, dateFrom, dateTo, timezone = EGYPT_TIMEZONE) {
    try {
      const where = {
        companyId: companyId
      };

      if (dateFrom || dateTo) {
        const dateRangeFilter = buildDateRangeFilter(dateFrom, dateTo, timezone);
        if (dateRangeFilter.gte || dateRangeFilter.lte) {
          where.createdAt = dateRangeFilter;
        }
      }

      const [
        totalOrders,
        totalRevenue,
        avgConfidence,
        extractionMethods,
        statusRows,
        topCities
      ] = await Promise.all([
        // إجمالي الطلبات
        this.getPrisma().order.count({ where }),

        // إجمالي الإيرادات
        this.getPrisma().order.aggregate({
          where,
          _sum: { total: true }
        }),

        // متوسط الثقة
        this.getPrisma().order.aggregate({
          where: { ...where, confidence: { not: null } },
          _avg: { confidence: true }
        }),

        // طرق الاستخراج
        this.getPrisma().order.groupBy({
          by: ['extractionMethod'],
          where,
          _count: true
        }),

        // 🛡️ PRODUCTION-FIX (custom-status-persist): توزيع الحالات بالحالة الفعلية
        // (كود مخصص ← تجهيز محوّلة ← enum) — بدل groupBy على الـ enum بس اللي كان
        // بيخفي الحالات المخصصة من صفحة إحصائيات الطلبات.
        this.getPrisma().order.findMany({
          where,
          select: { status: true, customStatusCode: true, metadata: true }
        }),

        // أهم المدن
        this.getPrisma().order.groupBy({
          by: ['city'],
          where: { ...where, city: { not: null } },
          _count: true,
          orderBy: { _count: { city: 'desc' } },
          take: 10
        })
      ]);

      const { computeEffectiveOrderStatus } = require('../utils/orderEffectiveStatus');
      const statusDistribution = Object.entries(
        statusRows.reduce((acc, row) => {
          const key = computeEffectiveOrderStatus(row);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).map(([status, count]) => ({ status, _count: count }));

      // Recent orders (last 10)
      const recentOrders = await this.getPrisma().order.findMany({
        where,
        include: {
          customer: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      return {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        averageOrderValue: totalOrders > 0 ? (totalRevenue._sum.total || 0) / totalOrders : 0,
        avgConfidence: avgConfidence._avg.confidence || 0,
        extractionMethods: extractionMethods.reduce((acc, item) => {
          acc[item.extractionMethod || 'unknown'] = item._count;
          return acc;
        }, {}),
        statusDistribution: statusDistribution.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {}),
        statusCounts: statusDistribution.reduce((acc, item) => {
          acc[item.status?.toLowerCase()] = item._count;
          return acc;
        }, {}),
        recentOrders: recentOrders.map(order => ({
          orderNumber: order.orderNumber,
          customerName: order.customerName || (order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'غير محدد'),
          total: parseFloat(order.total) || 0,
          status: (order.status || 'pending').toLowerCase(),
          createdAt: order.createdAt
        })),
        topCities: topCities.map(item => ({
          city: item.city,
          count: item._count
        }))
      };

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في حساب الإحصائيات:', error);
      throw error;
    }
  }

  /**
   * إحصائيات المحادثات المكتملة
   */
  async getConversationCompletionStats(companyId, dateFrom, dateTo, timezone = EGYPT_TIMEZONE) {
    try {
      const where = {
        companyId: companyId,
        status: 'RESOLVED'
      };

      if (dateFrom || dateTo) {
        const dateRangeFilter = buildDateRangeFilter(dateFrom, dateTo, timezone);
        if (dateRangeFilter.gte || dateRangeFilter.lte) {
          where.updatedAt = dateRangeFilter;
        }
      }

      const [
        totalCompleted,
        completedWithOrders,
        avgCompletionTime,
        completionByChannel
      ] = await Promise.all([
        // إجمالي المحادثات المكتملة
        this.getPrisma().conversation.count({ where }),

        // المحادثات المكتملة مع طلبات
        this.getPrisma().conversation.count({
          where: {
            ...where,
            orders: { some: {} }
          }
        }),

        // متوسط وقت إكمال المحادثة
        this.getPrisma().conversation.aggregate({
          where,
          _avg: {
            // حساب الفرق بين تاريخ الإنشاء والتحديث
          }
        }),

        // التوزيع حسب القناة
        this.getPrisma().conversation.groupBy({
          by: ['channel'],
          where,
          _count: true
        })
      ]);

      const conversionRate = totalCompleted > 0 ?
        ((completedWithOrders / totalCompleted) * 100).toFixed(1) : 0;

      return {
        totalCompleted,
        completedWithOrders,
        conversionRate: parseFloat(conversionRate),
        completionByChannel: completionByChannel.reduce((acc, item) => {
          acc[item.channel] = item._count;
          return acc;
        }, {}),
        summary: {
          message: `تم إكمال ${totalCompleted} محادثة، منها ${completedWithOrders} أدت لطلبات`,
          conversionMessage: `معدل التحويل: ${conversionRate}%`
        }
      };

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في حساب إحصائيات المحادثات:', error);
      throw error;
    }
  }

  /**
   * جلب المحادثات المرتبطة بالطلبات
   */
  async getOrderConversations(companyId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'RESOLVED',
        hasOrder = true
      } = options;

      const where = {
        companyId: companyId,
        status: status
      };

      if (hasOrder) {
        where.orders = { some: {} };
      }

      const conversations = await this.getPrisma().conversation.findMany({
        where,
        include: {
          customer: true,
          orders: {
            include: {
              orderItems: true
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      });

      const total = await this.getPrisma().conversation.count({ where });

      return {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('❌ [ENHANCED-ORDER] خطأ في جلب محادثات الطلبات:', error);
      throw error;
    }
  }

  /**
   * إغلاق الاتصال
   */
  /**
   * جلب تفاصيل طلب واحد بالـ ID
   */
  async getOrderById(orderId, companyId) {
    try {
      // ✅ SECURITY FIX: Always include companyId in where clause
      if (!companyId) {
        return {
          success: false,
          message: 'معرف الشركة مطلوب'
        };
      }

      const include = {
        orderItems: {
          include: {
            product: true
          }
        },
        customer: true,
        conversation: true,
        statusHistory: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        orderNotes: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      };

      let order;

      let whereClause;
      // If it looks like an order number (ORD-xxx), search by orderNumber
      if (orderId && orderId.startsWith('ORD-')) {
        whereClause = {
          orderNumber: orderId,
          companyId: companyId
        };
        console.log('🔍 [ENHANCED-ORDER] Searching by orderNumber:', whereClause);
        order = await this.getPrisma().order.findFirst({
          where: whereClause,
          include
        });
      } else {
        // Try by cuid/id first
        whereClause = {
          id: orderId,
          companyId: companyId
        };
        console.log('🔍 [ENHANCED-ORDER] Searching by id:', whereClause);
        order = await this.getPrisma().order.findUnique({
          where: whereClause,
          include
        });

        // Fallback: also try by orderNumber for non-ORD codes
        if (!order) {
          whereClause = {
            orderNumber: orderId,
            companyId: companyId
          };
          console.log('🔍 [ENHANCED-ORDER] Fallback to orderNumber:', whereClause);
          order = await this.getPrisma().order.findFirst({
            where: whereClause,
            include
          });
        }

        // Fallback: try by turbo shipment code
        if (!order) {
          whereClause = {
            OR: [
              { turboShipmentId: orderId },
              { turboTrackingNumber: orderId }
            ],
            companyId: companyId
          };
          console.log('🔍 [ENHANCED-ORDER] Fallback to turbo code:', whereClause);
          order = await this.getPrisma().order.findFirst({
            where: whereClause,
            include
          });
        }
      }

      // Log if found in Order table
      if (order) {
        console.log('✅ [ENHANCED-ORDER] Found in Order table');
        console.log('🔍 [ENHANCED-ORDER] Order Turbo fields:', {
          turboShipmentId: order.turboShipmentId,
          turboTrackingNumber: order.turboTrackingNumber,
          turboShipmentStatus: order.turboShipmentStatus,
          turboLabelUrl: order.turboLabelUrl,
          turboMetadata: order.turboMetadata ? 'exists' : 'null'
        });
      }

      // If not found in Order table, try GuestOrder
      if (!order) {
        console.log('🔍 [ENHANCED-ORDER] Not found in Order table, trying GuestOrder...');
        const guestOrder = await this.getPrisma().guestOrder.findFirst({
          where: {
            OR: [
              { id: orderId },
              { orderNumber: orderId },
              { turboShipmentId: orderId },
              { turboTrackingNumber: orderId }
            ],
            companyId: companyId
          },
          select: {
            id: true,
            orderNumber: true,
            guestName: true,
            guestEmail: true,
            guestPhone: true,
            shippingAddress: true,
            items: true,
            total: true,
            shippingCost: true,
            discountAmount: true,
            status: true,
            paymentMethod: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            isViewed: true,
            // Turbo Shipping Fields - IMPORTANT!
            turboShipmentId: true,
            turboTrackingNumber: true,
            turboShipmentStatus: true,
            turboLabelUrl: true,
            turboMetadata: true,
            companyId: true
          }
        });

        if (guestOrder) {
          console.log('✅ [ENHANCED-ORDER] Found in GuestOrder table');
          console.log('🔍 [ENHANCED-ORDER] GuestOrder Turbo fields:', {
            turboShipmentId: guestOrder.turboShipmentId,
            turboTrackingNumber: guestOrder.turboTrackingNumber,
            turboShipmentStatus: guestOrder.turboShipmentStatus,
            turboLabelUrl: guestOrder.turboLabelUrl,
            turboMetadata: guestOrder.turboMetadata ? 'exists' : 'null'
          });
          // Convert GuestOrder to Order-like format
          let items = guestOrder.items || [];
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { items = []; }
          }

          let shippingAddress = guestOrder.shippingAddress || {};
          if (typeof shippingAddress === 'string') {
            try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
          }

          // Calculate subtotal from total - shippingCost - discountAmount
          const totalAmount = parseFloat(guestOrder.total || 0);
          const shippingAmount = parseFloat(guestOrder.shippingCost || 0);
          const discountAmount = parseFloat(guestOrder.discountAmount || 0);
          const calculatedSubtotal = totalAmount - shippingAmount + discountAmount;

          order = {
            id: guestOrder.id,
            orderNumber: guestOrder.orderNumber,
            customerName: guestOrder.guestName || '',
            customerEmail: guestOrder.guestEmail || '',
            customerPhone: guestOrder.guestPhone || '',
            customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || shippingAddress.street || '') : '',
            city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
            status: guestOrder.status || 'PENDING',
            paymentStatus: 'UNAVAILABLE',
            paymentMethod: guestOrder.paymentMethod || 'غير محدد',
            orderItems: items.map((item, index) => ({
              id: `guest-item-${index}`,
              productId: item.productId || null,
              productName: item.name || item.productName || '',
              productColor: item.color || '',
              productSize: item.size || '',
              productSku: item.sku || item.productSku || '',
              price: parseFloat(item.price || 0),
              quantity: parseInt(item.quantity || 1),
              total: parseFloat(item.total || (item.price * item.quantity) || 0),
              product: null
            })),
            subtotal: calculatedSubtotal,
            tax: 0, // GuestOrder doesn't have tax field
            shipping: shippingAmount,
            total: totalAmount,
            currency: guestOrder.currency || 'EGP',
            confidence: null,
            extractionMethod: null,
            conversationId: null,
            notes: guestOrder.notes || '',
            createdAt: guestOrder.createdAt,
            updatedAt: guestOrder.updatedAt,
            isViewed: guestOrder.isViewed ?? false,
            // Turbo Shipping Fields
            turboShipmentId: guestOrder.turboShipmentId,
            turboTrackingNumber: guestOrder.turboTrackingNumber,
            turboShipmentStatus: guestOrder.turboShipmentStatus,
            turboLabelUrl: guestOrder.turboLabelUrl,
            turboMetadata: guestOrder.turboMetadata,
            statusHistory: [],
            orderNotes: [],
            customer: null,
            conversation: null
          };
        }
      }

      // If still not found, try by turboTrackingNumber (كود الشحن)
      if (!order && orderId) {
        console.log('🔍 [ENHANCED-ORDER] Not found by ID/orderNumber, trying turboTrackingNumber:', orderId);
        order = await this.getPrisma().order.findFirst({
          where: {
            turboTrackingNumber: orderId,
            companyId: companyId
          },
          include
        });

        if (order) {
          console.log('✅ [ENHANCED-ORDER] Found in Order table by turboTrackingNumber');
        } else {
          console.log('🔍 [ENHANCED-ORDER] Trying GuestOrder by turboTrackingNumber...');
          const guestOrder = await this.getPrisma().guestOrder.findFirst({
            where: {
              turboTrackingNumber: orderId,
              companyId: companyId
            },
            select: {
              id: true,
              orderNumber: true,
              guestName: true,
              guestEmail: true,
              guestPhone: true,
              shippingAddress: true,
              items: true,
              total: true,
              shippingCost: true,
              discountAmount: true,
              status: true,
              paymentMethod: true,
              notes: true,
              createdAt: true,
              updatedAt: true,
              isViewed: true,
              turboShipmentId: true,
              turboTrackingNumber: true,
              turboShipmentStatus: true,
              turboLabelUrl: true,
              turboMetadata: true,
              companyId: true
            }
          });

          if (guestOrder) {
            console.log('✅ [ENHANCED-ORDER] Found in GuestOrder table by turboTrackingNumber');
            let items = guestOrder.items || [];
            if (typeof items === 'string') {
              try { items = JSON.parse(items); } catch (e) { items = []; }
            }

            let shippingAddress = guestOrder.shippingAddress || {};
            if (typeof shippingAddress === 'string') {
              try { shippingAddress = JSON.parse(shippingAddress); } catch (e) { shippingAddress = {}; }
            }

            const totalAmount = parseFloat(guestOrder.total || 0);
            const shippingAmount = parseFloat(guestOrder.shippingCost || 0);
            const discountAmount = parseFloat(guestOrder.discountAmount || 0);
            const calculatedSubtotal = totalAmount - shippingAmount + discountAmount;

            order = {
              id: guestOrder.id,
              orderNumber: guestOrder.orderNumber,
              customerName: guestOrder.guestName || '',
              customerEmail: guestOrder.guestEmail || '',
              customerPhone: guestOrder.guestPhone || '',
              customerAddress: typeof shippingAddress === 'object' ? (shippingAddress.address || shippingAddress.street || '') : '',
              city: typeof shippingAddress === 'object' ? (shippingAddress.city || '') : '',
              status: guestOrder.status || 'PENDING',
              paymentStatus: 'UNAVAILABLE',
              paymentMethod: guestOrder.paymentMethod || 'غير محدد',
              orderItems: items.map((item, index) => ({
                id: `guest-item-${index}`,
                productId: item.productId || null,
                productName: item.name || item.productName || '',
                productColor: item.color || '',
                productSize: item.size || '',
                productSku: item.sku || item.productSku || '',
                price: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 1),
                total: parseFloat(item.total || (item.price * item.quantity) || 0),
                product: null
              })),
              subtotal: calculatedSubtotal,
              tax: 0,
              shipping: shippingAmount,
              total: totalAmount,
              currency: guestOrder.currency || 'EGP',
              confidence: null,
              extractionMethod: null,
              conversationId: null,
              notes: guestOrder.notes || '',
              createdAt: guestOrder.createdAt,
              updatedAt: guestOrder.updatedAt,
              isViewed: guestOrder.isViewed ?? false,
              turboShipmentId: guestOrder.turboShipmentId,
              turboTrackingNumber: guestOrder.turboTrackingNumber,
              turboShipmentStatus: guestOrder.turboShipmentStatus,
              turboLabelUrl: guestOrder.turboLabelUrl,
              turboMetadata: guestOrder.turboMetadata,
              statusHistory: [],
              orderNotes: [],
              customer: null,
              conversation: null
            };
          }
        }
      }

      if (!order) {
        return {
          success: false,
          message: 'الطلب غير موجود'
        };
      }

      // تنسيق البيانات
      const formattedOrder = {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        city: order.city,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod || 'غير محدد',
        items: (order.orderItems || []).map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productColor: item.productColor,
          productSize: item.productSize,
          productSku: item.productSku || '',
          productImage: (() => {
            if (item.product?.images) {
              try {
                const images = typeof item.product.images === 'string' ? JSON.parse(item.product.images) : item.product.images;
                return Array.isArray(images) ? images[0] : null;
              } catch (e) { return null; }
            }
            return null;
          })(),
          price: parseFloat(item.price),
          quantity: item.quantity,
          total: parseFloat(item.total)
        })),
        subtotal: parseFloat(order.subtotal),
        tax: parseFloat(order.tax || 0),
        shipping: parseFloat(order.shipping || 0),
        total: parseFloat(order.total),
        currency: order.currency,
        confidence: order.confidence,
        extractionMethod: order.extractionMethod,
        conversationId: order.conversationId,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        isViewed: order.isViewed ?? false,
        // Turbo Shipping Fields
        turboShipmentId: order.turboShipmentId,
        turboTrackingNumber: order.turboTrackingNumber,
        turboShipmentStatus: order.turboShipmentStatus,
        turboLabelUrl: order.turboLabelUrl,
        turboMetadata: order.turboMetadata,
        statusHistory: order.statusHistory?.map(history => ({
          status: history.status,
          notes: history.notes,
          createdAt: history.createdAt,
          updatedBy: history.updatedBy
        })) || []
      };

      console.log('📦 [ENHANCED-ORDER] FormattedOrder Turbo fields before return:', {
        turboShipmentId: formattedOrder.turboShipmentId,
        turboTrackingNumber: formattedOrder.turboTrackingNumber,
        turboShipmentStatus: formattedOrder.turboShipmentStatus,
        turboLabelUrl: formattedOrder.turboLabelUrl,
        turboMetadata: formattedOrder.turboMetadata ? 'exists' : 'null'
      });

      return {
        success: true,
        order: formattedOrder
      };

    } catch (error) {
      console.error('❌ Error fetching order by ID:', error);
      return {
        success: false,
        message: 'حدث خطأ أثناء جلب تفاصيل الطلب'
      };
    }
  }

  /**
   * تحويل Order object للـ response (تحويل Decimal لـ number)
   */
  transformOrderForResponse(order) {
    if (!order) return null;

    console.log('🔄 [TRANSFORM] تحويل الطلب للـ response - قبل:', {
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total
    });

    const orderMeta = order.metadata
      ? (() => { try { return JSON.parse(order.metadata); } catch { return {}; } })()
      : {};
    const walletProof = orderMeta.walletPaymentProof;
    const isWalletPayment = String(order.paymentMethod || '').toLowerCase() === 'wallet';
    const hasScreenshot = Boolean(walletProof && walletProof.imageUrl);
    const isRejected = String((walletProof && walletProof.status) || '').toUpperCase() === 'REJECTED';
    const storedPaymentStatus = String(order.paymentStatus || '').toLowerCase();
    const displayPaymentStatus =
      isWalletPayment && hasScreenshot && !isRejected &&
      !['failed', 'refunded', 'partially_refunded'].includes(storedPaymentStatus)
        ? 'completed'
        : (storedPaymentStatus || 'pending');

    const transformed = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone,
      total: parseFloat(order.total) || 0,
      subtotal: parseFloat(order.subtotal) || 0,
      tax: parseFloat(order.tax) || 0,
      shipping: parseFloat(order.shipping) || 0,
      status: order.status?.toLowerCase() || 'pending',
      paymentStatus: displayPaymentStatus,
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
      shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : {},
      items: (order.orderItems || []).map(item => ({
        id: item.id,
        productId: item.productId || 'ai-generated',
        name: item.productName,
        price: parseFloat(item.price) || 0,
        quantity: item.quantity || 1,
        total: parseFloat(item.total) || 0,
        productSku: item.productSku || '',
        metadata: {
          color: item.productColor,
          size: item.productSize,
          conversationId: order.conversationId,
          source: 'ai_agent',
          confidence: order.confidence,
          extractionMethod: order.extractionMethod || 'ai_enhanced'
        }
      })),
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      metadata: orderMeta,
      isViewed: order.isViewed ?? false
    };

    console.log('🔄 [TRANSFORM] تحويل الطلب للـ response - بعد:', {
      subtotal: transformed.subtotal,
      shipping: transformed.shipping,
      tax: transformed.tax,
      total: transformed.total
    });

    return transformed;
  }

  async disconnect() {
    // No-op: getPrisma() returns a shared singleton client.
    // Disconnecting it here would break other services (internalSyncService, etc.)
    // that rely on the same Prisma connection.
  }
}

module.exports = EnhancedOrderService;



