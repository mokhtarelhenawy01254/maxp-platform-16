/**
 * QP Express Tracking Service
 * متابعة وتتبع الشحنات ومزامنة الحالات وتفاصيل المناديب
 */

const QP_STATUS_MAP = {
  '1': { code: 'PENDING', label: 'طلب جديد / قيد التجهيز' },
  '2': { code: 'OUT_FOR_DELIVERY', label: 'خرج للتوصيل مع المندوب' },
  '3': { code: 'DELIVERED', label: 'تم التسليم بنجاح' },
  '4': { code: 'POSTPONED', label: 'مؤجل / جاري إعادة المحاولة' },
  '5': { code: 'RETURNED', label: 'مرتجع / ملغي' },
  '6': { code: 'CANCELLED', label: 'ملغي قبل الشحن' },
  '7': { code: 'ARCHIVED', label: 'مؤرشف' },
};

class QpExpressTrackingService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  /**
   * تحويل كود حالة QP Express إلى حالة متوافقة مع نظام MaxP
   */
  mapStatus(statusCode) {
    const s = String(statusCode || '1');
    return QP_STATUS_MAP[s] || { code: 'UNKNOWN', label: 'غير محدد' };
  }

  /**
   * تتبع شحنة برقم البوليصة (serial) أو برقم أوردر المتجر (customer_serial)
   */
  async trackShipment(serialOrOrderNumber) {
    if (!serialOrOrderNumber) {
      throw new Error('Serial or order number is required for tracking.');
    }

    const query = String(serialOrOrderNumber).trim();

    let order = null;

    // 1. First try by exact order serial detail endpoint: GET /addorders/order/<serial>/
    try {
      const detailRes = await this._client.get(`/addorders/order/${encodeURIComponent(query)}/`);
      if (detailRes && detailRes.serial && String(detailRes.serial) === query) {
        order = detailRes;
      }
    } catch (e) {
      // Ignore 404/not found errors on direct lookup
    }

    // 2. If not found by direct detail endpoint, search orders list by exact serial or customer_serial
    if (!order) {
      try {
        const listResult = await this._client.get('/addorders/order/');
        const list = Array.isArray(listResult) ? listResult : (listResult?.results || []);
        order = list.find(o => String(o.serial) === query || (o.customer_serial && String(o.customer_serial) === query)) || null;
      } catch (e) {
        // Ignore list lookup errors
      }
    }

    if (!order) {
      return {
        found: false,
        message: 'الشحنة غير موجودة في سيستم QP Express أو قيد المراجعة.',
        trackingNumber: query,
      };
    }

    const mapped = this.mapStatus(order.Order_Delivery_Status);

    return {
      found: true,
      serial: order.serial,
      trackingNumber: String(order.serial),
      customerSerial: order.customer_serial,
      statusCode: order.Order_Delivery_Status,
      status: mapped.code,
      statusLabel: mapped.label,
      statusNote: order.StatusNote || '',
      driverName: order.shipper || null,
      driverPhone: order.shipper_phone || null,
      city: order.city,
      recipientName: order.full_name,
      recipientPhone: order.phone,
      totalAmount: order.total_amount,
      totalFees: order.total_fees,
      isPrinted: !!order.isprint,
      isCollectedFromShipper: !!order.Collected_shipper,
      collectStatusDate: order.Collect_status_date,
      isReturnedToClient: !!order.Returned_Client,
      returnedClientDate: order.returned_Client_date,
      orderDate: order.order_date,
      createdDate: order.created_date,
      updatedDate: order.update_date,
      raw: order,
    };
  }

  /**
   * جلب الشحنات الأخيرة للحساب
   */
  async getRecentOrders(limit = 50) {
    const result = await this._client.get('/addorders/order/', {
      page: 1,
      page_size: limit,
    });

    const list = Array.isArray(result) ? result : (result?.results || []);
    return list.map(order => ({
      serial: order.serial,
      trackingNumber: String(order.serial),
      customerSerial: order.customer_serial,
      statusCode: order.Order_Delivery_Status,
      status: this.mapStatus(order.Order_Delivery_Status).code,
      statusLabel: this.mapStatus(order.Order_Delivery_Status).label,
      statusNote: order.StatusNote || '',
      driverName: order.shipper || null,
      driverPhone: order.shipper_phone || null,
      recipientName: order.full_name,
      recipientPhone: order.phone,
      city: order.city,
      totalAmount: order.total_amount,
      totalFees: order.total_fees,
      orderDate: order.order_date,
    }));
  }
}

module.exports = QpExpressTrackingService;
