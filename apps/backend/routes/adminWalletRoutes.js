const express = require('express');
const router = express.Router();
const { authenticateToken, requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const { getSharedPrismaClient, executeWithRetry } = require('../services/sharedDatabase');
const Joi = require('joi');

// Validation schema
const addFundsSchema = Joi.object({
    companyId: Joi.string().required().messages({
        'string.empty': 'Company ID is required'
    }),
    amount: Joi.number().positive().required().messages({
        'number.positive': 'Amount must be positive'
    }),
    notes: Joi.string().optional().allow('').allow(null),
    bonus: Joi.number().min(0).default(0)
});

/**
 * @route POST /api/v1/admin/wallet/add-funds
 * @desc Manually add funds to a company wallet
 * @access Super Admin
 */
router.post('/add-funds', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        // Validate input
        const { error, value } = addFundsSchema.validate(req.body);

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: error.details
            });
        }

        const { companyId, amount, notes, bonus } = value;
        const totalAmount = amount + bonus;

        const result = await executeWithRetry(async () => {
            const prisma = getSharedPrismaClient();

            return await prisma.$transaction(async (tx) => {
                // 1. Find or Create Wallet
                let wallet = await tx.companyWallet.findUnique({
                    where: { companyId }
                });

                if (!wallet) {
                    wallet = await tx.companyWallet.create({
                        data: {
                            companyId,
                            balance: 0,
                            currency: 'EGP' // Default currency
                        }
                    });
                }

                // 2. Create Transaction Record
                const transaction = await tx.transaction.create({
                    data: {
                        walletId: wallet.id,
                        type: 'DEPOSIT',
                        amount: totalAmount,
                        status: 'COMPLETED',
                        description: notes || `Manual Top-up by Admin (${amount} + ${bonus} Bonus)`,
                        referenceId: req.user.id
                    }
                });

                // 3. Update Wallet Balance
                const updatedWallet = await tx.companyWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: { increment: totalAmount },
                        totalDeposited: { increment: totalAmount }
                    }
                });

                return { wallet: updatedWallet, transaction };
            });
        });

        // 🚀 تحصيل رسوم الاستخدام المؤجلة تلقائياً بعد إضافة الرصيد
        try {
            const pendingBillingService = require('../services/pendingBillingService');
            const pendingResult = await pendingBillingService.processPendingUsageCharges(companyId);
            if (pendingResult.processed > 0) {
                console.log(`✅ [ADMIN-WALLET] Auto-collected ${pendingResult.processed} pending charge(s), released ${pendingResult.released.length} order(s) for company ${companyId}`);
            }
        } catch (pendingError) {
            console.error('⚠️ [ADMIN-WALLET] Error processing pending charges:', pendingError.message);
        }

        return res.json({
            success: true,
            message: 'Funds added successfully',
            data: result
        });

    } catch (error) {
        console.error('Error adding funds manually:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add funds',
            error: error.message
        });
    }
});

/**
 * @route GET /api/v1/admin/wallet/companies
 * @desc Get all companies with their wallet details
 * @access Super Admin
 */
router.get('/companies', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const prisma = getSharedPrismaClient();

        // Get all companies with their wallet
        const companies = await executeWithRetry(async () => {
            return await prisma.company.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    wallet: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        });

        // Format response
        const data = companies.map(comp => ({
            companyId: comp.id,
            companyName: comp.name,
            companyEmail: comp.email,
            phone: comp.phone,
            walletId: comp.wallet?.id || null,
            balance: comp.wallet ? Number(comp.wallet.balance) : 0,
            currency: comp.wallet?.currency || 'EGP',
            totalSpent: comp.wallet ? Number(comp.wallet.totalSpent) : 0,
            totalDeposited: comp.wallet ? Number(comp.wallet.totalDeposited) : 0
        }));

        return res.json({
            success: true,
            data: data
        });

    } catch (error) {
        console.error('Error fetching company wallets:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch company wallets',
            error: error.message
        });
    }
});

module.exports = router;
