const { getSharedPrismaClient, safeQuery } = require('../../services/sharedDatabase');

const getCaptainStats = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'Company ID is required' });

    const prisma = getSharedPrismaClient();
    const { sortBy = 'delivery_rate', sortOrder = 'desc', search } = req.query;

    const where = {
      companyId,
      turboShipmentId: { not: null },
      turboCaptainName: { not: null }
    };

    if (search) {
      where.turboCaptainName = { contains: search, mode: 'insensitive' };
    }

    const orders = await safeQuery(() => prisma.order.findMany({
      where,
      select: {
        turboCaptainName: true,
        turboCaptainPhone: true,
        turboBranchName: true,
        turboBranchPhone: true,
        turboShipmentStatus: true,
        turboDelayReason: true,
        turboReturnReason: true,
        total: true,
        shipping: true,
        orderNumber: true
      }
    }), 5);

    const captainMap = {};

    for (const o of orders) {
      const key = o.turboCaptainName;
      if (!captainMap[key]) {
        captainMap[key] = {
          captainName: o.turboCaptainName,
          captainPhone: o.turboCaptainPhone,
          branchName: o.turboBranchName,
          branchPhone: o.turboBranchPhone,
          total: 0,
          delivered: 0,
          returned: 0,
          active: 0,
          delayed: 0,
          remitted: 0,
          delayReasons: {},
          returnReasons: {},
          totalRevenue: 0,
          totalShipping: 0,
          recentOrders: []
        };
      }

      const c = captainMap[key];
      c.total++;

      const status = (o.turboShipmentStatus || '').toLowerCase().trim();
      if (status === 'delivered') c.delivered++;
      else if (status === 'remitted') c.remitted++;
      else if (status.startsWith('returned')) c.returned++;
      else if (['processing', 'turbo_sent', 'out_for_delivery', 'turbo_saved', 'created'].includes(status)) c.active++;
      else if (status === 'delayed') c.delayed++;

      if (o.turboDelayReason) {
        c.delayReasons[o.turboDelayReason] = (c.delayReasons[o.turboDelayReason] || 0) + 1;
      }
      if (o.turboReturnReason) {
        c.returnReasons[o.turboReturnReason] = (c.returnReasons[o.turboReturnReason] || 0) + 1;
      }

      c.totalRevenue += parseFloat(o.total || 0);
      c.totalShipping += parseFloat(o.shipping || 0);

      if (c.recentOrders.length < 5) {
        c.recentOrders.push(o.orderNumber);
      }
    }

    let captains = Object.values(captainMap).map(c => ({
      ...c,
      deliveryRate: c.total > 0 ? parseFloat(((c.delivered + c.remitted) / c.total * 100).toFixed(1)) : 0,
      returnRate: c.total > 0 ? parseFloat((c.returned / c.total * 100).toFixed(1)) : 0,
      activeRate: c.total > 0 ? parseFloat((c.active / c.total * 100).toFixed(1)) : 0,
      delayRate: c.total > 0 ? parseFloat((Object.keys(c.delayReasons).length / c.total * 100).toFixed(1)) : 0,
      totalRevenue: parseFloat(c.totalRevenue.toFixed(2)),
      totalShipping: parseFloat(c.totalShipping.toFixed(2)),
      delayReasonSummary: Object.entries(c.delayReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count })),
      returnReasonSummary: Object.entries(c.returnReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([reason, count]) => ({ reason, count }))
    }));

    const sortFieldMap = {
      total: 'total',
      delivered: 'delivered',
      returned: 'returned',
      delivery_rate: 'deliveryRate',
      return_rate: 'returnRate',
      active: 'active',
      delayed: 'delayed',
      revenue: 'totalRevenue',
      shipping: 'totalShipping',
      captain_name: 'captainName'
    };

    const field = sortFieldMap[sortBy] || 'deliveryRate';
    const order = sortOrder === 'asc' ? 1 : -1;
    captains.sort((a, b) => {
      const va = a[field] ?? 0;
      const vb = b[field] ?? 0;
      if (typeof va === 'string') return va.localeCompare(vb) * order;
      return (va - vb) * order;
    });

    const totalStats = {
      totalCaptains: captains.length,
      totalShipments: captains.reduce((s, c) => s + c.total, 0),
      totalDelivered: captains.reduce((s, c) => s + c.delivered, 0),
      totalReturned: captains.reduce((s, c) => s + c.returned, 0),
      totalActive: captains.reduce((s, c) => s + c.active, 0),
      totalRevenue: parseFloat(captains.reduce((s, c) => s + c.totalRevenue, 0).toFixed(2)),
      avgDeliveryRate: captains.length > 0 ? parseFloat((captains.reduce((s, c) => s + c.deliveryRate, 0) / captains.length).toFixed(1)) : 0
    };

    res.json({ success: true, data: captains, totalStats });
  } catch (error) {
    console.error('❌ [TURBO-CAPTAINS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getCaptainStats };
