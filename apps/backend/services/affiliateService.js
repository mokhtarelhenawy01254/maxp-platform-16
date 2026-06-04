const { getSharedPrismaClient } = require('./sharedDatabase');
const { isProductVisibleToAffiliate } = require('../utils/affiliateProductVisibility');

const VALID_COMMISSION_TYPES = new Set(['PERCENTAGE', 'MARKUP']);
const VALID_AFFILIATE_STATUSES = new Set(['PENDING', 'ACTIVE', 'SUSPENDED']);
const AFFILIATE_ORDER_TICKET_REASONS = {
  CANCEL_ORDER: {
    label: 'طلب إلغاء من العميل',
    priority: 'HIGH',
    category: 'INQUIRY',
  },
  CHANGE_ADDRESS: {
    label: 'تعديل بيانات الشحن',
    priority: 'MEDIUM',
    category: 'INQUIRY',
  },
  SHIPPING_DELAY: {
    label: 'متابعة الشحن أو التأخير',
    priority: 'MEDIUM',
    category: 'INQUIRY',
  },
  CUSTOMER_NOTE: {
    label: 'ملاحظة من العميل',
    priority: 'MEDIUM',
    category: 'INQUIRY',
  },
  OTHER: {
    label: 'طلب متابعة على الأوردر',
    priority: 'MEDIUM',
    category: 'OTHER',
  },
};
const VALID_DOCUMENT_REVIEW_STATUSES = new Set([
  'NOT_SUBMITTED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
]);

