const axios = require('axios');
const { getSharedPrismaClient, safeQuery } = require('./sharedDatabase');

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
      const company = await safeQuery(() =>
        prisma.company.findUnique({ where: { id: this.companyId }, select: { bostaApiKey: true, bostaEnabled: true } })
      , 2);

      if (!company || !company.bostaEnabled) throw new Error('Bosta is not enabled for this company');
      if (!company.bostaApiKey) throw new Error('Bosta API key is not configured');

      this.apiKey = company.bostaApiKey;
      return this.apiKey;
    } catch (error) {
      if (error.message.includes('Bosta')) throw error;
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
    const type = order.paymentMethod === 'cod' ? BOSTA_DELIVERY_TYPES.CASH_COLLECTION : BOSTA_DELIVERY_TYPES.FORWARD;
    const codAmount = order.paymentMethod === 'cod' ? Number(order.total || 0) : 0;
    const items = order.orderItems || [];
    const totalWeight = items.reduce((sum, item) => sum + Number(item.product?.weight || item.weight || 0.5), 0.5);

    return {
      type,
      specs: {
        packageDetails: [{ weight: Math.max(totalWeight, 0.5), length: 10, width: 10, height: 10 }],
        description: `Order #${order.orderNumber || order.id}`,
      },
      cod: { collectionAmount: codAmount },
      dropOffAddress: { locationId: null },
      businessReference: { businessReference: String(order.orderNumber || order.id) },
      receiver: {
        firstName: customer?.firstName || customer?.name || '',
        lastName: customer?.lastName || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
      },
      notes: `Order ID: ${order.id}`,
    };
  }
}

module.exports = BostaService;
