const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { normalizeTurboStatus } = require('../utils/statusNormalizer');

const TURBO_COMPANY_KEY = 'TURBO';
const TURBO_COMPANY_NAME = 'Turbo Express';
const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];
const TURBO_DELIVERED_CANONICAL = new Set(['delivered', 'remitted']);

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isDelivered = (orderStatus, shipmentStatus) =>
  DELIVERED_STATUSES.includes(normalizeStatus(orderStatus)) ||
  DELIVERED_STATUSES.includes(normalizeStatus(shipmentStatus));

const isTurboDelivered = (orderStatus, turboStatus) =>
  DELIVERED_STATUSES.includes(normalizeStatus(orderStatus)) ||
  TURBO_DELIVERED_CANONICAL.has(normalizeTurboStatus(turboStatus));

const normalizeAmount = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getCompanyId = (req) => req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

const parseTurboMetadata = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const buildShipmentInclude = () => ({
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      total: true,
      shipping: true,
      status: true
    }
  },
  shippingCompany: {
    select: {
      id: true,
      name: true,
      providerKey: true
    }
  }
});

const mapShipmentEntry = (shipment) => {
  const delivered = isDelivered(shipment.order?.status, shipment.status);
  return {
    id: shipment.id,
    trackingNumber: shipment.trackingNumber,
    externalShipmentId: shipment.externalShipmentId,
    shipmentStatus: shipment.status,
    cost: normalizeAmount(shipment.cost),
    createdAt: shipment.createdAt,
    settlementStatus: shipment.settlementStatus || 'PENDING',
    settledAt: shipment.settledAt,
    delivered,
    sourceType: 'SHIPMENT',
    order: shipment.order
      ? {
          orderNumber: shipment.order.orderNumber,
          customerName: shipment.order.customerName,
          customerPhone: shipment.order.customerPhone,
          total: normalizeAmount(shipment.order.total),
          shipping: normalizeAmount(shipment.order.shipping),
          status: shipment.order.status
        }
      : null
  };
};

const mapTurboOrderEntry = (order) => {
  const meta = parseTurboMetadata(order.turboMetadata);
  return {
    id: order.id,
    trackingNumber: order.turboTrackingNumber || null,
    externalShipmentId: order.turboShipmentId || null,
    shipmentStatus: order.turboShipmentStatus || null,
    cost: normalizeAmount(order.shipping),
    createdAt: order.createdAt,
    settlementStatus: meta.settlementStatus || 'PENDING',
    settledAt: meta.settledAt || null,
    delivered: isTurboDelivered(order.status, order.turboShipmentStatus),
    sourceType: 'TURBO',
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: normalizeAmount(order.total),
      shipping: normalizeAmount(order.shipping),
      status: order.status
    }
  };
};

const buildDateRange = (startDate, endDate) => {
  const createdAt = {};
  if (startDate) createdAt.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    createdAt.lte = end;
  }
  return createdAt;
};

const getSummary = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const prisma = getSharedPrismaClient();

    const companies = await prisma.shippingCompany.findMany({
      where: { companyId },
      select: { id: true, name: true, providerKey: true }
    });

    const shipments = await prisma.shipment.findMany({
      where: { companyId },
      select: {
        id: true,
        shippingCompanyId: true,
        status: true,
        settlementStatus: true,
        order: { select: { total: true, status: true } }
      }
    });

    const summaryByCompany = companies.map((company) => {
      const companyShipments = shipments.filter((s) => s.shippingCompanyId === company.id);
      let deliveredShipments = 0;
      let pendingAmount = 0;
      let settledShipments = 0;
      let settledAmount = 0;

      for (const shipment of companyShipments) {
        const delivered = isDelivered(shipment.order?.status, shipment.status);
        const amount = normalizeAmount(shipment.order?.total);
        if (delivered) {
          if (shipment.settlementStatus === 'SETTLED') {
            settledShipments += 1;
            settledAmount += amount;
          } else {
            deliveredShipments += 1;
            pendingAmount += amount;
          }
        }
      }

      return {
        company: { id: company.id, name: company.name, providerKey: company.providerKey },
        totalShipments: companyShipments.length,
        deliveredShipments,
        pendingAmount,
        settledShipments,
        settledAmount
      };
    });

    // 💠 Turbo virtual company: Turbo shipments live on the Order table
    // (turboShipmentId / turboShipmentStatus / turboMetadata), not on Shipment rows,
    // so they never reach the Shipment-based settlement above. Merge them here.
    const turboOrders = await prisma.order.findMany({
      where: { companyId, OR: [{ turboShipmentId: { not: null } }, { turboTrackingNumber: { not: null } }] },
      select: { id: true, total: true, status: true, turboShipmentStatus: true, turboMetadata: true }
    });

    let turboDelivered = 0;
    let turboPendingAmount = 0;
    let turboSettled = 0;
    let turboSettledAmount = 0;

    for (const order of turboOrders) {
      if (!isTurboDelivered(order.status, order.turboShipmentStatus)) continue;
      const amount = normalizeAmount(order.total);
      if (parseTurboMetadata(order.turboMetadata).settlementStatus === 'SETTLED') {
        turboSettled += 1;
        turboSettledAmount += amount;
      } else {
        turboDelivered += 1;
        turboPendingAmount += amount;
      }
    }

    if (turboOrders.length > 0) {
      summaryByCompany.push({
        company: { id: TURBO_COMPANY_KEY, name: TURBO_COMPANY_NAME, providerKey: 'TURBO' },
        totalShipments: turboOrders.length,
        deliveredShipments: turboDelivered,
        pendingAmount: turboPendingAmount,
        settledShipments: turboSettled,
        settledAmount: turboSettledAmount
      });
    }

    res.json({ success: true, data: summaryByCompany });
  } catch (error) {
    console.error('❌ [SHIPPING-SETTLEMENT] Error in getSummary:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل ملخص التسويات' });
  }
};

