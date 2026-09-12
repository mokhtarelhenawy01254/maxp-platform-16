const BostaService = require('../services/bostaService');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

const getService = async (req) => {
  const { companyId } = req.user;
  const prisma = getSharedPrismaClient();
  return { service: new BostaService(null, companyId), prisma };
};

exports.createShipment = async (req, res) => {
  try {
    const { service, prisma } = await getService(req);
    const { orderId } = req.params;

    const order = await safeQuery(() =>
      prisma.order.findFirst({
        where: {
          OR: [
            { id: orderId },
            { orderNumber: orderId },
          ],
          companyId: req.user.companyId,
        },
        include: {
          customer: true,
          orderItems: { include: { product: true } },
          shipments: {
            where: { carrierType: 'BOSTA' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
    , 2);

    if (!order) return res.status(404).json({ success: false, error: 'الطلب غير موجود' });

    const payload = service.formatOrderForBosta(order, order.customer);
    const result = await service.createDelivery(payload);

    // Upsert or update shipment in DB
    const existingShipment = order.shipments?.[0] || await safeQuery(() =>
      prisma.shipment.findFirst({
        where: { orderId: order.id, companyId: req.user.companyId, carrierType: 'BOSTA' },
        orderBy: { createdAt: 'desc' },
      })
    , 2);

    const bostaCompany = await safeQuery(() =>
      prisma.shippingCompany.findFirst({
        where: { companyId: req.user.companyId, providerKey: 'BOSTA' },
        select: { id: true },
      })
    , 2);

    if (existingShipment) {
      await safeQuery(() =>
        prisma.shipment.update({
          where: { id: existingShipment.id },
          data: {
            externalShipmentId: result._id,
            trackingNumber: result.trackingNumber,
            shippingCompanyId: bostaCompany?.id || existingShipment.shippingCompanyId,
            status: 'CREATED',
            carrierType: 'BOSTA',
            metadata: JSON.stringify({
              bostaDeliveryId: result._id,
              bostaTrackingNumber: result.trackingNumber,
            }),
          },
        })
      , 2);
    } else {
      await safeQuery(() =>
        prisma.shipment.create({
          data: {
            companyId: req.user.companyId,
            orderId: order.id,
            shippingCompanyId: bostaCompany?.id || null,
            externalShipmentId: result._id,
            trackingNumber: result.trackingNumber,
            status: 'CREATED',
            carrierType: 'BOSTA',
            destinationGovernorate: order.governorate || null,
            destinationCity: order.city || null,
            destinationAddress: order.customerAddress || order.shippingAddress || null,
            cost: order.shipping !== null && order.shipping !== undefined ? Number(order.shipping) : null,
            metadata: JSON.stringify({
              bostaDeliveryId: result._id,
              bostaTrackingNumber: result.trackingNumber,
            }),
          },
        })
      , 2);
    }
    let orderMeta = {};
    try {
      orderMeta = typeof order.metadata === 'string' ? JSON.parse(order.metadata) : (order.metadata || {});
    } catch (e) {}
    orderMeta.trackingNumber = String(result.trackingNumber);
    orderMeta.shippingCarrier = 'BOSTA';
    orderMeta.bostaDeliveryId = result._id;

    await safeQuery(() =>
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'SHIPPED',
          customStatusCode: null,
          metadata: JSON.stringify(orderMeta),
          statusHistory: {
            create: {
              status: 'SHIPPED',
              oldStatus: order.status,
              reason: `تم إنشاء بوليصة بوستا برقم ${result.trackingNumber}`,
              changedBy: req.user?.id || 'SYSTEM',
            },
          },
        },
      })
    , 2);

    res.json({ success: true, data: result, message: `تم إنشاء الشحنة بنجاح برقم تتبع ${result.trackingNumber}` });
  } catch (error) {
    console.error('[BOSTA] createShipment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.bulkCreateShipments = async (req, res) => {
  try {
    const { service, prisma } = await getService(req);
    const { orderIds } = req.body || {};

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد الطلبات المراد شحنها' });
    }

    const orders = await safeQuery(() =>
      prisma.order.findMany({
        where: {
          OR: [
            { id: { in: orderIds } },
            { orderNumber: { in: orderIds } },
          ],
          companyId: req.user.companyId,
        },
        include: {
          customer: true,
          orderItems: { include: { product: true } },
          shipments: {
            where: { carrierType: 'BOSTA' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
    , 2);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const order of orders) {
      const existingBostaShipment = order.shipments?.[0];
      if (existingBostaShipment?.trackingNumber && existingBostaShipment.carrierType === 'BOSTA') {
        skippedCount++;
        results.push({ orderId: order.id, orderNumber: order.orderNumber, success: true, skipped: true, trackingNumber: existingBostaShipment.trackingNumber });
        continue;
      }

      try {
        const payload = service.formatOrderForBosta(order, order.customer);
        const result = await service.createDelivery(payload);

        if (existingBostaShipment) {
          await safeQuery(() =>
            prisma.shipment.update({
              where: { id: existingBostaShipment.id },
              data: {
                externalShipmentId: result._id,
                trackingNumber: result.trackingNumber,
                status: 'CREATED',
                carrierType: 'BOSTA',
                metadata: JSON.stringify({
                  bostaDeliveryId: result._id,
                  bostaTrackingNumber: result.trackingNumber,
                }),
              },
            })
          , 2);
        } else {
          await safeQuery(() =>
            prisma.shipment.create({
              data: {
                companyId: req.user.companyId,
                orderId: order.id,
                externalShipmentId: result._id,
                trackingNumber: result.trackingNumber,
                status: 'CREATED',
                carrierType: 'BOSTA',
                metadata: JSON.stringify({
                  bostaDeliveryId: result._id,
                  bostaTrackingNumber: result.trackingNumber,
                }),
              },
            })
          , 2);
        }

        successCount++;
        results.push({ orderId: order.id, orderNumber: order.orderNumber, success: true, trackingNumber: result.trackingNumber });
      } catch (err) {
        failedCount++;
        results.push({ orderId: order.id, orderNumber: order.orderNumber, success: false, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: orderIds.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        results,
      },
    });
  } catch (error) {
    console.error('[BOSTA] bulkCreateShipments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.trackShipment = async (req, res) => {
  try {
    const { service } = await getService(req);
    const { trackingNumber } = req.params;
    const result = await service.trackDelivery(trackingNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.cancelShipment = async (req, res) => {
  try {
    const { service } = await getService(req);
    const { deliveryId } = req.params;
    const result = await service.terminateDelivery(deliveryId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.printAWB = async (req, res) => {
  try {
    const { service } = await getService(req);
    const { deliveryId } = req.params;
    const result = await service.printAWB(deliveryId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getOrderShipment = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { orderId } = req.params;
    const prisma = getSharedPrismaClient();

    let targetOrderId = orderId;
    const order = await safeQuery(() =>
      prisma.order.findFirst({
        where: {
          OR: [{ id: orderId }, { orderNumber: orderId }],
          companyId,
        },
        select: { id: true },
      })
    , 2);

    if (order) targetOrderId = order.id;

    const shipment = await safeQuery(() =>
      prisma.shipment.findFirst({
        where: { orderId: targetOrderId, companyId, carrierType: 'BOSTA' },
        orderBy: { createdAt: 'desc' },
      })
    , 2);
    res.json({ success: true, data: shipment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCities = async (req, res) => {
  try {
    const { service } = await getService(req);
    const result = await service.getAllCities();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCityZones = async (req, res) => {
  try {
    const { service } = await getService(req);
    const { cityId } = req.params;
    const result = await service.getCityZones(cityId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
