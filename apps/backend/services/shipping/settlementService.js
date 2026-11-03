/**
 * Shipping COD Settlement Service (SHIP-W5)
 * 
 * Provides end-to-end COD settlements and statement reconciliation for shipping clients (merchants):
 * - preview: calculate gross COD, shipping fees, COD fees, return fees, and net payout without mutations
 * - issue: atomically record settlement and line items with shipment unique constraints
 * - approve: lock settlement against edits
 * - pay: record remittance & treasury transaction without changing shipment amounts
 * - reject / void: manage settlement lifecycles
 * - exportCsv: generate UTF-8 BOM CSV statements
 */

const { getSharedPrismaClient } = require('../sharedDatabase');
const { normalizeGovernorateName } = require('../../utils/orderLocationNormalizer');

const round = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

function serviceError(message, statusCode = 400, extra = {}) {
  const err = new Error(message);
  err.statusCode = statusCode;
  Object.assign(err, extra);
  return err;
}

/**
 * Match rate card for destination governorate
 */
function matchRateCard(rateCards, governorate) {
  if (!rateCards || !rateCards.length) return null;
  const normGov = normalizeGovernorateName(governorate);
  return (
    rateCards.find((c) => c.governorateCode === normGov) ||
    rateCards.find((c) => !c.governorateCode) ||
    null
  );
}

/**
 * Calculate line item fees for a single shipment
 */
function calculateShipmentLineFees(shipment, card) {
  const isDelivered = shipment.status === 'DELIVERED';
  const isReturned = shipment.status === 'RETURNED';

  const codAmount = round(shipment.codAmount || 0);

  if (isDelivered) {
    const collectedAmount = round(
      shipment.collectedAmount != null ? shipment.collectedAmount : codAmount
    );

    // Shipping fee: from shipment.cost if exists and > 0, otherwise calculate from rate card
    let shippingFee = 0;
    if (shipment.cost != null && Number(shipment.cost) > 0) {
      shippingFee = round(Number(shipment.cost));
    } else if (card) {
      const basePrice = Number(card.basePrice || 0);
      const baseWeight = Number(card.baseWeightKg || 1);
      const extraKgPrice = Number(card.extraKgPrice || 0);
      const weight = Number(shipment.actualWeight || shipment.weight || 1);
      let extraUnits = 0;
      if (weight > baseWeight) {
        extraUnits = Math.ceil(Math.max(0, weight - baseWeight) - 1e-9);
      }
      shippingFee = round(basePrice + extraUnits * extraKgPrice);
    }

    // COD fee: fixed + percent of collected amount
    let codFee = 0;
    if (card && collectedAmount > 0) {
      const fixed = Number(card.codFeeFixed || 0);
      const pct = Number(card.codFeePercent || 0);
      codFee = round(fixed + (collectedAmount * pct) / 100);
    }

    const returnFee = 0;
    const net = round(collectedAmount - shippingFee - codFee - returnFee);

    return {
      shipmentId: shipment.id,
      shipmentBarcode: shipment.barcode || shipment.trackingNumber || shipment.id,
      trackingNumber: shipment.trackingNumber,
      orderNumber: shipment.order?.orderNumber || shipment.merchantOrderId || null,
      recipientName: shipment.recipientName,
      destinationGovernorate: shipment.destinationGovernorate,
      destinationCity: shipment.destinationCity,
      status: 'DELIVERED',
      codAmount,
      collectedAmount,
      shippingFee,
      codFee,
      returnFee,
      net,
      createdAt: shipment.createdAt,
      deliveredAt: shipment.collectedAt || shipment.updatedAt || shipment.createdAt,
    };
  }

  if (isReturned) {
    const collectedAmount = 0;
    const shippingFee = 0;
    const codFee = 0;
    const returnFee = card ? round(Number(card.returnFee || 0)) : 0;
    const net = round(0 - shippingFee - codFee - returnFee);

    return {
      shipmentId: shipment.id,
      shipmentBarcode: shipment.barcode || shipment.trackingNumber || shipment.id,
      trackingNumber: shipment.trackingNumber,
      orderNumber: shipment.order?.orderNumber || shipment.merchantOrderId || null,
      recipientName: shipment.recipientName,
      destinationGovernorate: shipment.destinationGovernorate,
      destinationCity: shipment.destinationCity,
      status: 'RETURNED',
      codAmount,
      collectedAmount,
      shippingFee,
      codFee,
      returnFee,
      net,
      createdAt: shipment.createdAt,
      returnedAt: shipment.updatedAt || shipment.createdAt,
    };
  }

  return null;
}

