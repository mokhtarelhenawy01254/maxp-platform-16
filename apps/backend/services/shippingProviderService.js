const crypto = require('crypto');
const TurboService = require('./turboService');
const BostaService = require('./bostaService');
const QpExpressService = require('./qpExpressService');
const { calculateCollectableCodAmount } = require('../utils/shippingFinancialUtils');

const PROVIDER_KEYS = Object.freeze({
  MANUAL: 'MANUAL',
  TURBO: 'TURBO',
  BOSTA: 'BOSTA',
  QP_EXPRESS: 'QP_EXPRESS',
  BOSTA_DEMO: 'BOSTA_DEMO',
  MYLERZ_DEMO: 'MYLERZ_DEMO',
  ARAMEX_DEMO: 'ARAMEX_DEMO',
});

const INTEGRATION_MODES = new Set(['MANUAL', 'DEMO', 'LIVE']);

const DEMO_CARRIER_DEFINITIONS = Object.freeze([
  {
    providerKey: PROVIDER_KEYS.BOSTA_DEMO,
    integrationMode: 'DEMO',
    name: 'Bosta Demo',
    slug: 'bosta-demo',
    phone: '+201000000710',
    website: 'https://bosta.co',
    apiUrl: 'https://demo.maxp.local/providers/bosta',
    serviceLevel: 'Next-day demo',
  },
  {
    providerKey: PROVIDER_KEYS.QP_EXPRESS,
    integrationMode: 'DEMO',
    name: 'QP Express Demo',
    slug: 'qp-express-demo',
    phone: '19252',
    website: 'https://qpxpress.com',
    apiUrl: 'https://demo.maxp.local/providers/qpexpress',
    serviceLevel: 'Express demo',
  },
  {
    providerKey: PROVIDER_KEYS.MYLERZ_DEMO,
    integrationMode: 'DEMO',
    name: 'Mylerz Demo',
    slug: 'mylerz-demo',
    phone: '+201000000711',
    website: 'https://mylerz.com',
    apiUrl: 'https://demo.maxp.local/providers/mylerz',
    serviceLevel: 'Economy demo',
  },
  {
    providerKey: PROVIDER_KEYS.ARAMEX_DEMO,
    integrationMode: 'DEMO',
    name: 'Aramex Demo',
    slug: 'aramex-demo',
    phone: '+201000000712',
    website: 'https://www.aramex.com',
    apiUrl: 'https://demo.maxp.local/providers/aramex',
    serviceLevel: 'International demo',
  },
]);

const DEMO_PREFIXES = Object.freeze({
  [PROVIDER_KEYS.BOSTA_DEMO]: 'BOSTA',
  [PROVIDER_KEYS.MYLERZ_DEMO]: 'MYLERZ',
  [PROVIDER_KEYS.ARAMEX_DEMO]: 'ARAMEX',
});

const safeJsonParse = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const safeJsonStringify = (value) => JSON.stringify(value || {});

const normalizeProviderKey = (value, carrier = {}) => {
  const explicit = String(value || '').trim().toUpperCase();
  if (Object.values(PROVIDER_KEYS).includes(explicit)) {
    return explicit;
  }

  const text = `${carrier.slug || ''} ${carrier.name || ''}`.toLowerCase();
  if (text.includes('turbo') || text.includes('تربو')) return PROVIDER_KEYS.TURBO;
  if (text.includes('bosta') || text.includes('بوستا')) {
    const mode = String(carrier.integrationMode || '').toUpperCase();
    return mode === 'LIVE' ? PROVIDER_KEYS.BOSTA : PROVIDER_KEYS.BOSTA_DEMO;
  }
  if (text.includes('qp') || text.includes('كيو بي') || text.includes('qpxpress') || text.includes('كيو_بي')) {
    return PROVIDER_KEYS.QP_EXPRESS;
  }
  if (text.includes('mylerz') || text.includes('مايلرز')) return PROVIDER_KEYS.MYLERZ_DEMO;
  if (text.includes('aramex') || text.includes('ارامكس') || text.includes('أرامكس')) {
    return PROVIDER_KEYS.ARAMEX_DEMO;
  }

  return PROVIDER_KEYS.MANUAL;
};

const normalizeIntegrationMode = (value, providerKey) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (INTEGRATION_MODES.has(normalized)) {
    return normalized;
  }

  if (providerKey && providerKey.endsWith('_DEMO')) return 'DEMO';
  return providerKey === PROVIDER_KEYS.TURBO ? 'LIVE' : 'MANUAL';
};

