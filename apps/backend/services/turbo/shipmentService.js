const axios = require('axios');
const { getBestShippingAddressFields, extractCleanStreetAddress, cleanLocationName, stripMatchedAreaFromAddress } = require('../../utils/turbo/addressParser');
const { getTurboGovernorateName, findGovernmentByCity, normalizeArabic } = require('../../utils/turbo/governorateMapper');
const { FALLBACK_GOVERNMENTS } = require('../../utils/turbo/constants');
const { handleError } = require('../../utils/turbo/errorHandler');
const { cleanShippingNotes } = require('../../utils/shippingSanitizer');


function normalizeTextForMatching(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48))
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^a-z0-9\u0600-\u06FF\s]/gi, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeDigits(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u0660-\u0669]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, d => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48));
}

function cleanEgyptianPhone(raw) {
  if (!raw) return null;
  let digits = normalizeDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('0020')) digits = digits.slice(4);
  else if (digits.startsWith('002')) digits = digits.slice(3);
  else if (digits.startsWith('20') && (digits.length === 12 || (digits.length === 13 && digits.startsWith('2001')))) digits = digits.slice(2);
  if (digits.startsWith('1') && digits.length === 10) digits = '0' + digits;
  return (digits.startsWith('01') && digits.length === 11) ? digits : null;
}