/**
 * Preview settlement calculations for a merchant & period
 */
async function preview({ companyId, merchantId, from, to, prismaClient = null }) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  if (!merchantId) throw serviceError('معرف العميل مطلوب', 400);

  const prisma = prismaClient || getSharedPrismaClient();

  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, companyId },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!merchant) throw serviceError('سجل عميل الشحن غير موجود', 404);

  const rateCards = await prisma.clientRateCard.findMany({
    where: { companyId, merchantId, isActive: true },
    orderBy: [{ governorateCode: 'desc' }, { createdAt: 'desc' }],
  });

  const where = {
    companyId,
    merchantId,
    status: { in: ['DELIVERED', 'RETURNED'] },
    settlementLine: null, // Exclude shipments already in any settlement
  };

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      if (typeof to === 'string' && !to.includes('T')) end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const rawShipments = await prisma.shipment.findMany({
    where,
    include: {
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter DELIVERED to collectedAmount > 0
  const eligibleShipments = rawShipments.filter((s) => {
    if (s.status === 'RETURNED') return true;
    if (s.status === 'DELIVERED') {
      const col = Number(s.collectedAmount != null ? s.collectedAmount : s.codAmount || 0);
      return col > 0;
    }
    return false;
  });

  const lines = [];
  for (const shipment of eligibleShipments) {
    const card = matchRateCard(rateCards, shipment.destinationGovernorate);
    const line = calculateShipmentLineFees(shipment, card);
    if (line) lines.push(line);
  }

  const grossCOD = round(lines.reduce((sum, l) => sum + l.collectedAmount, 0));
  const shippingFeesTotal = round(lines.reduce((sum, l) => sum + l.shippingFee, 0));
  const codFeesTotal = round(lines.reduce((sum, l) => sum + l.codFee, 0));
  const returnFeesTotal = round(lines.reduce((sum, l) => sum + l.returnFee, 0));
  const netPayout = round(grossCOD - shippingFeesTotal - codFeesTotal - returnFeesTotal);

  const deliveredCount = lines.filter((l) => l.status === 'DELIVERED').length;
  const returnedCount = lines.filter((l) => l.status === 'RETURNED').length;

  let periodStart = from ? new Date(from) : null;
  let periodEnd = to ? new Date(to) : null;

  if (lines.length > 0) {
    if (!periodStart) {
      const dates = lines.map((l) => new Date(l.createdAt).getTime()).filter(Boolean);
      periodStart = new Date(Math.min(...dates));
    }
    if (!periodEnd) {
      const dates = lines.map((l) => new Date(l.createdAt).getTime()).filter(Boolean);
      periodEnd = new Date(Math.max(...dates));
    }
  } else {
    periodStart = periodStart || new Date();
    periodEnd = periodEnd || new Date();
  }

  return {
    merchant: {
      id: merchant.id,
      name: merchant.name,
      phone: merchant.phone,
      email: merchant.email,
    },
    summary: {
      totalShipments: lines.length,
      deliveredCount,
      returnedCount,
      grossCOD,
      shippingFeesTotal,
      codFeesTotal,
      returnFeesTotal,
      netPayout,
      periodStart,
      periodEnd,
    },
    lines,
  };
}

/**
 * Issue a new settlement and lock lines atomically
 */
async function issue({
  companyId,
  merchantId,
  from,
  to,
  periodStart,
  periodEnd,
  shipmentIds,
  userId,
  notes,
}) {
  const prisma = getSharedPrismaClient();

  return prisma.$transaction(async (tx) => {
    // Generate preview with active lock & exclusion
    const previewData = await preview({
      companyId,
      merchantId,
      from: periodStart || from,
      to: periodEnd || to,
      prismaClient: tx,
    });

    let selectedLines = previewData.lines;
    if (Array.isArray(shipmentIds) && shipmentIds.length > 0) {
      const allowedSet = new Set(shipmentIds);
      selectedLines = previewData.lines.filter((l) => allowedSet.has(l.shipmentId));
    }

    if (selectedLines.length === 0) {
      throw serviceError('لا توجد شحنات مؤهلة لإنشاء الكشف أو تم إدراج الشحنات في كشف سابق', 400);
    }

    // Re-verify none of the selected shipments are already in a line
    const alreadySettled = await tx.shippingSettlementLine.findMany({
      where: {
        shipmentId: { in: selectedLines.map((l) => l.shipmentId) },
      },
      select: { shipmentId: true },
    });

    if (alreadySettled.length > 0) {
      const settledSet = new Set(alreadySettled.map((s) => s.shipmentId));
      selectedLines = selectedLines.filter((l) => !settledSet.has(l.shipmentId));
      if (selectedLines.length === 0) {
        throw serviceError('جميع الشحنات المحددة تم إدراجها بالفعل في تسويات سابقة', 400);
      }
    }

    // Recalculate totals for the final selected lines
    const grossCOD = round(selectedLines.reduce((sum, l) => sum + l.collectedAmount, 0));
    const shippingFeesTotal = round(selectedLines.reduce((sum, l) => sum + l.shippingFee, 0));
    const codFeesTotal = round(selectedLines.reduce((sum, l) => sum + l.codFee, 0));
    const returnFeesTotal = round(selectedLines.reduce((sum, l) => sum + l.returnFee, 0));
    const netPayout = round(grossCOD - shippingFeesTotal - codFeesTotal - returnFeesTotal);

    const deliveredCount = selectedLines.filter((l) => l.status === 'DELIVERED').length;
    const returnedCount = selectedLines.filter((l) => l.status === 'RETURNED').length;

    const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const settlementNumber = `SET-${dateTag}-${randSuffix}`;

    const createdSettlement = await tx.shippingSettlement.create({
      data: {
        companyId,
        merchantId,
        settlementNumber,
        status: 'ISSUED',
        periodStart: previewData.summary.periodStart,
        periodEnd: previewData.summary.periodEnd,
        totalShipments: selectedLines.length,
        deliveredCount,
        returnedCount,
        grossCOD,
        shippingFeesTotal,
        codFeesTotal,
        returnFeesTotal,
        netPayout,
        lines: {
          create: selectedLines.map((l) => ({
            shipmentId: l.shipmentId,
            codAmount: l.codAmount,
            collectedAmount: l.collectedAmount,
            shippingFee: l.shippingFee,
            codFee: l.codFee,
            returnFee: l.returnFee,
            net: l.net,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    return createdSettlement;
  });
}

/**
 * Approve a settlement: locks against edits
 */
async function approve(id, { companyId, approvedBy }) {
  const prisma = getSharedPrismaClient();

  const settlement = await prisma.shippingSettlement.findFirst({
    where: { id, companyId },
  });
  if (!settlement) throw serviceError('الكشف غير موجود', 404);

  if (settlement.status === 'APPROVED' || settlement.status === 'PAID') {
    throw serviceError('الكشف معتمد أو مدفوع بالفعل', 400);
  }
  if (settlement.status === 'REJECTED') {
    throw serviceError('لا يمكن اعتماد كشف مرفوض', 400);
  }

  return prisma.shippingSettlement.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: approvedBy || 'ADMIN',
      approvedAt: new Date(),
    },
    include: { lines: true },
  });
}

/**
 * Pay (remit) settlement: records payment, attaches treasury movement without altering shipments
 */
async function pay(id, { companyId, method = 'CASH', reference, treasuryAccountId, userId }) {
  const prisma = getSharedPrismaClient();

  return prisma.$transaction(async (tx) => {
    const settlement = await tx.shippingSettlement.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    if (!settlement) throw serviceError('الكشف غير موجود', 404);

    if (settlement.status === 'PAID') {
      throw serviceError('تم توريد وصرف هذا الكشف بالفعل', 409);
    }
    if (settlement.status === 'REJECTED') {
      throw serviceError('لا يمكن صرف كشف مرفوض', 400);
    }

    const netPayoutAmount = round(Number(settlement.netPayout || 0));
    let treasuryTransactionId = null;

    // If treasuryAccountId is provided and net payout is positive, withdraw from treasury
    if (treasuryAccountId && netPayoutAmount > 0) {
      const account = await tx.treasuryAccount.findFirst({
        where: { id: treasuryAccountId, companyId },
      });
      if (!account) {
        throw serviceError('حساب الخزينة المحدد غير موجود أو غير تابع للشركة', 400);
      }

      const updatedAccount = await tx.treasuryAccount.update({
        where: { id: treasuryAccountId },
        data: { balance: { decrement: netPayoutAmount } },
      });

      const newBalance = round(Number(updatedAccount.balance || 0));

      const txRecord = await tx.treasuryTransaction.create({
        data: {
          companyId,
          treasuryAccountId,
          amount: netPayoutAmount,
          type: 'WITHDRAWAL',
          runningBalance: newBalance,
          referenceType: 'SHIPPING_SETTLEMENT',
          referenceId: settlement.id,
          description: `صرف مستحقات تسوية الشحن ${settlement.settlementNumber}${reference ? ` - ${reference}` : ''}`,
          createdById: userId || null,
          date: new Date(),
        },
      });

      treasuryTransactionId = txRecord.id;
    } else {
      // Record reference or manual marker with documented TODO
      // TODO: Automatic treasury sync when default shipping treasury account is configured
      treasuryTransactionId = reference || `MANUAL-${settlement.settlementNumber}`;
    }

    const updatedSettlement = await tx.shippingSettlement.update({
      where: { id },
      data: {
        status: 'PAID',
        paymentMethod: method || 'CASH',
        paymentReference: reference || null,
        treasuryTransactionId,
        paidAt: new Date(),
      },
      include: { lines: true },
    });

    return updatedSettlement;
  });
}

/**
 * Reject a settlement
 */
async function reject(id, { companyId, reason, userId }) {
  const prisma = getSharedPrismaClient();

  const settlement = await prisma.shippingSettlement.findFirst({
    where: { id, companyId },
  });
  if (!settlement) throw serviceError('الكشف غير موجود', 404);

  if (settlement.status === 'PAID') {
    throw serviceError('لا يمكن رفض كشف تم صرفه بالفعل', 400);
  }

  return prisma.shippingSettlement.update({
    where: { id },
    data: {
      status: 'REJECTED',
      paymentReference: reason ? `مرفوض: ${reason}` : 'REJECTED',
    },
    include: { lines: true },
  });
}

/**
 * Void a DRAFT settlement
 */
async function voidSettlement(id, { companyId }) {
  const prisma = getSharedPrismaClient();

  const settlement = await prisma.shippingSettlement.findFirst({
    where: { id, companyId },
  });
  if (!settlement) throw serviceError('الكشف غير موجود', 404);

  if (settlement.status !== 'DRAFT') {
    throw serviceError('لا يمكن إلغاء كشف إلا في حالة المسودة (DRAFT)', 400);
  }

  // Deleting the settlement cascades lines and releases shipments
  await prisma.shippingSettlement.delete({
    where: { id },
  });

  return { success: true, message: 'تم إلغاء مسودة الكشف بنجاح' };
}

/**
 * Guard against editing lines on APPROVED or PAID settlements
 */
async function updateLine(settlementId, lineId, data, { companyId }) {
  const prisma = getSharedPrismaClient();

  const settlement = await prisma.shippingSettlement.findFirst({
    where: { id: settlementId, companyId },
  });
  if (!settlement) throw serviceError('الكشف غير موجود', 404);

  if (settlement.status === 'APPROVED' || settlement.status === 'PAID') {
    throw serviceError('ممنوع تعديل أسطر كشف معتمد أو مدفوع', 409);
  }

  return prisma.shippingSettlementLine.update({
    where: { id: lineId },
    data,
  });
}

/**
 * List settlements with filters and pagination
 */
async function list({
  companyId,
  merchantId,
  status,
  from,
  to,
  page = 1,
  limit = 20,
}) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);

  const prisma = getSharedPrismaClient();
  const where = { companyId };

  if (merchantId) where.merchantId = merchantId;
  if (status) where.status = status;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      if (typeof to === 'string' && !to.includes('T')) end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const p = Math.max(1, Number(page || 1));
  const l = Math.min(100, Math.max(1, Number(limit || 20)));
  const skip = (p - 1) * l;

  const [total, items] = await Promise.all([
    prisma.shippingSettlement.count({ where }),
    prisma.shippingSettlement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: l,
    }),
  ]);

  // Enrich with merchant details
  const merchantIds = [...new Set((items || []).map((s) => s.merchantId))];
  const merchants = merchantIds.length > 0 ? await prisma.merchant.findMany({
    where: { id: { in: merchantIds }, companyId },
    select: { id: true, name: true, phone: true, email: true },
  }) : [];
  const merchantMap = new Map((merchants || []).map((m) => [m.id, m]));

  const enriched = items.map((item) => ({
    ...item,
    merchant: merchantMap.get(item.merchantId) || null,
  }));

  return {
    settlements: enriched,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  };
}

/**
 * Get settlement details with lines
 */
async function getById(id, { companyId, merchantId, isClient = false }) {
  if (!companyId) throw serviceError('معرف الشركة مطلوب', 400);
  const prisma = getSharedPrismaClient();

  const settlement = await prisma.shippingSettlement.findFirst({
    where: { id, companyId },
    include: {
      lines: {
        include: {
          shipment: {
            select: {
              id: true,
              barcode: true,
              trackingNumber: true,
              recipientName: true,
              destinationGovernorate: true,
              destinationCity: true,
              status: true,
              codAmount: true,
              collectedAmount: true,
              createdAt: true,
              collectedAt: true,
            },
          },
        },
      },
    },
  });

  if (!settlement) throw serviceError('الكشف غير موجود', 404);

  // Strict tenant merchant isolation for client portal
  if (merchantId && settlement.merchantId !== merchantId) {
    throw serviceError('الكشف غير موجود', 404);
  }

  const merchant = await prisma.merchant.findFirst({
    where: { id: settlement.merchantId, companyId },
    select: { id: true, name: true, phone: true, email: true },
  });

  const response = {
    ...settlement,
    merchant: merchant || null,
  };

  // If client portal, strip any internal cost fields (P0 Security & Transparency)
  if (isClient) {
    response.lines = settlement.lines.map((l) => ({
      id: l.id,
      shipmentId: l.shipmentId,
      barcode: l.shipment?.barcode || l.shipment?.trackingNumber || l.shipmentId,
      trackingNumber: l.shipment?.trackingNumber || null,
      recipientName: l.shipment?.recipientName || null,
      destinationGovernorate: l.shipment?.destinationGovernorate || null,
      destinationCity: l.shipment?.destinationCity || null,
      status: l.shipment?.status || null,
      codAmount: Number(l.codAmount),
      collectedAmount: Number(l.collectedAmount),
      shippingFee: Number(l.shippingFee),
      codFee: Number(l.codFee),
      returnFee: Number(l.returnFee),
      net: Number(l.net),
      createdAt: l.createdAt,
    }));
  }

  return response;
}

/**
 * Export settlement details to CSV format
 */
async function exportCsv(id, { companyId, merchantId, isClient = false }) {
  const settlement = await getById(id, { companyId, merchantId, isClient });

  const rows = [];
  rows.push(['رقم الكشف', settlement.settlementNumber]);
  rows.push(['العميل', settlement.merchant?.name || '']);
  rows.push(['الحالة', settlement.status]);
  rows.push(['بداية الفترة', new Date(settlement.periodStart).toLocaleDateString('ar-EG')]);
  rows.push(['نهاية الفترة', new Date(settlement.periodEnd).toLocaleDateString('ar-EG')]);
  rows.push(['إجمالي الشحنات', settlement.totalShipments]);
  rows.push(['الشحنات المسلمة', settlement.deliveredCount]);
  rows.push(['الشحنات المرتجعة', settlement.returnedCount]);
  rows.push(['إجمالي COD المحصل', Number(settlement.grossCOD).toFixed(2)]);
  rows.push(['إجمالي رسوم الشحن', Number(settlement.shippingFeesTotal).toFixed(2)]);
  rows.push(['إجمالي رسوم COD', Number(settlement.codFeesTotal).toFixed(2)]);
  rows.push(['إجمالي رسوم المرتجعات', Number(settlement.returnFeesTotal).toFixed(2)]);
  rows.push(['صافي التوريد المستحق', Number(settlement.netPayout).toFixed(2)]);
  if (settlement.paymentMethod) rows.push(['طريقة التوريد', settlement.paymentMethod]);
  if (settlement.paymentReference) rows.push(['مرجع التوريد', settlement.paymentReference]);
  rows.push([]);

  // Table header
  rows.push([
    'الباركود / التتبع',
    'اسم المستلم',
    'المحافظة',
    'الحالة',
    'قيمة COD',
    'المبلغ المحصل',
    'رسوم الشحن',
    'رسوم COD',
    'رسوم المرتجع',
    'الصافي',
  ]);

  for (const line of settlement.lines || []) {
    const barcode = line.barcode || line.shipment?.barcode || line.shipment?.trackingNumber || line.shipmentId;
    const recipient = line.recipientName || line.shipment?.recipientName || '';
    const gov = line.destinationGovernorate || line.shipment?.destinationGovernorate || '';
    const status = line.status || line.shipment?.status || '';

    rows.push([
      `"${barcode}"`,
      `"${recipient}"`,
      `"${gov}"`,
      `"${status}"`,
      Number(line.codAmount).toFixed(2),
      Number(line.collectedAmount).toFixed(2),
      Number(line.shippingFee).toFixed(2),
      Number(line.codFee).toFixed(2),
      Number(line.returnFee).toFixed(2),
      Number(line.net).toFixed(2),
    ]);
  }

  const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\r\n');
  return {
    filename: `settlement-${settlement.settlementNumber}.csv`,
    csv: csvContent,
  };
}

module.exports = {
  preview,
  issue,
  approve,
  pay,
  reject,
  void: voidSettlement,
  updateLine,
  list,
  getById,
  exportCsv,
};
