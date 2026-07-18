const { getSharedPrismaClient } = require('./sharedDatabase');

const normalizePayoutPaymentMethod = (method) => {
  const normalized = String(method || '').trim().toUpperCase();
  if (['TRANSFERS', 'BANK_TRANSFER'].includes(normalized)) return 'TRANSFERS';
  if (['WALLET', 'VODAFONE_CASH', 'ORANGE_CASH', 'INSTAPAY'].includes(normalized)) {
    return 'WALLET';
  }
  if (normalized === 'CASH') return 'CASH';
  return null;
};

class CommissionService {
  get prisma() {
    return getSharedPrismaClient();
  }

  constructor() {
  }

  appendCommissionNote(existingNotes, note) {
    if (!note) {
      return existingNotes || null;
    }

    return existingNotes ? `${existingNotes}\n${note}` : note;
  }

  async syncPendingAffiliatePayout(payoutId) {
    const payout = await this.prisma.affiliatePayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payout || payout.status !== 'PENDING') {
      return null;
    }

    const linkedCommissions = await this.prisma.commission.findMany({
      where: {
        payoutId,
        status: 'CONFIRMED',
      },
      select: {
        amount: true,
      },
    });

    const recalculatedAmount = Number(
      linkedCommissions
        .reduce((sum, commission) => sum + Number(commission.amount || 0), 0)
        .toFixed(2),
    );

