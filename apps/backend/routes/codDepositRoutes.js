const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const CodDepositService = require('../services/codDepositService');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');

const router = express.Router();
const getPrisma = () => getSharedPrismaClient();

// Multer setup for deposit proof screenshots
const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/deposit-proofs';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `deposit-proof-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

router.post('/cod-deposit/create-session', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const { orderId, redirectUrl } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required',
      });
    }

    const prisma = getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, companyId: true, codDepositPaid: true, paymentMethod: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (order.codDepositPaid) {
      return res.status(400).json({ success: false, error: 'Deposit already paid for this order' });
    }

    const result = await CodDepositService.createDepositSession(orderId, company.id, redirectUrl);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    console.error('[COD-DEPOSIT] Create session error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/cod-deposit/webhook', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[COD-DEPOSIT-WEBHOOK] Received:', JSON.stringify(payload));

    const result = await CodDepositService.handleDepositWebhook(payload);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[COD-DEPOSIT-WEBHOOK] Error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

router.get('/cod-deposit/status/:orderId', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const { orderId } = req.params;

    const prisma = getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, companyId: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const result = await CodDepositService.getDepositStatus(orderId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[COD-DEPOSIT] Status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/cod-deposit/settings', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const { enabled, type, value, minAmount, maxAmount } = req.body;

    const prisma = getPrisma();
    const updateData = {};

    if (enabled !== undefined) updateData.codDepositEnabled = Boolean(enabled);
    if (type !== undefined) {
      if (!['PERCENTAGE', 'FIXED'].includes(type)) {
        return res.status(400).json({ success: false, error: 'Type must be PERCENTAGE or FIXED' });
      }
      updateData.codDepositType = type;
    }
    if (value !== undefined) {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < 0) {
        return res.status(400).json({ success: false, error: 'Invalid value' });
      }
      updateData.codDepositValue = numValue;
    }
    if (minAmount !== undefined) {
      updateData.codDepositMinAmount = minAmount !== null ? Number(minAmount) : null;
    }
    if (maxAmount !== undefined) {
      updateData.codDepositMaxAmount = maxAmount !== null ? Number(maxAmount) : null;
    }

    await prisma.storefrontSettings.update({
      where: { companyId: company.id },
      data: updateData,
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    console.error('[COD-DEPOSIT] Settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/cod-deposit/settings', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const settings = await CodDepositService.getDepositSettings(company.id);

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('[COD-DEPOSIT] Get settings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/cod-deposit/order-suggest/:orderId', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const { orderId } = req.params;

    const prisma = getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, companyId: true, total: true, codDepositPaid: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const depositSettings = await CodDepositService.getDepositSettings(company.id);
    if (!depositSettings.enabled) {
      return res.json({ success: true, data: { enabled: false } });
    }

    const depositAmount = CodDepositService.calculateDepositAmount(Number(order.total), depositSettings);

    res.json({
      success: true,
      data: {
        enabled: true,
        total: Number(order.total),
        depositAmount,
        remainingAmount: Number(order.total) - depositAmount,
        alreadyPaid: order.codDepositPaid,
        settings: {
          type: depositSettings.type,
          value: depositSettings.value,
        },
      },
    });
  } catch (error) {
    console.error('[COD-DEPOSIT] Suggest error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ─── Deposit Proof (Manual Screenshot Upload) ────────────────────────────────

router.post('/cod-deposit/proof/upload', extractSubdomainMiddleware, requireCompany, (req, res, next) => {
  proofUpload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'حجم الملف كبير جداً. الحد الأقصى 10MB' });
      return res.status(400).json({ success: false, error: err.message || 'خطأ في رفع الملف' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { company, user } = req;
    const { orderId, amount, walletNumber, transferRef, notes } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required' });
    }

    const prisma = getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, companyId: true, codDepositPaid: true, total: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (order.codDepositPaid) {
      return res.status(400).json({ success: false, error: 'Deposit already paid for this order' });
    }

    const imageUrl = `/uploads/deposit-proofs/${req.file.filename}`;
    const depositAmount = amount ? Number(amount) : Number(order.total);

    const proof = await prisma.orderDepositProof.create({
      data: {
        orderId,
        imageUrl,
        amount: depositAmount,
        walletNumber: walletNumber || null,
        transferRef: transferRef || null,
        notes: notes || null,
        submittedBy: user?.id || null,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      data: {
        id: proof.id,
        imageUrl: proof.imageUrl,
        amount: Number(proof.amount),
        walletNumber: proof.walletNumber,
        transferRef: proof.transferRef,
        status: proof.status,
        createdAt: proof.createdAt,
      },
    });
  } catch (error) {
    console.error('[COD-DEPOSIT] Proof upload error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/cod-deposit/proof/:id/verify', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company, user } = req;
    const { id } = req.params;
    const { transferRef, walletNumber } = req.body;

    const prisma = getPrisma();
    const proof = await prisma.orderDepositProof.findUnique({
      where: { id },
      include: { order: { select: { id: true, companyId: true, total: true } } },
    });

    if (!proof) {
      return res.status(404).json({ success: false, error: 'Proof not found' });
    }
    if (proof.order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (proof.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Proof already ${proof.status}` });
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderDepositProof.update({
        where: { id },
        data: {
          status: 'VERIFIED',
          verifiedBy: user?.id || null,
          verifiedAt: new Date(),
          transferRef: transferRef || proof.transferRef,
          walletNumber: walletNumber || proof.walletNumber,
        },
      });

      await tx.order.update({
        where: { id: proof.orderId },
        data: {
          codDepositAmount: proof.amount,
        },
      });
    });

    await CodDepositService.confirmOrderAfterDeposit(proof.orderId, 'manual_transfer');

    res.json({ success: true, message: 'تم التحقق من إثبات الدفع وتأكيد الأوردر' });
  } catch (error) {
    console.error('[COD-DEPOSIT] Proof verify error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.put('/cod-deposit/proof/:id/reject', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company, user } = req;
    const { id } = req.params;
    const { rejectReason } = req.body;

    const prisma = getPrisma();
    const proof = await prisma.orderDepositProof.findUnique({
      where: { id },
      include: { order: { select: { id: true, companyId: true } } },
    });

    if (!proof) {
      return res.status(404).json({ success: false, error: 'Proof not found' });
    }
    if (proof.order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    if (proof.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Proof already ${proof.status}` });
    }

    await prisma.orderDepositProof.update({
      where: { id },
      data: {
        status: 'REJECTED',
        verifiedBy: user?.id || null,
        rejectedAt: new Date(),
        rejectReason: rejectReason || null,
      },
    });

    res.json({ success: true, message: 'تم رفض إثبات الدفع' });
  } catch (error) {
    console.error('[COD-DEPOSIT] Proof reject error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/cod-deposit/proof/:orderId', extractSubdomainMiddleware, requireCompany, async (req, res) => {
  try {
    const { company } = req;
    const { orderId } = req.params;

    const prisma = getPrisma();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, companyId: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (order.companyId !== company.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const proofs = await prisma.orderDepositProof.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: proofs.map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl,
        amount: Number(p.amount),
        walletNumber: p.walletNumber,
        transferRef: p.transferRef,
        status: p.status,
        notes: p.notes,
        submittedBy: p.submittedBy,
        verifiedBy: p.verifiedBy,
        verifiedAt: p.verifiedAt,
        rejectedAt: p.rejectedAt,
        rejectReason: p.rejectReason,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error('[COD-DEPOSIT] Proof list error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
