/**
 * Turbo Error Handler Utilities
 * دوال معالجة وترجمة أخطاء Turbo API
 */

function isTurboConfigurationError(error) {
  const message = error?.message || '';
  return message.includes('Turbo is not enabled')
    || message.includes('Turbo API key is not configured')
    || message.includes('Company ID is required to fetch API key');
}

function translateTurboErrorToArabic(errorMsg) {
  if (!errorMsg) return 'حدث خطأ غير متوقع أثناء التواصل مع تربو';
  const str = String(errorMsg).trim();

  if (/Company ID is required/i.test(str)) return 'معرف الشركة مطلوب';
  if (/Order IDs array is required/i.test(str)) return 'يرجى اختيار طلب واحد على الأقل لإرساله لتربو';
  if (/Turbo is not enabled/i.test(str)) return 'خدمة شحن تربو غير مفعّلة في الإعدادات أو لم يتم إدخال مفتاح API';
  if (/No orders found or all orders already have shipments/i.test(str)) return 'لم يتم العثور على طلبات غير مشحونة (قد تكون الطلبات تحتوي على شحنات تربو بالفعل)';
  if (/Shipment already exists/i.test(str)) return 'يوجد شحنة سابقة لهذا الطلب بالفعل';
  if (/No response from Turbo API/i.test(str)) return 'تعذر الاتصال بسيرفر تربو، يرجى التحقق من اتصال الإنترنت';
  if (/missing code or bar_code/i.test(str)) return 'لم يرجع سيرفر تربو رقم تتبع الشحنة';
  if (/authentication_key|unauthorized|invalid key/i.test(str)) return 'مفتاح الـ API الخاص بشركة تربو غير صحيح أو منتهي الصلاحية';
  if (/governorate|government/i.test(str)) return 'تعذر تحديد المحافظة بشكل صحيح للطلب';
  if (/phone/i.test(str)) return 'رقم هاتف العميل غير صحيح أو مفقود';

  if (/[\u0600-\u06FF]/.test(str)) {
    return str.replace(/^Turbo API error:\s*/i, '');
  }

  return `خطأ في الشحن: ${str}`;
}

function extractErrorFromData(data, status) {
  if (!data) return status ? `Turbo API error: ${status}` : '';
  if (data.errors && typeof data.errors === 'object') {
    const msgs = [];
    for (const [field, val] of Object.entries(data.errors)) {
      if (Array.isArray(val)) {
        msgs.push(...val.filter(Boolean));
      } else if (typeof val === 'string' && val.trim()) {
        msgs.push(val.trim());
      }
    }
    if (msgs.length > 0) {
      return msgs.join(' - ');
    }
  }
  return data.error_msg || data.message || data.error || (status ? `Turbo API error: ${status}` : '');
}

function getTurboErrorMessage(error) {
  if (error?.response?.data) {
    const extracted = extractErrorFromData(error.response.data, error.response.status);
    if (extracted) return extracted;
  }
  return (
    error?.message ||
    ''
  );
}

function isShipmentNotFoundError(message = '') {
  return /shipments?\s+not\s+found/i.test(String(message || ''));
}

function handleError(error, operation) {
  if (isTurboConfigurationError(error)) {
    // 🛡️ Silent for unconfigured companies to avoid log spam (e.g. 1600+ entries)
    const translatedError = translateTurboErrorToArabic(error.message);
    throw new Error(translatedError);
  }
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    const rawError = extractErrorFromData(data, status);
    const translatedError = translateTurboErrorToArabic(rawError);
    console.error(`❌ [TURBO] ${operation} failed:`, { status, data, error_msg: rawError });
    throw new Error(translatedError);
  } else if (error.request) {
    console.error(`❌ [TURBO] ${operation} failed: No response from Turbo API`);
    throw new Error('لم يتم تلقي استجابة من سيرفر تربو. يرجى التأكد من اتصال الإنترنت.');
  } else {
    console.error(`❌ [TURBO] ${operation} failed:`, error.message);
    const translatedError = translateTurboErrorToArabic(error.message);
    throw new Error(translatedError);
  }
}

module.exports = {
  isTurboConfigurationError,
  translateTurboErrorToArabic,
  getTurboErrorMessage,
  isShipmentNotFoundError,
  handleError
};
