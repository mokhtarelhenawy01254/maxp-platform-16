const axios = require('axios');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');
const { calculateCollectableCodAmount } = require('../utils/shippingFinancialUtils');

const BOSTA_DELIVERY_TYPES = {
  FORWARD: 10,
  CASH_COLLECTION: 15,
  RTO: 20,
  EXCHANGE: 30,
};

const BOSTA_STATUS_MAP = {
  'Pickup requested': 'pending',
  'Waiting for route': 'pending',
  'Route Assigned': 'processing',
  'Waiting for Pickup': 'processing',
  'Picking up': 'processing',
  'Picked up': 'processing',
  'Received at warehouse': 'processing',
  'In transit between Hubs': 'in_transit',
  'Delivering': 'out_for_delivery',
  'Arrived at customer': 'out_for_delivery',
  'Delivered': 'delivered',
  'Delivery confirmed': 'delivered',
  'Canceled': 'cancelled',
  'Terminated': 'cancelled',
  'Exception': 'exception',
  'Returned to business': 'returned',
  'Lost': 'lost',
  'Damaged': 'damaged',
  'Investigation': 'investigation',
};

class BostaService {
  constructor(apiKey = null, companyId = null) {
    this.apiKey = apiKey;
    this.companyId = companyId;
    this.baseUrl = process.env.BOSTA_API_URL || 'https://app.bosta.co';
    this.timeout = 30000;
  }

  async getApiKey() {
    if (this.apiKey) return this.apiKey;
    if (!this.companyId) throw new Error('Company ID is required to fetch API key');

    try {
      const prisma = getSharedPrismaClient();

      // 1. Check ShippingCompany model first (SaaS per-carrier integration)
      const carrier = await safeQuery(() =>
        prisma.shippingCompany.findFirst({
          where: {
            companyId: this.companyId,
            providerKey: 'BOSTA',
            isActive: true,
          },
        })
      , 2);

      if (carrier) {
        let settings = {};
        try {
          settings = carrier.settings ? (typeof carrier.settings === 'string' ? JSON.parse(carrier.settings) : carrier.settings) : {};
        } catch {
          settings = {};
        }
        const key = carrier.apiKey || settings.apiKey;
        if (key) {
          this.apiKey = key;
          return this.apiKey;
        }
      }

      // 2. Fallback to Company model (legacy settings)
      const company = await safeQuery(() =>
        prisma.company.findUnique({ where: { id: this.companyId }, select: { bostaApiKey: true, bostaEnabled: true } })
      , 2);

      if (company && company.bostaApiKey) {
        this.apiKey = company.bostaApiKey;
        return this.apiKey;
      }

      throw new Error('لم يتم تهيئة أو تفعيل مفتاح الـ API لشركة بوستا (Bosta) لهذه الشركة. يرجى إدخال الـ API Key وتفعيل الشركة من صفحة شركات الشحن.');
    } catch (error) {
      if (error.message.includes('بوستا') || error.message.includes('Bosta')) throw error;
      console.error('[BOSTA] Error fetching API key:', error);
      throw error;
    }
  }

