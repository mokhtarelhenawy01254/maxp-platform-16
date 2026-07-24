const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { getWooCommerceAutoExportService } = require('./wooCommerceAutoExportService');
const orderService = require('./orderService');
const internalSyncService = require('./internalSyncService');
const { ensureWithinPlanLimit } = require('../utils/planLimitPayloads');
const customerBlocklistService = require('./customerBlocklistService');
const { resolveVariantAttributes } = require('../utils/productNormalizationUtils');
const { normalizeOrderPaymentMethod } = require('../utils/paymentMethodNormalization');

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
      data.status = (data.status || 'CONFIRMED').toUpperCase();
      data.paymentMethod = normalizeOrderPaymentMethod(data.paymentMethod, 'CASH');
      data.paymentStatus = (data.paymentStatus || 'PENDING').toUpperCase();

      // حساب التكاليف (أو استخدام التكاليف المرسلة يدوياً)
      const costs = await this.calculateOrderCosts(data);

      // فحص التكرار قبل إنشاء الطلب
      const duplicateSettings = await orderService.getDuplicateSettings(data.companyId);
      let duplicateMatch = null;
      if (
        duplicateSettings &&
        (customer?.phone || customer?.email || data.customerPhone || data.customerEmail) &&
        costs?.total !== undefined &&
        costs?.total !== null
      ) {
        duplicateMatch = await orderService.findDuplicateOrder({
          companyId: data.companyId,
          customerPhone: customer?.phone || data.customerPhone,
          customerEmail: customer?.email || data.customerEmail,
          total: costs.total,
          windowMinutes: duplicateSettings.windowMinutes,
          includeGuest: false
        });
      }

      if (duplicateMatch && duplicateSettings?.action === 'ignore') {
        const existingOrder = await this.getPrisma().order.findUnique({
          where: { id: duplicateMatch.order.id },
          include: { customer: true, conversation: true, orderItems: true }
        });

        if (existingOrder) {
          return {
            success: true,
            order: this.transformOrderForResponse(existingOrder),
            duplicate: true,
            duplicateOf: duplicateMatch.order.id,
            message: 'تم تجاهل الطلب المكرر'
          };
        }
      }

      if (duplicateMatch) {
        const originalStatus = data.status || 'PENDING';
        data.status = 'DUPLICATE_ORDER';
        data.duplicateInfo = {
          duplicateOfId: duplicateMatch.order.id,
          duplicateOfOrderNumber: duplicateMatch.order.orderNumber,
          detectedAt: new Date().toISOString(),
          windowMinutes: duplicateSettings?.windowMinutes || 60,
          originalStatus
        };
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
                    turboMetadata: JSON.stringify(shipmentResult.data)
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

          await WhatsAppNotificationService.sendOrderCreatedNotification(orderForNotification);
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
          this.getPrisma().customer.findFirst({
            where: {
              phone: data.customerPhone,
              companyId: data.companyId
            }
          })
        );
      }

      // إنشاء عميل جديد إذا لم نجده
      if (!customer) {
        //console.log('👤 [ENHANCED-ORDER] إنشاء عميل جديد...');

        const customerName = this.parseCustomerName(data.customerName);

        customer = await this.safeQuery(() =>
          this.getPrisma().customer.create({
            data: {
              firstName: customerName.firstName,
              lastName: customerName.lastName,
              phone: data.customerPhone || null,
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
          })
        );

        //console.log('✅ [ENHANCED-ORDER] تم إنشاء عميل جديد:', customer.id);
      } else {
        //console.log('👤 [ENHANCED-ORDER] تم العثور على العميل:', customer.id);
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
    if (!fullName || typeof fullName !== 'string') {
      return {
        firstName: 'عميل',
        lastName: 'جديد'
      };
    }

    const nameParts = fullName.trim().split(' ');

    return {
      firstName: nameParts[0] || 'عميل',
      lastName: nameParts.slice(1).join(' ') || 'جديد'
    };
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

    // حساب الضرائب (0% حالياً)
    const tax = parseFloat(data.tax) || 0;

    // حساب الخصم (يدوي + كوبون)
    const manualDiscount = parseFloat(data.manualDiscount) || 0;
    const couponDiscount = parseFloat(data.couponDiscount) || 0;
    const discount = manualDiscount + couponDiscount || parseFloat(data.discount) || 0;

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
    const addrArea = parsedAddress?.area || data.area || '';
    const addrText = parsedAddress?.address || (typeof data.customerAddress === 'string' && !data.customerAddress.trim().startsWith('{') ? data.customerAddress : '') || '';
    const addrPhone = parsedAddress?.phone || data.customerPhone || customer.phone;

    return {
      orderNumber,
      customerId: customer.id,
      conversationId: conversation?.id || null,
      companyId: data.companyId,

      // حالة الطلب
      status: data.status || 'CONFIRMED',
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
      productName: data.productName,
      productColor: data.productColor,
      productSize: data.productSize,
      productPrice: costs.productPrice,

      quantity: data.quantity || 1,
      products: data.products, // ✅ تمرير مصفوفة المنتجات

      // metadata
      metadata: JSON.stringify({
        conversationId: data.conversationId,
        source: data.source,
        requestType: data.requestType || 'delivery',
        returnAmount: data.returnAmount || null,
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
        productName: orderData.productName,
        productColor: orderData.productColor,
        productSize: orderData.productSize,
        productPrice: orderData.productPrice,
        quantity: orderData.quantity,
        products: orderData.products // ✅ تمرير مصفوفة المنتجات
      };

      // ✅ إزالة حقول المنتج من orderData لأنها مش جزء من Order schema
      const { products, productName, productColor, productSize, productPrice, quantity, ...cleanOrderData } = orderData;

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
      await this.createOrderItems(order.id, { ...productData, companyId: orderData.companyId });

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
          } else if (productItem.productName) {
            product = await this.findProductByName(productItem.productName, orderData.companyId);
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
            console.log(`   ℹ️ No variantId provided, will try to extract from product name`);
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

          const itemData = {
            orderId: orderId,
            productId: product?.id || productItem.productId || null,
            variantId: productItem.variantId || null, // ✨ حفظ variantId
            quantity: itemQuantity,
            price: Number.isFinite(itemPrice) ? itemPrice : 0,
            total: productItem.total || ((Number.isFinite(itemPrice) ? itemPrice : 0) * itemQuantity),

            productName: productItem.productName || product?.name || null,
            productColor: extractedColor || null, // ✨ استخدام البيانات المستخرجة
            productSize: extractedSize || null, // ✨ استخدام البيانات المستخرجة
            productImage: productItem.productImage || null,
            productSku: variant?.sku || product?.sku || `MANUAL-${Date.now()}`,
            basePrice: Number.isFinite(basePrice) ? basePrice : null,
            merchantPrice: Number.isFinite(merchantPrice) ? merchantPrice : null,

            extractionSource: 'manual',
            confidence: 1.0,

            metadata: JSON.stringify({
              manualEntry: true,
              catalogMatch: !!product,
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
      if (orderData.productName) {
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

      const itemData = {
        orderId: orderId,
        productId: product?.id || null,
        quantity: quantity,
        price: productPrice,
        total: total,

        // ✅ معلومات المنتج من الاستخراج التلقائي - بدون قيم افتراضية
        productName: orderData.productName || product?.name || null,
        productColor: orderData.productColor || selectedAttributes.Color || null,
        productSize: orderData.productSize || selectedAttributes.Size || null,
        productImage: orderData.productImage || null,
        productSku: product?.sku || `AUTO-${Date.now()}`,
        basePrice: product?.basePrice || product?.price || null,
        merchantPrice: selectedMerchantProduct?.merchantPrice || product?.cost || null,

        extractionSource: 'ai',
        confidence: orderData.confidence || 0.5,

        metadata: JSON.stringify({
          aiExtracted: true,
          originalData: {
            productName: orderData.productName,
            productColor: orderData.productColor,
            productSize: orderData.productSize,
            productAttributes: selectedAttributes,
            productPrice: orderData.productPrice
          },
          catalogMatch: !!product,
          productId: product?.id || null,
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

      // فلاتر إضافية
      if (status && status !== 'all') {
        where.status = status;
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
          const clean = input.replace(/\D/g, '');
          if (!clean) return [];
          const variations = new Set([clean, input]);
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
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      if (sourceType) {
        const normalizedSource = String(sourceType).toLowerCase();
        let sourceCondition = null;

        switch (normalizedSource) {
          case 'manual':
            sourceCondition = {
              OR: [
                { extractionMethod: { startsWith: 'manual' } },
                { extractionMethod: { in: ['manual_order_modal', 'manual_admin'] } },
                { sourceType: 'manual' },
                { createdBy: { not: null } },
                { createdByName: { not: null } },
                { conversationId: 'manual' }
              ]
            };
            break;
          case 'ai_conversation':
            sourceCondition = {
              AND: [
                { sourceType: 'ai_conversation' },
                { NOT: { extractionMethod: { startsWith: 'manual' } } },
                { NOT: { extractionMethod: 'manual_admin' } },
                { NOT: { extractionMethod: 'manual_order_modal' } },
                { NOT: { conversationId: 'manual' } }
              ]
            };
            break;
          case 'storefront':
            sourceCondition = {
              OR: [
                { sourceType: 'storefront' },
                { metadata: { contains: '"source":"storefront"' } },
                { metadata: { contains: 'storefront', mode: 'insensitive' } }
              ]
            };
            break;
          case 'woocommerce':
            sourceCondition = {
              OR: [
                { sourceType: { in: ['woocommerce', 'woocommerce_webhook', 'woo'] } },
                { wooCommerceId: { not: null } },
                { syncedFromWoo: true }
              ]
            };
            break;
          case 'pos':
            sourceCondition = {
              OR: [
                { sourceType: 'pos' },
                { metadata: { contains: 'pos_terminal', mode: 'insensitive' } }
              ]
            };
            break;
          case 'api':
            sourceCondition = {
              OR: [
                { sourceType: { in: ['api', 'public_api'] } },
                { metadata: { contains: '"source":"api"' } },
                { metadata: { contains: 'api', mode: 'insensitive' } }
              ]
            };
            break;
          case 'import':
            sourceCondition = {
              OR: [
                { extractionMethod: 'import' },
                { sourceType: { in: ['import', 'easy-orders', 'internal_import'] } },
                { orderSource: 'INTERNAL_IMPORT' }
              ]
            };
            break;
          case 'unknown':
            sourceCondition = {
              OR: [
                { sourceType: null },
                { sourceType: 'unknown' }
              ]
            };
            break;
          default:
            sourceCondition = { sourceType: normalizedSource };
        }

        if (sourceCondition) {
          if (!where.AND) where.AND = [];
          where.AND.push(sourceCondition);
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

      // ✅ FIX: Use findMany with select id only instead of count() (more reliable)
      // count() fails intermittently with "Response from the Engine was empty"
      let total = 0;
      try {
        // Use findMany with select id only - more reliable than count()
        const allOrderIds = await this.safeQuery(async () => {
          await this.getPrisma().$connect().catch(() => { }); // Ensure connection
          return await this.getPrisma().order.findMany({
            where,
            select: { id: true }, // Only select id for performance
            take: 10000 // Reasonable limit to prevent memory issues
          });
        }, 3);

        total = allOrderIds.length;
      } catch (error) {
        // Fallback: use orders.length (at least we have the current page)
        console.error('❌ [ENHANCED-ORDER] Count query failed, using orders.length as fallback:', error.message);
        total = orders.length;
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
  async getOrderStats(companyId, dateFrom, dateTo) {
    try {
      const where = {
        companyId: companyId
      };

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = new Date(dateFrom);
        if (dateTo) where.createdAt.lte = new Date(dateTo);
      }

      const [
        totalOrders,
        totalRevenue,
        avgConfidence,
        extractionMethods,
        statusDistribution,
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

        // توزيع الحالات
        this.getPrisma().order.groupBy({
          by: ['status'],
          where,
          _count: true
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
  async getConversationCompletionStats(companyId, dateFrom, dateTo) {
    try {
      const where = {
        companyId: companyId,
        status: 'RESOLVED'
      };

      if (dateFrom || dateTo) {
        where.updatedAt = {};
        if (dateFrom) where.updatedAt.gte = new Date(dateFrom);
        if (dateTo) where.updatedAt.lte = new Date(dateTo);
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
          where: whereClause,
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
            paymentStatus: true,
            paymentMethod: true,
            currency: true,
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
      paymentStatus: order.paymentStatus?.toLowerCase() || 'pending',
      paymentMethod: order.paymentMethod?.toLowerCase() || 'cash_on_delivery',
      shippingAddress: order.shippingAddress ? JSON.parse(order.shippingAddress) : {},
      items: (order.orderItems || []).map(item => ({
        id: item.id,
        productId: item.productId || 'ai-generated',
        name: item.productName,
        price: parseFloat(item.price) || 0,
        quantity: item.quantity || 1,
        total: parseFloat(item.total) || 0,
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
      metadata: order.metadata ? JSON.parse(order.metadata) : {},
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



