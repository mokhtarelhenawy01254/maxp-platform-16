const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');
const { STATUS_FILTER_ALIASES, TURBO_SPECIFIC_FILTERS, VALID_ORDER_STATUSES, STATUS_ALIAS_MAP } = require('../../utils/turbo/constants');

const getRecords = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { page = '1', limit = '20', search, filterType, refresh } = req.query;
    const pageNum = parseInt(page), limitNum = parseInt(limit), skip = (pageNum - 1) * limitNum;
    const prisma = getSharedPrismaClient();
    const baseWhere = { companyId, OR: [{ turboShipmentId: { not: null } }, { turboTrackingNumber: { not: null } }] };
    let where = { ...baseWhere };

    if (filterType && filterType !== 'all') {
      const ft = filterType.toLowerCase();
      if (ft === 'unshipped') {
        where = { companyId, turboShipmentId: null, turboTrackingNumber: null };
      } else {
        const upperFilter = filterType.toUpperCase();
        const targetList = STATUS_FILTER_ALIASES[ft] || [ft];
        const statusOrConditions = [{ turboShipmentStatus: { in: targetList } }];
        if (ft === 'returned_to_company' || ft === 'returned') statusOrConditions.push({ status: 'RETURNED' });
        if (ft === 'merchant_preparing' || ft === 'turbo_saved' || ft === 'preparing') statusOrConditions.push({ turboShipmentStatus: null });
        if (VALID_ORDER_STATUSES.has(upperFilter) && !TURBO_SPECIFIC_FILTERS.has(ft)) statusOrConditions.push({ status: { equals: upperFilter } });
        where = { ...baseWhere, AND: [{ OR: baseWhere.OR }, { OR: statusOrConditions }] };
        delete where.OR;
      }
    }

    if (search) {
      const searchCondition = [{ orderNumber: { contains: search, mode: 'insensitive' } }, { turboTrackingNumber: { contains: search, mode: 'insensitive' } }, { turboShipmentId: { contains: search, mode: 'insensitive' } }, { customerName: { contains: search, mode: 'insensitive' } }];
      if (where.AND) { where.AND.push({ OR: searchCondition }); }
      else { const existingOR = where.OR; where.AND = [{ OR: existingOR }, { OR: searchCondition }]; delete where.OR; }
    }

    const [orders, total] = await Promise.all([
      safeQuery(() => prisma.order.findMany({ where, select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true, status: true, turboShipmentId: true, turboTrackingNumber: true, turboShipmentStatus: true, turboMetadata: true, turboCaptainName: true, turboCaptainPhone: true, turboBranchName: true, turboBranchPhone: true, turboDelayReason: true, turboReturnReason: true, turboExpectedBranch: true, createdAt: true, shipping: true, paymentMethod: true, shippingAddress: true, company: { select: { turboEnabled: true, turboApiKey: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limitNum }), 3),
      safeQuery(() => prisma.order.count({ where }), 3)
    ]);

    let turboStatuses = null;
    if (refresh === 'true') {
      const comp = await safeQuery(() => prisma.company.findUnique({ where: { id: companyId }, select: { turboEnabled: true, turboApiKey: true } }), 2).catch(() => null);
      if (comp?.turboApiKey) {
        try {
          const TurboService = require('../../services/turboService');
          const turboStatusSyncService = require('../../services/turboStatusSyncService');
          const svc = new TurboService(comp.turboApiKey, companyId);
          const now = new Date();
          const startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 180 days - captures all finalized orders
          const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const r = await svc.fetchAllStatuses(startDate, endDate);
          if (r.success && Array.isArray(r.shipments)) {
            turboStatuses = {};
            for (const s of r.shipments) {
              if (s.code) turboStatuses[String(s.code).toLowerCase()] = s;
              if (s.barCode) turboStatuses[String(s.barCode).toLowerCase()] = s;
              if (s.invoiceNumber) { const inv = String(s.invoiceNumber).toLowerCase(); turboStatuses[inv] = s; turboStatuses[`ord-${inv}`] = s; }
            }
            const allCompanyOrders = await safeQuery(() => prisma.order.findMany({ where: baseWhere, select: { id: true, orderNumber: true, turboShipmentId: true, turboTrackingNumber: true, turboShipmentStatus: true } }), 2).catch(() => []);
            for (const o of allCompanyOrders) {
              const keys = [o.turboShipmentId, o.turboTrackingNumber, o.orderNumber, o.orderNumber ? o.orderNumber.replace('ORD-', '') : null].filter(Boolean).map(k => String(k).trim().toLowerCase());
              let live = null;
              for (const k of keys) { if (turboStatuses[k]) { live = turboStatuses[k]; break; } }
              if (live) { const rawStat = live.internalStatus || live.status || live.statusCode; await turboStatusSyncService.syncTurboStatusToOrder({ orderId: o.id, orderNumber: o.orderNumber, companyId, rawStatus: rawStat, payload: live }).catch(() => {}); }
            }

            // 🔄 FALLBACK: For turbo_sent orders NOT found in get-status, search ALL individually in BACKGROUND
            // Turbo's get-status API doesn't return status_code=2 (قيد الانتظار) orders,
            // so we use search-order to check if any have moved to status_code=3 (قيد التنفيذ).
            // Runs asynchronously so the API response isn't blocked.
            const missingOrders = allCompanyOrders.filter(o => {
              if (!o.turboShipmentId || o.turboShipmentStatus !== 'turbo_sent') return false;
              const keys = [o.turboShipmentId, o.turboTrackingNumber].filter(Boolean).map(k => String(k).trim().toLowerCase());
              return !keys.some(k => turboStatuses[k]);
            });
            if (missingOrders.length > 0) {
              console.log(`🔄 [TURBO-REFRESH] ${missingOrders.length} turbo_sent orders not in get-status — launching background search-order for ALL...`);
              // Fire-and-forget: update in background so API responds immediately
              setImmediate(async () => {
                let fixed = 0, checked = 0;
                for (const o of missingOrders) {
                  try {
                    const shipmentCode = o.turboShipmentId || o.turboTrackingNumber;
                    const searchResult = await svc.trackShipment(shipmentCode);
                    checked++;
                    if (searchResult?.success && searchResult.data) {
                      const rawStat = searchResult.data.internalStatus || searchResult.data.status || 'turbo_sent';
                      console.log(`🔍 [TURBO-BG] ${shipmentCode}: success=true, status="${rawStat}"`);
                      if (rawStat !== 'turbo_sent') {
                        await turboStatusSyncService.syncTurboStatusToOrder({ orderId: o.id, orderNumber: o.orderNumber, companyId, rawStatus: rawStat, payload: searchResult.data.raw || searchResult.data }).catch(() => {});
                        fixed++;
                      }
                    } else {
                      // Log first 5 failures for diagnostics
                      if (checked <= 5) console.log(`🔍 [TURBO-BG] ${shipmentCode}: success=false, error="${searchResult?.error || 'unknown'}"`);
                    }
                  } catch (e) { /* individual search-order failed, skip */ }
                  await new Promise(r => setTimeout(r, 150)); // 150ms delay between calls
                }
                console.log(`✅ [TURBO-BG] Background search-order complete: ${fixed}/${checked} orders updated from turbo_sent`);
              });
            }
          }
        } catch (e) { console.warn('⚠️ [TURBO] Failed to refresh statuses:', e.message); }
      }
    }

    const records = orders.map(o => {
      const key = o.turboShipmentId || o.turboTrackingNumber;
      const ls = turboStatuses && key && turboStatuses[key] ? { status: turboStatuses[key].status, statusCode: turboStatuses[key].statusCode, internalStatus: turboStatuses[key].internalStatus, captain: turboStatuses[key].captain, captainNumber1: turboStatuses[key].captainNumber1, branch: turboStatuses[key].branch, receivedAmount: turboStatuses[key].receivedAmount, returnReason: turboStatuses[key].returnReason, delayReason: turboStatuses[key].delayReason } : null;
      return { id: o.id, orderNumber: o.orderNumber, customerName: o.customerName, customerPhone: o.customerPhone, total: o.total, shipping: o.shipping, paymentMethod: o.paymentMethod, status: o.status, turboShipmentId: o.turboShipmentId, turboTrackingNumber: o.turboTrackingNumber, turboShipmentStatus: o.turboShipmentStatus || ls?.internalStatus || null, turboLiveStatus: ls, turboCaptainName: o.turboCaptainName, turboCaptainPhone: o.turboCaptainPhone, turboBranchName: o.turboBranchName, turboBranchPhone: o.turboBranchPhone, turboDelayReason: o.turboDelayReason, turboReturnReason: o.turboReturnReason, turboExpectedBranch: o.turboExpectedBranch, governorate: o.shippingAddress?.governorate || null, city: o.shippingAddress?.city || null, createdAt: o.createdAt };
    });

    const statusCountsRaw = await safeQuery(() => prisma.order.groupBy({ by: ['turboShipmentStatus'], where: baseWhere, _count: { id: true } }), 2).catch(() => []);
    const statusCountsObj = {};
    if (Array.isArray(statusCountsRaw)) {
      for (const row of statusCountsRaw) {
        const rawKey = (row.turboShipmentStatus || 'turbo_saved').toLowerCase();
        const key = STATUS_ALIAS_MAP[rawKey] || rawKey;
        statusCountsObj[key] = (statusCountsObj[key] || 0) + row._count.id;
      }
    }
    statusCountsObj['returned'] = statusCountsObj['returned_to_company'] || 0;
    statusCountsObj['merchant_preparing'] = (statusCountsObj['turbo_saved'] || 0) + (statusCountsObj['turbo_sent'] || 0);
    statusCountsObj['preparing'] = statusCountsObj['merchant_preparing'] + (statusCountsObj['processing'] || 0);
    // Combined "in Turbo pipeline" = what Turbo dashboard calls "قيد التنفيذ" (status_code 2+3+4)
    statusCountsObj['in_turbo_pipeline'] = (statusCountsObj['turbo_sent'] || 0) + (statusCountsObj['processing'] || 0) + (statusCountsObj['out_for_delivery'] || 0);


    const financialOrders = await safeQuery(() => prisma.order.findMany({ where: baseWhere, select: { total: true, turboShipmentStatus: true } }), 2).catch(() => []);
    let pendingRemittanceAmount = 0, pendingRemittanceCount = 0, activeInTransitAmount = 0, activeInTransitCount = 0, remittedAmount = 0, remittedCount = 0;
    for (const fo of financialOrders) {
      const st = (fo.turboShipmentStatus || '').toLowerCase().trim();
      const val = typeof fo.total === 'number' ? fo.total : parseFloat(fo.total || 0) || 0;
      if (st === 'delivered' || st === '7') { pendingRemittanceAmount += val; pendingRemittanceCount++; }
      else if (st === 'remitted' || st === '8' || st === '19') { remittedAmount += val; remittedCount++; }
      else if (['out_for_delivery', 'processing', 'delayed', 'turbo_sent', 'turbo_saved', '3', '4', '13', '2', '1'].includes(st)) { activeInTransitAmount += val; activeInTransitCount++; }
    }

    res.json({
      success: true, data: records, statusCounts: statusCountsObj,
      financialSummary: { pendingRemittanceAmount, pendingRemittanceCount, activeInTransitAmount, activeInTransitCount, remittedAmount, remittedCount },
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('❌ [TURBO-CONTROLLER] Error fetching records:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getRecords };
