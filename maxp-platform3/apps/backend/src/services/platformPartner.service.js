const { getSharedPrismaClient } = require('./sharedDatabase');
const crypto = require('crypto');

class PlatformPartnerService {
    /**
     * Helper to generate a unique partner code
     */
    async generateUniquePartnerCode(prefix = 'PRT') {
        const prisma = getSharedPrismaClient();
        let isUnique = false;
        let code = '';

        while (!isUnique) {
            const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
            code = `${prefix}-${randomStr}`;

            const existing = await prisma.platformPartner.findUnique({
                where: { partnerCode: code }
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
            where: { userId }
        });

        if (existingPartner) {
            throw new Error('User is already registered as a Platform Partner');
        }

        let parentPartnerId = null;

        if (parentPartnerCode) {
            const parentPartner = await prisma.platformPartner.findUnique({
                where: { partnerCode: parentPartnerCode }
            });

            if (!parentPartner) {
                throw new Error('Invalid Referral Partner Code');
            }

            if (parentPartner.title === 'PARTNER') {
                throw new Error('The referring partner does not have permission to invite sub-partners.');
            }

            parentPartnerId = parentPartner.id;
        }

        const prefix = companyName
            ? companyName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') || 'PRT'
            : 'PRT';

        const partnerCode = await this.generateUniquePartnerCode(prefix);

        const newPartner = await prisma.platformPartner.create({
            data: {
                userId,
                partnerCode,
                companyName,
                parentPartnerId,
                status: 'ACTIVE',
                title: 'PARTNER',
                maxAllowedDepth: 1
            }
        });

        if (parentPartnerId) {
            await prisma.platformPartner.update({
                where: { id: parentPartnerId },
                data: { totalSubPartners: { increment: 1 } }
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
            where: { partnerCode }
        });

        if (!partner) return null;

        const linkedCompany = await prisma.partnerReferredCompany.create({
            data: {
                partnerId: partner.id,
                companyId
            }
        });

        await prisma.platformPartner.update({
            where: { id: partner.id },
            data: { totalCompanies: { increment: 1 } }
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
            include: { company: true }
        });

        if (!billing || billing.status !== 'SUCCESS' || billing.amount <= 0) return;

        // 2. Find the immediate partner (Level 1)
        const referral = await prisma.partnerReferredCompany.findUnique({
            where: { companyId: billing.companyId }
        });

        if (!referral) return;

        // 3. Get global settings for rates
        const settings = await prisma.platformPartnerSetting.findFirst({
            where: { isActive: true }
        }) || { level1Rate: 20, level2Rate: 5, level3Rate: 3, level4Rate: 1 };

        const rates = [
            settings.level1Rate,
            settings.level2Rate,
            settings.level3Rate,
            settings.level4Rate
        ];

        let currentPartnerId = referral.partnerId;

        // 4. Traverse up to 4 levels
        for (let level = 1; level <= 4; level++) {
            if (!currentPartnerId) break;

            const partner = await prisma.platformPartner.findUnique({
                where: { id: currentPartnerId }
            });

            if (!partner || partner.status !== 'ACTIVE') break;

            // 🛑 Check if the partner's Title allows earning at this depth
            // PARTNER: Level 1 only
            // SENIOR: Levels 1, 2
            // MASTER: Levels 1, 2, 3
            // EXECUTIVE: Levels 1, 2, 3, 4
            const allowedDepthMap = {
                'PARTNER': 1,
                'SENIOR_PARTNER': 2,
                'MASTER_PARTNER': 3,
                'EXECUTIVE_PARTNER': 4
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
                            status: 'CONFIRMED'
                        }
                    });

                    // Update partner balance
                    await prisma.platformPartner.update({
                        where: { id: partner.id },
                        data: {
                            totalEarnings: { increment: commissionAmount },
                            pendingEarnings: { increment: commissionAmount } // initially confirmed/pending
                        }
                    });
                }
            }

            // Move to parent for next iteration
            currentPartnerId = partner.parentPartnerId;
        }
    }

    async getPartnerDashboardData(userId) {
        const prisma = getSharedPrismaClient();
        const partner = await prisma.platformPartner.findUnique({
            where: { userId },
            include: {
                referredCompanies: {
                    include: { company: true }
                },
                subPartners: true,
                payouts: true,
                commissions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                }
            }
        });

        if (!partner) throw new Error("Partner not found");

        return partner;
    }

    /**
     * SUPER ADMIN: Update Partner Title & Depth manually
     */
    async updatePartnerTitle(partnerId, title) {
        const prisma = getSharedPrismaClient();

        const depthMap = {
            'PARTNER': 1,
            'SENIOR_PARTNER': 2,
            'MASTER_PARTNER': 3,
            'EXECUTIVE_PARTNER': 4
        };

        if (!depthMap[title]) throw new Error('Invalid Partner Title');

        return await prisma.platformPartner.update({
            where: { id: partnerId },
            data: {
                title: title,
                maxAllowedDepth: depthMap[title]
            }
        });
    }

    /**
     * PARTNER: Request a Payout
     */
    async requestPayout(userId, amount, method, details = {}) {
        const prisma = getSharedPrismaClient();
        const partner = await prisma.platformPartner.findUnique({ where: { userId } });

        if (!partner) throw new Error('Partner not found');
        if (partner.pendingEarnings < amount) throw new Error('Insufficient balance');

        return await prisma.partnerPayout.create({
            data: {
                partnerId: partner.id,
                amount,
                method,
                status: 'PENDING',
                transactionDetails: JSON.stringify(details)
            }
        });
    }

    /**
     * SUPER ADMIN: Process/Approve Payout
     */
    async processPayout(payoutId, status, txHash = '') {
        const prisma = getSharedPrismaClient();

        const payout = await prisma.partnerPayout.findUnique({
            where: { id: payoutId },
            include: { partner: true }
        });

        if (!payout) throw new Error('Payout request not found');
        if (payout.status !== 'PENDING') throw new Error('Payout already processed');

        if (status === 'COMPLETED') {
            await prisma.$transaction([
                prisma.partnerPayout.update({
                    where: { id: payoutId },
                    data: { status: 'COMPLETED', processedAt: new Date(), transactionDetails: txHash }
                }),
                prisma.platformPartner.update({
                    where: { id: payout.partnerId },
                    data: {
                        totalPaid: { increment: payout.amount },
                        pendingEarnings: { decrement: payout.amount }
                    }
                })
            ]);
        } else {
            await prisma.partnerPayout.update({
                where: { id: payoutId },
                data: { status: 'REJECTED', processedAt: new Date() }
            });
        }

        return { success: true };
    }

    /**
     * SUPER ADMIN: Get Overall Stats for the control panel
     */
    async getAdminStats() {
        const prisma = getSharedPrismaClient();

        const [totalPartners, totalEarnings, totalPaid, pendingPayouts] = await Promise.all([
            prisma.platformPartner.count(),
            prisma.platformPartner.aggregate({ _sum: { totalEarnings: true } }),
            prisma.platformPartner.aggregate({ _sum: { totalPaid: true } }),
            prisma.partnerPayout.count({ where: { status: 'PENDING' } })
        ]);

        return {
            totalPartners,
            totalEarnings: totalEarnings._sum.totalEarnings || 0,
            totalPaid: totalPaid._sum.totalPaid || 0,
            pendingPayoutsCount: pendingPayouts
        };
    }
}

module.exports = new PlatformPartnerService();