function matchBestAreaFromTurboList(areas, candidateArea, fullAddressText, govName) {
  if (!Array.isArray(areas) || areas.length === 0) {
    return candidateArea || govName || 'المركز الرئيسي';
  }

  const nGov = normalizeArabic(govName);
  const nCandidate = normalizeArabic(candidateArea);

  const govNamesList = [
    'cairo', 'giza', 'alexandria', 'sharqia', 'gharbia', 'dakahlia', 'qena',
    'sohag', 'aswan', 'asyut', 'qalyubia', 'monufia', 'beheira', 'ismailia',
    'suez', 'damietta', 'port said', 'fayoum', 'beni suef', 'minya', 'luxor',
    'matrouh', 'red sea', 'north sinai', 'south sinai', 'new valley'
  ];
  const isCandidateJustGov = !nCandidate || nCandidate === nGov || govNamesList.includes(nCandidate);

  const streetNoiseWords = [
    'شارع', 'طريق', 'ميدان', 'حارة', 'حاره', 'عطفة', 'عطفه', 'زقاق',
    'عمارة', 'عماره', 'برج', 'فيلا', 'مبنى', 'مبني', 'دور', 'شقة', 'شقه',
    'رقم', 'امام', 'خلف', 'بجوار', 'قرب', 'ناصية', 'ناصيه', 'تقاطع', 'مدخل'
  ];

  const sortedAreas = [...areas].sort((a, b) => (b.name || '').length - (a.name || '').length);

  // 1. Primary AI Match: Scan address text FIRST for canonical areas of this governorate.
  // If the customer wrote their specific neighborhood in the address (e.g. "سموحة شارع مصطفى النجار"),
  // this takes precedence over a generic or mismatched candidate area (e.g. "سيدي جابر").
  if (fullAddressText) {
    const nAddress = normalizeArabic(fullAddressText);
    for (const area of sortedAreas) {
      const na = normalizeArabic(area.name);
      if (na === nGov || govNamesList.includes(na)) continue;

      if (na.length >= 3 && nAddress.includes(na)) {
        return area.name;
      }

      const bareArea = na.startsWith('ال') ? na.slice(2) : na;
      if (bareArea.length >= 3 && nAddress.includes(bareArea)) {
        return area.name;
      }

      // Check if area starts with street/district prefix (e.g. 'شارع زغلول' -> 'زغلول')
      const bareStreet = na.replace(/^(?:شارع|ش|طريق|ميدان|حي|حى|منطقة|منطقه)\s+/, '').replace(/^ال/, '').trim();
      // Guard: do not match if bareStreet is just the governorate name (e.g. 'ميدان الجيزة' -> 'جيزة' matching 'الجيزة' in address)
      const nGovBare = nGov.replace(/^ال/, '');
      if (bareStreet !== nGov && bareStreet !== nGovBare && !govNamesList.includes(bareStreet)) {
        if (bareStreet.length >= 3 && nAddress.includes(bareStreet)) {
          return area.name;
        }
      }
    }
  }

  // 2. Direct exact normalized match with candidateArea
  if (!isCandidateJustGov && nCandidate.length >= 2) {
    const directMatch = areas.find(a => normalizeArabic(a.name) === nCandidate);
    if (directMatch) return directMatch.name;
  }

  // 3. Tokenized search in candidateArea if it has street words
  if (!isCandidateJustGov && candidateArea) {
    let cleanedCandidate = nCandidate;
    cleanedCandidate = cleanedCandidate.replace(/(?:^|\s)ش\s+/g, ' ');

    for (const noise of streetNoiseWords) {
      if (noise.trim().length >= 2) {
        cleanedCandidate = cleanedCandidate.replace(new RegExp(normalizeArabic(noise), 'g'), ' ');
      }
    }
    const candidateTokens = cleanedCandidate.split(/\s+/).filter(w => w.length >= 3);

    for (const area of sortedAreas) {
      const na = normalizeArabic(area.name);
      if (candidateTokens.some(token => token === na || (token.length >= 4 && na.includes(token)) || (na.length >= 4 && token.includes(na)))) {
        return area.name;
      }
    }
  }

  // 4. Colloquial variations without 'ال' against candidateArea
  if (!isCandidateJustGov && candidateArea) {
    for (const area of sortedAreas) {
      const na = normalizeArabic(area.name);
      const bareArea = na.startsWith('ال') ? na.slice(2) : na;
      if (bareArea.length >= 3 && nCandidate.includes(bareArea)) {
        return area.name;
      }
    }
  }

  // 5. If candidateArea is clean and contains no street noise, retain it
  if (!isCandidateJustGov && candidateArea && candidateArea.trim().length >= 2) {
    const hasStreetNoise = streetNoiseWords.some(w => candidateArea.includes(w));
    if (!hasStreetNoise) {
      return candidateArea.trim();
    }
  }

  // 6. Safe Central Fallback for Turbo:
  // استبعاد المنشآت غير السكنية كالملاعب والمطارات والموانئ من أن تكون منطقة افتراضية
  const nonFallbackKeywords = ['ستاد', 'استاد', 'مطار', 'صالة', 'صاله', 'ميناء', 'مينا'];

  // 6a. مطابقة تامة لاسم المحافظة كمنطقة (دون استخدام includes لتجنب التقاط ستاد القاهرة أو مطار القاهرة)
  const govAreaMatch = areas.find(a => normalizeArabic(a.name) === nGov);
  if (govAreaMatch) return govAreaMatch.name;

  // 6b. المناطق المركزية الرئيسية المعتمدة لكل محافظة
  const centralNames = [
    'وسط البلد', 'ميدان الجيزة', 'محطة الرمل', 'المنشية', 'التحرير',
    'الازبكية', 'الرئيسي', 'المركز الرئيسي', 'حدائق الاهرام'
  ];
  for (const cName of centralNames) {
    const nCName = normalizeArabic(cName);
    const found = areas.find(a => {
      const na = normalizeArabic(a.name);
      return na === nCName || na.includes(nCName);
    });
    if (found) return found.name;
  }

  // 6c. البحث عن منطقة تحتوي على 'رئيسي' أو 'مركز' أو 'عام' مع استبعاد الملاعب والمطارات
  const mainCenterMatch = areas.find(a => {
    const na = normalizeArabic(a.name);
    if (nonFallbackKeywords.some(k => na.includes(k))) return false;
    return na.includes('رئيسي') || na.includes('مركز') || na.includes('عام');
  });
  if (mainCenterMatch) return mainCenterMatch.name;

  // 6d. أول منطقة آمنة ليست ملعباً أو مطاراً
  const firstSafe = areas.find(a => {
    const na = normalizeArabic(a.name);
    return !nonFallbackKeywords.some(k => na.includes(k));
  });
  if (firstSafe) return firstSafe.name;

  if (areas.length > 0 && areas[0].name) {
    return areas[0].name;
  }

  return govName || 'المركز الرئيسي';
}

