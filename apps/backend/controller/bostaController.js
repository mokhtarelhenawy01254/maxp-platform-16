const BostaService = require('../services/bostaService');
const { getSharedPrismaClient, safeQuery } = require('../services/sharedDatabase');

const getService = async (req) => {
  const { companyId } = req.user;
  const prisma = getSharedPrismaClient();
  const company = await safeQuery(() =>
    prisma.company.findUnique({ where: { id: companyId }, select: { bostaApiKey: true, bostaEnabled: true } })
  , 2);
  return { service: new BostaService(company?.bostaApiKey || null, companyId), company, prisma };
};

exports.createShipment = async (req, res) => {
  try {
    const { service, prisma } = await getService(req);
    const { orderId } = req.params;

    const order = await safeQuery(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true, orderItems: { include: { product: true } } },
      })
    , 2);

    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const payload = service.formatOrderForBosta(order, order.customer);
    const result = await service.createDelivery(payload);

    await safeQuery(() =>
      prisma.shipment.updateMany({
        where: { orderId, companyId: req.user.companyId },
        data: {
          externalShipmentId: result._id,
          trackingNumber: result.trackingNumber,
          status: 'CREATED',
          carrierType: 'BOSTA',
        },
      })
    , 2);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[BOSTA] createShipment error:', error);
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
    const shipment = await safeQuery(() =>
      prisma.shipment.findFirst({
        where: { orderId, companyId, carrierType: 'BOSTA' },
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