const validateNonNegativeNumber = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} غير صالح`);
  }
  return parsed;
};

const validatePositiveAmount = (value, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000000) {
    throw new Error(`${label} غير صالح`);
  }
  return parsed;
};

const validateMinPayout = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000000) {
    throw new Error('الحد الأدنى للسحب غير صالح');
  }
  return parsed;
};
const crypto = require('crypto');

class AffiliateService {
  /**
   * الحصول على Prisma client
   */
  get prisma() {
    return getSharedPrismaClient();
  }

  normalizePaymentMethod(paymentMethod) {
    if (!paymentMethod) {
      return null;
    }

    const normalized = String(paymentMethod).trim().toUpperCase();

    if (['TRANSFERS', 'BANK_TRANSFER'].includes(normalized)) {
      return 'TRANSFERS';
    }

    if (
      ['WALLET', 'VODAFONE_CASH', 'ORANGE_CASH', 'INSTAPAY'].includes(
        normalized,
      )
    ) {
      return 'WALLET';
    }

    if (normalized === 'CASH') {
      return 'CASH';
    }

    return normalized;
  }

  normalizeOrderTicketReason(reason) {
    const normalized = String(reason || 'OTHER').trim().toUpperCase();
    return AFFILIATE_ORDER_TICKET_REASONS[normalized]
      ? normalized
      : 'OTHER';
  }

  generateSupportTicketId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `TKT-${timestamp}-${random}`;
  }

  formatAffiliateSupportTicket(ticket) {
    if (!ticket) return ticket;

    return {
      id: ticket.id,
      ticketId: ticket.ticketId,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      orderId: ticket.orderId || null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      closedAt: ticket.closedAt,
    };
  }

  formatAffiliateOrderNoteTicket(note) {
    if (!note) return note;

    const content = String(note.content || '');
    const ticketMatch = content.match(/Ticket:\s*([A-Z0-9-]+)/);
    const firstLine = content.split('\n')[0] || 'تيكت أفليت';

    return this.formatAffiliateSupportTicket({
      id: note.id,
      ticketId: ticketMatch?.[1] || note.id,
      subject: firstLine.replace(/^تيكت أفليت\s*/, '').trim() || 'تيكت أفليت',
      description: content,
      category: 'AFFILIATE_ORDER_REQUEST',
      status: 'OPEN',
      priority: 'NORMAL',
      orderId: note.orderId || null,
      createdAt: note.createdAt,
      updatedAt: note.createdAt,
      closedAt: null,
    });
  }

  getDocumentReviewTitle(status) {
    switch (status) {
      case 'APPROVED':
        return 'تم اعتماد مستند المسوق';
      case 'REJECTED':
        return 'تم رفض مستند المسوق';
      case 'PENDING_REVIEW':
        return 'تمت إعادة المستند إلى المراجعة';
      default:
        return 'تم تحديث حالة مستند المسوق';
    }
  }

  async createAffiliateReviewLog(data = {}) {
    const prisma = this.prisma;
    if (!prisma.affiliateReviewLog?.create || !data.affiliateId) {
      return null;
    }

    return prisma.affiliateReviewLog.create({
      data: {
        affiliateId: data.affiliateId,
        companyId: data.companyId || null,
        actorUserId: data.actorUserId || null,
        eventType: data.eventType || 'STATUS_CHANGED',
        title: data.title || 'تم تحديث حالة المسوق',
        note: data.note || null,
        previousStatus: data.previousStatus || null,
        nextStatus: data.nextStatus || null,
        previousDocumentStatus: data.previousDocumentStatus || null,
        nextDocumentStatus: data.nextDocumentStatus || null,
      },
    });
  }

  async createAffiliateIdentityDocumentVersion(data = {}) {
    const prisma = this.prisma;
    if (
      !prisma.affiliateIdentityDocumentVersion?.create ||
      !data.affiliateId ||
      !data.fileUrl
    ) {
      return null;
    }

    return prisma.affiliateIdentityDocumentVersion.create({
      data: {
        affiliateId: data.affiliateId,
        fileUrl: data.fileUrl,
        uploadedAt: data.uploadedAt || new Date(),
        uploadedByUserId: data.uploadedByUserId || null,
        source: data.source || 'REGISTRATION',
        isCurrent: Boolean(data.isCurrent),
        replacedAt: data.replacedAt || null,
      },
    });
  }

  /**
   * تسجيل مسوق جديد
   */
  async registerAffiliate(userId, data = {}) {
    try {
      const prisma = this.prisma;
      const {
        companyId,
        commissionType = 'PERCENTAGE',
        commissionRate = 5.0,
        paymentMethod,
        paymentDetails,
        minPayout = 100.0,
        status = 'ACTIVE',
        canCreateOrdersForOthers = true,
        canViewCustomerData = true,
        identityDocumentUrl = null,
        identityDocumentUploadedAt = null,
      } = data;

      const normalizedCommissionType = String(commissionType || 'PERCENTAGE').toUpperCase();
      if (!VALID_COMMISSION_TYPES.has(normalizedCommissionType)) {
        throw new Error('نوع العمولة غير صالح');
      }

      const normalizedStatus = String(status || 'ACTIVE').toUpperCase();
      if (!VALID_AFFILIATE_STATUSES.has(normalizedStatus)) {
        throw new Error('حالة المسوق غير صالحة');
      }

      const parsedCommissionRate = validateNonNegativeNumber(
        commissionRate,
        'قيمة العمولة',
      );
      if (normalizedCommissionType === 'PERCENTAGE' && parsedCommissionRate > 100) {
        throw new Error('نسبة العمولة لا يمكن أن تتجاوز 100%');
      }
      if (normalizedCommissionType === 'MARKUP' && parsedCommissionRate > 1000000) {
        throw new Error('قيمة هامش الربح أكبر من الحد المسموح');
      }

      const parsedMinPayout = validateMinPayout(minPayout);

      // التحقق من أن المستخدم غير مسجل كمسوق
      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { userId }
      });

      if (existingAffiliate) {
        throw new Error('المستخدم مسجل بالفعل كمسوق');
      }

      // إنشاء كود فريد للمسوق
      const affiliateCode = await this.generateAffiliateCode();

      // إنشاء المسوق
      const affiliate = await prisma.affiliate.create({
        data: {
          userId,
          companyId,
          affiliateCode,
          commissionType: normalizedCommissionType,
          commissionRate: parsedCommissionRate,
          paymentMethod: this.normalizePaymentMethod(paymentMethod),
          paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
          minPayout: parsedMinPayout,
          canCreateOrdersForOthers: Boolean(canCreateOrdersForOthers),
          canViewCustomerData: Boolean(canViewCustomerData),
          identityDocumentUrl:
            typeof identityDocumentUrl === 'string' && identityDocumentUrl.trim()
              ? identityDocumentUrl.trim()
              : null,
          identityDocumentUploadedAt:
            identityDocumentUrl
              ? identityDocumentUploadedAt || new Date()
              : null,
          identityDocumentStatus: identityDocumentUrl
            ? 'PENDING_REVIEW'
            : 'NOT_SUBMITTED',
          status: normalizedStatus
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      if (affiliate.identityDocumentStatus === 'PENDING_REVIEW') {
        await this.createAffiliateIdentityDocumentVersion({
          affiliateId: affiliate.id,
          fileUrl: affiliate.identityDocumentUrl,
          uploadedAt: affiliate.identityDocumentUploadedAt || new Date(),
          uploadedByUserId: userId,
          source: 'REGISTRATION',
          isCurrent: true,
        });
      }

      if (affiliate.companyId) {
        await this.createAffiliateReviewLog({
          affiliateId: affiliate.id,
          companyId: affiliate.companyId,
          actorUserId: userId,
          eventType: 'REGISTRATION_SUBMITTED',
          title: 'تم إنشاء طلب مسوق جديد',
          note:
            normalizedStatus === 'ACTIVE'
              ? 'تم إنشاء المسوق بحالة نشطة'
              : 'تم إنشاء المسوق بانتظار مراجعة الإدارة',
          nextStatus: normalizedStatus,
          nextDocumentStatus: affiliate.identityDocumentStatus,
        });

        if (affiliate.identityDocumentStatus === 'PENDING_REVIEW') {
          await this.createAffiliateReviewLog({
            affiliateId: affiliate.id,
            companyId: affiliate.companyId,
            actorUserId: userId,
            eventType: 'DOCUMENT_UPLOADED',
            title: 'تم رفع مستند الاعتماد',
            nextDocumentStatus: 'PENDING_REVIEW',
          });
        }
      }

      console.log('✅ [AFFILIATE] Registered new affiliate:', affiliateCode);
      return affiliate;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error registering affiliate:', error);
      throw error;
    }
  }

  /**
   * إنشاء كود فريد للمسوق
   */
  async generateAffiliateCode() {
    const prisma = this.prisma;
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      // إنشاء كود من 8 أحرف عشوائية
      code = crypto.randomBytes(4).toString('hex').toUpperCase();

      const existing = await prisma.affiliate.findUnique({
        where: { affiliateCode: code }
      });

      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('فشل في إنشاء كود فريد للمسوق');
    }

    return code;
  }

  /**
   * تتبع إحالة
   */
  async trackReferral(affiliateCode, customerId, metadata = {}) {
    try {
      const prisma = this.prisma;
      const companyId = metadata.companyId || metadata.companyID || null;
      // البحث عن المسوق
      const affiliate = await prisma.affiliate.findFirst({
        where: {
          affiliateCode,
          status: 'ACTIVE',
          ...(companyId ? { companyId } : {})
        }
      });

      if (!affiliate) {
        throw new Error('كود المسوق غير صحيح أو غير نشط');
      }

      // التحقق من وجود إحالة مؤخرة من نفس العميل/IP لمنع تكرار حساب النقرات
      // (Cooldown: 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentReferral = await prisma.affiliateReferral.findFirst({
        where: {
          affiliateId: affiliate.id,
          OR: [
            customerId ? { customerId } : undefined,
            metadata.ipAddress ? { ipAddress: metadata.ipAddress } : undefined
          ].filter(Boolean),
          createdAt: { gte: oneHourAgo }
        }
      });

      if (recentReferral) {
        // إذا وجد سجل حديث، نكتفي بإرجاعه دون زيادة عدد النقرات
        return recentReferral;
      }

      // إنشاء سجل إحالة
      const referral = await prisma.affiliateReferral.create({
        data: {
          affiliateId: affiliate.id,
          customerId,
          referralCode: affiliateCode,
          referralUrl: metadata.url,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          source: metadata.source
        }
      });

      // تحديث عدد النقرات
      await prisma.affiliate.update({
        where: { id: affiliate.id },
        data: {
          totalClicks: {
            increment: 1
          }
        }
      });

      console.log('✅ [AFFILIATE] Tracked referral:', referral.id);
      return referral;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error tracking referral:', error);
      throw error;
    }
  }

  /**
   * حساب عمولة المسوق
   */
  async calculateCommission(orderId, affiliateId) {
    try {
      const prisma = this.prisma;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          affiliate: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });

      if (!order || !order.affiliateId || order.affiliateId !== affiliateId) {
        throw new Error('الطلب غير مرتبط بهذا المسوق');
      }

      const affiliate = order.affiliate;
      let commissionAmount = 0;

      if (affiliate.commissionType === 'PERCENTAGE') {
        // الطريقة الأولى: نسبة مئوية
        commissionAmount = Number(order.total) * (affiliate.commissionRate / 100);
      } else if (affiliate.commissionType === 'MARKUP') {
        // الطريقة الثانية: هامش ربح
        // حساب الهامش بناءً على (سعر البيع - السعر الأساسي)
        let totalMarkup = 0;
        for (const item of order.orderItems) {
          const affiliateProduct = await prisma.affiliateProduct.findUnique({
            where: {
              affiliateId_productId: {
                affiliateId: affiliate.id,
                productId: item.productId
              }
            }
          });

          if (affiliateProduct) {
            // Commission = (Selling Price - Base Price) * Quantity
            // This allows dynamic markup (if affiliate increased/decreased price)
            const sellingPrice = Number(item.price);
            const basePrice = Number(affiliateProduct.basePrice);
            const commissionPerItem = sellingPrice - basePrice;

            // Ensure commission is calculated correctly even if price changed
            totalMarkup += commissionPerItem * item.quantity;
          }
        }
        commissionAmount = totalMarkup;
      }


      return {
        amount: commissionAmount,
        type: affiliate.commissionType,
        rate: affiliate.commissionRate
      };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error calculating commission:', error);
      throw error;
    }
  }

  /**
   * تحديث إحصائيات المسوق
   */
  async updateAffiliateStats(affiliateId) {
    try {
      const prisma = this.prisma;

      // 1. حساب إحصائيات المبيعات (عدد الطلبات المرتبطة بالمسوق)
      const totalSales = await prisma.order.count({
        where: {
          affiliateId,
          status: {
            notIn: ['CANCELLED', 'REFUNDED', 'RETURNED', 'PARTIALLY_REFUNDED'],
          },
        }
      });

      // 2. حساب العمولات (الإجمالي، المدفوع، والقابل للسحب)
      const commissionStats = await prisma.commission.aggregate({
        where: {
          affiliateId,
          status: { in: ['CONFIRMED', 'PAID'] }
        },
        _sum: {
          amount: true
        }
      });

      const paidStats = await prisma.commission.aggregate({
        where: {
          affiliateId,
          status: 'PAID'
        },
        _sum: {
          amount: true
        }
      });

      const availableStats = await prisma.commission.aggregate({
        where: {
          affiliateId,
          status: 'CONFIRMED',
          payoutId: null
        },
        _sum: {
          amount: true
        }
      });

      const totalEarnings = Number(commissionStats._sum.amount || 0);
      const paidEarnings = Number(paidStats._sum.amount || 0);
      const pendingEarnings = Number(
        Number(availableStats._sum.amount || 0).toFixed(2)
      );

      // 3. حساب نسبة التحويل
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: { totalClicks: true }
      });

      const conversionRate = (affiliate && affiliate.totalClicks > 0)
        ? Number(((totalSales / affiliate.totalClicks) * 100).toFixed(2))
        : 0;

      // 4. تحديث سجل المسوق
      await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          totalSales,
          totalEarnings,
          paidEarnings,
          pendingEarnings,
          conversionRate
        }
      });

      console.log('✅ [AFFILIATE] Updated stats for affiliate (Optimized):', affiliateId);
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating stats:', error);
      throw error;
    }
  }

  /**
   * إنشاء منتج مسوق (للطريقة الثانية)
   */
  async createAffiliateProduct(affiliateId, productId, markup) {
    try {
      const prisma = this.prisma;
      const parsedMarkup = validateNonNegativeNumber(markup, 'هامش الربح');
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: {
          id: true,
          companyId: true
        }
      });

      if (!affiliate?.companyId) {
        throw new Error('المسوق غير مرتبط بشركة صالحة');
      }

      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId: affiliate.companyId
        }
      });

      if (!product) {
        throw new Error('المنتج غير موجود');
      }

      if (!isProductVisibleToAffiliate(product, affiliate.id)) {
        throw new Error('هذا المنتج غير متاح لهذا المسوق');
      }

      if (!product.allowAffiliateMarkup) {
        throw new Error('هذا المنتج لا يسمح بإضافة هامش ربح');
      }

      const basePrice = product.basePrice || product.price;
      const finalPrice = Number(basePrice) + parsedMarkup;

      const affiliateProduct = await prisma.affiliateProduct.upsert({
        where: {
          affiliateId_productId: {
            affiliateId,
            productId
          }
        },
        update: {
          markup: parsedMarkup,
          finalPrice,
          isActive: true
        },
        create: {
          affiliateId,
          productId,
          basePrice,
          markup: parsedMarkup,
          finalPrice
        }
      });

      console.log('✅ [AFFILIATE] Created/updated affiliate product');
      return affiliateProduct;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error creating affiliate product:', error);
      throw error;
    }
  }

  /**
   * الحصول على سعر المنتج للمسوق
   */
  async getAffiliateProductPrice(affiliateId, productId) {
    try {
      const prisma = this.prisma;
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: {
          id: true,
          companyId: true,
          commissionType: true
        }
      });

      if (!affiliate?.companyId) {
        throw new Error('المسوق غير موجود');
      }

      if (affiliate.commissionType === 'PERCENTAGE') {
        // الطريقة الأولى: إرجاع السعر العادي
        const product = await prisma.product.findFirst({
          where: {
            id: productId,
            companyId: affiliate.companyId
          }
        });

        if (!product) {
          throw new Error('المنتج غير موجود ضمن شركة المسوق');
        }

        if (!isProductVisibleToAffiliate(product, affiliate.id)) {
          throw new Error('هذا المنتج غير متاح لهذا المسوق');
        }

        return {
          price: product.price,
          type: 'PERCENTAGE'
        };
      } else {
        // الطريقة الثانية: إرجاع السعر مع الهامش
        const affiliateProduct = await prisma.affiliateProduct.findFirst({
          where: {
            affiliateId,
            productId,
            products: {
              companyId: affiliate.companyId
            }
          }
        });

        if (affiliateProduct && affiliateProduct.isActive) {
          return {
            price: affiliateProduct.finalPrice,
            basePrice: affiliateProduct.basePrice,
            markup: affiliateProduct.markup,
            type: 'MARKUP'
          };
        }

        // إذا لم يكن هناك منتج مسوق، إرجاع السعر العادي
        const product = await prisma.product.findFirst({
          where: {
            id: productId,
            companyId: affiliate.companyId
          }
        });

        if (!product) {
          throw new Error('المنتج غير موجود ضمن شركة المسوق');
        }

        if (!isProductVisibleToAffiliate(product, affiliate.id)) {
          throw new Error('هذا المنتج غير متاح لهذا المسوق');
        }

        return {
          price: product.price,
          type: 'MARKUP',
          needsSetup: true
        };
      }
    } catch (error) {
      console.error('❌ [AFFILIATE] Error getting product price:', error);
      throw error;
    }
  }

  /**
   * إنشاء طلب مباشر من المسوق
   */
  async createAffiliateOrder(affiliateId, orderData, customerData = null) {
    try {
      const prisma = this.prisma;
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId }
      });

      if (!affiliate || affiliate.status !== 'ACTIVE') {
        throw new Error('المسوق غير موجود أو غير نشط');
      }

      // إذا كان هناك بيانات عميل، إنشاء أو البحث عن العميل
      let customerId = orderData.customerId;
      if (customerData && !customerId) {
        // البحث عن عميل موجود أو إنشاء جديد
        const customer = await prisma.customer.upsert({
          where: {
            whatsappId_companyId: {
              whatsappId: customerData.phone,
              companyId: affiliate.companyId
            }
          },
          update: {},
          create: {
            firstName: customerData.firstName || 'عميل',
            lastName: customerData.lastName || '',
            phone: customerData.phone,
            whatsappId: customerData.phone,
            companyId: affiliate.companyId,
            status: 'ACTIVE'
          }
        });
        customerId = customer.id;
      }

      // إنشاء الطلب (سيتم ربطه بالمسوق تلقائياً في orderService)
      return {
        affiliateId,
        customerId,
        orderSource: 'AFFILIATE_DIRECT',
        ...orderData
      };
    } catch (error) {
      console.error('❌ [AFFILIATE] Error creating affiliate order:', error);
      throw error;
    }
  }

  /**
   * الحصول على طلبات المسوق
   */
  async getAffiliateOrders(affiliateId, filters = {}) {
    try {
      const prisma = this.prisma;
      const {
        status,
        orderSource,
        limit = 50,
        offset = 0,
        includeCustomerData = true,
      } = filters;

      const where = {
        affiliateId
      };

      if (status) {
        where.status = status;
      }

      if (orderSource) {
        where.orderSource = orderSource;
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          ...(includeCustomerData
            ? {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true
                  }
                },
              }
            : {}),
          commissions: {
            where: {
              affiliateId,
              type: 'AFFILIATE'
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return orders.map((order) =>
        includeCustomerData ? order : this.redactAffiliateOrderCustomerData(order),
      );
    } catch (error) {
      console.error('❌ [AFFILIATE] Error getting affiliate orders:', error);
      throw error;
    }
  }

  /**
   * Hide customer/contact fields when the affiliate policy disables customer visibility.
   */
  redactAffiliateOrderCustomerData(order) {
    if (!order) return order;

    return {
      ...order,
      customer: undefined,
      customerName: null,
      customerPhone: null,
      customerEmail: null,
      customerAddress: null,
      shippingAddress: null,
      billingAddress: null,
      city: null,
      governorate: null,
    };
  }

  sanitizeAffiliateOrderOperationalData(order) {
    if (!order) return order;

    return {
      ...order,
      shipments: Array.isArray(order.shipments)
        ? order.shipments.map((shipment) => ({
            id: shipment.id,
            status: shipment.status,
            destinationGovernorate: shipment.destinationGovernorate || null,
            destinationCity: shipment.destinationCity || null,
            createdAt: shipment.createdAt,
            handlerLabel: 'الشركة',
          }))
        : [],
      merchantOrders: Array.isArray(order.merchantOrders)
        ? order.merchantOrders.map((merchantOrder) => ({
            id: merchantOrder.id,
            status: merchantOrder.status,
            fulfillmentSource: merchantOrder.fulfillmentSource || null,
            createdAt: merchantOrder.createdAt,
            handlerLabel: 'الشركة',
          }))
        : [],
      supportTickets: Array.isArray(order.supportTickets)
        ? order.supportTickets.map((ticket) =>
            this.formatAffiliateSupportTicket(ticket),
          )
        : [],
    };
  }

  /**
   * Load one order only when it belongs to the current affiliate.
   */
  async getAffiliateOrderById(affiliateId, orderId, options = {}) {
    try {
      const prisma = this.prisma;
      const includeCustomerData = options.includeCustomerData !== false;

      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          affiliateId,
        },
        include: {
          ...(includeCustomerData
            ? {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    email: true
                  }
                },
              }
            : {}),
          commissions: {
            where: {
              affiliateId,
              type: 'AFFILIATE'
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  price: true,
                  mainImage: true
                }
              },
              productVariant: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  sku: true
                }
              }
            }
          },
          shipments: {
            select: {
              id: true,
              status: true,
              destinationGovernorate: true,
              destinationCity: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          },
          merchantOrders: {
            select: {
              id: true,
              status: true,
              fulfillmentSource: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      const supportTickets = order
        ? await prisma.orderNote
            .findMany({
              where: {
                orderId: order.id,
                content: {
                  contains: 'تيكت أفليت',
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            })
            .then((notes) =>
              notes.map((note) => this.formatAffiliateOrderNoteTicket(note)),
            )
        : [];

      const sanitizedOrder = order
        ? this.sanitizeAffiliateOrderOperationalData({
            ...order,
            supportTickets,
          })
        : null;

      return includeCustomerData
        ? sanitizedOrder
        : this.redactAffiliateOrderCustomerData(sanitizedOrder);
    } catch (error) {
      console.error('Error getting affiliate order details:', error);
      throw error;
    }
  }

  /**
   * List support tickets linked to an affiliate-owned order.
   */
  async getAffiliateOrderTickets(affiliateId, orderId) {
    try {
      const prisma = this.prisma;
      const order = await prisma.order.findFirst({
        where: { id: orderId, affiliateId },
        select: { id: true },
      });

      if (!order) {
        return null;
      }

      const ticketNotes = await prisma.orderNote.findMany({
        where: {
          orderId: order.id,
          content: {
            contains: 'تيكت أفليت',
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ticketNotes.map((note) => this.formatAffiliateOrderNoteTicket(note));
    } catch (error) {
      console.error('Error getting affiliate order tickets:', error);
      throw error;
    }
  }

  /**
   * Create a support ticket from the affiliate order screen and mirror it as an order note.
   */
  async createAffiliateOrderTicket(affiliateId, user, orderId, data = {}) {
    try {
      const prisma = this.prisma;
      const reason = this.normalizeOrderTicketReason(data.reason || data.type);
      const reasonConfig = AFFILIATE_ORDER_TICKET_REASONS[reason];
      const content = String(data.message || data.content || data.description || '').trim();

      if (content.length < 5) {
        const error = new Error('يجب كتابة تفاصيل التيكت قبل الإرسال');
        error.statusCode = 400;
        throw error;
      }

      const order = await prisma.order.findFirst({
        where: { id: orderId, affiliateId },
        select: {
          id: true,
          orderNumber: true,
          companyId: true,
        },
      });

      if (!order) {
        return null;
      }

      const authorName = [user?.firstName, user?.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || user?.email || 'Affiliate';
      const subject = `${reasonConfig.label} - ${order.orderNumber}`;
      const noteContent = [
        `تيكت أفليت ${subject}`,
        `رقم الأوردر: ${order.orderNumber}`,
        `المسوق: ${authorName}`,
        '',
        content,
      ].join('\n');

      const ticketId = this.generateSupportTicketId();
      const result = await prisma.$transaction(async (tx) => {
        const orderNote = await tx.orderNote.create({
          data: {
            content: `${noteContent}\n\nTicket: ${ticketId}`,
            orderId: order.id,
            authorId: user.id,
            authorName,
          },
        });

        return { orderNote };
      });

      return {
        ticket: this.formatAffiliateSupportTicket({
          id: result.orderNote.id,
          ticketId,
          subject,
          description: content,
          category: reasonConfig.category,
          status: 'OPEN',
          priority: reasonConfig.priority,
          orderId: order.id,
          createdAt: result.orderNote.createdAt,
          updatedAt: result.orderNote.createdAt,
          closedAt: null,
        }),
        orderNote: result.orderNote,
      };
    } catch (error) {
      console.error('Error creating affiliate order ticket:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة العملاء المرتبطين بالمسوق
   */
  async getAffiliateCustomers(affiliateId) {
    try {
      const prisma = this.prisma;

      // جلب العملاء مع تجميع إحصائياتهم مباشرة من الـ orders
      const customerStats = await prisma.order.groupBy({
        by: ['customerId'],
        where: { affiliateId },
        _count: {
          id: true
        },
        _sum: {
          total: true
        }
      });

      if (customerStats.length === 0) return [];

      // جلب بيانات العملاء لهؤلاء المعرفات
      const customerIds = customerStats.map(stat => stat.customerId);
      const customers = await prisma.customer.findMany({
        where: {
          id: { in: customerIds }
        }
      });

      // دمج البيانات
      return customers.map(customer => {
        const stats = customerStats.find(s => s.customerId === customer.id);
        return {
          ...customer,
          totalOrders: stats?._count?.id || 0,
          totalSpent: Number(Number(stats?._sum?.total || 0).toFixed(2))
        };
      });
    } catch (error) {
      console.error('❌ [AFFILIATE] Error getting affiliate customers:', error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة جميع المسوقين (للإدارة)
   */
  async listAffiliates(companyId) {
    try {
      const prisma = this.prisma;

      // 1. Get all users with AFFILIATE role in this company from UserCompany table
      const userCompanies = await prisma.userCompany.findMany({
        where: {
          companyId,
          role: 'AFFILIATE'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });

      // 2. Get existing affiliate records for this company
      const affiliates = await prisma.affiliate.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });

      // 3. Merge and identify missing records
      const affiliateMap = new Map(affiliates.map(a => [a.userId, a]));
      const results = [];

      for (const uc of userCompanies) {
        let affiliate = affiliateMap.get(uc.userId);

        if (!affiliate) {
          // ⚠️ Missing affiliate record! We'll return a mock and log it
          // In a real scenario, we might want to auto-create it here or flag it
          console.warn(`⚠️ [AFFILIATE] Missing affiliate record for user ${uc.user.email} in company ${companyId}`);
          affiliate = {
            id: `temp_${uc.userId}`,
            userId: uc.userId,
            companyId,
            affiliateCode: 'PENDING',
            status: uc.isActive ? 'ACTIVE' : 'PENDING',
            commissionRate: 5.0,
            totalEarnings: 0,
            paidEarnings: 0,
            pendingEarnings: 0,
            totalSales: 0,
          totalClicks: 0,
          minPayout: 100.0,
          canCreateOrdersForOthers: true,
          canViewCustomerData: true,
          identityDocumentUrl: null,
          identityDocumentUploadedAt: null,
          identityDocumentStatus: 'NOT_SUBMITTED',
          identityDocumentReviewNote: null,
          identityDocumentReviewedAt: null,
          statusReason: null,
          reviewedAt: null,
          reviewedBy: null,
          createdAt: uc.createdAt,
          isMissingRecord: true // Flag for UI if needed
        };
        }

        results.push({
          ...affiliate,
          user: uc.user,
          isActive: affiliate.status === 'ACTIVE' || (affiliate.isMissingRecord && uc.isActive)
        });
      }

      return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('❌ [AFFILIATE] Error listing affiliates:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة المسوق
   */
  async updateAffiliateStatus(affiliateId, statusOrActive, options = {}) {
    try {
      const prisma = this.prisma;
      let newStatus;

      // تحديد الحالة الجديدة بناءً على المدخلات
      if (typeof statusOrActive === 'string') {
        newStatus = statusOrActive.toUpperCase();
      } else {
        newStatus = statusOrActive ? 'ACTIVE' : 'SUSPENDED';
      }

      if (!VALID_AFFILIATE_STATUSES.has(newStatus)) {
        throw new Error('حالة المسوق غير صالحة');
      }

      const normalizedReason =
        typeof options.statusReason === 'string'
          ? options.statusReason.trim()
          : '';

      if (newStatus === 'SUSPENDED' && !normalizedReason) {
        throw new Error('يجب إدخال سبب إيقاف أو رفض المسوق');
      }

      const existingAffiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: {
          id: true,
          companyId: true,
          status: true,
          identityDocumentStatus: true,
        },
      });

      if (!existingAffiliate) {
        throw new Error('المسوق غير موجود');
      }

      const updatedAffiliate = await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          status: newStatus,
          statusReason: normalizedReason || null,
          reviewedAt: new Date(),
          reviewedBy: options.reviewedBy || null,
        }
      });

      await this.createAffiliateReviewLog({
        affiliateId,
        companyId: existingAffiliate.companyId,
        actorUserId: options.reviewedBy || null,
        eventType: 'STATUS_CHANGED',
        title:
          newStatus === 'ACTIVE'
            ? 'تم تفعيل المسوق'
            : newStatus === 'SUSPENDED'
              ? 'تم إيقاف أو رفض المسوق'
              : 'تمت إعادة المسوق إلى المراجعة',
        note: normalizedReason || null,
        previousStatus: existingAffiliate.status,
        nextStatus: newStatus,
        previousDocumentStatus: existingAffiliate.identityDocumentStatus,
        nextDocumentStatus: existingAffiliate.identityDocumentStatus,
      });

      return updatedAffiliate;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating affiliate status:', error);
      throw error;
    }
  }

  async updateAffiliateDocumentReview(affiliateId, options = {}) {
    try {
      const prisma = this.prisma;
      const nextStatus = String(options.status || '').trim().toUpperCase();
      const normalizedNote =
        typeof options.reviewNote === 'string' ? options.reviewNote.trim() : '';

      if (!VALID_DOCUMENT_REVIEW_STATUSES.has(nextStatus)) {
        throw new Error('حالة مستند الاعتماد غير صالحة');
      }

      if (nextStatus === 'REJECTED' && !normalizedNote) {
        throw new Error('يجب إدخال سبب رفض مستند الاعتماد');
      }

      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: {
          id: true,
          companyId: true,
          identityDocumentUrl: true,
          identityDocumentStatus: true,
        },
      });

      if (!affiliate) {
        throw new Error('المسوق غير موجود');
      }

      if (!affiliate.identityDocumentUrl) {
        throw new Error('لا يوجد مستند اعتماد مرفوع لهذا المسوق');
      }

      const updatedAffiliate = await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          identityDocumentStatus: nextStatus,
          identityDocumentReviewNote: normalizedNote || null,
          identityDocumentReviewedAt: new Date(),
        },
      });

      await this.createAffiliateReviewLog({
        affiliateId,
        companyId: affiliate.companyId,
        actorUserId: options.reviewedBy || null,
        eventType: 'DOCUMENT_REVIEWED',
        title: this.getDocumentReviewTitle(nextStatus),
        note: normalizedNote || null,
        previousDocumentStatus: affiliate.identityDocumentStatus,
        nextDocumentStatus: nextStatus,
      });

      return updatedAffiliate;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating affiliate document review:', error);
      throw error;
    }
  }

  async getAffiliateReviewHistory(affiliateId, options = {}) {
    try {
      const prisma = this.prisma;
      const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 50);

      const reviewLogs = prisma.affiliateReviewLog?.findMany
        ? await prisma.affiliateReviewLog.findMany({
            where: { affiliateId },
            orderBy: { createdAt: 'desc' },
            take: limit,
          })
        : [];

      const actorIds = [
        ...new Set(
          reviewLogs
            .map((log) => log.actorUserId)
            .filter(Boolean),
        ),
      ];

      let actorMap = new Map();
      if (actorIds.length > 0 && prisma.user?.findMany) {
        const actors = await prisma.user.findMany({
          where: {
            id: { in: actorIds },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        });
        actorMap = new Map(
          actors.map((actor) => [
            actor.id,
            {
              id: actor.id,
              name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
              email: actor.email,
            },
          ]),
        );
      }

      return reviewLogs.map((log) => ({
        ...log,
        actor: log.actorUserId ? actorMap.get(log.actorUserId) || null : null,
      }));
    } catch (error) {
      if (
        error?.code === 'P2021' ||
        /does not exist|table .* not found/i.test(error?.message || '')
      ) {
        console.warn(
          '⚠️ [AFFILIATE] affiliate_review_logs table is unavailable; returning empty review history',
        );
        return [];
      }
      console.error('❌ [AFFILIATE] Error getting affiliate review history:', error);
      throw error;
    }
  }

  async replaceAffiliateIdentityDocument(affiliateId, options = {}) {
    try {
      const prisma = this.prisma;
      const nextFileUrl =
        typeof options.fileUrl === 'string' ? options.fileUrl.trim() : '';

      if (!nextFileUrl) {
        throw new Error('رابط مستند الاعتماد الجديد غير صالح');
      }

      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: {
          id: true,
          companyId: true,
          status: true,
          statusReason: true,
          identityDocumentUrl: true,
          identityDocumentStatus: true,
        },
      });

      if (!affiliate) {
        throw new Error('المسوق غير موجود');
      }

      if (
        affiliate.identityDocumentStatus === 'APPROVED' &&
        !options.allowApprovedReplacement
      ) {
        throw new Error('لا يمكن استبدال مستند معتمد بدون مراجعة إدارية جديدة');
      }

      const uploadedAt = options.uploadedAt || new Date();
      const shouldReopenAffiliateReview =
        affiliate.identityDocumentStatus === 'REJECTED' &&
        affiliate.status !== 'ACTIVE';

      if (prisma.affiliateIdentityDocumentVersion?.updateMany) {
        await prisma.affiliateIdentityDocumentVersion.updateMany({
          where: {
            affiliateId,
            isCurrent: true,
          },
          data: {
            isCurrent: false,
            replacedAt: uploadedAt,
          },
        });
      }

      const updatedAffiliate = await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          identityDocumentUrl: nextFileUrl,
          identityDocumentUploadedAt: uploadedAt,
          identityDocumentStatus: 'PENDING_REVIEW',
          identityDocumentReviewNote: null,
          identityDocumentReviewedAt: null,
          ...(shouldReopenAffiliateReview
            ? {
                status: 'PENDING',
                statusReason:
                  'تم رفع نسخة جديدة من مستند الاعتماد وبانتظار المراجعة',
                reviewedAt: new Date(),
                reviewedBy: options.uploadedByUserId || null,
              }
            : {}),
        },
      });

      await this.createAffiliateIdentityDocumentVersion({
        affiliateId,
        fileUrl: nextFileUrl,
        uploadedAt,
        uploadedByUserId: options.uploadedByUserId || null,
        source: options.source || 'RESUBMISSION',
        isCurrent: true,
      });

      await this.createAffiliateReviewLog({
        affiliateId,
        companyId: affiliate.companyId,
        actorUserId: options.uploadedByUserId || null,
        eventType: 'DOCUMENT_RESUBMITTED',
        title: 'تم رفع نسخة جديدة من مستند الاعتماد',
        note:
          typeof options.note === 'string' && options.note.trim()
            ? options.note.trim()
            : null,
        previousStatus: affiliate.status,
        nextStatus: shouldReopenAffiliateReview ? 'PENDING' : affiliate.status,
        previousDocumentStatus: affiliate.identityDocumentStatus,
        nextDocumentStatus: 'PENDING_REVIEW',
      });

      return updatedAffiliate;
    } catch (error) {
      console.error(
        '❌ [AFFILIATE] Error replacing affiliate identity document:',
        error,
      );
      throw error;
    }
  }

  async getAffiliateDocumentHistory(affiliateId, options = {}) {
    try {
      const prisma = this.prisma;
      const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 20);

      const versions = prisma.affiliateIdentityDocumentVersion?.findMany
        ? await prisma.affiliateIdentityDocumentVersion.findMany({
            where: { affiliateId },
            orderBy: { uploadedAt: 'desc' },
            take: limit,
          })
        : [];

      return versions;
    } catch (error) {
      if (
        error?.code === 'P2021' ||
        /does not exist|table .* not found/i.test(error?.message || '')
      ) {
        console.warn(
          '⚠️ [AFFILIATE] affiliate_identity_document_versions table is unavailable; returning empty document history',
        );
        return [];
      }
      console.error(
        '❌ [AFFILIATE] Error getting affiliate identity document history:',
        error,
      );
      throw error;
    }
  }

  /**
   * تحديث نسبة عمولة المسوق
   */
  async updateAffiliateCommission(affiliateId, commissionRate) {
    try {
      const prisma = this.prisma;
      const affiliate = await prisma.affiliate.findUnique({
        where: { id: affiliateId },
        select: { commissionType: true }
      });

      if (!affiliate) {
        throw new Error('المسوق غير موجود');
      }

      const parsedCommissionRate = validateNonNegativeNumber(
        commissionRate,
        'قيمة العمولة',
      );
      if (affiliate.commissionType === 'PERCENTAGE' && parsedCommissionRate > 100) {
        throw new Error('نسبة العمولة لا يمكن أن تتجاوز 100%');
      }
      if (affiliate.commissionType === 'MARKUP' && parsedCommissionRate > 1000000) {
        throw new Error('قيمة هامش الربح أكبر من الحد المسموح');
      }

      return await prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          commissionRate: parsedCommissionRate
        }
      });
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating affiliate commission:', error);
      throw error;
    }
  }

  /**
   * تحديث ضوابط المسوق التشغيلية
   */
  async updateAffiliatePolicy(affiliateId, policyData = {}) {
    try {
      const prisma = this.prisma;
      const updateData = {};

      if (policyData.minPayout !== undefined) {
        updateData.minPayout = validatePositiveAmount(
          policyData.minPayout,
          'الحد الأدنى للسحب',
        );
      }

      if (policyData.canCreateOrdersForOthers !== undefined) {
        updateData.canCreateOrdersForOthers = Boolean(
          policyData.canCreateOrdersForOthers,
        );
      }

      if (policyData.canViewCustomerData !== undefined) {
        updateData.canViewCustomerData = Boolean(
          policyData.canViewCustomerData,
        );
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('لا توجد بيانات صالحة لتحديث ضوابط المسوق');
      }

      return await prisma.affiliate.update({
        where: { id: affiliateId },
        data: updateData,
      });
    } catch (error) {
      console.error('❌ [AFFILIATE] Error updating affiliate policy:', error);
      throw error;
    }
  }
  /**
   * الحصول على أو إنشاء سجل مسوق لشركة بناءً على علاقة ربط
   */
  async getOrCreateAffiliateForCompany(providerId, consumerId) {
    try {
      const prisma = this.prisma;

      const tenantContext = require('./tenantContext');

      // 1. البحث عن مالك الشركة المستهلكة (Switch to consumer context to find its owner)
      const owner = await tenantContext.run(consumerId, async () => {
        return await prisma.user.findFirst({
          where: {
            companyId: consumerId,
            role: 'OWNER',
            isActive: true
          }
        });
      });

      if (!owner) {
        throw new Error(`لم يتم العثور على مالك نشط للشركة ${consumerId}`);
      }

      // 2. التحقق من وجود سجل مسوق لهذا المالك في الشركة المزودة
      let affiliate = await prisma.affiliate.findFirst({
        where: {
          userId: owner.id,
          companyId: providerId
        }
      });

      // 3. إذا لم يوجد، إنشاؤه
      if (!affiliate) {
        console.log(`ℹ️ [AFFILIATE] Creating new affiliate for owner ${owner.email} in company ${providerId}`);
        affiliate = await this.registerAffiliate(owner.id, {
          companyId: providerId,
          commissionType: 'PERCENTAGE',
          commissionRate: 5, // نسبة افتراضية
          status: 'ACTIVE'
        });
      }

      return affiliate;
    } catch (error) {
      console.error('❌ [AFFILIATE] Error in getOrCreateAffiliateForCompany:', error);
      throw error;
    }
  }
}

module.exports = new AffiliateService();