  async request(method, path, data = null) {
    const apiKey = await this.getApiKey();
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}/api/v0/${path}`,
        data,
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
          'X-Requested-By': 'maxp-integration',
        },
        timeout: this.timeout,
      });
      return response.data;
    } catch (error) {
      throw new Error(error?.response?.data?.message || error.message || 'Bosta API error');
    }
  }

  async createDelivery({ type, specs, cod, dropOffAddress, businessReference, receiver, notes }) {
    const data = {
      type,
      specs,
      cod,
      dropOffAddress,
      businessReference,
      receiver,
    };
    if (notes) data.notes = notes;
    return this.request('post', 'deliveries', data);
  }

  async getDeliveryByTrackingNumber(trackingNumber) {
    return this.request('get', `deliveries/${trackingNumber}`);
  }

  async trackDelivery(trackingNumber) {
    return this.request('get', `deliveries/${trackingNumber}/tracking`);
  }

  async trackShipment(trackingNumber) {
    return this.trackDelivery(trackingNumber);
  }

  async updateDelivery(deliveryId, updatePayload) {
    return this.request('put', `deliveries/${deliveryId}`, updatePayload);
  }

  async terminateDelivery(deliveryId) {
    return this.request('delete', `deliveries/${deliveryId}`);
  }

  async printAWB(deliveryId) {
    return this.request('get', `deliveries/awb/${deliveryId}`);
  }

  async getAllDeliveries() {
    return this.request('get', 'deliveries');
  }

  async getAllCities() {
    return this.request('get', 'cities');
  }

  async getCityZones(cityId) {
    return this.request('get', `zones?cityId=${cityId}`);
  }

  async getBusinessPickupLocations() {
    return this.request('get', 'pickups/business-pickup-locations');
  }

  async createPickup(businessLocationId, scheduledDate, scheduledTimeSlot, contactPerson) {
    return this.request('post', 'pickups', { businessLocationId, scheduledDate, scheduledTimeSlot, contactPerson });
  }

  mapStatus(bostaStatus) {
    return BOSTA_STATUS_MAP[bostaStatus] || `status_${bostaStatus}`;
  }

  formatOrderForBosta(order, customer) {
    const codAmount = calculateCollectableCodAmount(order);
    const type = codAmount > 0 ? BOSTA_DELIVERY_TYPES.CASH_COLLECTION : BOSTA_DELIVERY_TYPES.FORWARD;
    const items = order.orderItems || [];
    const totalWeight = items.reduce((sum, item) => sum + Number(item.product?.weight || item.weight || 0.5), 0.5);

    const formattedItems = items.map(item => {
      const name = item.productName || item.product?.name || item.name || 'منتج';
      const qty = item.quantity || 1;
      const size = item.productSize || item.size || '';
      const color = item.productColor || item.color || '';
      const variant = [size, color].filter(Boolean).join(' - ');
      return variant ? `${name} (${variant}) × ${qty}` : `${name} × ${qty}`;
    });
    const itemsDescription = formattedItems.length > 0 ? formattedItems.join(' + ') : `طلب #${order.orderNumber || order.id}`;

    // Format address
    let addressLine = order.customerAddress || order.shippingAddress || customer?.address || '';
    let parsedCity = order.city || order.governorate || customer?.city || customer?.governorate || 'Cairo';
    let parsedDistrict = order.city || undefined;

    if (typeof addressLine === 'string' && addressLine.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(addressLine);
        if (parsed && typeof parsed === 'object') {
          addressLine = parsed.address || parsed.addressLine1 || parsed.street || addressLine;
          if (parsed.city) parsedCity = parsed.city;
          if (parsed.governorate && !parsedCity) parsedCity = parsed.governorate;
          if (parsed.district) parsedDistrict = parsed.district;
        }
      } catch {
        // keep string as is
      }
    }

    const fullName = (order.customerName || customer?.name || customer?.firstName || 'عميل').trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || 'عميل';
    const lastName = nameParts.slice(1).join(' ') || '.';
    const phone = order.customerPhone || customer?.phone || '';

    return {
      type,
      specs: {
        packageDetails: [{ weight: Math.max(totalWeight, 0.5), length: 10, width: 10, height: 10 }],
        description: itemsDescription.substring(0, 450),
        allowToOpenPackage: order.canOpen !== false,
      },
      cod: { collectionAmount: codAmount },
      dropOffAddress: {
        firstLine: addressLine || 'العنوان غير محدد',
        city: parsedCity,
        district: parsedDistrict,
      },
      businessReference: { businessReference: String(order.orderNumber || order.id) },
      receiver: {
        firstName,
        lastName,
        phone,
        email: order.customerEmail || customer?.email || '',
      },
      notes: `Order ID: ${order.orderNumber || order.id}`,
    };
  }
}

module.exports = BostaService;
