const { getSharedPrismaClient } = require('../services/sharedDatabase');

const DELIVERED_STATUSES = ['DELIVERED', 'COMPLETED', 'REMITTED'];

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const isDelivered = (orderStatus, shipmentStatus) =>
  DELIVERED_STATUSES.includes(normalizeStatus(orderStatus)) ||
  DELIVERED_STATUSES.includes(normalizeStatus(shipmentStatus));

const normalizeAmount = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const getCompanyId = (req) => req.user?.companyId || req.headers['x-company-id'] || req.headers['X-Company-Id'];

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

const buildOrderFilters = (filters) => {
  const where = {};
  if (filters.shippingCompanyId) where.shippingCompanyId = filters.shippingCompanyId;
  if (filters.settlementStatus === 'SETTLED') where.settlementStatus = 'SETTLED';
  if (filters.settlementStatus === 'PENDING') where.settlementStatus = { not: 'SETTLED' };

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  return where;
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
    const where = { companyId, ...buildOrderFilters(req.query) };

    if (req.query.search) {
      const search = String(req.query.search).trim();
      where.OR = [
        { order: { is: { orderNumber: { contains: search, mode: 'insensitive' } } } },
        { order: { is: { customerName: { contains: search, mode: 'insensitive' } } } },
        { trackingNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [total, shipments] = await Promise.all([
      prisma.shipment.count({ where }),
      prisma.shipment.findMany({
        where,
        include: buildShipmentInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    const data = shipments.map((shipment) => {
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
    });

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
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

    const { shippingCompanyId, shipmentIds, settlementDate } = req.body || {};

    let where = { companyId };
    if (shippingCompanyId) {
      where.shippingCompanyId = shippingCompanyId;
    } else if (Array.isArray(shipmentIds) && shipmentIds.length) {
      where.id = { in: shipmentIds };
    } else {
      return res.status(400).json({ success: false, message: 'حدد شركة الشحن أو قائمة الشحنات' });
    }
    where.settlementStatus = { not: 'SETTLED' };

    const result = await prisma.shipment.updateMany({
      where,
      data: {
        settlementStatus: 'SETTLED',
        settledAt: settlementDate ? new Date(settlementDate) : new Date(),
        settledBy: userId || null
      }
    });

    res.json({ success: true, data: { updated: result.count } });
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

    const { shipmentIds } = req.body || {};
    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'قائمة الشحنات مطلوبة' });
    }

    const result = await prisma.shipment.updateMany({
      where: { companyId, id: { in: shipmentIds }, settlementStatus: 'SETTLED' },
      data: { settlementStatus: 'PENDING', settledAt: null, settledBy: null }
    });

    res.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    console.error('❌ [SHIPPING-SETTLEMENT] Error in unsettle:', error);
    res.status(500).json({ success: false, message: error.message || 'تعذر التراجع عن التسوية' });
  }
};

module.exports = { getSummary, listOrders, settle, unsettle };
