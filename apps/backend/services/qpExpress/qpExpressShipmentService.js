/**
 * QP Express Shipment Service
 * إدارة تجهيز وإنشاء شحنات كيو بي إكسبريس
 */

const QpExpressCityMapper = require('./qpExpressCityMapper');

class QpExpressShipmentService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  /**
   * تحويل عناصر الطلب إلى نص موجز ومفهوم للبوليصة
   */
  formatShipmentContents(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 'منتجات متنوعة';
    }

    const parts = items.map(item => {
      const name = item.productName || item.product?.name || item.product?.title || item.title || item.name || 'منتج';
      const qty = item.quantity || 1;
      const size = item.productSize || item.size || '';
      const color = item.productColor || item.color || '';
      const variant = [size, color, item.variant].filter(Boolean).join(' - ');
      return variant ? `${name} (${variant}) × ${qty}` : `${name} × ${qty}`;
    });

    const result = parts.join(' + ');
    // QP Express schema allows max 255 chars
    return result.length > 250 ? result.substring(0, 247) + '...' : result;
  }

  /**
   * تنظيف وتنسيق رقم هاتف العميل
   */
  cleanPhoneNumber(phone) {
    if (!phone) return '';
    const clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('20') && clean.length === 12) {
      return '0' + clean.substring(2);
    }
    return clean;
  }

  /**
   * استخراج نص العنوان الصافي
   */
  formatAddress(shippingAddress, customerAddress) {
    if (typeof shippingAddress === 'string' && shippingAddress.trim()) {
      return shippingAddress.trim();
    }
    if (shippingAddress && typeof shippingAddress === 'object') {
      const parts = [
        shippingAddress.street || shippingAddress.address,
        shippingAddress.building,
        shippingAddress.floor ? `دور ${shippingAddress.floor}` : '',
        shippingAddress.apartment ? `شقة ${shippingAddress.apartment}` : '',
        shippingAddress.landmark,
        shippingAddress.area,
        shippingAddress.city
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    if (typeof customerAddress === 'string' && customerAddress.trim()) {
      return customerAddress.trim();
    }
    return 'العنوان غير محدد';
  }

  /**
   * إنشاء شحنة جديدة في سيستم QP Express
   */
  async createShipment(orderData) {
    const {
      orderId,
      orderNumber,
      customerName,
      customerPhone,
      shippingAddress,
      customerAddress,
      city,
      governorate,
      items,
      totalAmount,
      price,
      notes,
      weight = 1
    } = orderData;

    const cityId = QpExpressCityMapper.getCityId(city || governorate);
    const contents = typeof items === 'string' ? items : this.formatShipmentContents(items);
    const address = this.formatAddress(shippingAddress, customerAddress);
    const phone = this.cleanPhoneNumber(customerPhone);
    const codAmount = Number(totalAmount !== undefined ? totalAmount : (price || 0));

    if (!this._client.customerId) {
      try {
        await this._client.fetchCustomerProfile();
      } catch (e) {
        console.warn('⚠️ [QP_EXPRESS] Could not auto-fetch customer profile:', e.message);
      }
    }

    if (!this._client.customerId) {
      throw new Error('تعذر تحديد كود العميل الخاص بحساب كيو بي إكسبريس. يرجى التأكد من صحة اسم المستخدم وكلمة المرور في إعدادات الربط.');
    }

    const inspectionNotice = 'مسموح بفتح ومعاينة الشحنة في وجود المندوب';
    const finalNotes = notes && String(notes).trim()
      ? (String(notes).includes('معاين') || String(notes).includes('فتح') ? String(notes).trim() : `${inspectionNotice} - ${String(notes).trim()}`)
      : inspectionNotice;

    // Contract payload based on /addorders/order/ schema
    const payload = {
      customer: this._client.customerId,
      order_date: new Date().toISOString(),
      shipment_contents: contents,
      weight: String(weight || 1),
      full_name: customerName || 'عميل',
      phone,
      total_amount: codAmount,
      city: String(cityId),
      address: address.substring(0, 295),
      notes: finalNotes.substring(0, 250),
      customer_serial: String(orderNumber || orderId || '')
    };

    console.log(`🚀 [QP_EXPRESS] Creating shipment for order ${payload.customer_serial} in city ${cityId}...`);

    const result = await this._client.post('/addorders/order/', payload);

    return {
      success: true,
      serial: result.serial,
      orderSerial: result.serial,
      trackingNumber: String(result.serial),
      orderDeliveryStatus: result.Order_Delivery_Status,
      totalAmount: result.total_amount,
      totalFees: result.total_fees,
      city: result.city,
      cityId: result.city_id,
      notes: result.notes,
      raw: result
    };
  }
}

module.exports = QpExpressShipmentService;
