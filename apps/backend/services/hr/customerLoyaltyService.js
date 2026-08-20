/**
 * 🎁 Customer Loyalty Service
 * خدمة إدارة نظام ولاء العملاء
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues - use getSharedPrismaClient() inside functions

function parseJsonMaybe(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

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

      // برامج الكاش باك مش بتسجّل اشتراكات (المنح بيتم مباشرة للمحافظ) →
      // عدد المشتركين بياخد من عدد العملاء اللي عندهم معاملات CASHBACK فعلاً.
      const hasCashbackProgram = programs.some(p => p.type === 'CASHBACK');
      const cashbackCustomerCount = hasCashbackProgram ? await this.getCashbackCustomerCount(companyId) : 0;

      // حساب الإحصائيات لكل برنامج
      const programsWithStats = await Promise.all(
        programs.map(async (program) => {
          const stats = await this.getProgramStatistics(companyId, program.id);
          return {
            ...program,
            customersCount: program.type === 'CASHBACK' ? cashbackCustomerCount : program._count.customerLoyaltyRecords,
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
   * عدد العملاء الفعليين اللي استلموا كاش باك (محافظ عندها معاملة نوع CASHBACK).
   * المحفظة مرتبطة بعميل واحد (@unique customerId) فالعدد = عدد المحافظ المميزة.
   */
  async getCashbackCustomerCount(companyId) {
    const prisma = getSharedPrismaClient();
    try {
      const groups = await prisma.walletTransaction.groupBy({
        by: ['walletId'],
        where: {
          type: 'CASHBACK',
          wallet: { companyId }
        }
      });
      return groups.length;
    } catch (error) {
      console.error('❌ Error counting cashback customers:', error);
      return 0;
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
   * استخراج الحدود (min/max) حسب طريقة الحساب
   */
  _toNum(value) {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  _extractTierRange(calculationType, data) {
    const c = calculationType || 'POINTS';
    if (c === 'SPENT') return { min: this._toNum(data.minSpent), max: this._toNum(data.maxSpent) };
    if (c === 'ITEMS' || c === 'ORDER_COUNT') return { min: this._toNum(data.minItems), max: this._toNum(data.maxItems) };
    return { min: this._toNum(data.minPoints), max: this._toNum(data.maxPoints) };
  }

  _isRangeEmpty(range) {
    return range.min === null && range.max === null;
  }

  _rangesOverlap(a, b) {
    const aMin = a.min === null ? 0 : a.min;
    const bMin = b.min === null ? 0 : b.min;
    const aMax = a.max === null ? Infinity : a.max;
    const bMax = b.max === null ? Infinity : b.max;
    return aMin <= bMax && bMin <= aMax;
  }

  /**
   * التأكد من عدم وجود مستوى آخر بنفس الحدود أو متداخل معها في نفس البرنامج
   */
  async _assertNoTierRangeConflict(prisma, companyId, programId, calculationType, excludeTierId, range) {
    if (range.min !== null && range.max !== null && range.min > range.max) {
      const err = new Error('الحد الأدنى أكبر من الحد الأقصى');
      err.statusCode = 400;
      throw err;
    }

    const existing = await prisma.customerLoyaltyTier.findMany({
      where: { companyId, programId, calculationType },
      select: {
        id: true,
        name: true,
        nameAr: true,
        minPoints: true,
        maxPoints: true,
        minSpent: true,
        maxSpent: true,
        minItems: true,
        maxItems: true
      }
    });

    for (const t of existing) {
      if (excludeTierId && t.id === excludeTierId) continue;
      const tRange = this._extractTierRange(calculationType, t);
      if (this._isRangeEmpty(tRange)) continue;

      if (tRange.min === range.min && tRange.max === range.max) {
        const err = new Error(`يوجد مستوى آخر بنفس الحد الأدنى والأقصى ("${t.nameAr || t.name}")`);
        err.statusCode = 400;
        throw err;
      }

      if (this._rangesOverlap(tRange, range)) {
        const err = new Error(`حدود المستوى تتداخل مع مستوى آخر ("${t.nameAr || t.name}") في نفس البرنامج`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * إنشاء مستوى جديد
   */
  async createTier(companyId, data) {
    const prisma = getSharedPrismaClient();
    try {
      const calcType = data.calculationType || 'POINTS';
      const newRange = this._extractTierRange(calcType, data);
      if (!this._isRangeEmpty(newRange)) {
        await this._assertNoTierRangeConflict(prisma, companyId, data.programId, calcType, null, newRange);
      }

      const tier = await prisma.customerLoyaltyTier.create({
        data: {
          companyId,
          programId: data.programId,
          name: data.name,
          nameAr: data.nameAr,
          calculationType: data.calculationType || 'POINTS',
          minPoints: data.minPoints != null ? data.minPoints : undefined,
          maxPoints: data.maxPoints != null ? data.maxPoints : undefined,
          minSpent: data.minSpent != null ? data.minSpent : undefined,
          maxSpent: data.maxSpent != null ? data.maxSpent : undefined,
          minItems: data.minItems != null ? data.minItems : undefined,
          maxItems: data.maxItems != null ? data.maxItems : undefined,
          benefits: data.benefits ? JSON.stringify(data.benefits) : null,
          color: data.color || '#6366f1',
          icon: data.icon || 'crown',
          priority: data.priority || 1
        }
      });

      return {
        ...tier,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : null
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
      const existing = await prisma.customerLoyaltyTier.findFirst({
        where: { id: tierId, companyId },
        select: {
          id: true,
          programId: true,
          calculationType: true,
          minPoints: true,
          maxPoints: true,
          minSpent: true,
          maxSpent: true,
          minItems: true,
          maxItems: true
        }
      });
      if (!existing) {
        const err = new Error('المستوى غير موجود');
        err.statusCode = 404;
        throw err;
      }

      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.nameAr !== undefined) updateData.nameAr = data.nameAr;
      if (data.calculationType !== undefined) updateData.calculationType = data.calculationType;
      if (data.minPoints !== undefined) updateData.minPoints = data.minPoints;
      if (data.maxPoints !== undefined) updateData.maxPoints = data.maxPoints;
      if (data.minSpent !== undefined) updateData.minSpent = data.minSpent;
      if (data.maxSpent !== undefined) updateData.maxSpent = data.maxSpent;
      if (data.minItems !== undefined) updateData.minItems = data.minItems;
      if (data.maxItems !== undefined) updateData.maxItems = data.maxItems;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.benefits !== undefined) updateData.benefits = data.benefits ? JSON.stringify(data.benefits) : null;

      // التحقق من عدم تكرار/تداخل الحدود مع مستويات أخرى في نفس البرنامج
      const calcType = data.calculationType !== undefined ? data.calculationType : (existing.calculationType || 'POINTS');
      const merged = { ...existing, ...updateData };
      const newRange = this._extractTierRange(calcType, merged);
      if (!this._isRangeEmpty(newRange)) {
        await this._assertNoTierRangeConflict(prisma, companyId, existing.programId, calcType, tierId, newRange);
      }

      const tier = await prisma.customerLoyaltyTier.update({
        where: {
          id: tierId,
          companyId
        },
        data: updateData
      });

      return {
        ...tier,
        benefits: tier.benefits ? JSON.parse(tier.benefits) : null
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
        ...(filters.status && { status: filters.status }),
        ...(filters.search && {
          customer: {
            OR: [
              { firstName: { contains: filters.search } },
              { lastName: { contains: filters.search } },
              { email: { contains: filters.search } },
              { phone: { contains: filters.search } }
            ]
          }
        })
      };

      // Pagination is opt-in: when page/pageSize are passed we return a
      // paginated object, otherwise we keep the legacy array behavior so
      // existing callers (CustomerSegments, CustomerPointsCenter, ...) are
      // not affected.
      const paginated = filters.page !== undefined || filters.pageSize !== undefined;
      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const pageSize = Math.min(200, Math.max(1, parseInt(filters.pageSize, 10) || 50));

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
        },
        ...(paginated ? { skip: (page - 1) * pageSize, take: pageSize } : {})
      });

      const mapped = records.map(record => ({
        ...record,
        program: record.customerLoyaltyProgram,
        tier: record.customerLoyaltyTier,
        metadata: record.metadata ? JSON.parse(record.metadata) : null
      }));

      if (paginated) {
        const total = await prisma.customerLoyaltyRecord.count({ where });
        return {
          records: mapped,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize)
        };
      }

      return mapped;
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

      // تحديد المستوى الأولي حسب طريقة حساب العميل/البرنامج
      const initialMethod = await this.resolveTierMethod(companyId, customerId, programId);
      let initialMetric = initialPoints;
      if (initialMethod !== 'POINTS') {
        initialMetric = await this.computeTierMetric(companyId, customerId, programId, initialMethod);
      }
      const initialTier = await this.determineTier(companyId, programId, initialMetric, initialMethod);

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

      // 🔔 إرسال إشعار كسب النقاط عبر جدول إشعارات العملاء
      try {
        if (updatedRecord.customer && updatedRecord.customer.phone) {
          const scheduleService = require('./customerNotificationScheduleService');
          await scheduleService.sendCustomerNotification({
            companyId,
            eventType: 'LOYALTY_POINTS_AWARDED',
            customer: updatedRecord.customer,
            customerId,
            variables: {
              points: String(points),
              currentPoints: String(updatedRecord.currentPoints),
              reason: reason || 'شكراً لتعاملك معنا'
            }
          });
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

      // 🔔 إشعار استبدال النقاط
      try {
        if (updatedRecord.customer && updatedRecord.customer.phone) {
          const scheduleService = require('./customerNotificationScheduleService');
          await scheduleService.sendCustomerNotification({
            companyId,
            eventType: 'LOYALTY_POINTS_REDEEMED',
            customer: updatedRecord.customer,
            customerId,
            variables: {
              points: String(points),
              cashAmount: cashAmount.toFixed(2),
              programName: program.nameAr || program.name
            }
          });
        }
      } catch (notifyError) {
        console.warn('⚠️ [LOYALTY] Failed to send redemption notification:', notifyError.message);
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

      const method = await this.resolveTierMethod(companyId, customerId, programId);
      const metricValue = await this.computeTierMetric(companyId, customerId, programId, method);

      const newTier = await this.determineTier(companyId, programId, metricValue, method);

      if (newTier && newTier.id !== record.tierId) {
        const oldTier = record.tierId
          ? await prisma.customerLoyaltyTier.findUnique({
              where: { id: record.tierId },
              select: { name: true, nameAr: true, priority: true }
            })
          : null;

        await prisma.customerLoyaltyRecord.update({
          where: {
            id: record.id
          },
          data: {
            tierId: newTier.id
          }
        });

        // 🔔 إشعار تغيير المستوى (ترقية / انخفاض)
        this._notifyTierChange(companyId, customerId, oldTier, newTier).catch(() => {});
      }
    } catch (error) {
      console.error('❌ Error updating customer tier:', error);
      // لا نرمي الخطأ هنا لأنها عملية ثانوية
    }
  }

  /**
   * 🚀 تفعيل نظام المستويات على جميع عملاء الشركة:
   *  - يتأكد أن كل عميل عنده سجل ولاء (تسجيل تلقائي لو مش مسجل)
   *  - يعيد حساب مستوى كل عميل بناءً على طريقة حسابه وحدود المستويات
   *  - بيخلي البادجات (المستوى) تظهر في قائمة العملاء والبوابة
   */
  async activateTiersForAllCustomers(companyId, { programId: fixedProgramId } = {}) {
    const prisma = getSharedPrismaClient();
    try {
      // نجيب أول برنامج نقاط نشط (أو البرنامج المحدد)
      const programs = fixedProgramId
        ? [await prisma.customerLoyaltyProgram.findFirst({ where: { id: fixedProgramId, companyId, status: 'ACTIVE' } })]
        : await prisma.customerLoyaltyProgram.findMany({
            where: { companyId, type: 'POINTS', status: 'ACTIVE' },
            orderBy: { createdAt: 'asc' }
          });

      const activeProgram = (programs || []).find(Boolean);
      if (!activeProgram) {
        console.warn('⚠️ [LOYALTY] No active POINTS program found for activation backfill');
        return { enrolled: 0, updated: 0, reason: 'no_active_program' };
      }

      // كل عملاء الشركة
      const customers = await prisma.customer.findMany({
        where: { companyId },
        select: { id: true }
      });

      let enrolled = 0;
      let updated = 0;

      for (const customer of customers) {
        try {
          const existing = await prisma.customerLoyaltyRecord.findUnique({
            where: {
              customerId_programId: {
                customerId: customer.id,
                programId: activeProgram.id
              }
            }
          });

          if (!existing) {
            await this.enrollCustomer(companyId, customer.id, activeProgram.id, 0);
            enrolled++;
          }

          // إعادة حساب المستوى (بيحدد الـ tierId وبيخلي البادج يظهر)
          await this.updateCustomerTier(companyId, customer.id, activeProgram.id);
          updated++;
        } catch (customerError) {
          // نكمل لباقي العملاء لو حصل خطأ لواحد
          console.warn(`⚠️ [LOYALTY-ACTIVATE] Failed for customer ${customer.id}:`, customerError?.message);
        }
      }

      console.log(`✅ [LOYALTY-ACTIVATE] Tiers applied: ${enrolled} enrolled, ${updated} updated`);
      return { enrolled, updated };
    } catch (error) {
      console.error('❌ Error activating tiers for all customers:', error);
      throw error;
    }
  }

  /**
   * 🔔 إرسال إشعار تغيير المستوى (ترقية/انخفاض) عبر جدول إشعارات العملاء
   */
  async _notifyTierChange(companyId, customerId, oldTier, newTier) {
    try {
      const prisma = getSharedPrismaClient();
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true, phone: true, firstName: true, lastName: true }
      });
      if (!customer || !customer.phone) return;

      const tierName = newTier.nameAr || newTier.name;
      const oldPriority = oldTier?.priority ?? 0;
      const newPriority = Number(newTier.priority) || 0;
      const eventType = newPriority > oldPriority ? 'LOYALTY_TIER_UPGRADED' : 'LOYALTY_TIER_DOWNGRADED';

      const scheduleService = require('./customerNotificationScheduleService');
      await scheduleService.sendCustomerNotification({
        companyId,
        eventType,
        customer,
        customerId: customer.id,
        variables: { tierName }
      });

      // 💳 ترقية فقط (وليس انخفاض): توليد كارت العضوية + إرساله تلقائياً
      if (newPriority > oldPriority) {
        try {
          const { getOrGenerateTierCard, sendTierCardImage } = require('../loyalty/loyaltyTierCardService');
          const card = await getOrGenerateTierCard({
            companyId,
            customerId: customer.id,
            tierId: newTier.id
          });
          if (card.filePath) {
            await sendTierCardImage({
              companyId,
              customer,
              filePath: card.filePath,
              caption: `🎖️ مبروك يا ${customer.firstName || 'عميلنا العزيز'}! وصلت لمستوى "${newTier.nameAr || newTier.name}" 🎉\nكارت عضويتك الجديد وصل لك الآن — استمتع بمزاياك ✨`
            });
          }
        } catch (cardError) {
          console.warn('⚠️ [LOYALTY] Failed to send tier card:', cardError.message);
        }
      }
    } catch (error) {
      console.warn('⚠️ [LOYALTY] Failed to send tier change notification:', error.message);
    }
  }

  /**
   * تحديد طريقة حساب المستوى للعميل: تجاوز العميل > افتراضي البرنامج > نقاط
   */
  async resolveTierMethod(companyId, customerId, programId) {
    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { tierMethod: true }
    });
    if (customer?.tierMethod) return customer.tierMethod;

    const program = await prisma.customerLoyaltyProgram.findFirst({
      where: { companyId, id: programId },
      select: { defaultTierMethod: true }
    });
    return program?.defaultTierMethod || 'POINTS';
  }

  /**
   * حساب القيمة المعيارية حسب الطريقة: نقاط / فلوس مستلمة / عدد القطع المستلمة
   */
  async computeTierMetric(companyId, customerId, programId, method) {
    const prisma = getSharedPrismaClient();

    if (method === 'SPENT') {
      // الـ Order.total هو المبلغ المدفوع فعلاً (بعد الخصومات) — الحقل اسمه total مش finalTotal
      const agg = await prisma.order.aggregate({
        where: { customerId, companyId, status: 'DELIVERED' },
        _sum: { total: true }
      });
      return parseFloat(agg._sum?.total || 0);
    }

    if (method === 'ITEMS') {
      const agg = await prisma.orderItem.aggregate({
        where: { order: { customerId, companyId, status: 'DELIVERED' } },
        _sum: { quantity: true }
      });
      return agg._sum?.quantity || 0;
    }

    if (method === 'ORDER_COUNT') {
      const agg = await prisma.order.aggregate({
        where: { customerId, companyId, status: 'DELIVERED' },
        _count: true
      });
      return agg._count || 0;
    }

    // POINTS
    const record = await prisma.customerLoyaltyRecord.findUnique({
      where: {
        customerId_programId: {
          customerId,
          programId
        }
      }
    });
    return parseFloat(record?.currentPoints || 0);
  }

  /**
   * جلب إعدادات المستويات (الافتراضي + الفئات) لصفحة الإعدادات
   */
  async getTierConfig(companyId, programId) {
    const prisma = getSharedPrismaClient();
    const program = await prisma.customerLoyaltyProgram.findFirst({
      where: { companyId, id: programId },
      select: { defaultTierMethod: true, id: true }
    });

    const tiers = await this.getTiers(companyId, programId);

    return {
      defaultTierMethod: program?.defaultTierMethod || 'POINTS',
      programId,
      tiers
    };
  }

  /**
   * تحديث طريقة الحساب الافتراضية للبرنامج
   */
  async updateDefaultTierMethod(companyId, programId, method) {
    const prisma = getSharedPrismaClient();
    const normalized = ['SPENT', 'ITEMS', 'ORDER_COUNT'].includes(method) ? method : 'POINTS';
    return prisma.customerLoyaltyProgram.update({
      where: { id: programId, companyId },
      data: { defaultTierMethod: normalized }
    });
  }

  /**
   * جلب تجاوز العميل (طريقة الحساب + المزايا المخصصة)
   */
  async getCustomerTierOverride(companyId, customerId) {
    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true, firstName: true, lastName: true, phone: true, tierMethod: true, tierBenefits: true }
    });
    if (!customer) return null;
    return {
      ...customer,
      tierBenefits: customer.tierBenefits ? JSON.parse(customer.tierBenefits) : null
    };
  }

  /**
   * تحديث تجاوز العميل (طريقة الحساب + المزايا المخصصة)
   */
  async updateCustomerTierOverride(companyId, customerId, data) {
    const prisma = getSharedPrismaClient();
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true }
    });
    if (!customer) throw new Error('العميل غير موجود');

    const updateData = {};
    if (data.tierMethod !== undefined) {
      updateData.tierMethod = ['SPENT', 'ITEMS', 'ORDER_COUNT'].includes(data.tierMethod) ? data.tierMethod : (data.tierMethod ? 'POINTS' : null);
    }
    if (data.tierBenefits !== undefined) {
      updateData.tierBenefits = data.tierBenefits ? JSON.stringify(data.tierBenefits) : null;
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: updateData
    });

    // إعادة حساب مستوى العميل فوراً بعد تغيير الطريقة/المزايا
    const records = await prisma.customerLoyaltyRecord.findMany({
      where: { customerId, companyId },
      select: { programId: true }
    });
    for (const r of records) {
      await this.updateCustomerTier(companyId, customerId, r.programId);
    }

    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      tierMethod: updated.tierMethod,
      tierBenefits: updated.tierBenefits ? JSON.parse(updated.tierBenefits) : null
    };
  }

  /**
   * جلب مستوى العميل + المزايا + التقدم للمستوى التالي (للعرض في المتجر)
   */
  async getCustomerTierProgress(companyId, customerId) {
    const prisma = getSharedPrismaClient();
    try {
      const program = await prisma.customerLoyaltyProgram.findFirst({
        where: { companyId, type: 'POINTS', status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' }
      });
      if (!program) return null;

      const method = await this.resolveTierMethod(companyId, customerId, program.id);
      const metric = await this.computeTierMetric(companyId, customerId, program.id, method);

      const tiers = await prisma.customerLoyaltyTier.findMany({
        where: { companyId, programId: program.id, calculationType: method },
        orderBy: { minPoints: 'asc' }
      });

      // ترتيب حسب الحد الأدنى الصحيح لكل طريقة
      const sortKey = (t) => {
        if (method === 'SPENT') return Number(t.minSpent || 0);
        if (method === 'ITEMS' || method === 'ORDER_COUNT') return Number(t.minItems || 0);
        return Number(t.minPoints || 0);
      };
      const sorted = [...tiers].sort((a, b) => sortKey(a) - sortKey(b));

      const currentTier = await this.determineTier(companyId, program.id, metric, method);
      let nextTier = null;
      for (const t of sorted) {
        if (sortKey(t) > metric && (!nextTier || sortKey(t) < sortKey(nextTier))) {
          nextTier = t;
        }
      }

      const metricLabels = {
        POINTS: { label: 'نقطة', remainingPrefix: 'فاضل', remainingSuffix: 'نقطة' },
        SPENT: { label: 'ج.م', remainingPrefix: 'فاضل', remainingSuffix: 'ج.م' },
        ITEMS: { label: 'قطعة', remainingPrefix: 'فاضل', remainingSuffix: 'قطعة' },
        ORDER_COUNT: { label: 'أوردر', remainingPrefix: 'فاضل', remainingSuffix: 'أوردر' },
      };
      const ml = metricLabels[method] || metricLabels.POINTS;

      const rewards = await this.getCustomerActiveRewards(companyId, customerId);

      // الخصم التلقائي: الكوبون النشط + رصيد المحفظة (الكاش باك)
      let activeVoucher = null;
      let walletBalance = 0;
      let loyaltySystem = 'TIERS';
      try {
        const autoDiscountService = require('../autoDiscountService');
        const _adSettings = await autoDiscountService.getSettings(companyId);
        loyaltySystem = _adSettings.loyaltySystem || 'TIERS';
        if (await autoDiscountService.isAutoDiscountActive(companyId)) {
          const voucher = await autoDiscountService.getActiveVoucher(customerId, companyId);
          activeVoucher = autoDiscountService.mapVoucherToPublic(voucher);
          const wallet = await prisma.customerWallet.findFirst({ where: { customerId, companyId, isActive: true } });
          walletBalance = wallet ? Number(wallet.balance) : 0;
        }
      } catch (voucherError) {
        console.error('⚠️ [TIER-PROGRESS] Failed to load voucher/wallet:', voucherError?.message);
      }

      const parseBenefits = (tier) => {
        if (!tier || !tier.benefits) return null;
        try {
          return typeof tier.benefits === 'string' ? JSON.parse(tier.benefits) : tier.benefits;
        } catch (e) { return null; }
      };

      return {
        customerId,
        programId: program.id,
        method,
        metricLabel: ml.label,
        currentMetric: Number(metric),
        tier: currentTier ? {
          id: currentTier.id,
          name: currentTier.name,
          nameAr: currentTier.nameAr,
          color: currentTier.color,
          icon: currentTier.icon,
          benefits: parseBenefits(currentTier)
        } : null,
        nextTier: nextTier ? {
          id: nextTier.id,
          name: nextTier.name,
          nameAr: nextTier.nameAr,
          color: nextTier.color,
          icon: nextTier.icon,
          targetMetric: sortKey(nextTier),
          remainingMetric: Math.max(0, sortKey(nextTier) - Number(metric)),
          benefits: parseBenefits(nextTier)
        } : null,
        rewards: rewards || { freeShipping: false, discountPercent: 0 },
        activeVoucher,
        walletBalance,
        loyaltySystem,
        tiersEnabled: _adSettings.tiersEnabled === true,
        autoDiscountEnabled: _adSettings.autoDiscountEnabled === true,
        discountCombination: _adSettings.discountCombination || 'ADDITIVE',
        maxTotalDiscountPercent: Number(_adSettings.maxTotalDiscountPercent || 0)
      };
    } catch (error) {
      console.error('❌ Error getting customer tier progress:', error);
      return null;
    }
  }

  /**
   * تحديد المستوى بناءً على طريقة الحساب (نقاط / فلوس / قطع)
   */
  async determineTier(companyId, programId, metricValue, method = 'POINTS') {
    const prisma = getSharedPrismaClient();
    try {
      const tiers = await prisma.customerLoyaltyTier.findMany({
        where: {
          companyId,
          programId,
          calculationType: method
        },
        orderBy: {
          priority: 'desc' // أعلى أولوية أولاً
        }
      });

      const val = Number(metricValue);

      for (const tier of tiers) {
        let match = false;
        if (method === 'SPENT') {
          const min = tier.minSpent != null ? Number(tier.minSpent) : 0;
          const max = tier.maxSpent != null ? Number(tier.maxSpent) : null;
          match = val >= min && (max == null || val <= max);
        } else if (method === 'ITEMS' || method === 'ORDER_COUNT') {
          const min = tier.minItems != null ? Number(tier.minItems) : 0;
          const max = tier.maxItems != null ? Number(tier.maxItems) : null;
          match = val >= min && (max == null || val <= max);
        } else {
          // POINTS
          const min = tier.minPoints != null ? Number(tier.minPoints) : 0;
          const max = tier.maxPoints != null ? Number(tier.maxPoints) : null;
          match = val >= min && (max == null || val <= max);
        }

        if (match) {
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

      // دمج مزايا مستوى العميل الحالي + المزايا المخصصة للعميل (من صفحة إعدادات المستويات)
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, companyId },
        select: { tierBenefits: true }
      });

      const parseBenefits = (raw) => {
        if (!raw) return {};
        try {
          return typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          return {};
        }
      };

      const tierBenefits = records[0]?.customerLoyaltyTier ? parseBenefits(records[0].customerLoyaltyTier.benefits) : {};
      const overrideBenefits = customer ? parseBenefits(customer.tierBenefits) : {};

      const applyBenefits = (b) => {
        if (!b || typeof b !== 'object') return;
        if (b.freeShipping) effectiveRewards.freeShipping = true;
        const d = Number(b.discountPercent || 0);
        if (d > 0 && d > effectiveRewards.discountPercent) effectiveRewards.discountPercent = d;
      };
      applyBenefits(tierBenefits);
      applyBenefits(overrideBenefits);

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
          customerLoyaltyProgram: true,
          customer: { select: { id: true, phone: true, firstName: true, lastName: true } }
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

          // 🔔 إشعار انتهاء صلاحية النقاط
          try {
            if (record.customer && record.customer.phone) {
              const scheduleService = require('./customerNotificationScheduleService');
              await scheduleService.sendCustomerNotification({
                companyId: record.companyId,
                eventType: 'LOYALTY_POINTS_EXPIRED',
                customer: record.customer,
                customerId: record.customerId,
                variables: {
                  points: String(pointsToExpire),
                  programName: program.nameAr || program.name
                }
              });
            }
          } catch (notifyError) {
            console.warn('⚠️ [LOYALTY] Failed to send expiry notification:', notifyError.message);
          }

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
   * ⏰ تنبيه قرب انتهاء صلاحية النقاط
   * يرسل إشعار LOYALTY_POINTS_EXPIRY_WARNING قبل انتهاء الصلاحية بعدة أيام
   * (المدة تُقرأ من جدول إشعارات العملاء — delayValue لحدث التنبيه).
   */
  async processExpiryWarnings(companyId = null) {
    const prisma = getSharedPrismaClient();
    const scheduleService = require('./customerNotificationScheduleService');
    try {
      const where = companyId ? { companyId, status: 'ACTIVE' } : { status: 'ACTIVE' };
      const records = await prisma.customerLoyaltyRecord.findMany({
        where,
        include: {
          customerLoyaltyProgram: true,
          customer: { select: { id: true, phone: true, firstName: true, lastName: true } }
        }
      });

      let totalWarned = 0;

      for (const record of records) {
        const program = record.customerLoyaltyProgram;
        const expiryMonths = program.expiryMonths || 12;

        if (!record.lastPointsEarned) continue;
        if (parseFloat(record.currentPoints) <= 0) continue;

        const expiryDate = new Date(record.lastPointsEarned);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
        if (expiryDate <= new Date()) continue; // خلصت الصلاحية — يتعامل معها processExpiredPoints

        // مدة التنبيه من جدول الإشعارات (افتراضياً 7 أيام)
        const warningDays = await this._getExpiryWarningDays(record.companyId);

        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > warningDays) continue;

        // منع تكرار الإشعار — نرسل مرة واحدة فقط لنفس موعد انتهاء الصلاحية
        const metadata = record.metadata ? JSON.parse(record.metadata) : {};
        const lastExpiryWarnAt = metadata.expiryWarningSentAt ? new Date(metadata.expiryWarningSentAt) : null;
        const warnedForSameExpiry = lastExpiryWarnAt && lastExpiryWarnAt >= new Date(expiryDate.getTime() - 24 * 60 * 60 * 1000) && lastExpiryWarnAt <= new Date(expiryDate.getTime() + 24 * 60 * 60 * 1000);

        if (warnedForSameExpiry) continue;

        try {
          if (record.customer && record.customer.phone) {
            await scheduleService.sendCustomerNotification({
              companyId: record.companyId,
              eventType: 'LOYALTY_POINTS_EXPIRY_WARNING',
              customer: record.customer,
              customerId: record.customerId,
              variables: {
                points: String(parseFloat(record.currentPoints)),
                expiryDate: expiryDate.toLocaleDateString('ar-EG'),
                programName: program.nameAr || program.name
              }
            });

            await prisma.customerLoyaltyRecord.update({
              where: { id: record.id },
              data: {
                metadata: JSON.stringify({
                  ...metadata,
                  expiryWarningSentAt: new Date().toISOString(),
                  expiryWarningTargetDate: expiryDate.toISOString()
                })
              }
            });

            totalWarned++;
          }
        } catch (notifyError) {
          console.warn('⚠️ [LOYALTY] Failed to send expiry warning:', notifyError.message);
        }
      }

      return { success: true, totalWarned };
    } catch (error) {
      console.error('❌ Error processing expiry warnings:', error);
      throw error;
    }
  }

  /**
   * عدد أيام تنبيه انتهاء الصلاحية من جدول إشعارات العملاء
   */
  async _getExpiryWarningDays(companyId) {
    try {
      const scheduleService = require('./customerNotificationScheduleService');
      const schedule = await scheduleService.getEffectiveSchedule(companyId, 'LOYALTY_POINTS_EXPIRY_WARNING');
      const days = schedule?.delayUnit === 'DAYS' ? Number(schedule.delayValue) : 0;
      return Number.isFinite(days) && days >= 0 ? days : 7;
    } catch (error) {
      return 7;
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

      // منع التكرار: لو النقاط اتضافت للطلب ده قبل كده، نتخطى
      const orderMeta = parseJsonMaybe(order.metadata, {});
      if (orderMeta.loyaltyPoints && orderMeta.loyaltyPoints.applied) {
        return { applied: false, reason: 'already_awarded' };
      }

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
      const awardedPrograms = [];

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

        // حساب النقاط (على المبلغ المدفوع فعلاً بعد الخصومات)
        let points = 0;
        const baseAmount = parseFloat(order.finalTotal || order.total || order.subtotal || 0);

        if (program.pointsPerAmount && parseFloat(program.pointsPerAmount) > 0) {
          points = Math.floor(baseAmount / parseFloat(program.pointsPerAmount)) * parseFloat(program.pointsPerPurchase || 1);
        } else {
          points = parseFloat(program.pointsPerPurchase || 0);
        }

        // تطبيق سقف النقاط للطلب الواحد إن كان محدد
        const maxPerTx = program.maxPointsPerTransaction ? parseFloat(program.maxPointsPerTransaction) : 0;
        if (maxPerTx > 0 && points > maxPerTx) {
          points = maxPerTx;
        }

        if (points > 0) {
          // 🔒 منح نقاط معلّقة (PENDING_RELEASE) بدل إضافتها للرصيد مباشرة
          const award = await this.awardPendingPoints({
            companyId,
            customerId: order.customerId,
            programId: program.id,
            points,
            orderId: order.id,
            reason: `طلب #${order.orderNumber}`
          });
          if (award.awarded) {
            totalPointsAwarded += award.points;
            awardedPrograms.push({ programId: program.id, points: award.points, status: 'PENDING_RELEASE' });
          }
        }
      }

      // 💸 كاش باك معلّق (PENDING_RELEASE) — يُطلق بعد مهلة الإرجاع (releaseEligiblePoints)
      try {
        const cashbackPrograms = await prisma.customerLoyaltyProgram.findMany({
          where: { companyId, type: 'CASHBACK', status: 'ACTIVE' }
        });
        const cbBase = parseFloat(order.finalTotal || order.total || order.subtotal || 0);
        for (const cb of cashbackPrograms) {
          const rate = parseFloat(cb.cashbackRate || cb.pointsPerPurchase || 0.05) || 0.05;
          const cbAmount = Math.floor(cbBase * rate * 100) / 100;
          if (cbAmount > 0) {
            await this.awardPendingCashback({
              companyId,
              customerId: order.customerId,
              orderId: order.id,
              amount: cbAmount,
              programId: cb.id,
              referenceId: order.id
            });
          }
        }
      } catch (cbError) {
        console.warn('⚠️ [LOYALTY] cashback pending award failed:', cbError?.message);
      }

      if (totalPointsAwarded > 0) {
        const nextMeta = {
          ...orderMeta,
          loyaltyPoints: {
            applied: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalPointsAwarded,
            programs: awardedPrograms,
            appliedAt: new Date().toISOString()
          }
        };
        await prisma.order.update({
          where: { id: order.id },
          data: { metadata: JSON.stringify(nextMeta) }
        });
      }

      return { applied: true, totalPointsAwarded, programs: awardedPrograms };
    } catch (error) {
      console.error('❌ Error applying loyalty points for order:', error);
      throw error;
    }
  }

  /**
   * خصم نقاط من العميل (مستخدم عند إرجاع نقاط المرتجعات)
   */
  async subtractPoints(companyId, customerId, programId, points, reason = null) {
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
        return { deducted: false, reason: 'record_not_found' };
      }

      if (record.status !== 'ACTIVE') {
        return { deducted: false, reason: 'record_inactive' };
      }

      const toDeduct = Math.min(Math.abs(points), parseFloat(record.currentPoints || 0));
      if (toDeduct <= 0) return { deducted: false, reason: 'no_points' };

      // استرجاع النقاط: يخصم من الرصيد الحالي ومن إجمالي المكتسب (مش من المستبدل)
      const prevMeta = parseJsonMaybe(record.metadata, {});
      const updatedRecord = await prisma.customerLoyaltyRecord.update({
        where: { id: record.id },
        data: {
          currentPoints: { decrement: toDeduct },
          totalEarned: { decrement: toDeduct },
          lastActivity: new Date(),
          metadata: reason ? JSON.stringify({ ...prevMeta, lastReason: reason }) : record.metadata
        }
      });

      return { deducted: true, amount: toDeduct, record: updatedRecord };
    } catch (error) {
      console.error('❌ Error subtracting points:', error);
      throw error;
    }
  }

  /**
   * إرجاع نقاط الولاء عند إرجاع/استرداد طلب تم توصيله
   */
  async reverseLoyaltyPointsForReturn({ returnRequestId, companyId, changedBy }) {
    const prisma = getSharedPrismaClient();
    try {
      const rr = await prisma.returnRequest.findFirst({
        where: { id: returnRequestId, companyId },
        include: {
          order: {
            select: {
              id: true,
              companyId: true,
              customerId: true,
              total: true,
              metadata: true,
              orderNumber: true
            }
          }
        }
      });

      if (!rr || !rr.order) return { reversed: false, reason: 'request_not_found' };

      const meta = parseJsonMaybe(rr.order.metadata, {});
      const lp = meta.loyaltyPoints;
      if (!lp || !lp.applied) return { reversed: false, reason: 'no_points_on_order' };

      const recordedReversals = lp.reversals || {};
      if (recordedReversals[returnRequestId]) {
        return { reversed: false, reason: 'already_reversed' };
      }

      const orderTotal = Math.max(0.01, Number(rr.order.total || 0));
      const refundAmount = Number(rr.refundAmount || 0);
      const ratio = Math.max(0, Math.min(1, refundAmount / orderTotal));

      const reversedPrograms = [];
      let totalReversed = 0;

      for (const award of (lp.programs || [])) {
        // floor لمنع الإفراط في الخصم على الكسور
        const reversePoints = Math.floor((Number(award.points || 0)) * ratio);
        if (reversePoints <= 0) continue;

        const result = await this.subtractPoints(
          rr.order.companyId,
          rr.order.customerId,
          award.programId,
          reversePoints,
          `إرجاع نقاط الطلب #${rr.order.orderNumber} بمرتجع #${rr.id}`
        );

        if (result.deducted) {
          totalReversed += result.amount;
          reversedPrograms.push({ programId: award.programId, points: result.amount });
        }
      }

      if (totalReversed <= 0) return { reversed: false, reason: 'reverse_points_zero' };

      const nextMeta = { ...meta };
      nextMeta.loyaltyPoints = {
        ...lp,
        reversals: {
          ...recordedReversals,
          [returnRequestId]: {
            points: totalReversed,
            programs: reversedPrograms,
            ratio: ratio.toFixed(2),
            date: new Date().toISOString()
          }
        }
      };

      await prisma.order.update({
        where: { id: rr.order.id },
        data: { metadata: JSON.stringify(nextMeta) }
      });

      console.log(`✅ Reversed ${totalReversed} loyalty points for return on order #${rr.order.orderNumber}`);

      return { reversed: true, points: totalReversed, programs: reversedPrograms };
    } catch (error) {
      console.error('❌ Error reversing loyalty points for return:', error);
      throw error;
    }
  }

  /**
   * إرجاع نقاط الولاء عند إلغاء طلب تم توصيله (بدون مرتجع)
   */
  async reverseLoyaltyPointsForOrder({ orderId, companyId, changedBy, reason }) {
    const prisma = getSharedPrismaClient();
    try {
      const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
        select: { id: true, companyId: true, customerId: true, total: true, metadata: true, orderNumber: true }
      });

      if (!order || !order.customerId) return { reversed: false, reason: 'order_not_found' };

      const meta = parseJsonMaybe(order.metadata, {});
      const lp = meta.loyaltyPoints;
      if (!lp || !lp.applied) return { reversed: false, reason: 'no_points_on_order' };

      if (lp.cancelledReversed) return { reversed: false, reason: 'already_reversed' };

      let totalReversed = 0;
      const reversedPrograms = [];

      for (const award of (lp.programs || [])) {
        const points = Number(award.points || 0);
        if (points <= 0) continue;

        const result = await this.subtractPoints(
          order.companyId,
          order.customerId,
          award.programId,
          points,
          reason || `إلغاء الطلب #${order.orderNumber}`
        );

        if (result.deducted) {
          totalReversed += result.amount;
          reversedPrograms.push({ programId: award.programId, points: result.amount });
        }
      }

      if (totalReversed <= 0) return { reversed: false, reason: 'reverse_points_zero' };

      const nextMeta = { ...meta };
      nextMeta.loyaltyPoints = {
        ...lp,
        cancelledReversed: true,
        cancelledReversal: {
          points: totalReversed,
          programs: reversedPrograms,
          date: new Date().toISOString()
        }
      };

      await prisma.order.update({
        where: { id: order.id },
        data: { metadata: JSON.stringify(nextMeta) }
      });

      console.log(`✅ Reversed ${totalReversed} loyalty points for cancelled order #${order.orderNumber}`);

      return { reversed: true, points: totalReversed, programs: reversedPrograms };
    } catch (error) {
      console.error('❌ Error reversing loyalty points for cancelled order:', error);
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

      // 🔔 إرسال إشعار كسب النقاط عبر جدول إشعارات العملاء إذا كان التعديل إيجابياً
      if (isIncrement) {
        try {
          const customer = await prisma.customer.findUnique({ where: { id: customerId } });
          if (customer && customer.phone) {
            const scheduleService = require('./customerNotificationScheduleService');
            await scheduleService.sendCustomerNotification({
              companyId,
              eventType: 'LOYALTY_POINTS_AWARDED',
              customer,
              customerId,
              variables: {
                points: String(points),
                currentPoints: String(updatedRecord.currentPoints),
                reason: reason || 'تعديل رصيد من قبل الإدارة'
              }
            });
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

  /**
   * 🏷️ إثراء قائمة العملاء بمستوى الولاء (badge) لكل عميل — بتعرض في صفحة العملاء
   * بترجع نفس الـ customers مع إضافة حقل loyaltyTier لكل واحد
   */
  async enrichCustomersWithTier(companyId, customers) {
    const prisma = getSharedPrismaClient();
    try {
      if (!Array.isArray(customers) || customers.length === 0) return customers;

      const ids = customers.map((c) => c.id);
      const program = await prisma.customerLoyaltyProgram.findFirst({
        where: { companyId, type: 'POINTS', status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      });
      if (!program) return customers;

      const records = await prisma.customerLoyaltyRecord.findMany({
        where: {
          companyId,
          programId: program.id,
          customerId: { in: ids },
          status: 'ACTIVE'
        },
        include: {
          customerLoyaltyTier: {
            select: { id: true, name: true, nameAr: true, color: true, icon: true }
          }
        }
      });

      const tierByCustomer = new Map();
      for (const r of records) {
        if (r.tierId && r.customerLoyaltyTier) {
          tierByCustomer.set(r.customerId, r.customerLoyaltyTier);
        }
      }

      return customers.map((c) => {
        const tier = tierByCustomer.get(c.id) || null;
        return {
          ...c,
          loyaltyTier: tier
            ? {
                id: tier.id,
                name: tier.name,
                nameAr: tier.nameAr,
                color: tier.color,
                icon: tier.icon
              }
            : null
        };
      });
    } catch (error) {
      console.error('❌ Error enriching customers with tier:', error);
      return customers;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔒 Loyalty Modernization — PENDING_RELEASE lifecycle, dynamic cashback engine,
  //    referral fraud guard, discount cap, gamification hooks
  //    (الإصدار الحديث: دورة الإطلاق، محرك الكاش باك، حماية الإحالات، سقف الخصم)
  // ═══════════════════════════════════════════════════════════════════════════

  _clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  /**
   * 🔒 منح نقاط معلّقة (PENDING_RELEASE) بدل إضافتها للرصيد المتاح مباشرة.
   * لا تُضاف لـ currentPoints حتى يتم إطلاقها عبر releaseEligiblePoints.
   */
  async awardPendingPoints({ companyId, customerId, programId, points, orderId, reason }) {
    const prisma = getSharedPrismaClient();
    try {
      const pts = Math.floor(Number(points));
      if (!pts || pts <= 0) return { awarded: false, reason: 'no_points' };

      const record = await prisma.customerLoyaltyRecord.findUnique({
        where: { customerId_programId: { customerId, programId } }
      });
      if (!record) return { awarded: false, reason: 'no_record' };
      if (record.status !== 'ACTIVE') return { awarded: false, reason: 'inactive' };

      // 🛡️ منع التكرار: لو فيه نشاط نقاط معلّق لنفس الأوردر
      if (prisma.loyaltyActivity) {
        const existing = await prisma.loyaltyActivity.findFirst({
          where: { companyId, customerId, type: 'ORDER_POINTS', referenceId: orderId, status: { in: ['PENDING', 'APPROVED'] } }
        }).catch(() => null);
        if (existing) return { awarded: false, reason: 'already_awarded', activityId: existing.id };
      }

      await prisma.customerLoyaltyRecord.update({
        where: { id: record.id },
        data: {
          pendingPoints: { increment: pts },
          lastActivity: new Date(),
          metadata: reason ? JSON.stringify({ ...(record.metadata ? JSON.parse(record.metadata) : {}), lastReason: reason }) : record.metadata
        }
      });

      let activityId = null;
      if (prisma.loyaltyActivity) {
        const activity = await prisma.loyaltyActivity.create({
          data: { companyId, customerId, type: 'ORDER_POINTS', points: pts, status: 'PENDING', referenceId: orderId }
        }).catch(() => null);
        activityId = activity?.id;
      }

      return { awarded: true, points: pts, activityId };
    } catch (error) {
      console.error('❌ Error awarding pending points:', error);
      throw error;
    }
  }

  /**
   * 🔒 منح كاش باك معلّق (PENDING_RELEASE) — لا يُضاف لرصيد المحفظة إلا بعد الإطلاق.
   */
  async awardPendingCashback({ companyId, customerId, orderId, amount, currency, programId, referenceId }) {
    const prisma = getSharedPrismaClient();
    try {
      const amt = Number(amount);
      if (!amt || amt <= 0) return { awarded: false, reason: 'no_amount' };
      const ref = referenceId || orderId;

      let wallet = await prisma.customerWallet.findFirst({ where: { customerId, companyId, isActive: true } });
      if (!wallet) {
        try { const WalletService = require('../walletService'); wallet = await WalletService.createWallet(customerId, companyId); } catch (e) { wallet = null; }
      }
      if (!wallet) return { awarded: false, reason: 'no_wallet' };

      // 🛡️ منع التكرار
      if (prisma.walletTransaction) {
        const dup = await prisma.walletTransaction.findFirst({
          where: { walletId: wallet.id, type: 'CASHBACK', status: 'PENDING_RELEASE', referenceId: ref }
        }).catch(() => null);
        if (dup) return { awarded: false, reason: 'already_awarded', transactionId: dup.id };
      }

      const balanceNow = Number(wallet.balance || 0);
      const tx = await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'CASHBACK',
          amount: amt,
          balanceBefore: balanceNow,
          balanceAfter: balanceNow, // لم يتغير الرصيد — ينتظر الإطلاق
          orderId: orderId || null,
          description: `كاش باك تحت الإطلاق — أوردر #${orderId || ''}`,
          status: 'PENDING_RELEASE',
          referenceId: ref
        }
      });

      // عكس المبلغ في سجل الولاء (pendingCashback)
      const record = await prisma.customerLoyaltyRecord.findFirst({ where: { companyId, customerId, status: 'ACTIVE' } });
      if (record) {
        await prisma.customerLoyaltyRecord.update({ where: { id: record.id }, data: { pendingCashback: { increment: amt }, lastActivity: new Date() } });
      }

      return { awarded: true, amount: amt, transactionId: tx.id };
    } catch (error) {
      console.error('❌ Error awarding pending cashback:', error);
      throw error;
    }
  }

  /**
   * 🔓 إطلاق النقاط/الكاش باك المعلّقة التي تجاوزت مهلة الإرجاع (Company.cashbackReturnWindowDays).
   * يُربط بالأوردر: يُطلق فقط إذا وُسلّم الأوردر منذ أكثر من المهلة.
   * Hook لاحقاً عبر الـ scheduler (Cron).
   */
  async releaseEligiblePoints({ companyId } = {}) {
    const prisma = getSharedPrismaClient();
    try {
      const company = companyId ? await prisma.company.findUnique({ where: { id: companyId }, select: { cashbackReturnWindowDays: true } }) : null;
      const windowDays = company?.cashbackReturnWindowDays != null ? Number(company.cashbackReturnWindowDays) : 14;
      const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

      let releasedTx = 0;
      let releasedActs = 0;

      // 1) إطلاق معاملات الكاش باك المعلّقة
      if (prisma.walletTransaction) {
        const pendingTx = await prisma.walletTransaction.findMany({
          where: { status: 'PENDING_RELEASE', ...(companyId ? { wallet: { companyId } } : {}) },
          include: { wallet: true, order: true }
        });
        for (const tx of pendingTx) {
          const order = tx.order;
          const baseDate = order ? new Date(order.deliveredAt || order.updatedAt || order.createdAt) : new Date(tx.createdAt);
          if (baseDate > cutoff) continue;

          const newBalance = Number(tx.wallet.balance || 0) + Number(tx.amount || 0);
          await prisma.customerWallet.update({ where: { id: tx.walletId }, data: { balance: newBalance, totalEarned: { increment: Number(tx.amount || 0) } } });
          await prisma.walletTransaction.update({ where: { id: tx.id }, data: { status: 'RELEASED', releasedAt: new Date(), balanceAfter: newBalance } });
          releasedTx++;

          const rec = await prisma.customerLoyaltyRecord.findFirst({ where: { companyId: tx.wallet.companyId, customerId: tx.wallet.customerId, status: 'ACTIVE' } });
          if (rec && Number(rec.pendingCashback || 0) > 0) {
            await prisma.customerLoyaltyRecord.update({ where: { id: rec.id }, data: { pendingCashback: { decrement: Number(tx.amount || 0) }, releasedAt: new Date() } });
          }
        }
      }

      // 2) إطلاق النقاط المعلّقة (LoyaltyActivity PENDING) المرتبطة بأوردر مُسلّم
      if (prisma.loyaltyActivity) {
        const pendingActs = await prisma.loyaltyActivity.findMany({ where: { status: 'PENDING', type: 'ORDER_POINTS', referenceId: { not: null } } });
        const orderIds = [...new Set(pendingActs.map(a => a.referenceId).filter(Boolean))];
        const orders = orderIds.length ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, deliveredAt: true, updatedAt: true, createdAt: true } }) : [];
        const deliveredMap = new Map(orders.map(o => [o.id, new Date(o.deliveredAt || o.updatedAt || o.createdAt)]));

        for (const act of pendingActs) {
          const d = deliveredMap.get(act.referenceId);
          if (!d || d > cutoff) continue;

          const record = await prisma.customerLoyaltyRecord.findFirst({ where: { companyId: act.companyId, customerId: act.customerId, status: 'ACTIVE' } });
          if (!record) continue;

          const pts = Number(act.points || 0);
          await prisma.customerLoyaltyRecord.update({
            where: { id: record.id },
            data: {
              pendingPoints: { decrement: pts },
              currentPoints: { increment: pts },
              totalEarned: { increment: pts },
              releasedAt: new Date(),
              lastActivity: new Date()
            }
          });
          await prisma.loyaltyActivity.update({ where: { id: act.id }, data: { status: 'APPROVED', approvedAt: new Date() } });
          releasedActs++;

          try { await this.updateCustomerTier(act.companyId, act.customerId, record.programId); } catch (e) { /* non-critical */ }
        }
      }

      return { success: true, releasedTransactions: releasedTx, releasedActivities: releasedActs };
    } catch (error) {
      console.error('❌ Error releasing eligible points:', error);
      throw error;
    }
  }

  /**
   * 🔁 التراجع عن النقاط/الكاش باك عند إرجاع أوردر (Idempotent).
   * - يلغي معاملات PENDING_RELEASE (لا تغيّر في الرصيد لأنها لم تُطلق بعد).
   * - يخصم من الرصيد لو كانت RELEASED (مُطلقة فعلاً) ويمنع سحبها لاحقاً.
   * يُستدعى من مسار المرتجعات (returnController) — آمن للاستدعاء المزدوج.
   */
  async rollbackPointsOnRefund(companyId, orderId) {
    const prisma = getSharedPrismaClient();
    try {
      if (!orderId) return { rolledBack: false, reason: 'missing_orderId' };

      let handledTx = 0;
      let handledActs = 0;

      if (prisma.walletTransaction) {
        const txs = await prisma.walletTransaction.findMany({
          where: { orderId, ...(companyId ? { wallet: { companyId } } : {}) }
        });
        for (const tx of txs) {
          if (tx.status === 'CANCELLED') continue; // idempotent skip
          if (tx.type === 'CASHBACK' || tx.type === 'LOYALTY') {
            if (tx.status === 'RELEASED') {
              await prisma.customerWallet.update({ where: { id: tx.walletId }, data: { balance: { decrement: Number(tx.amount || 0) } } });
            }
            await prisma.walletTransaction.update({ where: { id: tx.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
            handledTx++;

            const rec = await prisma.customerLoyaltyRecord.findFirst({ where: { companyId: tx.wallet.companyId, customerId: tx.wallet.customerId, status: 'ACTIVE' } });
            if (rec && Number(rec.pendingCashback || 0) > 0) {
              await prisma.customerLoyaltyRecord.update({ where: { id: rec.id }, data: { pendingCashback: { decrement: Number(tx.amount || 0) } } });
            }
          }
        }
      }

      if (prisma.loyaltyActivity) {
        const acts = await prisma.loyaltyActivity.findMany({ where: { referenceId: orderId, ...(companyId ? { companyId } : {}) } });
        const customerId = acts[0]?.customerId;
        const record = customerId ? await prisma.customerLoyaltyRecord.findFirst({ where: { companyId, customerId, status: 'ACTIVE' } }) : null;
        for (const act of acts) {
          if (act.status === 'CANCELLED') continue;
          if (act.status === 'APPROVED') {
            const pts = Number(act.points || 0);
            if (record && pts > 0) {
              await prisma.customerLoyaltyRecord.update({ where: { id: record.id }, data: { currentPoints: { decrement: pts }, pendingPoints: { decrement: pts }, totalEarned: { decrement: pts } } });
            }
          }
          await prisma.loyaltyActivity.update({ where: { id: act.id }, data: { status: 'CANCELLED' } });
          handledActs++;
        }
      }

      return { rolledBack: true, handledTransactions: handledTx, handledActivities: handledActs, alreadyHandled: handledTx === 0 && handledActs === 0 };
    } catch (error) {
      console.error('❌ Error rolling back points on refund:', error);
      throw error;
    }
  }

  /**
   * 🛡️ B) سقف الخصم + منع دمج الكوبون مع الولاء (Company.maxDiscountCap & Coupon.allowWithLoyalty).
   * يرجع القيم بعد التقييد النسبي + علم allowed.
   */
  async enforceDiscountCap({ companyId, orderTotal, couponDiscount = 0, walletAmount = 0, pointsAmount = 0, couponAllowWithLoyalty = true }) {
    const prisma = getSharedPrismaClient();
    try {
      let cap = 0.25;
      if (companyId && prisma.company) {
        const company = await prisma.company.findUnique({ where: { id: companyId }, select: { maxDiscountCap: true } }).catch(() => null);
        if (company?.maxDiscountCap != null) cap = Number(company.maxDiscountCap);
      }

      const total = Number(orderTotal) || 0;
      const cd = Number(couponDiscount) || 0;
      const wa = Number(walletAmount) || 0;
      const pa = Number(pointsAmount) || 0;
      const maxAllowed = total * cap;

      // الكوبون لا يسمح بالدمج مع الولاء → يُرفض جزء الولاء بالكامل
      if (couponAllowWithLoyalty === false) {
        return {
          allowed: false,
          loyaltyAllowed: false,
          cappedTotal: cd,
          maxAllowed,
          couponDiscount: cd,
          walletAmount: 0,
          pointsAmount: 0,
          message: 'coupon_not_combinable_with_loyalty'
        };
      }

      const totalDiscount = cd + wa + pa;
      if (totalDiscount <= maxAllowed) {
        return { allowed: true, loyaltyAllowed: true, cappedTotal: totalDiscount, maxAllowed, couponDiscount: cd, walletAmount: wa, pointsAmount: pa };
      }

      // تقييد نسبي لكل مكوّن (يحافظ على نسبة each)
      const scale = maxAllowed / totalDiscount;
      return {
        allowed: true,
        loyaltyAllowed: true,
        capped: true,
        cappedTotal: maxAllowed,
        maxAllowed,
        couponDiscount: cd * scale,
        walletAmount: wa * scale,
        pointsAmount: pa * scale
      };
    } catch (error) {
      console.error('❌ Error enforcing discount cap:', error);
      // في حالة الخطأ نسمح بالخصم الكامل حتى لا نوقف الطلب
      return {
        allowed: true,
        loyaltyAllowed: true,
        cappedTotal: (Number(couponDiscount) || 0) + (Number(walletAmount) || 0) + (Number(pointsAmount) || 0),
        maxAllowed: Number(orderTotal) || 0,
        couponDiscount: Number(couponDiscount) || 0,
        walletAmount: Number(walletAmount) || 0,
        pointsAmount: Number(pointsAmount) || 0
      };
    }
  }

  /**
   * 💡 C) محرك الكاش باك حسب هامش الربح (margin-aware, 2026).
   * - لو Company.dynamicCashbackEnabled=false → يرجع كاش باك ثابت (0 هنا؛ يُستبدل بالمنطق القديم عند الحاجة).
   * - لو مفعّل: rate = clamp(marginPct/100 * FACTOR, MIN, MAX) — هامش أعلى → كاش باك أعلى.
   */
  async calculateDynamicCashback({ companyId, productId, categoryId, baseAmount }) {
    const prisma = getSharedPrismaClient();
    try {
      const company = companyId && prisma.company ? await prisma.company.findUnique({ where: { id: companyId }, select: { dynamicCashbackEnabled: true, currency: true } }).catch(() => null) : null;
      const isDynamic = !!company?.dynamicCashbackEnabled;
      const currency = company?.currency || 'EGP';
      const base = Number(baseAmount) || 0;

      if (!isDynamic) {
        return { cashback: 0, rate: 0, isDynamic: false, currency };
      }

      // قراءة هامش الربح من المنتج، وإلا من الفئة، وإلا قيمة افتراضية 10%
      const MARGIN_FACTOR = 0.5;  // rate = (margin%/100) * 0.5  مثال: هامش 20% → كاش باك 10%
      const MIN_RATE = 0.01;      // أدنى نسبة كاش باك 1%
      const MAX_RATE = 0.20;      // أقصى نسبة كاش باك 20%
      let marginPct = null;

      if (productId && prisma.product) {
        const product = await prisma.product.findUnique({ where: { id: productId }, select: { marginPct: true, profitMarginPct: true, categoryId: true } }).catch(() => null);
        marginPct = this._toNum(product?.marginPct ?? product?.profitMarginPct);
        const catId = product?.categoryId || categoryId;
        if (marginPct == null && catId && prisma.category) {
          const cat = await prisma.category.findUnique({ where: { id: catId }, select: { marginPct: true, profitMarginPct: true } }).catch(() => null);
          marginPct = this._toNum(cat?.marginPct ?? cat?.profitMarginPct);
        }
      } else if (categoryId && prisma.category) {
        const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { marginPct: true, profitMarginPct: true } }).catch(() => null);
        marginPct = this._toNum(cat?.marginPct ?? cat?.profitMarginPct);
      }

      const margin = marginPct != null ? marginPct / 100 : 0.10;
      const rate = this._clamp(margin * MARGIN_FACTOR, MIN_RATE, MAX_RATE);
      const cashback = base * rate;

      return { cashback: Number(cashback.toFixed(2)), rate: Number(rate.toFixed(4)), isDynamic: true, currency };
    } catch (error) {
      console.error('❌ Error calculating dynamic cashback:', error);
      return { cashback: 0, rate: 0, isDynamic: false, currency: 'EGP' };
    }
  }

  /**
   * 🤝 D) تسجيل إحالة (يُنشئ LoyaltyActivity REFERRAL_GRANT معلّق).
   * يمنع الحسابات الوهمية/الذاتية (referrer != referred).
   */
  async registerReferral({ companyId, referrerId, referredCustomerId, points }) {
    const prisma = getSharedPrismaClient();
    try {
      if (!referrerId || !referredCustomerId) return { registered: false, reason: 'missing_ids' };
      if (String(referrerId) === String(referredCustomerId)) return { registered: false, reason: 'self_referral' };

      let pts = Number(points);
      if (!pts || pts <= 0) {
        const program = await prisma.customerLoyaltyProgram.findFirst({ where: { companyId, type: 'POINTS', status: 'ACTIVE' }, select: { pointsPerReferral: true } });
        pts = Number(program?.pointsPerReferral || 0) || 10;
      }

      if (!prisma.loyaltyActivity) return { registered: false, reason: 'no_activity_model' };

      const existing = await prisma.loyaltyActivity.findFirst({ where: { companyId, customerId: referrerId, type: 'REFERRAL_GRANT', referenceId: referredCustomerId, status: 'PENDING' } }).catch(() => null);
      if (existing) return { registered: false, reason: 'already_registered', activityId: existing.id };

      const activity = await prisma.loyaltyActivity.create({
        data: { companyId, customerId: referrerId, type: 'REFERRAL_GRANT', points: pts, status: 'PENDING', referenceId: referredCustomerId }
      });
      return { registered: true, points: pts, activityId: activity.id };
    } catch (error) {
      console.error('❌ Error registering referral:', error);
      throw error;
    }
  }

  /**
   * 🤝 D) منح مكافأة الإحالة عند إكمال العميل المُحال أول أوردر مدفوع بنجاح.
   * يُنشئ/يُوافق على LoyaltyActivity REFERRAL_GRANT للعميل المُحيل، ويمنح العميل المُحال بونص ترحيب.
   */
  async grantReferralOnFirstPaidOrder({ companyId, customerId, orderId }) {
    const prisma = getSharedPrismaClient();
    try {
      if (!customerId) return { granted: false, reason: 'missing_customerId' };

      const paidOrders = await prisma.order.count({ where: { customerId, companyId, status: { in: ['PAID', 'DELIVERED', 'COMPLETED'] } } });
      if (paidOrders !== 1) return { granted: false, reason: 'not_first_paid_order', paidOrders };

      const program = await prisma.customerLoyaltyProgram.findFirst({ where: { companyId, type: 'POINTS', status: 'ACTIVE' }, select: { id: true, pointsPerReferral: true } });

      let referrerId = null;
      const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { referredBy: true } }).catch(() => null);
      if (customer?.referredBy) referrerId = customer.referredBy;
      if (!referrerId && prisma.loyaltyActivity) {
        const act = await prisma.loyaltyActivity.findFirst({ where: { companyId, type: 'REFERRAL_GRANT', referenceId: customerId, status: 'PENDING' }, select: { customerId: true } }).catch(() => null);
        if (act) referrerId = act.customerId;
      }
      if (!referrerId) return { granted: false, reason: 'no_referrer' };
      if (String(referrerId) === String(customerId)) return { granted: false, reason: 'self_referral' };

      const pts = Number(program?.pointsPerReferral || 10);
      const granted = [];

      const welcome = await this.awardPendingPoints({ companyId, customerId, programId: program?.id, points: Math.floor(pts / 2), orderId, reason: 'بونص ترحيب بالإحالة' }).catch(() => null);
      if (welcome?.awarded) granted.push({ type: 'REFERRED_BONUS', customerId, points: welcome.points });

      if (prisma.loyaltyActivity) {
        const referrerAct = await prisma.loyaltyActivity.findFirst({ where: { companyId, customerId: referrerId, type: 'REFERRAL_GRANT', referenceId: customerId, status: 'PENDING' } }).catch(() => null);
        if (referrerAct) {
          await prisma.loyaltyActivity.update({ where: { id: referrerAct.id }, data: { status: 'APPROVED', approvedAt: new Date(), points: pts } });
          const rp = await this.awardPendingPoints({ companyId, customerId: referrerId, programId: program?.id, points: pts, orderId, reason: 'مكافأة إحالة' }).catch(() => null);
          if (rp?.awarded) granted.push({ type: 'REFERRAL_GRANT', customerId: referrerId, points: pts });
        }
      }

      return { granted: granted.length > 0, items: granted };
    } catch (error) {
      console.error('❌ Error granting referral on first paid order:', error);
      throw error;
    }
  }

  /**
   * ⏰ E) بيانات النقاط قيد الانتهاء (+ رابط ديناميكي لـ WhatsApp) — لا ترسل الرسائل هنا.
   */
  async getExpiringPoints({ companyId, days = 7 }) {
    const prisma = getSharedPrismaClient();
    try {
      const where = companyId ? { companyId, status: 'ACTIVE' } : { status: 'ACTIVE' };
      const records = await prisma.customerLoyaltyRecord.findMany({
        where,
        include: { customer: { select: { id: true, phone: true, firstName: true, lastName: true } }, customerLoyaltyProgram: true }
      });

      const company = companyId ? await prisma.company.findUnique({ where: { id: companyId }, select: { domain: true, storeUrl: true, name: true } }).catch(() => null) : null;
      const baseUrl = (company?.domain || company?.storeUrl || '').replace(/\/$/, '');

      const result = [];
      for (const record of records) {
        const program = record.customerLoyaltyProgram;
        const expiryMonths = program?.expiryMonths || 12;
        if (!record.lastPointsEarned) continue;

        const expiryDate = new Date(record.lastPointsEarned);
        expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
        const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > days || daysLeft < 0) continue;

        const expiringAvailable = parseFloat(record.currentPoints || 0);
        const expiringPending = parseFloat(record.pendingPoints || 0);
        if (expiringAvailable <= 0 && expiringPending <= 0) continue;

        const deepLink = baseUrl ? `${baseUrl}?loyalty_discount=${encodeURIComponent(String(expiringAvailable))}` : null;

        result.push({
          customerId: record.customerId,
          customer: record.customer,
          expiringPoints: expiringAvailable,
          expiringPendingPoints: expiringPending,
          expiryDate: expiryDate.toISOString(),
          daysLeft,
          deepLink,
          whatsappText: baseUrl ? `مرحباً ${record.customer?.firstName || ''}! فاضل عندك ${expiringAvailable} نقطة هتنتهي خلال ${daysLeft} يوم. استخدمها من هنا: ${deepLink}` : null
        });
      }
      return result;
    } catch (error) {
      console.error('❌ Error getting expiring points:', error);
      return [];
    }
  }

  /**
   * 🎮 E) منح نقاط سلوكية (gamification): REVIEW_WITH_PHOTO / PROFILE_COMPLETE / DAILY_CHECKIN.
   * ينشئ LoyaltyActivity (PENDING) ويُضيف النقاط للرصيد عند السياسة.
   */
  async awardBehavioralPoints({ companyId, customerId, type, referenceId }) {
    const prisma = getSharedPrismaClient();
    try {
      const VALID = ['REVIEW_WITH_PHOTO', 'PROFILE_COMPLETE', 'DAILY_CHECKIN'];
      if (!VALID.includes(type)) return { awarded: false, reason: 'invalid_type' };
      const POINTS_MAP = { REVIEW_WITH_PHOTO: 20, PROFILE_COMPLETE: 10, DAILY_CHECKIN: 5 };
      const points = POINTS_MAP[type];

      const program = await prisma.customerLoyaltyProgram.findFirst({ where: { companyId, type: 'POINTS', status: 'ACTIVE' }, select: { id: true } });
      if (!program) return { awarded: false, reason: 'no_program' };

      // 🔁 منع التكرار اليومي لنوع معيّن
      if (prisma.loyaltyActivity) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dup = await prisma.loyaltyActivity.findFirst({ where: { companyId, customerId, type, referenceId, createdAt: { gte: since } } }).catch(() => null);
        if (dup) return { awarded: false, reason: 'already_awarded_today', activityId: dup.id };
      }

      // DAILY_CHECKIN: تتبّع الـ streak
      let streak;
      if (type === 'DAILY_CHECKIN') {
        const record = await prisma.customerLoyaltyRecord.findFirst({ where: { companyId, customerId, programId: program.id, status: 'ACTIVE' } });
        const now = new Date();
        streak = 1;
        if (record?.lastCheckInAt) {
          const diff = Math.floor((now - new Date(record.lastCheckInAt)) / (1000 * 60 * 60 * 24));
          if (diff === 1) streak = (record.checkInStreak || 0) + 1;
          else if (diff === 0) streak = record.checkInStreak || 1;
          else streak = 1; // فجوة > يوم → إعادة الضبط
        }
        if (record) {
          await prisma.customerLoyaltyRecord.update({ where: { id: record.id }, data: { lastCheckInAt: now, checkInStreak: streak, lastActivity: now } });
        }
      }

      let activityId = null;
      if (prisma.loyaltyActivity) {
        const activity = await prisma.loyaltyActivity.create({
          data: { companyId, customerId, type, points, status: 'APPROVED', referenceId: referenceId || null, approvedAt: new Date() }
        }).catch(() => null);
        activityId = activity?.id;
      }

      // إضافة النقاط للرصيد المتاح مباشرة (سلوكية غير قابلة للاسترداد عادةً)
      await this.addPoints(companyId, customerId, program.id, points, `نقاط سلوكية: ${type}`).catch(() => null);

      return { awarded: true, type, points, activityId, ...(type === 'DAILY_CHECKIN' && streak != null ? { streak } : {}) };
    } catch (error) {
      console.error('❌ Error awarding behavioral points:', error);
      throw error;
    }
  }
}

module.exports = new CustomerLoyaltyService();
