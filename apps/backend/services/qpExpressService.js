/**
 * QP Express Service — Facade
 * يجمع كل خدمات QP Express للشحن والتتبع والتسعير تحت واجهة موحدة
 */

const QpExpressApiClient = require('./qpExpress/qpExpressApiClient');
const QpExpressShipmentService = require('./qpExpress/qpExpressShipmentService');
const QpExpressTrackingService = require('./qpExpress/qpExpressTrackingService');
const QpExpressCityMapper = require('./qpExpress/qpExpressCityMapper');

class QpExpressService {
  constructor(options = {}, companyId = null) {
    this._client = new QpExpressApiClient(options);
    this._shipment = new QpExpressShipmentService(this._client);
    this._tracking = new QpExpressTrackingService(this._client);
    this.companyId = companyId;

    this._cachedPricing = null;
    this._pricingExpiresAt = 0;
  }

  getClient() {
    return this._client;
  }

  // ── Shipment Operations ─────────────────────────────
  async createShipment(orderData) {
    return this._shipment.createShipment(orderData);
  }

  /**
   * إلغاء وحذف شحنة أو مجموعة شحنات من كيو بي إكسبريس
   */
  async cancelShipment(serialOrArray) {
    const list = Array.isArray(serialOrArray)
      ? serialOrArray.map(Number).filter(n => !isNaN(n))
      : [Number(serialOrArray)].filter(n => !isNaN(n));

    if (list.length === 0) {
      throw new Error('يرجى تحديد رقم بوليصة صالح للإلغاء');
    }

    return this._client.post('/addorders/order_bulk_delete', { del_list: list });
  }

  async bulkCreateShipments(ordersList = []) {
    const results = [];
    let successfulCount = 0;
    let failedCount = 0;

    for (const orderData of ordersList) {
      try {
        const res = await this.createShipment(orderData);
        if (res && res.success) {
          successfulCount++;
        } else {
          failedCount++;
        }
        results.push({
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          success: Boolean(res && res.success),
          trackingNumber: res ? (res.trackingNumber || res.serial) : null,
          error: res && !res.success ? res.error : null,
          data: res,
        });
      } catch (err) {
        failedCount++;
        results.push({
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          success: false,
          error: err.message,
        });
      }
    }

    return {
      total: ordersList.length,
      successfulCount,
      failedCount,
      results,
    };
  }

  // ── Tracking ────────────────────────────────────────
  async trackShipment(serialOrOrderNumber) {
    return this._tracking.trackShipment(serialOrOrderNumber);
  }

  async getRecentOrders(limit = 50) {
    return this._tracking.getRecentOrders(limit);
  }

  // ── Cities & Locations ──────────────────────────────
  getCities() {
    return QpExpressCityMapper.getAllCities();
  }

  findCity(nameOrGov) {
    return QpExpressCityMapper.findCity(nameOrGov);
  }

  getCityId(nameOrGov) {
    return QpExpressCityMapper.getCityId(nameOrGov);
  }

  // ── Account & Pricing ───────────────────────────────
  async getCustomerInfo() {
    const data = await this._client.get('/customers/shipment-info/');
    return data.customer || null;
  }

  /**
   * جلب قائمة الأسعار المتفق عليها للشركة لجميع المحافظات
   */
  async getPricingList() {
    const now = Date.now();
    if (this._cachedPricing && this._pricingExpiresAt > now) {
      return this._cachedPricing;
    }

    const data = await this._client.get('/customers/shipment-info/');
    const list = data.shipment_info || data.shipment_prices || [];

    const rates = list.map(item => ({
      cityId: item.city_id,
      cityName: item.City_ID,
      hub: item.Shipper_ID,
      customerFees: item.total_fees,
      shipperFees: item.shipper_fees,
    }));

    this._cachedPricing = rates;
    this._pricingExpiresAt = now + (30 * 60 * 1000); // 30 mins cache
    return rates;
  }

  /**
   * حساب تكلفة الشحن لمحافظة معينة طبقاً لتعاقد الشركة
   */
  async calculateShippingFee(cityNameOrGov) {
    const cityId = QpExpressCityMapper.getCityId(cityNameOrGov);
    const rates = await this.getPricingList();
    const matched = rates.find(r => r.cityId === cityId);
    return matched ? matched.customerFees : 65; // default 65 if not found
  }
}

module.exports = QpExpressService;
