const { getSharedPrismaClient } = require("./sharedDatabase");
const crypto = require("crypto");

class PlatformPartnerService {
  /**
   * Helper to generate a unique partner code
   */
  async generateUniquePartnerCode(prefix = "PRT") {
    const prisma = getSharedPrismaClient();
    let isUnique = false;
    let code = "";

    while (!isUnique) {
      const randomStr = crypto.randomBytes(4).toString("hex").toUpperCase();
      code = `${prefix}-${randomStr}`;

      const existing = await prisma.platformPartner.findUnique({
        where: { partnerCode: code },
      });

      if (!existing) {
        isUnique = true;
      }
    }

    return code;
  }

  /**
   * Registers a User as a Platform Partner
   */
  async registerPartner(userId, data = {}) {
    const prisma = getSharedPrismaClient();
    const { companyName, parentPartnerCode } = data;

    const existingPartner = await prisma.platformPartner.findUnique({
      where: { userId },
    });

    if (existingPartner) {
      throw new Error("User is already registered as a Platform Partner");
    }

    let parentPartnerId = null;

    if (parentPartnerCode) {
      const parentPartner = await prisma.platformPartner.findUnique({
        where: { partnerCode: parentPartnerCode },
      });

      if (!parentPartner) {
        throw new Error("Invalid Referral Partner Code");
      }

      if (parentPartner.title === "PARTNER") {
        throw new Error(
          "The referring partner does not have permission to invite sub-partners.",
        );
      }

      parentPartnerId = parentPartner.id;
    }

    const prefix = companyName
      ? companyName
          .substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, "") || "PRT"
      : "PRT";

    const partnerCode = await this.generateUniquePartnerCode(prefix);

    const newPartner = await prisma.platformPartner.create({
      data: {
        userId,
        partnerCode,
        companyName,
        parentPartnerId,
        status: "ACTIVE",
        title: "PARTNER",
        maxAllowedDepth: 1,
      },
    });

    if (parentPartnerId) {
      await prisma.platformPartner.update({
        where: { id: parentPartnerId },
        data: { totalSubPartners: { increment: 1 } },
      });
    }