const normalizeSettings = (settings, providerKey, integrationMode) => {
  const parsed = safeJsonParse(settings, {});
  const defaultAutoCreate = integrationMode === 'DEMO';

  return {
    ...parsed,
    autoCreateShipments:
      parsed.autoCreateShipments !== undefined
        ? Boolean(parsed.autoCreateShipments)
        : defaultAutoCreate,
    providerKey,
    integrationMode,
  };
};

const mergeMetadata = (metadata, patch) => ({
  ...safeJsonParse(metadata, {}),
  ...patch,
});

const shortHash = (value) =>
  crypto.createHash('sha1').update(String(value || Date.now())).digest('hex').slice(0, 8).toUpperCase();

const buildDemoShipmentResult = ({ shipment, providerKey, serviceLevel }) => {
  const prefix = DEMO_PREFIXES[providerKey] || 'DEMO';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = shortHash(`${shipment.id}:${shipment.merchantOrderId}:${providerKey}`);
  const trackingNumber = `${prefix}-${datePart}-${suffix}`;

  return {
    success: true,
    demo: true,
    providerKey,
    status: 'CREATED',
    externalShipmentId: `${prefix}-SHIP-${suffix}`,
    trackingNumber,
    labelUrl: `https://demo.maxp.local/labels/${prefix.toLowerCase()}/${trackingNumber}.pdf`,
    serviceLevel: serviceLevel || 'Demo shipment',
    cost: null,
    data: {
      carrier: providerKey,
      trackingNumber,
      destinationCity: shipment.destinationCity || null,
      createdAt: new Date().toISOString(),
    },
  };
};

const buildTurboOrderPayload = (shipment) => {
  const order = shipment.order || {};
  const customer = order.customer || null;
  const items = Array.isArray(order.orderItems) ? order.orderItems : [];
  const turboService = new TurboService(null, shipment.companyId);
  return turboService.formatOrderForTurbo(order, customer, items);
};

const createTurboShipment = async (shipment, options = {}) => {
  const settings = normalizeSettings(
    shipment.shippingCompany?.settings,
    PROVIDER_KEYS.TURBO,
    shipment.shippingCompany?.integrationMode || 'LIVE',
  );
  const company = shipment.company || {};

  if (!settings.autoCreateShipments && !options.force && !options.allowLiveCreate) {
    return {
      success: false,
      skipped: true,
      reason: 'LIVE_PROVIDER_AUTO_CREATE_DISABLED',
    };
  }

  const turboApiKey = settings.apiKey || shipment.shippingCompany?.apiKey || company.turboApiKey;
  if (!turboApiKey) {
    return {
      success: false,
      skipped: true,
      reason: 'TURBO_NOT_CONFIGURED',
    };
  }

  const turboService = new TurboService(turboApiKey || null, shipment.companyId);
  return turboService.createShipment(buildTurboOrderPayload(shipment));
};

const loadShipment = (prisma, shipmentOrId) => {
  if (shipmentOrId && typeof shipmentOrId === 'object' && shipmentOrId.shippingCompany) {
    return shipmentOrId;
  }

  const id = typeof shipmentOrId === 'object' ? shipmentOrId?.id : shipmentOrId;
  return prisma.shipment.findUnique({
    where: { id },
    include: {
      company: true,
      shippingCompany: true,
      merchant: true,
      merchantOrder: true,
      order: {
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      },
      warehouse: true,
    },
  });
};

