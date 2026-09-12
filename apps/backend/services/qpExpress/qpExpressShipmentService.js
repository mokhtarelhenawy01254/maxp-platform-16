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
      let name = item.productName || item.product?.name || item.product?.title || item.title || item.name;
      if (!name || name === 'منتج غير محدد' || name === 'منتج') {
        name = item.variantName || item.productSku || 'منتج';
      }
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
   * استخراج نص العنوان الصافي وتفكيك JSON وإزالة طوابع المحادثات
   */
  formatAddress(shippingAddress, customerAddress) {
    const tryParseJson = (val) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      if (typeof val === 'string' && val.trim().startsWith('{')) {
        try {
          return JSON.parse(val.trim());
        } catch {
          return null;
        }
      }
      return null;
    };

    const cleanText = (text) => {
      if (!text || typeof text !== 'string') return '';
      return text
        .replace(/\r?\n.*?[٠-٩0-9]{1,2}:[٠-٩0-9]{2}\s*(ص|م|am|pm)?/gi, '') // إزالة طوابع الوقت من الشات مثل ١٠:٥٣ ص
        .replace(/\r?\n\s*(\+?20|0)?1[0125][0-9]{8}\s*$/g, '') // إزالة رقم الهاتف إذا كان مكرراً في نهاية العنوان
        .replace(/[\r\n]+/g, ' - ') // استبدال الأسطر بواصلة
        .replace(/\s+/g, ' ')
        .trim();
    };

    // 1. فحص ما إذا كان العنوان كائن JSON (أو نص JSON مخزن في قاعدة البيانات)
    const parsed = tryParseJson(shippingAddress) || tryParseJson(customerAddress);
    if (parsed) {
      const street =
        parsed.address ||
        parsed['العنوان'] ||
        parsed['عنوان'] ||
        parsed.street ||
        parsed['الشارع'] ||
        parsed['شارع'] ||
        parsed.details ||
        parsed['تفاصيل العنوان'] ||
        '';

      const building = parsed.building || parsed['العمارة'] || parsed['عمارة'] ? `عمارة ${parsed.building || parsed['العمارة'] || parsed['عمارة']}`.replace(/عمارة\s+عمارة/, 'عمارة') : '';
      const floor = parsed.floor || parsed['الدور'] || parsed['دور'] ? `دور ${parsed.floor || parsed['الدور'] || parsed['دور']}`.replace(/دور\s+دور/, 'دور') : '';
      const apartment = parsed.apartment || parsed['الشقة'] || parsed['شقة'] ? `شقة ${parsed.apartment || parsed['الشقة'] || parsed['شقة']}`.replace(/شقة\s+شقة/, 'شقة') : '';
      const landmark = parsed.landmark || parsed['علامة مميزة'] || '';
      const area = parsed.area || parsed['المنطقة'] || parsed['منطقة'] || '';

      const parts = [
        street,
        building,
        floor,
        apartment,
        landmark,
        area
      ].filter(Boolean);

      if (parts.length > 0) {
        const joined = cleanText(parts.join(' - '));
        if (joined.length > 2) return joined;
      }
    }

    // 2. استخدام customerAddress إذا كان نصاً عادياً نظيفاً
    if (typeof customerAddress === 'string' && customerAddress.trim()) {
      const cleaned = cleanText(customerAddress);
      if (cleaned && !cleaned.startsWith('{') && cleaned.length > 2) {
        return cleaned;
      }
    }

    // 3. استخدام shippingAddress إذا كان نصاً عادياً نظيفاً
    if (typeof shippingAddress === 'string' && shippingAddress.trim()) {
      const cleaned = cleanText(shippingAddress);
      if (cleaned && !cleaned.startsWith('{') && cleaned.length > 2) {
        return cleaned;
      }
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
