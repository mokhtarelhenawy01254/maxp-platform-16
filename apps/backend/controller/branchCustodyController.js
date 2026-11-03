const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { recordShipmentEvent } = require('../services/shipping/shipmentEventService');

/**
 * Format shipment response to ensure declaredWeightKg, actualWeightKg,
 * numeric weights and costs are consistently exposed.
 */
function formatShipment(shipment) {
  if (!shipment) return null;
  const raw = typeof shipment.toJSON === 'function' ? shipment.toJSON() : { ...shipment };

  let declaredWeight = null;
  let actualWeightFromMeta = null;

  if (raw.metadata) {
    try {
      const metadataObj = typeof raw.metadata === 'string' ? JSON.parse(raw.metadata) : raw.metadata;
      if (metadataObj && metadataObj.declaredWeightKg !== undefined && metadataObj.declaredWeightKg !== null) {
        declaredWeight = Number(metadataObj.declaredWeightKg);
      }
      if (metadataObj && metadataObj.actualWeightKg !== undefined && metadataObj.actualWeightKg !== null) {
        actualWeightFromMeta = Number(metadataObj.actualWeightKg);
      }
    } catch (_) {}
  }

  const actualWeightVal = raw.actualWeight !== null && raw.actualWeight !== undefined
    ? Number(raw.actualWeight)
    : actualWeightFromMeta;

  const currentWeightVal = raw.weight !== null && raw.weight !== undefined
    ? Number(raw.weight)
    : null;

  const declaredWeightKg = declaredWeight !== null
    ? declaredWeight
    : (raw.declaredWeightKg !== undefined && raw.declaredWeightKg !== null
        ? Number(raw.declaredWeightKg)
        : currentWeightVal);

  const actualWeightKg = actualWeightVal !== null
    ? actualWeightVal
    : (raw.actualWeightKg !== undefined && raw.actualWeightKg !== null
        ? Number(raw.actualWeightKg)
        : null);

  return {
    ...raw,
    weight: currentWeightVal,
    cost: raw.cost !== null && raw.cost !== undefined ? Number(raw.cost) : null,
    actualWeight: actualWeightVal,
    declaredWeightKg,
    actualWeightKg,
    courierCost: raw.courierCost !== null && raw.courierCost !== undefined ? Number(raw.courierCost) : null,
    costSource: raw.costSource || null,
    marginAmount: raw.marginAmount !== null && raw.marginAmount !== undefined ? Number(raw.marginAmount) : null,
  };
}

/**
 * GET /api/v1/shipping-portal/branches/:id/inventory
 * Retrieves current shipment inventory for a branch with status counters
 */