    if (recalculatedAmount <= 0) {
      return await this.prisma.affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: 'CANCELLED',
          notes: 'تم إلغاء طلب السحب لعدم بقاء عمولات مؤكدة مرتبطة به',
        },
      });
    }

    return await this.prisma.affiliatePayout.update({
      where: { id: payoutId },
      data: {
        amount: recalculatedAmount,
      },
    });
  }

  async syncPendingMerchantPayout(payoutId) {
    const payout = await this.prisma.merchantPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!payout || payout.status !== 'PENDING') {
      return null;
    }

    const linkedCommissions = await this.prisma.commission.findMany({
      where: {
        merchantPayoutId: payoutId,
        status: 'CONFIRMED',
      },
      select: {
        amount: true,
      },
    });

    const recalculatedAmount = Number(
      linkedCommissions
        .reduce((sum, commission) => sum + Number(commission.amount || 0), 0)
        .toFixed(2),
    );

    if (recalculatedAmount <= 0) {
      return this.prisma.merchantPayout.update({
        where: { id: payoutId },
        data: {
          status: 'CANCELLED',
          notes: 'تم إلغاء طلب سحب التاجر لعدم بقاء مستحقات مؤكدة مرتبطة به',
        },
      });
    }

    return this.prisma.merchantPayout.update({
      where: { id: payoutId },
      data: {
        amount: recalculatedAmount,
      },
    });
  }

  async cancelAffiliateCommissionsForOrder(orderId, options = {}) {
    const reason =
      options.reason ||
      'تم إلغاء أو إرجاع الطلب، لذلك تم إلغاء عمولات المسوق المرتبطة به';

    const commissions = await this.prisma.commission.findMany({
      where: {
        orderId,
        affiliateId: { not: null },
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
      },
      select: {
        id: true,
        affiliateId: true,
        payoutId: true,
        status: true,
        notes: true,
      },
    });

    if (commissions.length === 0) {
      return {
        cancelledCount: 0,
        manualReviewCount: 0,
      };
    }

    const payoutIdsToSync = new Set();
    const affiliateIdsToRefresh = new Set();
    let cancelledCount = 0;
    let manualReviewCount = 0;

    for (const commission of commissions) {
      if (commission.affiliateId) {
        affiliateIdsToRefresh.add(commission.affiliateId);
      }

      if (commission.status === 'PAID') {
        manualReviewCount += 1;
        await this.prisma.commission.update({
          where: { id: commission.id },
          data: {
            notes: this.appendCommissionNote(
              commission.notes,
              `مراجعة يدوية مطلوبة بعد إلغاء الطلب: ${reason}`,
            ),
          },
        });
        continue;
      }

      if (commission.payoutId) {
        payoutIdsToSync.add(commission.payoutId);
      }

      await this.prisma.commission.update({
        where: { id: commission.id },
        data: {
          status: 'CANCELLED',
          payoutId: null,
          paidAt: null,
          notes: this.appendCommissionNote(commission.notes, reason),
        },
      });

      cancelledCount += 1;
    }

    for (const payoutId of payoutIdsToSync) {
      await this.syncPendingAffiliatePayout(payoutId);
    }

    if (affiliateIdsToRefresh.size > 0) {
      const affiliateService = require('./affiliateService');
      for (const affiliateId of affiliateIdsToRefresh) {
        await affiliateService.updateAffiliateStats(affiliateId);
      }
    }

    console.log(
      '✅ [COMMISSION] Cancelled affiliate commissions for order:',
      orderId,
      { cancelledCount, manualReviewCount },
    );

    return {
      cancelledCount,
      manualReviewCount,
    };
  }

  async cancelMerchantCommissionsForOrder(orderId, options = {}) {
    const reason =
      options.reason ||
      'تم إلغاء أو إرجاع الطلب، لذلك تم إلغاء مستحقات التاجر المرتبطة به';

    const commissions = await this.prisma.commission.findMany({
      where: {
        orderId,
        merchantId: { not: null },
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
      },
      select: {
        id: true,
        merchantId: true,
        merchantPayoutId: true,
        status: true,
        notes: true,
      },
    });

    if (commissions.length === 0) {
      return {
        cancelledCount: 0,
        manualReviewCount: 0,
      };
    }

    const payoutIdsToSync = new Set();
    let cancelledCount = 0;
    let manualReviewCount = 0;

    for (const commission of commissions) {
      if (commission.status === 'PAID') {
        manualReviewCount += 1;
        await this.prisma.commission.update({
          where: { id: commission.id },
          data: {
            notes: this.appendCommissionNote(
              commission.notes,
              `مراجعة يدوية مطلوبة بعد إلغاء الطلب: ${reason}`,
            ),
          },
        });
        continue;
      }

      if (commission.merchantPayoutId) {
        payoutIdsToSync.add(commission.merchantPayoutId);
      }

      await this.prisma.commission.update({
        where: { id: commission.id },
        data: {
          status: 'CANCELLED',
          merchantPayoutId: null,
          paidAt: null,
          notes: this.appendCommissionNote(commission.notes, reason),
        },
      });

      cancelledCount += 1;
    }

    for (const payoutId of payoutIdsToSync) {
      await this.syncPendingMerchantPayout(payoutId);
    }

    console.log(
      '✅ [COMMISSION] Cancelled merchant commissions for order:',
      orderId,
      { cancelledCount, manualReviewCount },
    );

    return {
      cancelledCount,
      manualReviewCount,
    };
  }

  /**
   * حساب جميع العمولات للطلب
   */
  async calculateCommissions(orderId) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          affiliate: true,
          orderItems: {
            include: {
              product: {
                include: {
                  merchantProducts: {
                    include: {
                      merchant: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      const commissions = [];
      let totalAffiliateProfit = 0;
      let totalPlatformProfit = 0;
      const merchantProfits = new Map(); // merchantId -> amount
      const dropshippingService = require('./dropshippingService');

      // حساب العمولات بناءً على كل عنصر في الطلب
      for (const item of order.orderItems) {
        const qty = item.quantity;
        const sellPrice = Number(item.price);

        // استخدام الأسعار المخزنة في الطلب (التي تم تثبيتها عند الإنشاء)
        // إذا لم توجد (للطلبات القديمة)، نستخدم السعر الحالي كاحتياطي
        const basePrice = Number(item.basePrice || sellPrice);
        const merchantPrice = Number(item.merchantPrice || basePrice);

        // 1. ربح التاجر (سعر التكلفة الأصلي)
        if (item.product?.merchantProducts?.length > 0) {
          const activeMerchantProducts = item.product.merchantProducts.filter((merchantProduct) => (
            merchantProduct?.isActive &&
            merchantProduct?.syncEnabled &&
            merchantProduct.merchant?.isActive
          ));
          const selectedMerchantProduct = activeMerchantProducts.find((merchantProduct) => (
            Number(merchantProduct.merchantPrice) === merchantPrice &&
            Number(merchantProduct.stock || 0) >= qty
          )) || dropshippingService.selectBestMerchantProduct(activeMerchantProducts, qty);

          const merchantId = selectedMerchantProduct?.merchantId;
          if (merchantId) {
            const currentAmount = merchantProfits.get(merchantId) || 0;
            merchantProfits.set(merchantId, currentAmount + (merchantPrice * qty));
          }
        }

        // 2. ربح المنصة (السعر الأساسي - سعر التاجر)
        totalPlatformProfit += Math.max(0, basePrice - merchantPrice) * qty;

        // 3. ربح المسوق (سعر البيع للعميل - السعر الأساسي للمنصة)
        if (order.affiliateId) {
          // إذا كان المسوق يستخدم نظام الهامش (MARKUP)
          if (order.affiliate.commissionType === 'MARKUP') {
            totalAffiliateProfit += (sellPrice - basePrice) * qty;
          }
        }
      }

      // حساب عمولة المسوق إذا لم تكن بنظام الهامش (نسبة مئوية أو مبلغ ثابت)
      if (order.affiliateId && order.affiliate.commissionType !== 'MARKUP') {
        const aff = order.affiliate;
        if (aff.commissionType === 'PERCENTAGE') {
          const subtotal = Number(order.subtotal || (Number(order.total) - Number(order.shipping || 0)));
          totalAffiliateProfit = (subtotal * aff.commissionRate) / 100;
        } else if (aff.commissionType === 'FIXED') {
          totalAffiliateProfit = aff.commissionRate;
        } else if (aff.commissionType === 'FIXED_PER_ITEM') {
          const totalQty = order.orderItems?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
          totalAffiliateProfit = Number(aff.commissionRate) * totalQty;
        }
      }

      // إضافة عمولة المسوق للقائمة
      if (totalAffiliateProfit > 0) {
        commissions.push({
          type: 'AFFILIATE',
          affiliateId: order.affiliateId,
          amount: Number(totalAffiliateProfit.toFixed(2)),
          orderTotal: order.total,
          status: 'CONFIRMED'
        });
      }

      // إضافة عمولات التجار للقائمة
      for (const [merchantId, amount] of merchantProfits) {
        commissions.push({
          type: 'MERCHANT',
          merchantId,
          amount: Number(amount.toFixed(2)),
          orderTotal: order.total,
          status: 'CONFIRMED'
        });
      }

      // إضافة عمولة المنصة للقائمة
      if (totalPlatformProfit > 0) {
        commissions.push({
          type: 'PLATFORM',
          amount: Number(totalPlatformProfit.toFixed(2)),
          orderTotal: order.total,
          status: 'CONFIRMED'
        });
      }

      // حفظ جميع العمولات في قاعدة البيانات
      const savedCommissions = [];
      for (const commission of commissions) {
        const saved = await this.prisma.commission.create({
          data: {
            orderId,
            affiliateId: commission.affiliateId || null,
            merchantId: commission.merchantId || null,
            type: commission.type,
            amount: commission.amount,
            orderTotal: order.total,
            companyId: order.companyId,
            status: commission.status || 'CONFIRMED'
          }
        });
        savedCommissions.push(saved);
      }

      console.log('✅ [COMMISSION] Calculated triple-split profits for order:', orderId);

      // 🚀 تحديث إحصائيات المسوق إذا كان موجوداً
      if (order.affiliateId) {
        try {
          const affiliateService = require('./affiliateService');
          await affiliateService.updateAffiliateStats(order.affiliateId);
        } catch (sErr) {
          console.error('⚠️ [COMMISSION] Error updating affiliate stats:', sErr.message);
        }
      }

      return savedCommissions;
    } catch (error) {
      console.error('❌ [COMMISSION] Error calculating triple-split commissions:', error);
      throw error;
    }
  }

  /**
   * حساب عمولة المسوق حسب النوع
   */
  async calculateAffiliateCommission(orderId, affiliateId, type, order = null) {
    try {
      if (!order) {
        order = await this.prisma.order.findUnique({
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
      }

      if (!order || !order.affiliate) {
        throw new Error('الطلب غير مرتبط بمسوق');
      }

      let commissionAmount = 0;
      let rate = null;
      let markup = null;
      let baseAmount = null;

      if (type === 'PERCENTAGE') {
        // الطريقة الأولى: نسبة مئوية (تعتمد على subtotal بدلاً من total)
        const commissionRate = order.affiliate.commissionRate;
        const subtotal = Number(order.subtotal || (Number(order.total) - Number(order.shipping || 0)));
        commissionAmount = Number((subtotal * (commissionRate / 100)).toFixed(2));
        rate = commissionRate;
      } else if (type === 'MARKUP') {
        // الطريقة الثانية: هامش ربح
        let totalMarkup = 0;
        let totalBase = 0;

        for (const item of order.orderItems) {
          const affiliateProduct = await this.prisma.affiliateProduct.findUnique({
            where: {
              affiliateId_productId: {
                affiliateId,
                productId: item.productId
              }
            }
          });

          if (affiliateProduct && affiliateProduct.isActive) {
            totalMarkup += Number(Number(affiliateProduct.markup).toFixed(2)) * item.quantity;
            totalBase += Number(Number(affiliateProduct.basePrice).toFixed(2)) * item.quantity;
          } else {
            // إذا لم يكن هناك منتج مسوق، استخدام السعر العادي
            totalBase += Number(item.product.price) * item.quantity;
          }
        }

        markup = totalMarkup;
        baseAmount = totalBase;
        commissionAmount = totalMarkup;
      }

      return {
        amount: commissionAmount,
        calculationType: type,
        rate,
        markup,
        baseAmount,
        status: 'CONFIRMED'
      };
    } catch (error) {
      console.error('❌ [COMMISSION] Error calculating affiliate commission:', error);
      throw error;
    }
  }

  /**
   * تأكيد العمولة
   */
  async confirmCommission(commissionId) {
    try {
      const commission = await this.prisma.commission.update({
        where: { id: commissionId },
        data: {
          status: 'CONFIRMED'
        },
        include: {
          affiliate: true
        }
      });

      // تحديث إحصائيات المسوق
      if (commission.affiliateId) {
        const affiliateService = require('./affiliateService');
        await affiliateService.updateAffiliateStats(commission.affiliateId);
      }

      console.log('✅ [COMMISSION] Confirmed commission:', commissionId);
      return commission;
    } catch (error) {
      console.error('❌ [COMMISSION] Error confirming commission:', error);
      throw error;
    }
  }

  /**
   * معالجة دفعة للمسوق
   */
  async processPayout(affiliateId, amount, paymentData) {
    try {
      const requestedAmount = Number(amount);
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error('مبلغ السحب غير صالح');
      }

      const affiliate = await this.prisma.affiliate.findUnique({
        where: { id: affiliateId }
      });

      if (!affiliate) {
        throw new Error('المسوق غير موجود');
      }

      if (requestedAmount < Number(affiliate.minPayout)) {
        throw new Error(`الحد الأدنى للسحب هو ${affiliate.minPayout} جنيه`);
      }

      const payoutMethod = normalizePayoutPaymentMethod(paymentData.method);
      if (!payoutMethod) {
        throw new Error('طريقة الدفع غير صالحة');
      }

      const run = async (prisma) => {
        // ربط العمولات المعلقة بالدفعة داخل عملية واحدة لتجنب دفعات غير مغطاة.
        const pendingCommissions = await prisma.commission.findMany({
          where: {
            affiliateId,
            status: 'CONFIRMED',
            payoutId: null
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        const selectedCommissionIds = pendingCommissions.map((commission) => commission.id);
        const availableAmount = Number(
          pendingCommissions
            .reduce((sum, commission) => sum + Number(commission.amount || 0), 0)
            .toFixed(2)
        );

        if (availableAmount <= 0) {
          throw new Error('لا توجد عمولات مؤكدة متاحة للسحب');
        }

        if (requestedAmount > availableAmount) {
          throw new Error('المبلغ المطلوب أكبر من الأرباح المتاحة للسحب');
        }

        if (Math.abs(availableAmount - requestedAmount) > 0.009) {
          throw new Error(
            `يمكن طلب سحب الرصيد المتاح بالكامل فقط حالياً: ${availableAmount} جنيه`
          );
        }

        const payout = await prisma.affiliatePayout.create({
          data: {
            affiliateId,
            amount: availableAmount,
            paymentMethod: payoutMethod,
            paymentDetails: paymentData.details ? JSON.stringify(paymentData.details) : null,
            status: 'PENDING'
          }
        });

        const linked = await prisma.commission.updateMany({
          where: {
            id: { in: selectedCommissionIds },
            affiliateId,
            status: 'CONFIRMED',
            payoutId: null
          },
          data: {
            payoutId: payout.id
            // لا نغير الحالة لـ PAID هنا، بل تظل CONFIRMED حتى اكتمال الدفع
          }
        });

        if (linked.count !== selectedCommissionIds.length) {
          throw new Error('تعذر ربط كل العمولات بطلب السحب');
        }

        return payout;
      };

      const payout = typeof this.prisma.$transaction === 'function'
        ? await this.prisma.$transaction(run)
        : await run(this.prisma);

      const affiliateService = require('./affiliateService');
      await affiliateService.updateAffiliateStats(affiliateId);

      console.log('✅ [COMMISSION] Created payout:', payout.id);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error processing payout:', error);
      throw error;
    }
  }

  /**
   * تسجيل دفعة خارجية
   */
  async recordExternalPayout(payoutId, transactionData) {
    try {
      const { transactionId, externalReference, paymentDate, processedBy } = transactionData;

      const payout = await this.prisma.affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: 'PROCESSED',
          transactionId,
          externalReference,
          externalPaymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          processedAt: new Date(),
          processedBy: processedBy || null
        },
        include: {
          affiliate: true
        }
      });

      // تحديث حالة جميع العمولات المرتبطة بهذه الدفعة إلى PAID
      await this.prisma.commission.updateMany({
        where: { payoutId: payout.id },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      });

      // تحديث إحصائيات المسوق
      const affiliateService = require('./affiliateService');
      await affiliateService.updateAffiliateStats(payout.affiliateId);

      console.log('✅ [COMMISSION] Recorded external payout:', payoutId);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error recording external payout:', error);
      throw error;
    }
  }

  /**
   * إرفاق إثبات تحويل بطلب سحب تم تسجيله بالفعل
   */
  async attachPayoutProof(payoutId, options = {}) {
    try {
      const proofFileUrl =
        typeof options.proofFileUrl === 'string' ? options.proofFileUrl.trim() : '';

      if (!proofFileUrl) {
        throw new Error('رابط إثبات التحويل مطلوب');
      }

      const payout = await this.prisma.affiliatePayout.findUnique({
        where: { id: payoutId },
        select: {
          id: true,
          status: true,
        },
      });

      if (!payout) {
        throw new Error('طلب السحب غير موجود');
      }

      if (!['PROCESSED', 'PAID'].includes(payout.status)) {
        throw new Error('يمكن رفع إثبات التحويل بعد تسجيل الدفعة فقط');
      }

      const updatedPayout = await this.prisma.affiliatePayout.update({
        where: { id: payout.id },
        data: {
          proofFileUrl,
          proofUploadedAt: new Date(),
        },
      });

      console.log('✅ [COMMISSION] Attached payout proof:', payoutId);
      return updatedPayout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error attaching payout proof:', error);
      throw error;
    }
  }

  /**
   * إلغاء طلب سحب وإرجاع العمولات المؤكدة إلى الرصيد القابل للسحب
   */
  async cancelPayoutRequest(payoutId, options = {}) {
    try {
      const normalizedReason =
        typeof options.reason === 'string' ? options.reason.trim() : '';

      if (!normalizedReason) {
        throw new Error('سبب إلغاء طلب السحب مطلوب');
      }

      const run = async (prisma) => {
        const payout = await prisma.affiliatePayout.findUnique({
          where: { id: payoutId },
          select: {
            id: true,
            affiliateId: true,
            status: true,
            notes: true,
          },
        });

        if (!payout) {
          throw new Error('طلب السحب غير موجود');
        }

        if (payout.status !== 'PENDING') {
          throw new Error('يمكن إلغاء طلبات السحب المعلقة فقط');
        }

        await prisma.commission.updateMany({
          where: {
            payoutId: payout.id,
            affiliateId: payout.affiliateId,
            status: 'CONFIRMED',
          },
          data: {
            payoutId: null,
          },
        });

        return await prisma.affiliatePayout.update({
          where: { id: payout.id },
          data: {
            status: 'CANCELLED',
            notes: this.appendCommissionNote(
              payout.notes,
              `تم إلغاء طلب السحب: ${normalizedReason}`,
            ),
            processedAt: new Date(),
            processedBy: options.processedBy || null,
          },
        });
      };

      const payout = typeof this.prisma.$transaction === 'function'
        ? await this.prisma.$transaction(run)
        : await run(this.prisma);

      const affiliateService = require('./affiliateService');
      await affiliateService.updateAffiliateStats(payout.affiliateId);

      console.log('✅ [COMMISSION] Cancelled payout request:', payoutId);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error cancelling payout request:', error);
      throw error;
    }
  }

  async getMerchantPayoutSummary(merchantId) {
    const eligibleWhere = {
      merchantId,
      type: 'MERCHANT',
      status: 'CONFIRMED',
      merchantPayoutId: null,
      order: {
        status: 'DELIVERED',
      },
    };

    const [
      merchant,
      availableStats,
      confirmedStats,
      paidStats,
      pendingPayoutStats,
      payouts,
    ] = await Promise.all([
      this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          isActive: true,
        },
      }),
      this.prisma.commission.aggregate({
        where: eligibleWhere,
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          merchantId,
          type: 'MERCHANT',
          status: 'CONFIRMED',
        },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          merchantId,
          type: 'MERCHANT',
          status: 'PAID',
        },
        _sum: { amount: true },
      }),
      this.prisma.merchantPayout.aggregate({
        where: {
          merchantId,
          status: 'PENDING',
        },
        _sum: { amount: true },
      }),
      this.prisma.merchantPayout.findMany({
        where: { merchantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!merchant) {
      throw new Error('التاجر غير موجود');
    }

    return {
      merchant,
      balances: {
        availableAmount: Number(Number(availableStats._sum.amount || 0).toFixed(2)),
        availableCommissionsCount: availableStats._count.id || 0,
        confirmedAmount: Number(Number(confirmedStats._sum.amount || 0).toFixed(2)),
        pendingPayoutAmount: Number(Number(pendingPayoutStats._sum.amount || 0).toFixed(2)),
        paidAmount: Number(Number(paidStats._sum.amount || 0).toFixed(2)),
      },
      payouts,
    };
  }

  async processMerchantPayout(merchantId, amount, paymentData = {}) {
    try {
      const requestedAmount = Number(amount);
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        throw new Error('مبلغ السحب غير صالح');
      }

      const payoutMethod = normalizePayoutPaymentMethod(paymentData.method);
      if (!payoutMethod) {
        throw new Error('طريقة الدفع غير صالحة');
      }

      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, isActive: true },
      });

      if (!merchant || merchant.isActive === false) {
        throw new Error('التاجر غير موجود أو غير مفعل');
      }

      const run = async (prisma) => {
        const pendingCommissions = await prisma.commission.findMany({
          where: {
            merchantId,
            type: 'MERCHANT',
            status: 'CONFIRMED',
            merchantPayoutId: null,
            order: {
              status: 'DELIVERED',
            },
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            amount: true,
          },
        });

        const selectedCommissionIds = pendingCommissions.map((commission) => commission.id);
        const availableAmount = Number(
          pendingCommissions
            .reduce((sum, commission) => sum + Number(commission.amount || 0), 0)
            .toFixed(2),
        );

        if (availableAmount <= 0) {
          throw new Error('لا توجد مستحقات تاجر مؤكدة بعد التسليم متاحة للسحب');
        }

        if (requestedAmount > availableAmount) {
          throw new Error('المبلغ المطلوب أكبر من مستحقات التاجر المتاحة للسحب');
        }

        if (Math.abs(availableAmount - requestedAmount) > 0.009) {
          throw new Error(
            `يمكن طلب سحب رصيد التاجر المتاح بالكامل فقط حالياً: ${availableAmount} جنيه`,
          );
        }

        const payout = await prisma.merchantPayout.create({
          data: {
            merchantId,
            amount: availableAmount,
            paymentMethod: payoutMethod,
            paymentDetails: paymentData.details ? JSON.stringify(paymentData.details) : null,
            status: 'PENDING',
          },
        });

        const linked = await prisma.commission.updateMany({
          where: {
            id: { in: selectedCommissionIds },
            merchantId,
            status: 'CONFIRMED',
            merchantPayoutId: null,
          },
          data: {
            merchantPayoutId: payout.id,
          },
        });

        if (linked.count !== selectedCommissionIds.length) {
          throw new Error('تعذر ربط كل مستحقات التاجر بطلب السحب');
        }

        return payout;
      };

      const payout = typeof this.prisma.$transaction === 'function'
        ? await this.prisma.$transaction(run)
        : await run(this.prisma);

      console.log('✅ [COMMISSION] Created merchant payout:', payout.id);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error processing merchant payout:', error);
      throw error;
    }
  }

  async recordExternalMerchantPayout(payoutId, transactionData = {}) {
    try {
      const { transactionId, externalReference, processedBy, notes } = transactionData;

      const payout = await this.prisma.merchantPayout.update({
        where: { id: payoutId },
        data: {
          status: 'PROCESSED',
          transactionId,
          externalReference,
          processedAt: new Date(),
          processedBy: processedBy || null,
          notes: this.appendCommissionNote(notes || null, 'تم تسجيل تحويل مستحقات التاجر خارجياً'),
        },
        include: {
          merchant: true,
        },
      });

      await this.prisma.commission.updateMany({
        where: {
          merchantPayoutId: payout.id,
          merchantId: payout.merchantId,
        },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      console.log('✅ [COMMISSION] Recorded external merchant payout:', payoutId);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error recording external merchant payout:', error);
      throw error;
    }
  }

  async cancelMerchantPayoutRequest(payoutId, options = {}) {
    try {
      const normalizedReason =
        typeof options.reason === 'string' ? options.reason.trim() : '';

      if (!normalizedReason) {
        throw new Error('سبب إلغاء طلب سحب التاجر مطلوب');
      }

      const run = async (prisma) => {
        const payout = await prisma.merchantPayout.findUnique({
          where: { id: payoutId },
          select: {
            id: true,
            merchantId: true,
            status: true,
            notes: true,
          },
        });

        if (!payout) {
          throw new Error('طلب سحب التاجر غير موجود');
        }

        if (payout.status !== 'PENDING') {
          throw new Error('يمكن إلغاء طلبات سحب التجار المعلقة فقط');
        }

        await prisma.commission.updateMany({
          where: {
            merchantPayoutId: payout.id,
            merchantId: payout.merchantId,
            status: 'CONFIRMED',
          },
          data: {
            merchantPayoutId: null,
          },
        });

        return prisma.merchantPayout.update({
          where: { id: payout.id },
          data: {
            status: 'CANCELLED',
            notes: this.appendCommissionNote(
              payout.notes,
              `تم إلغاء طلب سحب التاجر: ${normalizedReason}`,
            ),
            processedAt: new Date(),
            processedBy: options.processedBy || null,
          },
        });
      };

      const payout = typeof this.prisma.$transaction === 'function'
        ? await this.prisma.$transaction(run)
        : await run(this.prisma);

      console.log('✅ [COMMISSION] Cancelled merchant payout request:', payoutId);
      return payout;
    } catch (error) {
      console.error('❌ [COMMISSION] Error cancelling merchant payout request:', error);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات العمولات
   */
  async getCommissionStats(companyId, filters = {}) {
    try {
      const { startDate, endDate, affiliateId, merchantId } = filters;

      const where = {
        companyId
      };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      if (affiliateId) {
        where.affiliateId = affiliateId;
      }

      if (merchantId) {
        where.merchantId = merchantId;
      }

      const commissions = await this.prisma.commission.findMany({
        where,
        include: {
          affiliate: {
            select: {
              id: true,
              affiliateCode: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          merchant: {
            select: {
              id: true,
              name: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true
            }
          }
        }
      });

      // حساب الإحصائيات
      const stats = {
        total: commissions.length,
        totalAmount: commissions.reduce((sum, c) => sum + Number(c.amount), 0),
        byType: {
          AFFILIATE: 0,
          MERCHANT: 0,
          PLATFORM: 0
        },
        byStatus: {
          PENDING: 0,
          CONFIRMED: 0,
          PAID: 0,
          CANCELLED: 0
        }
      };

      for (const commission of commissions) {
        stats.byType[commission.type] = (stats.byType[commission.type] || 0) + Number(commission.amount);
        stats.byStatus[commission.status] = (stats.byStatus[commission.status] || 0) + 1;
      }

      return {
        commissions,
        stats
      };
    } catch (error) {
      console.error('❌ [COMMISSION] Error getting commission stats:', error);
      throw error;
    }
  }
}

module.exports = new CommissionService();