const updateShipmentFromProviderResult = async (prisma, shipment, provider, result) => {
  const providerStatus = result.skipped ? 'SKIPPED' : result.status || 'CREATED';
  const metadata = mergeMetadata(shipment.metadata, {
    providerKey: provider.providerKey,
    integrationMode: provider.integrationMode,
    providerStatus,
    providerServiceLevel: result.serviceLevel || provider.serviceLevel || null,
    providerDemo: Boolean(result.demo),
    providerUpdatedAt: new Date().toISOString(),
    providerResponse: result.data || null,
    providerSkipReason: result.reason || null,
  });

  if (result.skipped) {
    return prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        carrierType: provider.providerKey,
        serviceLevel: result.serviceLevel || shipment.serviceLevel || provider.serviceLevel || null,
        metadata: safeJsonStringify(metadata),
      },
    });
  }

  const updatedShipment = await prisma.shipment.update({
    where: { id: shipment.id },
    data: {
      carrierType: provider.providerKey,
      status: result.status || 'CREATED',
      trackingNumber: result.trackingNumber || shipment.trackingNumber || null,
      externalShipmentId: result.externalShipmentId || result.shipmentId || shipment.externalShipmentId || null,
      labelUrl: result.labelUrl || shipment.labelUrl || null,
      serviceLevel: result.serviceLevel || shipment.serviceLevel || provider.serviceLevel || null,
      cost: result.cost !== undefined && result.cost !== null ? result.cost : (shipment.cost || Number(shipment.order?.shipping || 0)),
      metadata: safeJsonStringify(metadata),
    },
  });

  if (shipment.orderId && (result.trackingNumber || shipment.trackingNumber)) {
    try {
      const finalTrackingNumber = result.trackingNumber || shipment.trackingNumber;

      let existingOrderMeta = {};
      try {
        existingOrderMeta = typeof shipment.order?.metadata === 'string'
          ? JSON.parse(shipment.order.metadata)
          : (shipment.order?.metadata || {});
      } catch (e) {}

      existingOrderMeta.trackingNumber = String(finalTrackingNumber);
      existingOrderMeta.shippingCarrier = provider.providerKey;

      await prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          status: 'SHIPPED',
          customStatusCode: null,
          metadata: JSON.stringify(existingOrderMeta),
          ...(provider.providerKey === 'TURBO'
            ? {
                turboTrackingNumber: String(finalTrackingNumber),
                turboShipmentId: result.externalShipmentId || result.shipmentId || shipment.externalShipmentId || null,
                turboShipmentStatus: 'turbo_sent',
              }
            : {}),
          statusHistory: {
            create: {
              status: 'SHIPPED',
              oldStatus: shipment.order?.status || 'PENDING',
              reason: `تم إنشاء الشحنة وتوجيهها لشركة ${provider.providerKey} بنجاح (رقم التتبع: ${finalTrackingNumber})`,
              changedBy: 'SYSTEM',
            },
          },
        },
      });
    } catch (orderSyncErr) {
      console.warn('⚠️ [SHIPPING_PROVIDER] Could not sync order status:', orderSyncErr.message);
    }
  }

  return updatedShipment;
};