    return newPartner;
  }

  /**
   * Links a newly created SaaS Company to a Partner
   */
  async linkCompanyToPartner(companyId, partnerCode) {
    const prisma = getSharedPrismaClient();
    if (!partnerCode) return null;

    const partner = await prisma.platformPartner.findUnique({
      where: { partnerCode },
    });

    if (!partner) return null;

    const linkedCompany = await prisma.partnerReferredCompany.create({
      data: {
        partnerId: partner.id,
        companyId,
      },
    });

    await prisma.platformPartner.update({
      where: { id: partner.id },
      data: { totalCompanies: { increment: 1 } },
    });

    return linkedCompany;
  }

  /**
   * Core Logic: Distribute commissions across 4 levels based on Titles
   * Triggered after a successful billing history entry is created
   */
  async distributeCommissions(billingHistoryId) {
    const prisma = getSharedPrismaClient();

    // 1. Get Billing Info
    const billing = await prisma.billingHistory.findUnique({
      where: { id: billingHistoryId },
      include: { company: true },
    });

    if (!billing || billing.status !== "SUCCESS" || billing.amount <= 0) return;

    // 2. Find the immediate partner (Level 1)
    const referral = await prisma.partnerReferredCompany.findUnique({
      where: { companyId: billing.companyId },
    });

    if (!referral) return;

    // 3. Get global settings for rates
    const settings = (await prisma.platformPartnerSetting.findFirst({
      where: { isActive: true },
    })) || { level1Rate: 20, level2Rate: 5, level3Rate: 3, level4Rate: 1 };

    const rates = [
      settings.level1Rate,
      settings.level2Rate,
      settings.level3Rate,
      settings.level4Rate,
    ];

    let currentPartnerId = referral.partnerId;

    // 4. Traverse up to 4 levels
    for (let level = 1; level <= 4; level++) {
      if (!currentPartnerId) break;

      const partner = await prisma.platformPartner.findUnique({
        where: { id: currentPartnerId },
      });

      if (!partner || partner.status !== "ACTIVE") break;

      // 🛑 Check if the partner's Title allows earning at this depth
      // PARTNER: Level 1 only
      // SENIOR: Levels 1, 2
      // MASTER: Levels 1, 2, 3
      // EXECUTIVE: Levels 1, 2, 3, 4
      const allowedDepthMap = {
        PARTNER: 1,
        SENIOR_PARTNER: 2,
        MASTER_PARTNER: 3,
        EXECUTIVE_PARTNER: 4,
      };

      const maxDepth = allowedDepthMap[partner.title] || 1;

      if (level <= maxDepth) {
        const rate = rates[level - 1];
        const commissionAmount = (Number(billing.amount) * rate) / 100;

        if (commissionAmount > 0) {
          // Create commission record
          await prisma.partnerCommission.create({
            data: {
              partnerId: partner.id,
              companyId: billing.companyId,
              billingHistoryId: billing.id,
              amount: commissionAmount,
              level: level,
              status: "CONFIRMED",
            },
          });

          // Update partner balance
          await prisma.platformPartner.update({
            where: { id: partner.id },
            data: {
              totalEarnings: { increment: commissionAmount },
              pendingEarnings: { increment: commissionAmount }, // initially confirmed/pending
            },
          });
        }
      }

      // Move to parent for next iteration
      currentPartnerId = partner.parentPartnerId;
    }
  }

  async getPartnerDashboardData(userId, options = {}) {
    const prisma = getSharedPrismaClient();
    const {
      commPage = 1,
      commLimit = 10,
      payoutPage = 1,
      payoutLimit = 5,
      refPage = 1,
      refLimit = 10,
    } = options;

    const commSkip = (Number(commPage) - 1) * Number(commLimit);
    const payoutSkip = (Number(payoutPage) - 1) * Number(payoutLimit);
    const refSkip = (Number(refPage) - 1) * Number(refLimit);

    // 1. Try to find existing partner
    let partner = await prisma.platformPartner.findUnique({
      where: { userId },
      include: {
        referredCompanies: {
          include: { company: true },
        },
        subPartners: true,
      },
    });

    if (!partner) {
      throw new Error("Partner not found for this user");
    }

    // Fetch paginated collections
    const [
      commissions,
      commissionsTotal,
      payouts,
      payoutsTotal,
      referrals,
      referralsTotal,
    ] = await Promise.all([
      prisma.partnerCommission.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: "desc" },
        skip: commSkip,
        take: Number(commLimit),
        include: { company: true },
      }),
      prisma.partnerCommission.count({ where: { partnerId: partner.id } }),
      prisma.partnerPayout.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: "desc" },
        skip: payoutSkip,
        take: Number(payoutLimit),
      }),
      prisma.partnerPayout.count({ where: { partnerId: partner.id } }),
      prisma.partnerReferredCompany.findMany({
        where: { partnerId: partner.id },
        orderBy: { joinedAt: "desc" },
        skip: refSkip,
        take: Number(refLimit),
        include: { company: true },
      }),
      prisma.partnerReferredCompany.count({ where: { partnerId: partner.id } }),
    ]);

    // Trends (آخر 30 يوم مقابل الفترة السابقة)
    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const prev60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [earnLast, earnPrev, refLast, refPrev] = await Promise.all([
      prisma.partnerCommission.aggregate({
        where: { partnerId: partner.id, createdAt: { gte: last30 } },
        _sum: { amount: true },
      }),
      prisma.partnerCommission.aggregate({
        where: {
          partnerId: partner.id,
          createdAt: { gte: prev60, lt: last30 },
        },
        _sum: { amount: true },
      }),
      prisma.partnerReferredCompany.count({
        where: { partnerId: partner.id, joinedAt: { gte: last30 } },
      }),
      prisma.partnerReferredCompany.count({
        where: { partnerId: partner.id, joinedAt: { gte: prev60, lt: last30 } },
      }),
    ]);

    const pct = (a, b) => {
      if (!b || b === 0) return a > 0 ? 100 : 0;
      return Math.round(((a - b) / b) * 100);
    };

    const trends = {
      earningsChange: pct(
        Number(earnLast._sum.amount || 0),
        Number(earnPrev._sum.amount || 0),
      ),
      referralsChange: pct(refLast, refPrev),
    };

    return {
      partner: {
        id: partner.id,
        partnerCode: partner.partnerCode,
        title: partner.title,
        totalEarnings: Number(partner.totalEarnings),
        pendingEarnings: Number(partner.pendingEarnings),
        totalPaid: Number(partner.paidEarnings || 0),
        status: partner.status,
        maxAllowedDepth: partner.maxAllowedDepth,
      },
      stats: {
        directReferralsCount: partner.referredCompanies.length,
        totalNetworkCount:
          (partner.totalSubPartners || 0) + partner.referredCompanies.length,
        activeCompaniesCount: partner.referredCompanies.filter(
          (c) => c.isActive,
        ).length,
      },
      trends,
      pagination: {
        commissions: {
          page: Number(commPage),
          pageSize: Number(commLimit),
          total: commissionsTotal,
        },
        payouts: {
          page: Number(payoutPage),
          pageSize: Number(payoutLimit),
          total: payoutsTotal,
        },
        referrals: {
          page: Number(refPage),
          pageSize: Number(refLimit),
          total: referralsTotal,
        },
      },
      recentCommissions: commissions,
      recentPayouts: payouts,
      referredCompanies: referrals.map((rc) => ({
        name: rc.company?.name || "Unknown",
        status: rc.company?.isActive ? "ACTIVE" : "PENDING",
        createdAt: rc.joinedAt,
      })),
    };
  }

  /**
   * SUPER ADMIN: Update Partner Title & Depth manually
   */
  async updatePartnerTitle(partnerId, title) {
    const prisma = getSharedPrismaClient();

    const depthMap = {
      PARTNER: 1,
      SENIOR_PARTNER: 2,
      MASTER_PARTNER: 3,
      EXECUTIVE_PARTNER: 4,
    };

    if (!depthMap[title]) throw new Error("Invalid Partner Title");

    return await prisma.platformPartner.update({
      where: { id: partnerId },
      data: {
        title: title,
        maxAllowedDepth: depthMap[title],
      },
    });
  }

  /**
   * PARTNER: Request a Payout
   */
  async requestPayout(userId, amount, method, details = {}) {
    const prisma = getSharedPrismaClient();

    // 1. Validation
    if (!amount || amount <= 0) {
      throw new Error("Invalid payout amount");
    }

    // Map frontend methods to DB enums if necessary
    // PartnerPayoutMethod: BANK_TRANSFER, PAYPAL, WALLET, CASH
    const methodMapping = {
      VODAFONE_CASH: "CASH", // Mapping specific methods to generic ones supported by DB
      INSTAPAY: "BANK_TRANSFER",
      BANK_TRANSFER: "BANK_TRANSFER",
      CASH: "CASH",
      WALLET: "WALLET",
    };

    const dbMethod = methodMapping[method];
    if (!dbMethod) {
      throw new Error("Unsupported payout method");
    }

    return await prisma.$transaction(async (tx) => {
      const partner = await tx.platformPartner.findUnique({
        where: { userId },
        select: { id: true, pendingEarnings: true },
      });

      if (!partner) throw new Error("Partner not found");

      // 2. Check balance
      if (Number(partner.pendingEarnings) < amount) {
        throw new Error("Insufficient balance");
      }

      // 3. Lock balance immediately (Debit)
      await tx.platformPartner.update({
        where: { id: partner.id },
        data: {
          pendingEarnings: { decrement: amount },
        },
      });

      // 4. Create payout record
      return await tx.partnerPayout.create({
        data: {
          partnerId: partner.id,
          amount,
          paymentMethod: dbMethod, // Use mapped method
          status: "PENDING",
          paymentDetails: JSON.stringify(details),
        },
      });
    });
  }

  /**
   * SUPER ADMIN: Process/Approve Payout
   */
  async processPayout(payoutId, status, txHash = "") {
    const prisma = getSharedPrismaClient();

    const payout = await prisma.partnerPayout.findUnique({
      where: { id: payoutId },
      include: { partner: true },
    });

    if (!payout) throw new Error("Payout request not found");
    if (payout.status !== "PENDING")
      throw new Error("Payout already processed");

    // Target Status ENUMS: PENDING, PROCESSED, FAILED, CANCELLED
    if (status === "COMPLETED" || status === "PROCESSED") {
      await prisma.partnerPayout.update({
        where: { id: payoutId },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          transactionId: txHash,
        },
      });

      // Update total paid (pendingEarnings already decremented on request)
      await prisma.platformPartner.update({
        where: { id: payout.partnerId },
        data: {
          paidEarnings: { increment: payout.amount }, // Corrected field name: paidEarnings
        },
      });
    } else if (status === "REJECTED" || status === "FAILED") {
      await prisma.$transaction([
        prisma.partnerPayout.update({
          where: { id: payoutId },
          data: { status: "FAILED", processedAt: new Date() },
        }),
        // Refund the locked balance
        prisma.platformPartner.update({
          where: { id: payout.partnerId },
          data: {
            pendingEarnings: { increment: payout.amount },
          },
        }),
      ]);
    }

    return { success: true };
  }

  /**
   * SUPER ADMIN: Get all partners with their user details
   */
  async getAdminPartners() {
    const prisma = getSharedPrismaClient();
    return await prisma.platformPartner.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * SUPER ADMIN: Get all payout requests
   */
  async getAdminPayouts() {
    const prisma = getSharedPrismaClient();
    return await prisma.partnerPayout.findMany({
      include: {
        partner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * SUPER ADMIN: Get Overall Stats for the control panel
   */
  async getAdminStats() {
    const prisma = getSharedPrismaClient();

    const [
      totalPartners,
      earningsAgg,
      paidAgg,
      pendingPayoutsCount,
      activeCompaniesCount,
    ] = await Promise.all([
      prisma.platformPartner.count(),
      prisma.platformPartner.aggregate({ _sum: { totalEarnings: true } }),
      prisma.platformPartner.aggregate({ _sum: { paidEarnings: true } }), // Fixed field name
      prisma.partnerPayout.count({ where: { status: "PENDING" } }),
      prisma.partnerReferredCompany.count({
        where: {
          company: { isActive: true },
        },
      }),
    ]);

    return {
      totalPartners,
      totalCommissionsDistributed: Number(earningsAgg._sum.totalEarnings || 0),
      totalPaid: Number(paidAgg._sum.paidEarnings || 0),
      totalPendingPayouts:
        (
          await prisma.partnerPayout.aggregate({
            where: { status: "PENDING" },
            _sum: { amount: true },
          })
        )._sum.amount || 0,
      pendingPayoutsCount,
      activeCompaniesCount,
    };
  }

  /**
   * SUPER ADMIN: Get the global partner program settings
   */
  async getAdminSettings() {
    const prisma = getSharedPrismaClient();
    let settings = await prisma.platformPartnerSetting.findFirst({
      where: { isActive: true },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.platformPartnerSetting.create({
        data: {
          level1Rate: 20,
          level2Rate: 5,
          level3Rate: 3,
          level4Rate: 1,
          minimumPayoutAmount: 100,
          isActive: true,
        },
      });
    }

    return settings;
  }

  /**
   * SUPER ADMIN: Update the global partner program settings
   */
  async updateAdminSettings(data) {
    const prisma = getSharedPrismaClient();
    const {
      level1Rate,
      level2Rate,
      level3Rate,
      level4Rate,
      minimumPayoutAmount,
      termsAndConditions,
    } = data;

    // Validate rates
    const rates = [level1Rate, level2Rate, level3Rate, level4Rate].filter(
      (r) => r !== undefined,
    );
    for (const rate of rates) {
      if (rate < 0 || rate > 100) {
        throw new Error("Commission rate must be between 0 and 100");
      }
    }

    let settings = await prisma.platformPartnerSetting.findFirst({
      where: { isActive: true },
    });

    if (settings) {
      settings = await prisma.platformPartnerSetting.update({
        where: { id: settings.id },
        data: {
          ...(level1Rate !== undefined && { level1Rate }),
          ...(level2Rate !== undefined && { level2Rate }),
          ...(level3Rate !== undefined && { level3Rate }),
          ...(level4Rate !== undefined && { level4Rate }),
          ...(minimumPayoutAmount !== undefined && { minimumPayoutAmount }),
          ...(termsAndConditions !== undefined && { termsAndConditions }),
        },
      });
    } else {
      settings = await prisma.platformPartnerSetting.create({
        data: {
          level1Rate: level1Rate ?? 20,
          level2Rate: level2Rate ?? 5,
          level3Rate: level3Rate ?? 3,
          level4Rate: level4Rate ?? 1,
          minimumPayoutAmount: minimumPayoutAmount ?? 100,
          termsAndConditions,
          isActive: true,
        },
      });
    }

    return settings;
  }
}

module.exports = new PlatformPartnerService();