const listOrders = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const prisma = getSharedPrismaClient();

    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const search = String(req.query.search || '').trim();
    const shippingCompanyId = String(req.query.shippingCompanyId || '');
    const settlementStatusFilter = req.query.settlementStatus || '';
    const isTurboFilter = shippingCompanyId === TURBO_COMPANY_KEY;
    const includeShipments = !shippingCompanyId || !isTurboFilter;
    const includeTurbo = !shippingCompanyId || isTurboFilter;

    const entries = [];

    if (includeShipments) {
      // Internal-courier shipments settle exclusively through the fleet module
      // (courier custody → treasury remittance); they must never appear here.
      const shipmentWhere = { companyId, carrierType: { not: 'INTERNAL_COURIER' } };
      if (!isTurboFilter && shippingCompanyId) shipmentWhere.shippingCompanyId = shippingCompanyId;
      if (settlementStatusFilter === 'SETTLED') shipmentWhere.settlementStatus = 'SETTLED';
      else if (settlementStatusFilter === 'PENDING') shipmentWhere.settlementStatus = { not: 'SETTLED' };

      if (req.query.startDate || req.query.endDate) {
        shipmentWhere.createdAt = buildDateRange(req.query.startDate, req.query.endDate);
      }

      if (search) {
        shipmentWhere.OR = [
          { order: { is: { orderNumber: { contains: search, mode: 'insensitive' } } } },
          { order: { is: { customerName: { contains: search, mode: 'insensitive' } } } },
          { trackingNumber: { contains: search, mode: 'insensitive' } },
          { externalShipmentId: { contains: search, mode: 'insensitive' } }
        ];
      }

      const shipments = await prisma.shipment.findMany({
        where: shipmentWhere,
        include: buildShipmentInclude(),
        orderBy: { createdAt: 'desc' }
      });

      for (const shipment of shipments) {
        entries.push(mapShipmentEntry(shipment));
      }
    }

    if (includeTurbo) {
      const turboWhere = { companyId, OR: [{ turboShipmentId: { not: null } }, { turboTrackingNumber: { not: null } }] };

      if (req.query.startDate || req.query.endDate) {
        turboWhere.createdAt = buildDateRange(req.query.startDate, req.query.endDate);
      }

      if (search) {
        turboWhere.AND = [
          {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' } },
              { customerName: { contains: search, mode: 'insensitive' } },
              { turboTrackingNumber: { contains: search, mode: 'insensitive' } },
              { turboShipmentId: { contains: search, mode: 'insensitive' } }
            ]
          }
        ];
      }

      const turboOrders = await prisma.order.findMany({
        where: turboWhere,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          total: true,
          shipping: true,
          status: true,
          turboShipmentId: true,
          turboTrackingNumber: true,
          turboShipmentStatus: true,
          turboMetadata: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const order of turboOrders) {
        const meta = parseTurboMetadata(order.turboMetadata);
        const turboSettlementStatus = meta.settlementStatus || 'PENDING';
        if (settlementStatusFilter === 'SETTLED' && turboSettlementStatus !== 'SETTLED') continue;
        if (settlementStatusFilter === 'PENDING' && turboSettlementStatus === 'SETTLED') continue;
        entries.push(mapTurboOrderEntry(order));
      }
    }

    entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = entries.length;
    const pages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = entries.slice(start, start + limit);

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, pages }
    });
  } catch (error) {
    console.error('❌ [SHIPPING-SETTLEMENT] Error in listOrders:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تحميل شحنات التسوية' });
  }
};

