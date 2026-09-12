/**
 * QP Express Shipment Service
 * إدارة تجهيز وإنشاء شحنات كيو بي إكسبريس
 */

const QpExpressCityMapper = require('./qpExpressCityMapper');
const {
  cleanPhoneNumber,
  cleanCustomerName,
  cleanShippingAddress,
  cleanShippingNotes,
  resolveBestPhoneNumbers,
  formatShipmentContents,
  detectGovernorateFromText,
} = require('../../utils/shippingSanitizer');

class QpExpressShipmentService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  /**
   * تحويل عناصر الطلب إلى نص موجز ومفهوم للبوليصة
   */
  formatShipmentContents(items, metadata = null) {
    return formatShipmentContents(items, metadata, 'منتج');
  }

  /**
   * تنظيف وتنسيق رقم هاتف العميل
   */
  cleanPhoneNumber(phone) {
    return cleanPhoneNumber(phone);
  }

  /**
   * استخراج نص العنوان الصافي وتفكيك JSON وإزالة طوابع المحادثات
   */
  formatAddress(shippingAddress, customerAddress, customerName = null) {
    return cleanShippingAddress(shippingAddress, customerAddress, customerName);
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
      weight = 1,
      metadata = null,
    } = orderData;

    // كشف المحافظة من العنوان إذا كانت غير محددة في الأوردر
    let resolvedCityOrGov = city || governorate;
    if (!resolvedCityOrGov || resolvedCityOrGov.trim() === '') {
      resolvedCityOrGov = detectGovernorateFromText(shippingAddress) || detectGovernorateFromText(customerAddress) || 'Cairo';
    }

    const cityId = QpExpressCityMapper.getCityId(resolvedCityOrGov);
    const recipientName = cleanCustomerName(customerName);
    const resolvedPhones = resolveBestPhoneNumbers(
      customerPhone,
      orderData.alternativePhone || orderData.phone2,
      `${shippingAddress || ''} ${customerAddress || ''}`
    );
    const phone = resolvedPhones.primaryPhone;
    const contents = typeof items === 'string' ? items : this.formatShipmentContents(items, metadata);
    const address = this.formatAddress(shippingAddress, customerAddress, recipientName);
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

    const finalNotes = cleanShippingNotes(notes, undefined, resolvedPhones.secondaryPhone);

    // Contract payload based on /addorders/order/ schema
    const payload = {
      customer: this._client.customerId,
      order_date: new Date().toISOString(),
      shipment_contents: contents,
      weight: String(weight || 1),
      full_name: recipientName,
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
