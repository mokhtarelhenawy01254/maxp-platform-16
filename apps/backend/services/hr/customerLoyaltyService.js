/**
 * 🎁 Customer Loyalty Service
 * خدمة إدارة نظام ولاء العملاء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues - use getSharedPrismaClient() inside functions

class CustomerLoyaltyService {
  /**
   * جلب جميع برامج الولاء للشركة
   */
  async getPrograms(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    try {
      const where = {
        companyId,
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type })
      };

      const programs = await prisma.customerLoyaltyProgram.findMany({
        where,
        include: {
          _count: {
            select: {
              customerLoyaltyRecords: {
                where: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // حساب الإحصائيات لكل برنامج
      const programsWithStats = await Promise.all(
        programs.map(async (program) => {
          const stats = await this.getProgramStatistics(companyId, program.id);
          return {
            ...program,
            customersCount: program._count.customerLoyaltyRecords,
            totalPointsIssued: stats.totalPointsIssued,
            totalPointsRedeemed: stats.totalPointsRedeemed
          };
        })
      );

      return programsWithStats;
    } catch (error) {
      console.error('❌ Error getting loyalty programs:', error);
      throw error;
    }
  }

  /**
   * جلب برنامج ولاء محدد
   */
  async getProgramById(companyId, programId) {
    const prisma = getSharedPrismaClient();
    try {
      const program = await prisma.customerLoyaltyProgram.findFirst({
        where: {
          id: programId,
          companyId
        },
        include: {
          tiers: {
            orderBy: {
              priority: 'asc'
            }
          },
          _count: {
            select: {
              customerLoyaltyRecords: true
            }
          }
        }
      });

      if (!program) {
        throw new Error('برنامج الولاء غير موجود');
      }

      const stats = await this.getProgramStatistics(companyId, programId);

      return {
        ...program,
        ...stats
      };
    } catch (error) {
      console.error('❌ Error getting loyalty program:', error);
      throw error;
    }
  }

  /**
   * إنشاء برنامج ولاء جديد
   */
  async createProgram(companyId, data, createdBy) {
    const prisma = getSharedPrismaClient();
    try {
      const program = await prisma.customerLoyaltyProgram.create({
        data: {
          companyId,
          name: data.name,
          nameAr: data.nameAr,
          description: data.description,
          type: data.type || 'POINTS',
          status: data.status || 'DRAFT',
          pointsPerPurchase: data.pointsPerPurchase || 1,
          pointsPerReferral: data.pointsPerReferral || 10,
          pointsPerAmount: data.pointsPerAmount,
          redemptionRate: data.redemptionRate || 100,
          minimumPoints: data.minimumPoints || 100,
          maxPointsPerTransaction: data.maxPointsPerTransaction,
          expiryMonths: data.expiryMonths || 12,
          rules: data.rules ? JSON.stringify(data.rules) : null,
          createdBy
        }
      });

      return program;
    } catch (error) {
      console.error('❌ Error creating loyalty program:', error);
      throw error;
    }
  }

  /**
   * تحديث برنامج ولاء
   */
  async updateProgram(companyId, programId, data) {
    const prisma = getSharedPrismaClient();
    try {
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.pointsPerPurchase !== undefined) updateData.pointsPerPurchase = data.pointsPerPurchase;
      if (data.pointsPerReferral !== undefined) updateData.pointsPerReferral = data.pointsPerReferral;
      if (data.pointsPerAmount !== undefined) updateData.pointsPerAmount = data.pointsPerAmount;
      if (data.redemptionRate !== undefined) updateData.redemptionRate = data.redemptionRate;
      if (data.minimumPoints !== undefined) updateData.minimumPoints = data.minimumPoints;
      if (data.maxPointsPerTransaction !== undefined) updateData.maxPointsPerTransaction = data.maxPointsPerTransaction;
      if (data.expiryMonths !== undefined) updateData.expiryMonths = data.expiryMonths;
      if (data.rules !== undefined) updateData.rules = data.rules ? JSON.stringify(data.rules) : null;

      const program = await prisma.customerLoyaltyProgram.update({
        where: {
          id: programId,
          companyId
        },
        data: updateData
      });

      return program;
    } catch (error) {
      console.error('❌ Error updating loyalty program:', error);
      throw error;
    }
  }

  /**
   * جلب جميع المستويات (Tiers)
   */
  async getTiers(companyId, programId = null) {
    const prisma = getSharedPrismaClient();
    try {
      const where = {
        companyId,
        ...(programId && { programId })
      };

      const tiers = await prisma.customerLoyaltyTier.findMany({
        where,
        include: {
          customerLoyaltyProgram: {
            select: {
              id: true,
              name: true,
              nameAr: true
            }
          }
        },
        orderBy: {
          priority: 'asc'
        }
      });

      // حساب عدد العملاء لكل مستوى
      const tiersWithCounts = await Promise.all(
        tiers.map(async (tier) => {
          const count = await prisma.customerLoyaltyRecord.count({
            where: {
              companyId,
              tierId: tier.id,
              status: 'ACTIVE'
            }
          });

          return {
            ...tier,
            program: tier.customerLoyaltyProgram,
            customersCount: count,
            benefits: tier.benefits ? JSON.parse(tier.benefits) : []
          };
        })
      );

      return tiersWithCounts;
    } catch (error) {
      console.error('❌ Error getting loyalty tiers:', error);
      throw error;
    }
  }

  /**
   * إنشاء مستوى جديد
   */
  async createTier(companyId, data) {
    const prisma = getSharedPrismaClient();
    try {
      const tier = await prisma.customerLoyaltyTier.create({
        data: {
          companyId,
          programId: data.programId,
          name: data.name,
          nameAr: data.nameAr,
          minPoints: data.minPoints,
          maxPoints: data.maxPoints,
          benefits: data.benefits ? JSON.stringify(data.benefits) : null,
          color: data.color || '#6366f1',
          icon: data.icon || 'crown',
          priority: data.priority || 1
        }
      });

      return {
        ...tier,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : []
      };
    } catch (error) {
      console.error('❌ Error creating loyalty tier:', error);
      throw error;
    }
  }

  /**
   * تحديث مستوى
   */
  async updateTier(companyId, tierId, data) {
    const prisma = getSharedPrismaClient();
    try {
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
      if (data.minPoints !== undefined) updateData.minPoints = data.minPoints;
      if (data.maxPoints !== undefined) updateData.maxPoints = data.maxPoints;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.benefits !== undefined) updateData.benefits = data.benefits ? JSON.stringify(data.benefits) : null;

      const tier = await prisma.customerLoyaltyTier.update({
        where: {
          id: tierId,
          companyId
        },
        data: updateData
      });

      return {
        ...tier,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : []
      };
    } catch (error) {
      console.error('❌ Error updating loyalty tier:', error);
      throw error;
    }
  }

  /**
   * حذف مستوى
   */
  async deleteTier(companyId, tierId) {
    const prisma = getSharedPrismaClient();
    try {
      // التأكد من عدم وجود عملاء مرتبطين بهذا المستوى
      const customersCount = await prisma.customerLoyaltyRecord.count({
        where: {
          companyId,
          tierId
        }
      });

      if (customersCount > 0) {
        throw new Error('لا يمكن حذف المستوى لوجود عملاء مرتبطين به');
      }

      await prisma.customerLoyaltyTier.delete({
        where: {
          id: tierId,
          companyId
        }
      });

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting loyalty tier:', error);
      throw error;
    }
  }

  /**
   * جلب سجلات ولاء العملاء
   */
  async getCustomerRecords(companyId, filters = {}) {
    const prisma = getSharedPrismaClient();
    try {
      const where = {
        companyId,
        ...(filters.customerId && { customerId: filters.customerId }),
        ...(filters.programId && { programId: filters.programId }),
        ...(filters.status && { status: filters.status })
      };

      const records = await prisma.customerLoyaltyRecord.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true
            }
          },
          customerLoyaltyProgram: true,
          customerLoyaltyTier: true
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      return records.map(record => ({
        ...record,
        program: record.customerLoyaltyProgram,
        tier: record.customerLoyaltyTier,
        metadata: record.metadata ? JSON.parse(record.metadata) : null
      }));
    } catch (error) {
      console.error('❌ Error getting customer loyalty records:', error);
      throw error;
    }
  }

  /**
   * إضافة عميل إلى برنامج ولاء
   */
  async enrollCustomer(companyId, customerId, programId, initialPoints = 0) {
    const prisma = getSharedPrismaClient();
    try {
      // التحقق من وجود البرنامج
      const program = await prisma.customerLoyaltyProgram.findFirst({
        where: {
          id: programId,
          companyId,
          status: 'ACTIVE'
        }
      });

      if (!program) {
        throw new Error('برنامج الولاء غير موجود أو غير نشط');
      }

      // التحقق من عدم وجود سجل سابق
      const existingRecord = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId
          }
        }
      });

      if (existingRecord) {
        throw new Error('العميل مسجل بالفعل في هذا البرنامج');
      }

      // تحديد المستوى الأولي
      const initialTier = await this.determineTier(companyId, programId, initialPoints);

      // إنشاء السجل
      const record = await prisma.customerLoyaltyRecord.create({
        data: {
          companyId,
          customerId,
          programId,
          tierId: initialTier?.id,
          currentPoints: initialPoints,
          totalEarned: initialPoints,
          status: 'ACTIVE',
          joinDate: new Date(),
          lastActivity: new Date(),
          lastPointsEarned: initialPoints > 0 ? new Date() : null
        },
        include: {
          customer: true,
          customerLoyaltyProgram: true,
          customerLoyaltyTier: true
        }
      });

      return record;
    } catch (error) {
      console.error('❌ Error enrolling customer:', error);
      throw error;
    }
  }

  /**
   * إضافة نقاط للعميل
   */
  async addPoints(companyId, customerId, programId, points, reason = null) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId
          }
        }
      });

      if (!record || record.companyId !== companyId) {
        throw new Error('سجل الولاء غير موجود');
      }

      if (record.status !== 'ACTIVE') {
        throw new Error('سجل الولاء غير نشط');
      }

      // تحديث النقاط
      const updatedRecord = await prisma.customerLoyaltyRecord.update({
        where: {
          id: record.id
        },
        data: {
          currentPoints: {
            increment: points
          },
          totalEarned: {
            increment: points
          },
          lastActivity: new Date(),
          lastPointsEarned: new Date(),
          metadata: reason ? JSON.stringify({ lastReason: reason }) : record.metadata
        },
        include: {
          customer: true,
          customerLoyaltyProgram: true,
          customerLoyaltyTier: true
        }
      });

      // تحديث المستوى إذا لزم الأمر
      await this.updateCustomerTier(companyId, customerId, programId);

      // 🔔 إرسال إشعار عبر الواتساب
      try {
        const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
        if (updatedRecord.customer && updatedRecord.customer.phone) {
          await WhatsAppNotificationService.sendLoyaltyPointsNotification(
            companyId,
            updatedRecord.customer,
            points,
            updatedRecord.currentPoints,
            reason
          );
        }
      } catch (notifyError) {
        console.warn('⚠️ [LOYALTY] Failed to send points notification:', notifyError.message);
      }

      return updatedRecord;
    } catch (error) {
      console.error('❌ Error adding points:', error);
      throw error;
    }
  }

  /**
   * استبدال النقاط
   */
  async redeemPoints(companyId, customerId, programId, points) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId
          }
        },
        include: {
          customerLoyaltyProgram: true
        }
      });

      if (!record || record.companyId !== companyId) {
        throw new Error('سجل الولاء غير موجود');
      }

      const program = record.customerLoyaltyProgram;

      if (record.status !== 'ACTIVE') {
        throw new Error('سجل الولاء غير نشط');
      }

      if (record.currentPoints < points) {
        throw new Error('النقاط غير كافية');
      }

      if (points < program.minimumPoints) {
        throw new Error(`الحد الأدنى للاستبدال هو ${program.minimumPoints} نقطة`);
      }

      // تحديث النقاط
      const updatedRecord = await prisma.customerLoyaltyRecord.update({
        where: {
          id: record.id
        },
        data: {
          currentPoints: {
            decrement: points
          },
          totalRedeemed: {
            increment: points
          },
          lastActivity: new Date(),
          lastPointsRedeemed: new Date()
        },
        include: {
          customer: true,
          customerLoyaltyProgram: true,
          customerLoyaltyTier: true
        }
      });

      // تحويل النقاط إلى رصيد محفظة
      const redemptionRate = parseFloat(program.redemptionRate) || 100;
      const cashAmount = points / redemptionRate;

      if (cashAmount > 0) {
        try {
          const WalletService = require('../walletService');
          await WalletService.createWallet(customerId, companyId);
          await WalletService.addToWallet(
            customerId,
            cashAmount,
            'CREDIT',
            `استبدال ${points} نقطة من برنامج الولاء: ${program.nameAr || program.name}`,
            { loyaltyProgramId: programId, redeemedPoints: points, companyId }
          );
        } catch (walletError) {
          console.error('⚠️ [LOYALTY] Failed to add balance to wallet:', walletError.message);
        }
      }

      return updatedRecord;
    } catch (error) {
      console.error('❌ Error redeeming points:', error);
      throw error;
    }
  }

  /**
   * تحديث مستوى العميل بناءً على نقاطه
   */
  async updateCustomerTier(companyId, customerId, programId) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId
          }
        }
      });

      if (!record) return;

      const newTier = await this.determineTier(companyId, programId, record.currentPoints);

      if (newTier && newTier.id !== record.tierId) {
        await prisma.customerLoyaltyRecord.update({
          where: {
            id: record.id
          },
          data: {
            tierId: newTier.id
          }
        });
      }
    } catch (error) {
      console.error('❌ Error updating customer tier:', error);
      // لا نرمي الخطأ هنا لأنها عملية ثانوية
    }
  }

  /**
   * تحديد المستوى بناءً على النقاط
   */
  async determineTier(companyId, programId, points) {
    const prisma = getSharedPrismaClient();
    try {
      const tiers = await prisma.customerLoyaltyTier.findMany({
        where: {
          companyId,
          programId
        },
        orderBy: {
          priority: 'desc' // أعلى أولوية أولاً
        }
      });

      for (const tier of tiers) {
        if (points >= tier.minPoints && (!tier.maxPoints || points <= tier.maxPoints)) {
          return tier;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error determining tier:', error);
      return null;
    }
  }

  /**
   * جلب إحصائيات البرنامج
   */
  async getProgramStatistics(companyId, programId) {
    const prisma = getSharedPrismaClient();
    try {
      const records = await prisma.customerLoyaltyRecord.findMany({
        where: {
          companyId,
          programId
        },
        select: {
          totalEarned: true,
          totalRedeemed: true
        }
      });

      const totalPointsIssued = records.reduce((sum, r) => sum + parseFloat(r.totalEarned), 0);
      const totalPointsRedeemed = records.reduce((sum, r) => sum + parseFloat(r.totalRedeemed), 0);

      return {
        totalPointsIssued,
        totalPointsRedeemed
      };
    } catch (error) {
      console.error('❌ Error getting program statistics:', error);
      return {
        totalPointsIssued: 0,
        totalPointsRedeemed: 0
      };
    }
  }

  /**
   * جلب المكافآت النشطة للعميل (مثل الشحن المجاني والخصومات)
   * يتم استدعاؤها أثناء حساب تكلفة الطلب
   */
  async getCustomerActiveRewards(companyId, customerId) {
    const prisma = getSharedPrismaClient();
    try {
      if (!customerId) return null;

      const records = await prisma.customerLoyaltyRecord.findMany({
        where: {
          companyId,
          customerId,
          status: 'ACTIVE',
          customerLoyaltyProgram: {
            status: 'ACTIVE'
          }
        },
        include: {
          customerLoyaltyProgram: true,
          customerLoyaltyTier: true
        }
      });

      const effectiveRewards = {
        freeShipping: false,
        freeShippingThreshold: 0,
        discountPercent: 0,
        pointsMultiplier: 1
      };

      for (const record of records) {
        const program = record.customerLoyaltyProgram;
        let rules = {};
        try {
          rules = program.rules ? (typeof program.rules === 'string' ? JSON.parse(program.rules) : program.rules) : {};
        } catch (e) {
          console.error(`Error parsing rules for program ${program.id}:`, e);
        }

        const rewards = rules.rewards || {};

        if (rewards.freeShipping) {
          effectiveRewards.freeShipping = true;
          // استخدام أقل عتبة شحن إذا كان مسجلاً في أكثر من برنامج
          if (effectiveRewards.freeShippingThreshold === 0 || (rules.freeShippingThreshold > 0 && rules.freeShippingThreshold < effectiveRewards.freeShippingThreshold)) {
            effectiveRewards.freeShippingThreshold = rules.freeShippingThreshold || 0;
          }
        }

        if (rewards.discount) {
          // استخدام أعلى نسبة خصم
          if (rules.discountPercent > effectiveRewards.discountPercent) {
            effectiveRewards.discountPercent = rules.discountPercent || 0;
          }
        }
      }

      return effectiveRewards;
    } catch (error) {
      console.error('❌ Error getting active rewards:', error);
      return null;
    }
  }

  /**
   * معالجة نقاط الولاء المنتهية الصلاحية
   * يمكن تشغيلها عبر Cron Job
   */
  async processExpiredPoints(companyId = null) {
    const prisma = getSharedPrismaClient();
    try {
      const where = companyId ? { companyId, status: 'ACTIVE' } : { status: 'ACTIVE' };
      const records = await prisma.customerLoyaltyRecord.findMany({
        where,
        include: {
          customerLoyaltyProgram: true
        }
      });

      let totalExpired = 0;

      for (const record of records) {
        const program = record.customerLoyaltyProgram;
        const expiryMonths = program.expiryMonths || 12;

        // التحقق من آخر نشاط كسب نقاط
        if (!record.lastPointsEarned) continue;

        const expiryDate = new Date(record.lastPointsEarned);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

        if (expiryDate < new Date() && parseFloat(record.currentPoints) > 0) {
          const pointsToExpire = parseFloat(record.currentPoints);

          await prisma.customerLoyaltyRecord.update({
            where: { id: record.id },
            data: {
              currentPoints: 0,
              lastActivity: new Date(),
              metadata: JSON.stringify({
                ...(record.metadata ? JSON.parse(record.metadata) : {}),
                expiredPoints: pointsToExpire,
                expiredAt: new Date().toISOString()
              })
            }
          });

          totalExpired++;
          console.log(`⚠️ Expired ${pointsToExpire} points for customer ${record.customerId} in program ${program.name}`);
        }
      }

      return { success: true, totalExpired };
    } catch (error) {
      console.error('❌ Error processing expired points:', error);
      throw error;
    }
  }

  /**
   * تطبيق نقاط الولاء عند اكتمال الطلب
   */
  async applyLoyaltyPointsForOrder({ orderId, companyId, changedBy }) {
    const prisma = getSharedPrismaClient();
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId, companyId },
        include: { customer: true }
      });

      if (!order || !order.customerId) return { applied: false, reason: 'order_not_found' };

      // جلب جميع برامج الولاء من نوع POINTS النشطة
      const programs = await prisma.customerLoyaltyProgram.findMany({
        where: {
          companyId,
          type: 'POINTS',
          status: 'ACTIVE'
        }
      });

      if (programs.length === 0) return { applied: false, reason: 'no_active_programs' };

      let totalPointsAwarded = 0;

      for (const program of programs) {
        // التحقق من التسجيل التلقائي
        let record = await prisma.customerLoyaltyRecord.findUnique({
          where: {
            customerId_programId: {
              customerId: order.customerId,
              programId: program.id
            }
          }
        });

        if (!record) {
          record = await this.enrollCustomer(companyId, order.customerId, program.id, 0);
        }

        // حساب النقاط
        let points = 0;
        const baseAmount = parseFloat(order.subtotal || order.total || 0);

        if (program.pointsPerAmount && parseFloat(program.pointsPerAmount) > 0) {
          points = Math.floor(baseAmount / parseFloat(program.pointsPerAmount)) * parseFloat(program.pointsPerPurchase || 1);
        } else {
          points = parseFloat(program.pointsPerPurchase || 0);
        }

        if (points > 0) {
          await this.addPoints(companyId, order.customerId, program.id, points, `طلب #${order.orderNumber}`);
          totalPointsAwarded += points;
        }
      }

      return { applied: true, totalPointsAwarded };
    } catch (error) {
      console.error('❌ Error applying loyalty points for order:', error);
      throw error;
    }
  }

  /**
   * تعديل النقاط يدوياً (من قبل الأدمن)
   */
  async adjustPoints(companyId, customerId, programId, points, reason, adjustedBy) {
    const prisma = getSharedPrismaClient();
    try {
      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: {
          customerId_programId: {
            customerId,
            programId
          }
        }
      });

      if (!record || record.companyId !== companyId) {
        throw new Error('سجل الولاء غير موجود');
      }

      const isIncrement = points >= 0;
      const absPoints = Math.abs(points);

      const updatedRecord = await prisma.customerLoyaltyRecord.update({
        where: { id: record.id },
        data: {
          currentPoints: isIncrement ? { increment: absPoints } : { decrement: absPoints },
          totalEarned: isIncrement ? { increment: absPoints } : undefined,
          lastActivity: new Date(),
          metadata: JSON.stringify({
            ...(record.metadata ? JSON.parse(record.metadata) : {}),
            lastAdjustment: {
              points,
              reason,
              adjustedBy,
              at: new Date().toISOString()
            }
          })
        }
      });

      // 🔔 إرسال إشعار عبر الواتساب إذا كان التعديل إيجابياً (كسب نقاط)
      if (isIncrement) {
        try {
          const WhatsAppNotificationService = require('../whatsapp/WhatsAppNotificationService');
          const customer = await prisma.customer.findUnique({ where: { id: customerId } });
          if (customer && customer.phone) {
            await WhatsAppNotificationService.sendLoyaltyPointsNotification(
              companyId,
              customer,
              points,
              updatedRecord.currentPoints,
              reason || 'تعديل رصيد من قبل الإدارة'
            );
          }
        } catch (notifyError) {
          console.warn('⚠️ [LOYALTY] Failed to send adjustment notification:', notifyError.message);
        }
      }

      return updatedRecord;
    } catch (error) {
      console.error('❌ Error adjusting points:', error);
      throw error;
    }
  }
}

module.exports = new CustomerLoyaltyService();