const settle = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const prisma = getSharedPrismaClient();
    const userId = req.user?.id;

    const { shippingCompanyId, shipmentIds, turboOrderIds, settlementDate } = req.body || {};
    const settledAtValue = settlementDate ? new Date(settlementDate) : new Date();
    let updated = 0;

    const shouldSettleTurbo =
      shippingCompanyId === TURBO_COMPANY_KEY || (Array.isArray(turboOrderIds) && turboOrderIds.length > 0);

    if (shouldSettleTurbo) {
      const turboWhere = { companyId };
      if (Array.isArray(turboOrderIds) && turboOrderIds.length) {
        turboWhere.id = { in: turboOrderIds };
      } else {
        turboWhere.OR = [{ turboShipmentId: { not: null } }, { turboTrackingNumber: { not: null } }];
      }

      const turboOrders = await prisma.order.findMany({
        where: turboWhere,
        select: { id: true, status: true, turboShipmentStatus: true, turboMetadata: true }
      });

      for (const order of turboOrders) {
        if (!isTurboDelivered(order.status, order.turboShipmentStatus)) continue;
        const meta = parseTurboMetadata(order.turboMetadata);
        if (meta.settlementStatus === 'SETTLED') continue;
        meta.settlementStatus = 'SETTLED';
        meta.settledAt = settledAtValue.toISOString();
        meta.settledBy = userId || null;
        await prisma.order.update({
          where: { id: order.id },
          data: { turboMetadata: JSON.stringify(meta) }
        });
        updated += 1;
      }
    } else {
      const hasShipmentTarget = Array.isArray(shipmentIds) && shipmentIds.length > 0;
      if (!shippingCompanyId && !hasShipmentTarget) {
        return res.status(400).json({ success: false, message: 'حدد شركة الشحن أو قائمة الشحنات' });
      }

      const where = { companyId, carrierType: { not: 'INTERNAL_COURIER' } };
      if (shippingCompanyId) where.shippingCompanyId = shippingCompanyId;
      if (hasShipmentTarget) where.id = { in: shipmentIds };
      where.settlementStatus = { not: 'SETTLED' };
      // Consistent with getSummary's delivered logic: a shipment is settlable when
      // either the order status OR the shipment status is a delivered status.
      // This also allows delivered shipments without an Order relation to settle.
      where.OR = [
        { order: { status: { in: DELIVERED_STATUSES } } },
        { status: { in: DELIVERED_STATUSES } }
      ];

      const result = await prisma.shipment.updateMany({
        where,
        data: {
          settlementStatus: 'SETTLED',
          settledAt: settledAtValue,
          settledBy: userId || null
        }
      });
      updated = result.count;
    }

    res.json({ success: true, data: { updated } });
  } catch (error) {
    console.error('❌ [SHIPPING-SETTLEMENT] Error in settle:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر تنفيذ التسوية' });
  }
};

const unsettle = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, message: 'معرف الشركة مفقود' });
    const prisma = getSharedPrismaClient();

    const { shipmentIds, turboOrderIds } = req.body || {};
    let updated = 0;

    if (Array.isArray(turboOrderIds) && turboOrderIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: { companyId, id: { in: turboOrderIds } },
        select: { id: true, turboMetadata: true }
      });

      for (const order of orders) {
        const meta = parseTurboMetadata(order.turboMetadata);
        if (meta.settlementStatus !== 'SETTLED') continue;
        meta.settlementStatus = 'PENDING';
        delete meta.settledAt;
        delete meta.settledBy;
        await prisma.order.update({
          where: { id: order.id },
          data: { turboMetadata: JSON.stringify(meta) }
        });
        updated += 1;
      }
    }

    if (Array.isArray(shipmentIds) && shipmentIds.length > 0) {
      const result = await prisma.shipment.updateMany({
        where: { companyId, id: { in: shipmentIds }, settlementStatus: 'SETTLED' },
        data: { settlementStatus: 'PENDING', settledAt: null, settledBy: null }
      });
      updated += result.count;
    }

    if (updated === 0 && !Array.isArray(turboOrderIds) && !Array.isArray(shipmentIds)) {
      return res.status(400).json({ success: false, message: 'قائمة الشحنات مطلوبة' });
    }

    res.json({ success: true, data: { updated } });
  } catch (error) {
    console.error('❌ [SHIPPING-SETTLEMENT] Error in unsettle:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر التراجع عن التسوية' });
  }
};

module.exports = { getSummary, listOrders, settle, unsettle };