const createProviderShipment = async (prisma, shipmentOrId, options = {}) => {
  const shipment = await loadShipment(prisma, shipmentOrId);
  if (!shipment) {
    return { success: false, skipped: true, reason: 'SHIPMENT_NOT_FOUND' };
  }

  const shippingCompany = shipment.shippingCompany;
  if (!shippingCompany) {
    return { success: false, skipped: true, reason: 'NO_SHIPPING_COMPANY' };
  }

  const providerKey = normalizeProviderKey(shippingCompany.providerKey, shippingCompany);
  const integrationMode = normalizeIntegrationMode(shippingCompany.integrationMode, providerKey);
  const settings = normalizeSettings(shippingCompany.settings, providerKey, integrationMode);
  const provider = {
    ...shippingCompany,
    providerKey,
    integrationMode,
    settings,
  };

  if (shipment.externalShipmentId && shipment.trackingNumber && !options.force) {
    return updateShipmentFromProviderResult(prisma, shipment, provider, {
      success: false,
      skipped: true,
      reason: 'SHIPMENT_ALREADY_HAS_PROVIDER_REFERENCE',
      serviceLevel: shipment.serviceLevel,
    });
  }

  if (!settings.autoCreateShipments && !options.force) {
    return updateShipmentFromProviderResult(prisma, shipment, provider, {
      success: false,
      skipped: true,
      reason: 'AUTO_CREATE_DISABLED',
      serviceLevel: provider.serviceLevel,
    });
  }

  if (integrationMode === 'DEMO' || providerKey.endsWith('_DEMO')) {
    return updateShipmentFromProviderResult(
      prisma,
      shipment,
      provider,
      buildDemoShipmentResult({
        shipment,
        providerKey,
        serviceLevel: settings.serviceLevel || provider.serviceLevel,
      }),
    );
  }

  if (providerKey === PROVIDER_KEYS.TURBO && integrationMode === 'LIVE') {
    if (!options.allowLiveCreate) {
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: false,
        skipped: true,
        reason: 'LIVE_CREATE_REQUIRES_EXPLICIT_CONFIRMATION',
        serviceLevel: provider.serviceLevel,
      });
    }

    const result = await createTurboShipment(shipment, options);
    return updateShipmentFromProviderResult(prisma, shipment, provider, result);
  }

  if (providerKey === PROVIDER_KEYS.BOSTA && integrationMode === 'LIVE') {
    if (!options.allowLiveCreate) {
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: false,
        skipped: true,
        reason: 'LIVE_CREATE_REQUIRES_EXPLICIT_CONFIRMATION',
        serviceLevel: provider.serviceLevel,
      });
    }

    const bostaApiKey = settings.apiKey || shipment.shippingCompany?.apiKey;
    const bostaService = new BostaService(bostaApiKey || null, shipment.companyId);
    const payload = bostaService.formatOrderForBosta(shipment.order || {}, shipment.order?.customer || {});
    try {
      const result = await bostaService.createDelivery(payload);
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: true,
        status: 'CREATED',
        externalShipmentId: result._id,
        trackingNumber: result.trackingNumber,
        labelUrl: null,
        serviceLevel: provider.serviceLevel,
        cost: null,
        data: result,
      });
    } catch (error) {
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: false,
        skipped: true,
        reason: `BOSTA_API_ERROR: ${error.message}`,
        serviceLevel: provider.serviceLevel,
      });
    }
  }

  if (providerKey === PROVIDER_KEYS.QP_EXPRESS && integrationMode === 'LIVE') {
    if (!options.allowLiveCreate) {
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: false,
        skipped: true,
        reason: 'LIVE_CREATE_REQUIRES_EXPLICIT_CONFIRMATION',
        serviceLevel: provider.serviceLevel,
      });
    }

    const qpService = new QpExpressService({
      username: settings.username || shipment.shippingCompany?.apiKey,
      password: settings.password,
      customerId: settings.customerId ? Number(settings.customerId) : null,
    }, shipment.companyId);

    const codAmount = calculateCollectableCodAmount(shipment.order);
    const customerName =
      shipment.order?.customerName ||
      shipment.order?.customer?.name ||
      (shipment.order?.customer
        ? `${shipment.order.customer.firstName || ''} ${shipment.order.customer.lastName || ''}`.trim()
        : null) ||
      'عميل';

    const orderData = {
      orderId: shipment.order?.id,
      orderNumber: shipment.order?.orderNumber || String(shipment.order?.id),
      customerName,
      customerPhone: shipment.order?.customerPhone || shipment.order?.customer?.phone,
      shippingAddress:
        shipment.order?.shippingAddress ||
        shipment.destinationAddress ||
        shipment.order?.customerAddress,
      customerAddress:
        shipment.order?.customerAddress ||
        shipment.destinationAddress ||
        '',
      city:
        shipment.destinationGovernorate ||
        shipment.destinationCity ||
        shipment.order?.governorate ||
        shipment.order?.city,
      items: shipment.order?.orderItems || [],
      totalAmount: codAmount,
      price: codAmount,
      notes: shipment.order?.notes || '',
      metadata: shipment.order?.metadata || null,
    };

    try {
      const result = await qpService.createShipment(orderData);
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: true,
        status: 'CREATED',
        externalShipmentId: String(result.serial),
        trackingNumber: result.trackingNumber,
        labelUrl: null,
        serviceLevel: provider.serviceLevel,
        cost: Number(result.totalFees || 0),
        data: result,
      });
    } catch (error) {
      return updateShipmentFromProviderResult(prisma, shipment, provider, {
        success: false,
        skipped: true,
        reason: `QP_EXPRESS_API_ERROR: ${error.message}`,
        serviceLevel: provider.serviceLevel,
      });
    }
  }

  return updateShipmentFromProviderResult(prisma, shipment, provider, {
    success: false,
    skipped: true,
    reason: 'MANUAL_PROVIDER',
    serviceLevel: provider.serviceLevel,
  });
};

const ensureDemoShippingCompanies = async (prisma, companyId) => {
  const carriers = [];

  for (const definition of DEMO_CARRIER_DEFINITIONS) {
    const settings = normalizeSettings(
      {
        autoCreateShipments: true,
        serviceLevel: definition.serviceLevel,
        demoOnly: true,
      },
      definition.providerKey,
      definition.integrationMode,
    );

    const carrier = await prisma.shippingCompany.upsert({
      where: {
        companyId_slug: {
          companyId,
          slug: definition.slug,
        },
      },
      update: {
        name: definition.name,
        phone: definition.phone,
        website: definition.website,
        apiUrl: definition.apiUrl,
        providerKey: definition.providerKey,
        integrationMode: definition.integrationMode,
        settings: safeJsonStringify(settings),
        isActive: true,
      },
      create: {
        companyId,
        name: definition.name,
        slug: definition.slug,
        phone: definition.phone,
        website: definition.website,
        apiUrl: definition.apiUrl,
        providerKey: definition.providerKey,
        integrationMode: definition.integrationMode,
        settings: safeJsonStringify(settings),
        isActive: true,
      },
    });

    carriers.push(carrier);
  }

  return carriers;
};

module.exports = {
  PROVIDER_KEYS,
  DEMO_CARRIER_DEFINITIONS,
  normalizeProviderKey,
  normalizeIntegrationMode,
  normalizeSettings,
  createProviderShipment,
  ensureDemoShippingCompanies,
  safeJsonParse,
  safeJsonStringify,
};