function rawShippingAddressString(shippingAddress, customerAddress) {
  let text = '';
  if (typeof shippingAddress === 'string') text += shippingAddress + ' ';
  else if (shippingAddress && typeof shippingAddress === 'object') text += JSON.stringify(shippingAddress) + ' ';
  if (typeof customerAddress === 'string') text += customerAddress + ' ';
  else if (customerAddress && typeof customerAddress === 'object') text += JSON.stringify(customerAddress) + ' ';
  return text;
}

class ShipmentService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  async createShipment(orderData) {
    try {
      const { orderId, orderNumber, customerName, customerPhone, customerEmail,
        shippingAddress, customerAddress, city, governorate, items, totalWeight,
        totalValue, shipping, paymentMethod = 'CASH', notes } = orderData;

      const headers = await this._client.getHeaders();
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const senderNumber = await this._client.getSenderNumber();

      const addressFields = getBestShippingAddressFields(shippingAddress, customerAddress);
      const cleanAddress = extractCleanStreetAddress(addressFields, shippingAddress, { customerName, city });

      let governments = [];
      try {
        const govResult = await this._client.get(`${this._client.baseUrl}/get-government?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`);
        const data = govResult.data;
        if ((data.success === true || data.success === 1) && data.feed) {
          governments = Array.isArray(data.feed) ? data.feed : [];
        }
      } catch (e) { console.warn('⚠️ [TURBO] Failed to fetch governments:', e.message); }

      // 🛡️ Fallback to FALLBACK_GOVERNMENTS if API failed or returned empty
      if (!governments || governments.length === 0) {
        governments = FALLBACK_GOVERNMENTS || [];
      }

      const rawGov = governorate || '';
      const rawCity = city || addressFields.city || '';
      const fullAddressContext = `${cleanAddress} ${rawShippingAddressString(shippingAddress, customerAddress)}`;

      let cleanGovernorate = getTurboGovernorateName(rawGov, rawCity, fullAddressContext);
      if (!cleanGovernorate && rawCity) {
        cleanGovernorate = findGovernmentByCity(rawCity, governments, fullAddressContext);
      }
      if (!cleanGovernorate) {
        cleanGovernorate = 'القاهرة';
      }

      let matchedGovId = null;
      if (governments.length > 0) {
        const nTargetGov = normalizeArabic(cleanGovernorate);
        let foundGov = governments.find(g => normalizeArabic(g.name) === nTargetGov)
          || governments.find(g => normalizeArabic(g.name).includes(nTargetGov))
          || [...governments].sort((a, b) => b.name.length - a.name.length).find(g => nTargetGov.includes(normalizeArabic(g.name)));
        if (foundGov) {
          cleanGovernorate = foundGov.name;
          matchedGovId = foundGov.id;
        }
      }

      if (!matchedGovId && FALLBACK_GOVERNMENTS && FALLBACK_GOVERNMENTS.length > 0) {
        const nTargetGov = normalizeArabic(cleanGovernorate);
        const fbMatch = FALLBACK_GOVERNMENTS.find(g => normalizeArabic(g.name) === nTargetGov)
          || FALLBACK_GOVERNMENTS.find(g => normalizeArabic(g.name).includes(nTargetGov));
        if (fbMatch) {
          cleanGovernorate = fbMatch.name;
          matchedGovId = fbMatch.id;
        }
      }

      // Capture district candidate if rawGov was a district resolved to governorate (e.g. سيدي جابر -> الإسكندرية)
      const potentialDistrict = (rawGov && normalizeArabic(rawGov) !== normalizeArabic(cleanGovernorate))
        ? cleanLocationName(rawGov)
        : null;

      // Determine area: prioritize specific area, then smart match from address text against Turbo's canonical area list
      let candidateArea = cleanLocationName(orderData.area || addressFields.area || addressFields.parsedAddress?.area || potentialDistrict || city || addressFields.city || '');
      let cleanArea = candidateArea;

      if (matchedGovId) {
        try {
          const areasResult = await this._client.get(`${this._client.baseUrl}/get-area/${matchedGovId}?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`);
          const aData = areasResult.data;
          let areas = [];
          if ((aData.success === true || aData.success === 1) && aData.feed) areas = Array.isArray(aData.feed) ? aData.feed : [];
          if (areas.length > 0) {
            cleanArea = matchBestAreaFromTurboList(areas, candidateArea, cleanAddress || fullAddressContext, cleanGovernorate);
          }
        } catch (e) { console.warn('⚠️ [TURBO] Failed area matching:', e.message); }
      }

      const rawSecondPhone = orderData.phone2 || orderData.alternativePhone || addressFields.parsedAddress?.phone2 || addressFields.parsedAddress?.alternativePhone || addressFields.parsedAddress?.secondPhone || addressFields.secondaryAddressPhone || null;
      const secondPhone = cleanEgyptianPhone(rawSecondPhone);

      const formattedSummary = Array.isArray(items) && items.length > 0
        ? items.map(item => {
            const qty = item.quantity || 1;
            const name = item.productName || item.name || 'منتج';
            const details = [];
            if (item.color) details.push(`اللون: ${item.color}`);
            if (item.size) details.push(`المقاس: ${item.size}`);
            if (details.length === 0 && item.variantName) details.push(item.variantName);
            const variantSuffix = details.length > 0 ? ` (${details.join(' - ')})` : '';
            return `[${qty} ${name}${variantSuffix}]`;
          }).join(' - ')
        : (notes || `طلب #${orderNumber}`);

      const rawReqType = String(orderData.requestType || orderData.orderType || orderData.type || '').trim().toLowerCase();
      const shippingFeeVal = parseFloat(shipping || orderData.shipping || orderData.shippingFee || orderData.shippingCost || 0);
      let isOrderVal = 0, returnAmt = 0, defaultReturnSummary = 'لا يوجد مرتجع';

      if (rawReqType === 'partial_delivery' || rawReqType === 'partial' || rawReqType === 'تسليم جزئي') {
        isOrderVal = 1; returnAmt = shippingFeeVal; defaultReturnSummary = 'تسليم جزئي';
      } else if (rawReqType === 'return' || rawReqType === 'returned' || orderData.orderType === 'RETURN') {
        isOrderVal = 2; returnAmt = parseFloat(orderData.returnAmount || totalValue || 0); defaultReturnSummary = formattedSummary;
      } else if (rawReqType === 'exchange' || rawReqType === 'exchanged' || orderData.orderType === 'EXCHANGE') {
        isOrderVal = 1; returnAmt = 0; defaultReturnSummary = 'طلب استبدال';
      } else {
        isOrderVal = 0; returnAmt = parseFloat(orderData.returnAmount || shippingFeeVal || 0);
      }

      const finalReceiver = (customerName || `عميل طلب #${orderNumber}`).trim();
      const validPhone = cleanEgyptianPhone(customerPhone || addressFields.parsedAddress?.phone);
      if (!validPhone) {
        const rawPhoneDigits = normalizeDigits(customerPhone || addressFields.parsedAddress?.phone || '').replace(/\D/g, '');
        const errMsg = rawPhoneDigits.length > 0 ? `رقم هاتف العميل غير صحيح: الرقم مكون من ${rawPhoneDigits.length} أرقام بدلاً من 11 رقماً` : 'رقم هاتف العميل غير صحيح أو مفقود';
        throw new Error(errMsg);
      }
      if (!cleanGovernorate) throw new Error('المحافظة غير محددة أو غير مطابقة لقائمة المحافظات المعتمدة في تربو.');

      const methodStr = String(orderData.paymentMethod || paymentMethod || '').trim().toUpperCase();
      const paymentStatusStr = String(orderData.paymentStatus || '').trim().toUpperCase();
      const isPrepaid = ['PAID', 'ONLINE', 'CARD', 'PAYMOB', 'FAWRY', 'CREDIT_CARD', 'VISA', 'WALLET', 'INSTAPAY', 'PREPAID'].includes(methodStr) ||
        ['PAID', 'COMPLETED'].includes(paymentStatusStr);
      let codAmount = (isOrderVal === 2 || isPrepaid) ? 0 : parseFloat(totalValue || orderData.total || 0);
      if (codAmount > 0 && orderData.codDepositPaid && Number(orderData.codDepositAmount) > 0) {
        codAmount = Math.max(0, codAmount - Number(orderData.codDepositAmount));
      }

      const finalTurboNotes = cleanShippingNotes(notes || `Order #${orderNumber}`, undefined, secondPhone);

      const strippedAddress = stripMatchedAreaFromAddress(cleanAddress, cleanArea, {
        additionalDistrict: potentialDistrict,
        governorate: cleanGovernorate
      });
      const finalAddress = (strippedAddress && strippedAddress.trim().length >= 3)
        ? strippedAddress.trim()
        : ((cleanAddress && cleanAddress.trim().length >= 3) ? cleanAddress.trim() : `${cleanArea || cleanGovernorate} - ${cleanGovernorate}`);
      const shipmentData = {
        authentication_key: apiKey, main_client_code: mainClientCode || 37321, remote_order_id: orderNumber || `Order ${orderNumber}`,
        remote_shipment_id: String(orderId || ''), receiver: finalReceiver, phone1: validPhone, phone2: secondPhone || null,
        api_followup_phone: senderNumber || validPhone, government: cleanGovernorate, area: cleanArea || cleanGovernorate || 'المركز الرئيسي',
        address: finalAddress, notes: finalTurboNotes, order_summary: formattedSummary,
        return_summary: orderData.returnSummary || defaultReturnSummary,
        amount_to_be_collected: codAmount,
        return_amount: returnAmt, is_order: isOrderVal, can_open: orderData.canOpen !== undefined ? (orderData.canOpen ? "1" : "0") : "1",
        weight: totalWeight || 1, delivery_type: 0, is_fragile: 0
      };

      const response = await axios.post(`${this._client.baseUrl}/add-order`, shipmentData, { headers, timeout: this._client.timeout });
      const responseData = response.data;

      if (responseData.success === 0 || responseData.success === false || responseData.error_msg) {
        throw new Error(`Turbo API error: ${responseData.error_msg || 'Unknown error'}`);
      }
      const isSuccess = responseData.success === 1 || responseData.success === true;
      if (!isSuccess || !responseData.result) throw new Error('Invalid response from Turbo API: missing success or result');
      const shipment = responseData.result;
      if (!shipment.code && !shipment.bar_code) throw new Error('Invalid response from Turbo API: missing code or bar_code');
      const trackingNumber = shipment.bar_code || shipment.code;

      const rawStatusCode = String(shipment.status_code || '');
      const rawStatusText = String(shipment.status || '');
      let determinedStatus = 'turbo_sent';
      if (rawStatusCode === '99' || rawStatusCode === '18' || rawStatusText.includes('غير مكتمل')) {
        determinedStatus = 'incomplete';
      }

      return {
        success: true,
        shipmentId: shipment.code || shipment.bar_code,
        trackingNumber,
        labelUrl: null,
        status: determinedStatus,
        estimatedDelivery: shipment.expected_branch || null,
        cost: null,
        data: shipment
      };
    } catch (error) {
      handleError(error, 'Create Shipment');
    }
  }

  async cancelShipment(shipmentId, reason = null) {
    try {
      const apiKey = await this._client.getApiKey();
      if (!apiKey) throw new Error('Turbo API key is required to cancel shipment');
      const headers = await this._client.getHeaders();
      const { normalizeShipmentSearchKeys } = require('../../utils/turbo/orderFormatter');
      const shipmentSearchKeys = normalizeShipmentSearchKeys(shipmentId);
      if (shipmentSearchKeys.length === 0) throw new Error('Turbo shipment identifier is required to cancel shipment');
      const mainClientCode = await this._client.getMainClientCode();
      let lastError = null;

      for (let index = 0; index < shipmentSearchKeys.length; index += 1) {
        const searchKey = shipmentSearchKeys[index];
        try {
          const response = await axios.post(`${this._client.baseUrl}/delete-order`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, search_key: searchKey }, { headers, timeout: this._client.timeout });
          const result = response.data;
          if (result.success === 0 || result.error_msg || result.success === false) {
            const err = new Error(result.error_msg || result.message || 'Unknown error from Turbo API');
            err.response = { status: 400, data: result }; throw err;
          }
          return { success: true, shipmentId: searchKey, status: 'cancelled', message: result.message || 'Shipment cancelled successfully', data: result };
        } catch (error) {
          lastError = error;
          const { getTurboErrorMessage, isShipmentNotFoundError } = require('../../utils/turbo/errorHandler');
          const errorMessage = getTurboErrorMessage(error);
          if (index < shipmentSearchKeys.length - 1 && isShipmentNotFoundError(errorMessage)) continue;
          break;
        }
      }

      const { getTurboErrorMessage, isShipmentNotFoundError } = require('../../utils/turbo/errorHandler');
      if (lastError && isShipmentNotFoundError(getTurboErrorMessage(lastError))) {
        return { success: true, shipmentId: shipmentSearchKeys[0], status: 'cancelled', message: 'Shipment was not found in Turbo and has been marked as cancelled locally', data: { success: true, providerStatus: 'not_found', resolvedLocally: true, message: 'Shipments not found', searchKeys: shipmentSearchKeys } };
      }
      throw lastError || new Error('Failed to cancel shipment');
    } catch (error) {
      handleError(error, 'Cancel Shipment');
    }
  }

  async updateShipment(shipmentId, orderData) {
    try {
      const headers = await this._client.getHeaders();
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const senderNumber = await this._client.getSenderNumber();
      const { formatOrderForTurbo } = require('../../utils/turbo/orderFormatter');

      let formattedData = orderData;
      if (!formattedData.governorate && formattedData.city) {
        formattedData = formatOrderForTurbo(orderData, orderData.customer, orderData.items || []);
      }

      const addressFields = getBestShippingAddressFields(formattedData.shippingAddress, formattedData.customerAddress);
      const cleanAddress = extractCleanStreetAddress(addressFields, formattedData.shippingAddress, { customerName: formattedData.customerName, city: formattedData.city });

      let governments = [];
      try {
        const govResult = await this._client.get(`${this._client.baseUrl}/get-government?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`);
        const data = govResult.data;
        if ((data.success === true || data.success === 1) && data.feed) governments = Array.isArray(data.feed) ? data.feed : [];
      } catch (e) { console.warn('⚠️ [TURBO] Failed to fetch governments for update:', e.message); }

      const updateRawGov = formattedData.governorate || '';
      const updateRawCity = formattedData.city || addressFields.city || '';
      const updateFullAddressContext = `${cleanAddress} ${rawShippingAddressString(formattedData.shippingAddress, formattedData.customerAddress)}`;

      let cleanGovernorate = getTurboGovernorateName(updateRawGov, updateRawCity, updateFullAddressContext);
      if (!cleanGovernorate && updateRawCity) {
        cleanGovernorate = findGovernmentByCity(updateRawCity, governments, updateFullAddressContext);
      }
      if (!cleanGovernorate) {
        cleanGovernorate = 'القاهرة';
      }

      let matchedGovId = null;
      if (governments.length > 0) {
        const nTargetGov = normalizeArabic(cleanGovernorate);
        let foundGov = governments.find(g => normalizeArabic(g.name) === nTargetGov)
          || governments.find(g => normalizeArabic(g.name).includes(nTargetGov))
          || [...governments].sort((a, b) => b.name.length - a.name.length).find(g => nTargetGov.includes(normalizeArabic(g.name)));
        if (foundGov) {
          cleanGovernorate = foundGov.name;
          matchedGovId = foundGov.id;
        }
      }

      if (!matchedGovId && FALLBACK_GOVERNMENTS && FALLBACK_GOVERNMENTS.length > 0) {
        const nTargetGov = normalizeArabic(cleanGovernorate);
        const fbMatch = FALLBACK_GOVERNMENTS.find(g => normalizeArabic(g.name) === nTargetGov)
          || FALLBACK_GOVERNMENTS.find(g => normalizeArabic(g.name).includes(nTargetGov));
        if (fbMatch) {
          cleanGovernorate = fbMatch.name;
          matchedGovId = fbMatch.id;
        }
      }

      const updatePotentialDistrict = (updateRawGov && normalizeArabic(updateRawGov) !== normalizeArabic(cleanGovernorate))
        ? cleanLocationName(updateRawGov)
        : null;

      // Determine area: prioritize specific area, then smart match from address text against Turbo's canonical area list
      let candidateArea = cleanLocationName(formattedData.area || addressFields.area || addressFields.parsedAddress?.area || updatePotentialDistrict || formattedData.city || addressFields.city || '');
      let cleanArea = candidateArea;

      if (matchedGovId) {
        try {
          const areasResult = await this._client.get(`${this._client.baseUrl}/get-area/${matchedGovId}?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`);
          const aData = areasResult.data;
          let areas = [];
          if ((aData.success === true || aData.success === 1) && aData.feed) areas = Array.isArray(aData.feed) ? aData.feed : [];
          if (areas.length > 0) {
            cleanArea = matchBestAreaFromTurboList(areas, candidateArea, cleanAddress || `${cleanAddress} ${rawShippingAddressString(formattedData.shippingAddress, formattedData.customerAddress)}`, cleanGovernorate);
          }
        } catch (e) { console.warn('⚠️ [TURBO] Failed area matching:', e.message); }
      }

      const rawReqType = String(formattedData.requestType || formattedData.orderType || formattedData.type || '').trim().toLowerCase();
      const shippingFeeVal = parseFloat(formattedData.shipping || formattedData.shippingCost || formattedData.shippingFee || 0);
      const totalValue = parseFloat(formattedData.totalValue || formattedData.total || 0);
      const items = formattedData.items || formattedData.orderItems || [];
      const formattedSummary = Array.isArray(items) && items.length > 0
        ? items.map(item => `[${item.quantity || 1} ${item.productName || item.name || 'منتج'}]`).join(' - ')
        : (formattedData.notes || `طلب #${formattedData.orderNumber || shipmentId}`);

      let isOrderVal = 0, returnAmt = 0, defaultReturnSummary = 'لا يوجد مرتجع';
      if (rawReqType === 'partial_delivery' || rawReqType === 'partial' || rawReqType === 'تسليم جزئي') {
        isOrderVal = 1; returnAmt = shippingFeeVal; defaultReturnSummary = 'تسليم جزئي';
      } else if (rawReqType === 'return' || rawReqType === 'returned' || formattedData.orderType === 'RETURN') {
        isOrderVal = 2; returnAmt = parseFloat(formattedData.returnAmount || totalValue || 0); defaultReturnSummary = formattedSummary;
      } else if (rawReqType === 'exchange' || rawReqType === 'exchanged' || formattedData.orderType === 'EXCHANGE') {
        isOrderVal = 1; returnAmt = 0; defaultReturnSummary = 'طلب استبدال';
      } else {
        isOrderVal = 0; returnAmt = parseFloat(formattedData.returnAmount || shippingFeeVal || 0);
      }

      const methodStr = String(formattedData.paymentMethod || '').trim().toUpperCase();
      const paymentStatusStr = String(formattedData.paymentStatus || '').trim().toUpperCase();
      const isPrepaid = ['PAID', 'ONLINE', 'CARD', 'PAYMOB', 'FAWRY', 'CREDIT_CARD', 'VISA', 'WALLET', 'INSTAPAY', 'PREPAID'].includes(methodStr) ||
        ['PAID', 'COMPLETED'].includes(paymentStatusStr);
      const codAmount = (isOrderVal === 2 || isPrepaid) ? 0 : totalValue;
      let rawPhoneDigits = String(formattedData.customerPhone || '').replace(/\D/g, '');
      let validPhone = rawPhoneDigits;
      if (validPhone.startsWith('20') && validPhone.length === 12) validPhone = validPhone.slice(2);
      if (validPhone.startsWith('1') && validPhone.length === 10) validPhone = '0' + validPhone;
      const finalReceiver = (formattedData.customerName || `عميل طلب #${formattedData.orderNumber || shipmentId}`).trim();

      const updateData = {
        authentication_key: apiKey, code: String(shipmentId), main_client_code: mainClientCode || 37321,
        remote_order_id: formattedData.orderNumber || `Order ${formattedData.orderNumber}`,
        remote_shipment_id: String(formattedData.orderId || ''), receiver: finalReceiver, phone1: validPhone,
        phone2: formattedData.alternativePhone || null, api_followup_phone: senderNumber || validPhone,
        government: cleanGovernorate, area: cleanArea, address: stripMatchedAreaFromAddress(cleanAddress, cleanArea, {
          additionalDistrict: updatePotentialDistrict,
          governorate: cleanGovernorate
        }) || cleanAddress,
        notes: cleanShippingNotes(formattedData.notes || `Order #${formattedData.orderNumber}`, undefined, formattedData.alternativePhone),
        invoice_number: String(formattedData.orderNumber || ''),
        order_summary: formattedSummary, return_summary: formattedData.returnSummary || defaultReturnSummary,
        amount_to_be_collected: codAmount, return_amount: returnAmt, is_order: isOrderVal,
        can_open: formattedData.canOpen !== undefined ? (formattedData.canOpen ? "1" : "0") : "1",
        weight: formattedData.totalWeight || 1, delivery_type: 0, is_fragile: 0
      };

      const response = await axios.post(`${this._client.baseUrl}/edit-order`, updateData, { headers, timeout: this._client.timeout });
      const result = response.data;
      if (result.success === 0 || result.error_msg) throw new Error(`Turbo API error: ${result.error_msg || 'Unknown error'}`);
      return { success: true, shipmentId: String(shipmentId), data: result };
    } catch (error) {
      handleError(error, 'Update Shipment');
    }
  }

  async calculateShippingCost(addressData, weight, dimensions = null) {
    const axios = require('axios');
    try {
      const headers = await this._client.getHeaders();
      const { city, governorate, address } = addressData;
      const calculationData = {
        city, governorate, address,
        weight: weight || 1,
        ...(dimensions && { length: dimensions.length, width: dimensions.width, height: dimensions.height }),
      };
      let response, lastError = null;
      const endpoints = ['/shipping/calculate', '/shipping-cost', '/calculate-shipping', '/calculate'];

      for (const ep of endpoints) {
        try {
          response = await axios.post(
            `${this._client.baseUrl}${ep}`,
            calculationData,
            { headers, timeout: this._client.timeout }
          );
          break;
        } catch (error) {
          lastError = error;
          if (error.response?.status === 405) {
            try {
              const mainClientCode = await this._client.getMainClientCode();
              const apiKey = await this._client.getApiKey();
              const qp = new URLSearchParams({
                main_client_code: (mainClientCode || 37321).toString(),
                authentication_key: apiKey || '',
                city: city || '',
                governorate: governorate || '',
                address: address || '',
                weight: (weight || 1).toString(),
              });
              if (dimensions) {
                qp.append('length', dimensions.length.toString());
                qp.append('width', dimensions.width.toString());
                qp.append('height', dimensions.height.toString());
              }
              response = await axios.get(
                `${this._client.baseUrl}${ep}?${qp.toString()}`,
                { headers, timeout: this._client.timeout }
              );
              break;
            } catch (getError) { continue; }
          } else if (error.response?.status === 404) {
            continue;
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        return {
          success: false,
          error: 'Turbo API does not support shipping cost calculation',
          message: 'Turbo API لا يدعم حساب تكلفة الشحن مباشرة',
          cost: null, estimatedDelivery: null, currency: 'EGP',
        };
      }

      const calc = response.data;
      return {
        success: true,
        cost: calc.cost || calc.price,
        estimatedDelivery: calc.estimated_delivery || calc.delivery_time,
        currency: calc.currency || 'EGP',
        data: calc,
      };
    } catch (error) {
      if (error.message?.includes('All endpoints failed') || error.response?.status === 404) {
        return {
          success: false,
          error: 'Shipping cost calculation not available',
          message: 'Turbo API لا يدعم حساب تكلفة الشحن مباشرة',
          cost: null, estimatedDelivery: null, currency: 'EGP',
        };
      }
      handleError(error, 'Calculate Shipping Cost');
    }
  }
}

ShipmentService.cleanEgyptianPhone = cleanEgyptianPhone;
ShipmentService.normalizeDigits = normalizeDigits;

module.exports = ShipmentService;