async function getBranchInventory(req, res) {
  try {
    const { companyId } = req.user;
    const { id: branchId } = req.params;
    const { status, search, page = 1, limit = 20 } = req.query;
    const prisma = getSharedPrismaClient();

    const branch = await prisma.shippingBranch.findFirst({
      where: { id: branchId, companyId },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    const where = {
      companyId,
      branchId: branch.id,
    };

    if (status && String(status).trim() && String(status).trim().toUpperCase() !== 'ALL') {
      where.status = String(status).trim().toUpperCase();
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      where.OR = [
        { trackingNumber: { contains: q, mode: 'insensitive' } },
        { barcode: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { recipientPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const allInBranch = await prisma.shipment.findMany({
      where: { companyId, branchId: branch.id },
      select: { id: true, status: true },
    });

    const statusCounts = {};
    allInBranch.forEach((s) => {
      statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    });
    statusCounts.total = allInBranch.length;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * take;

    const [shipments, filteredTotal] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastBranchAt: 'desc' }, { updatedAt: 'desc' }],
        include: {
          branch: true,
          merchant: { select: { id: true, name: true, phone: true } },
          courier: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    return res.json({
      success: true,
      branch,
      shipments: shipments.map(formatShipment),
      statusCounts,
      pagination: {
        page: pageNum,
        limit: take,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / take) || 1,
      },
    });
  } catch (error) {
    console.error('[ShippingPortal] Error getting branch inventory:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب عهدة الفرع',
    });
  }
}

/**
 * POST /api/v1/shipping-portal/branches/:id/transfer
 * Transfers shipments from source branch to target branch
 */
async function transferBranchShipments(req, res) {
  try {
    const { companyId } = req.user;
    const { id: sourceBranchId } = req.params;
    const { shipmentIds, toBranchId, courierId, notes } = req.body;
    const prisma = getSharedPrismaClient();

    const sourceBranch = await prisma.shippingBranch.findFirst({
      where: { id: sourceBranchId, companyId },
    });
    if (!sourceBranch) {
      return res.status(404).json({ success: false, error: 'الفرع المصدر غير موجود' });
    }

    if (!toBranchId) {
      return res.status(400).json({ success: false, error: 'الفرع الهدف مطلوب' });
    }

    const targetBranch = await prisma.shippingBranch.findFirst({
      where: { id: toBranchId, companyId },
    });
    if (!targetBranch) {
      return res.status(404).json({ success: false, error: 'الفرع المحول إليه غير موجود أو تابع لشركة أخرى' });
    }

    if (targetBranch.id === sourceBranch.id) {
      return res.status(400).json({ success: false, error: 'لا يمكن التحويل لنفس الفرع المصدر' });
    }

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'قائمة الشحنات مطلوبة' });
    }

    let courier = null;
    if (courierId) {
      courier = await prisma.courier.findFirst({
        where: { id: courierId, companyId },
      });
    }

    const shipments = await prisma.shipment.findMany({
      where: {
        id: { in: shipmentIds },
        companyId,
      },
      include: { branch: true },
    });

    const shipmentMap = new Map(shipments.map((s) => [s.id, s]));
    const transferred = [];
    const failed = [];
    const now = new Date();

    for (const shipmentId of shipmentIds) {
      const shipment = shipmentMap.get(shipmentId);
      if (!shipment) {
        failed.push({
          id: shipmentId,
          reason: 'NOT_FOUND',
          message: 'الشحنة غير موجودة',
        });
        continue;
      }

      if (shipment.branchId !== sourceBranch.id) {
        failed.push({
          id: shipmentId,
          trackingNumber: shipment.trackingNumber,
          reason: 'NOT_IN_BRANCH',
          message: `الشحنة ليست بعهدة الفرع ${sourceBranch.name}`,
        });
        continue;
      }

      const terminalStatuses = ['DELIVERED', 'CANCELLED'];
      if (terminalStatuses.includes(shipment.status)) {
        failed.push({
          id: shipmentId,
          trackingNumber: shipment.trackingNumber,
          reason: 'INVALID_STATUS',
          message: `حالة الشحنة (${shipment.status}) لا تسمح بالتحويل بين الفروع`,
        });
        continue;
      }

      const updateData = {
        branchId: targetBranch.id,
        lastBranchAt: now,
      };
      if (courierId) {
        updateData.courierId = courierId;
      }

      const updated = await prisma.shipment.update({
        where: { id: shipment.id },
        data: updateData,
        include: {
          branch: true,
          merchant: { select: { id: true, name: true, phone: true } },
          courier: { select: { id: true, name: true, phone: true } },
        },
      });

      await recordShipmentEvent(prisma, {
        companyId,
        shipmentId: shipment.id,
        fromStatus: shipment.status,
        toStatus: 'TRANSFERRED',
        reasonCode: 'BRANCH_TRANSFER',
        notes: notes || `تحويل عهدة من فرع ${sourceBranch.name} إلى ${targetBranch.name}`,
        actorType: req.user?.role === 'COURIER' ? 'COURIER' : 'ADMIN',
        actorId: req.user?.id || null,
        actorName: req.user?.name || 'مسؤول الحركة والفرع',
        branchId: targetBranch.id,
        metadata: {
          fromBranchId: sourceBranch.id,
          fromBranchName: sourceBranch.name,
          fromBranchCode: sourceBranch.code,
          toBranchId: targetBranch.id,
          toBranchName: targetBranch.name,
          toBranchCode: targetBranch.code,
          courierId: courierId || null,
          courierName: courier ? courier.name : null,
          transferredAt: now.toISOString(),
          notes: notes || null,
        },
      });

      transferred.push(formatShipment(updated));
    }

    const manifestNumber = `TRF-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    return res.json({
      success: true,
      manifest: {
        manifestNumber,
        sourceBranch: { id: sourceBranch.id, name: sourceBranch.name, code: sourceBranch.code },
        targetBranch: { id: targetBranch.id, name: targetBranch.name, code: targetBranch.code },
        totalRequested: shipmentIds.length,
        transferredCount: transferred.length,
        failedCount: failed.length,
        transferredAt: now.toISOString(),
      },
      transferred,
      failed,
    });
  } catch (error) {
    console.error('[ShippingPortal] Error transferring shipments:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء تحويل الشحنات بين الفروع',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/branches/:id/summary
 * Branch custody summary: counts by status, expected COD, aging parcels > 48h
 */
async function getBranchSummary(req, res) {
  try {
    const { companyId } = req.user;
    const { id: branchId } = req.params;
    const prisma = getSharedPrismaClient();

    const branch = await prisma.shippingBranch.findFirst({
      where: { id: branchId, companyId },
    });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'الفرع غير موجود' });
    }

    const shipments = await prisma.shipment.findMany({
      where: { companyId, branchId: branch.id },
      select: {
        id: true,
        trackingNumber: true,
        barcode: true,
        status: true,
        codAmount: true,
        lastBranchAt: true,
        createdAt: true,
        updatedAt: true,
        recipientName: true,
        recipientPhone: true,
        destinationGovernorate: true,
        destinationCity: true,
      },
    });

    const now = Date.now();
    const byStatus = {};
    let expectedCod = 0;
    const agingShipments = [];

    shipments.forEach((s) => {
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;

      // Expected COD: uncollected, non-terminal shipments
      const isTerminal = ['DELIVERED', 'CANCELLED', 'RETURNED'].includes(s.status);
      if (!isTerminal && s.codAmount) {
        expectedCod += Number(s.codAmount) || 0;
      }

      // Aging check: in branch > 48h
      const branchTime = s.lastBranchAt ? new Date(s.lastBranchAt).getTime() : new Date(s.createdAt).getTime();
      const ageHours = (now - branchTime) / (1000 * 3600);
      if (ageHours > 48 && !['DELIVERED', 'CANCELLED'].includes(s.status)) {
        agingShipments.push({
          id: s.id,
          trackingNumber: s.trackingNumber,
          barcode: s.barcode,
          status: s.status,
          codAmount: Number(s.codAmount || 0),
          recipientName: s.recipientName,
          recipientPhone: s.recipientPhone,
          destinationGovernorate: s.destinationGovernorate,
          destinationCity: s.destinationCity,
          branchArrival: s.lastBranchAt || s.createdAt,
          ageHours: Math.round(ageHours),
        });
      }
    });

    return res.json({
      success: true,
      branch,
      summary: {
        totalShipments: shipments.length,
        byStatus,
        expectedCod: Number(expectedCod.toFixed(2)),
        aging48hCount: agingShipments.length,
        agingShipments,
      },
    });
  } catch (error) {
    console.error('[ShippingPortal] Error getting branch summary:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء جلب ملخص عهدة الفرع',
    });
  }
}

/**
 * GET /api/v1/shipping-portal/branches/custody-diff
 * GET /api/v1/shipping-portal/custody-diff
 * Branch custody reconciliation: received / transferred / delivered / returned and discrepancies
 */
async function getCustodyDiff(req, res) {
  try {
    const { companyId } = req.user;
    const { from, to } = req.query;
    const prisma = getSharedPrismaClient();

    const eventWhere = { companyId };
    if (from || to) {
      eventWhere.createdAt = {};
      if (from) eventWhere.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        if (!String(to).includes('T')) toDate.setHours(23, 59, 59, 999);
        eventWhere.createdAt.lte = toDate;
      }
    }

    const [branches, events, currentShipments] = await Promise.all([
      prisma.shippingBranch.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
      }),
      prisma.shipmentEvent.findMany({
        where: eventWhere,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.shipment.findMany({
        where: { companyId },
        select: {
          id: true,
          branchId: true,
          status: true,
          trackingNumber: true,
          recipientName: true,
        },
      }),
    ]);

    const stats = {};
    branches.forEach((b) => {
      stats[b.id] = {
        branchId: b.id,
        branchName: b.name,
        branchCode: b.code,
        governorate: b.governorate,
        received: 0,
        transferredIn: 0,
        transferredOut: 0,
        delivered: 0,
        returned: 0,
        currentInventory: 0,
        discrepancies: [],
      };
    });

    const shipmentBranchMap = new Map();
    currentShipments.forEach((s) => {
      if (s.branchId && stats[s.branchId]) {
        stats[s.branchId].currentInventory += 1;
        shipmentBranchMap.set(s.id, s.branchId);

        if (['DELIVERED', 'CANCELLED'].includes(s.status)) {
          stats[s.branchId].discrepancies.push({
            shipmentId: s.id,
            trackingNumber: s.trackingNumber,
            issue: 'TERMINAL_STATUS_IN_CUSTODY',
            message: `الشحنة حالتها ${s.status} ولكن ما زالت مسجلة في عهدة الفرع`,
          });
        }
      }
    });

    for (const ev of events) {
      const toStatus = (ev.toStatus || '').toUpperCase();
      let meta = null;
      try {
        meta = typeof ev.metadata === 'string' ? JSON.parse(ev.metadata) : ev.metadata;
      } catch {}

      if (toStatus === 'RECEIVED_AT_HUB') {
        const bId = ev.branchId || meta?.branchId || meta?.toBranchId;
        if (bId && stats[bId]) {
          stats[bId].received += 1;
        }
      } else if (toStatus === 'TRANSFERRED' || ev.reasonCode === 'BRANCH_TRANSFER') {
        const fromB = meta?.fromBranchId;
        const toB = meta?.toBranchId || ev.branchId;
        if (fromB && stats[fromB]) {
          stats[fromB].transferredOut += 1;
        }
        if (toB && stats[toB]) {
          stats[toB].transferredIn += 1;
        }
      } else if (toStatus === 'DELIVERED') {
        const bId = ev.branchId || meta?.branchId || shipmentBranchMap.get(ev.shipmentId);
        if (bId && stats[bId]) {
          stats[bId].delivered += 1;
        }
      } else if (toStatus === 'RETURNED' || toStatus === 'RETURNED_TO_HUB') {
        const bId = ev.branchId || meta?.branchId || shipmentBranchMap.get(ev.shipmentId);
        if (bId && stats[bId]) {
          stats[bId].returned += 1;
        }
      }
    }

    const diff = Object.values(stats);

    return res.json({
      success: true,
      dateRange: { from: from || null, to: to || null },
      diff,
      totals: {
        totalBranches: branches.length,
        totalReceived: diff.reduce((sum, b) => sum + b.received, 0),
        totalTransferredIn: diff.reduce((sum, b) => sum + b.transferredIn, 0),
        totalTransferredOut: diff.reduce((sum, b) => sum + b.transferredOut, 0),
        totalDelivered: diff.reduce((sum, b) => sum + b.delivered, 0),
        totalReturned: diff.reduce((sum, b) => sum + b.returned, 0),
        totalCurrentInventory: diff.reduce((sum, b) => sum + b.currentInventory, 0),
        totalDiscrepancies: diff.reduce((sum, b) => sum + b.discrepancies.length, 0),
      },
    });
  } catch (error) {
    console.error('[ShippingPortal] Error calculating custody diff:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'حدث خطأ أثناء احتساب تقرير فروق العهدة',
    });
  }
}

module.exports = {
  formatShipment,
  getBranchInventory,
  transferBranchShipments,
  getBranchSummary,
  getCustodyDiff,
};
