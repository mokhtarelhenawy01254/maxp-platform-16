const axios = require('axios');
const { getBestShippingAddressFields, extractCleanStreetAddress, cleanLocationName } = require('../../utils/turbo/addressParser');
const { getTurboGovernorateName, findGovernmentByCity } = require('../../utils/turbo/governorateMapper');
const { handleError } = require('../../utils/turbo/errorHandler');


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
      } catch (e) { console.warn('ΓÜá∩╕Å [TURBO] Failed to fetch governments:', e.message); }

      let cleanGovernorate;
      let matchedGovId = null;
      if (governorate && governorate.trim()) {
        const cleanedGov = cleanLocationName(governorate);
        if (governments.length > 0) {
          const cleanedLower = cleanedGov.toLowerCase();
          let foundGov = governments.find(g => g.name.toLowerCase() === cleanedLower)
            || governments.find(g => g.name.toLowerCase().includes(cleanedLower))
            || [...governments].sort((a, b) => b.name.length - a.name.length).find(g => cleanedLower.includes(g.name.toLowerCase()));
          if (foundGov) { cleanGovernorate = foundGov.name; matchedGovId = foundGov.id; }
          else cleanGovernorate = getTurboGovernorateName(cleanedGov);
        } else {
          cleanGovernorate = getTurboGovernorateName(cleanedGov);
        }
      } else {
        const orderCity = city || '';
        if (governments.length > 0) cleanGovernorate = findGovernmentByCity(orderCity, governments);
        else cleanGovernorate = getTurboGovernorateName(cleanLocationName(city || ''));
        if (governments.length > 0 && cleanGovernorate) {
          const g = governments.find(x => x.name === cleanGovernorate);
          if (g) matchedGovId = g.id;
        }
      }

      // Use the parsed area (district) when present ΓÇö never fall back to the
      // governorate/city as the area, otherwise Turbo receives an incorrect area.
      let cleanArea = cleanLocationName(orderData.area || addressFields.area || addressFields.parsedAddress?.area || city || addressFields.city || '');

      // Normalize the area against Turbo's canonical area list (mirrors updateShipment).
      // Without this the first send (create) arrives with a wrong/incomplete area,
      // while the re-send (update) corrects it.
      if (matchedGovId && cleanArea) {
        try {
          const areasResult = await this._client.get(`${this._client.baseUrl}/get-area/${matchedGovId}?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`);
          const aData = areasResult.data;
          let areas = [];
          if ((aData.success === true || aData.success === 1) && aData.feed) areas = Array.isArray(aData.feed) ? aData.feed : [];
          if (areas.length > 0) {
            const cl = cleanArea.toLowerCase();
            const ma = areas.find(a => a.name.toLowerCase() === cl)
              || areas.find(a => a.name.toLowerCase().includes(cl) || cl.includes(a.name.toLowerCase()));
            if (ma) cleanArea = ma.name;
          }
        } catch (e) { console.warn('ΓÜá∩╕Å [TURBO] Failed area matching:', e.message); }
      }

      const secondPhone = orderData.phone2 || addressFields.parsedAddress?.phone2 || addressFields.parsedAddress?.secondPhone || addressFields.secondaryAddressPhone || null;
      const formattedSummary = Array.isArray(items) && items.length > 0
        ? items.map(item => `[${item.quantity || 1} ${item.productName || item.name || '┘à┘å╪¬╪¼'}]`).join(' - ')
        : (notes || `╪╖┘ä╪¿ #${orderNumber}`);

      const rawReqType = String(orderData.requestType || orderData.orderType || orderData.type || '').trim().toLowerCase();
      const shippingFeeVal = parseFloat(shipping || orderData.shipping || orderData.shippingFee || orderData.shippingCost || 0);
      let isOrderVal = 0, returnAmt = 0, defaultReturnSummary = '┘ä╪º ┘è┘ê╪¼╪» ┘à╪▒╪¬╪¼╪╣';

      if (rawReqType === 'partial_delivery' || rawReqType === 'partial' || rawReqType === '╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è') {
        isOrderVal = 1; returnAmt = shippingFeeVal; defaultReturnSummary = '╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è';
      } else if (rawReqType === 'return' || rawReqType === 'returned' || orderData.orderType === 'RETURN') {
        isOrderVal = 2; returnAmt = parseFloat(orderData.returnAmount || totalValue || 0); defaultReturnSummary = formattedSummary;
      } else if (rawReqType === 'exchange' || rawReqType === 'exchanged' || orderData.orderType === 'EXCHANGE') {
        isOrderVal = 1; returnAmt = 0; defaultReturnSummary = '╪╖┘ä╪¿ ╪º╪│╪¬╪¿╪»╪º┘ä';
      } else {
        isOrderVal = 0; returnAmt = parseFloat(orderData.returnAmount || shippingFeeVal || 0);
      }

      const finalReceiver = (customerName || `╪╣┘à┘è┘ä ╪╖┘ä╪¿ #${orderNumber}`).trim();
      let rawPhoneDigits = String(customerPhone || addressFields.parsedAddress?.phone || '').replace(/\D/g, '');
      let validPhone = rawPhoneDigits;
      if (validPhone.startsWith('20') && validPhone.length === 12) validPhone = validPhone.slice(2);
      if (validPhone.startsWith('1') && validPhone.length === 10) validPhone = '0' + validPhone;
      if (!validPhone || !validPhone.startsWith('01') || validPhone.length !== 11) {
        const errMsg = rawPhoneDigits.length > 0 ? `╪▒┘é┘à ┘ç╪º╪¬┘ü ╪º┘ä╪╣┘à┘è┘ä ╪║┘è╪▒ ╪╡╪¡┘è╪¡: ╪º┘ä╪▒┘é┘à ┘à┘â┘ê┘å ┘à┘å ${rawPhoneDigits.length} ╪ú╪▒┘é╪º┘à ╪¿╪»┘ä╪º┘ï ┘à┘å 11 ╪▒┘é┘à╪º┘ï` : '╪▒┘é┘à ┘ç╪º╪¬┘ü ╪º┘ä╪╣┘à┘è┘ä ╪║┘è╪▒ ╪╡╪¡┘è╪¡ ╪ú┘ê ┘à┘ü┘é┘ê╪»';
        throw new Error(errMsg);
      }
      if (!cleanGovernorate) throw new Error('╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐ ╪║┘è╪▒ ┘à╪¡╪»╪»╪⌐ ╪ú┘ê ╪║┘è╪▒ ┘à╪╖╪º╪¿┘é╪⌐ ┘ä┘é╪º╪ª┘à╪⌐ ╪º┘ä┘à╪¡╪º┘ü╪╕╪º╪¬ ╪º┘ä┘à╪╣╪¬┘à╪»╪⌐ ┘ü┘è ╪¬╪▒╪¿┘ê.');

      const finalAddress = (cleanAddress && cleanAddress.trim().length >= 3) ? cleanAddress.trim() : `${cleanArea || cleanGovernorate} - ${cleanGovernorate}`;
      const shipmentData = {
        authentication_key: apiKey, main_client_code: mainClientCode || 37321, remote_order_id: orderNumber || `Order ${orderNumber}`,
        remote_shipment_id: String(orderId || ''), receiver: finalReceiver, phone1: validPhone, phone2: secondPhone,
        api_followup_phone: senderNumber || validPhone, government: cleanGovernorate, area: cleanArea || cleanGovernorate || '╪º┘ä┘à╪▒┘â╪▓ ╪º┘ä╪▒╪ª┘è╪│┘è',
        address: finalAddress, notes: notes || `Order #${orderNumber}`, order_summary: formattedSummary,
        return_summary: orderData.returnSummary || defaultReturnSummary,
        amount_to_be_collected: (isOrderVal === 2 || (paymentMethod && paymentMethod.toUpperCase() === 'PAID')) ? 0 : parseFloat(totalValue || orderData.total || 0),
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

      return { success: true, shipmentId: shipment.code || shipment.bar_code, trackingNumber, labelUrl: null, status: 'created', estimatedDelivery: shipment.expected_branch || null, cost: null, data: shipment };
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
      } catch (e) { console.warn('ΓÜá∩╕Å [TURBO] Failed to fetch governments for update:', e.message); }

      let cleanGovernorate = formattedData.governorate || '';
      let matchedGovId = null;
      if (cleanGovernorate && governments.length > 0) {
        const cleanedLower = cleanGovernorate.toLowerCase().trim();
        let foundGov = governments.find(g => g.name.toLowerCase().trim() === cleanedLower)
          || [...governments].sort((a, b) => b.name.length - a.name.length).find(g => { const gn = g.name.toLowerCase().trim(); return cleanedLower.includes(gn) || gn.includes(cleanedLower); });
        if (foundGov) { cleanGovernorate = foundGov.name; matchedGovId = foundGov.id; }
      } else if (!cleanGovernorate && formattedData.city) {
        cleanGovernorate = findGovernmentByCity(formattedData.city, governments);
      }

      let cleanArea = cleanLocationName(formattedData.area || addressFields.area || addressFields.parsedAddress?.area || formattedData.city || addressFields.city || '');
      if (matchedGovId && cleanArea) {
        try {
          const areasResult = await this._client.get(`${this._client.baseUrl}/get-area/${matchedGovId}?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`);
          const aData = areasResult.data;
          let areas = [];
          if ((aData.success === true || aData.success === 1) && aData.feed) areas = Array.isArray(aData.feed) ? aData.feed : [];
          if (areas.length > 0) {
            const cl = cleanArea.toLowerCase();
            const ma = areas.find(a => a.name.toLowerCase() === cl) || areas.find(a => a.name.toLowerCase().includes(cl) || cl.includes(a.name.toLowerCase()));
            if (ma) cleanArea = ma.name;
          }
        } catch (e) { console.warn('ΓÜá∩╕Å [TURBO] Failed area matching:', e.message); }
      }

      const rawReqType = String(formattedData.requestType || formattedData.orderType || formattedData.type || '').trim().toLowerCase();
      const shippingFeeVal = parseFloat(formattedData.shipping || formattedData.shippingCost || formattedData.shippingFee || 0);
      const totalValue = parseFloat(formattedData.totalValue || formattedData.total || 0);
      const items = formattedData.items || formattedData.orderItems || [];
      const formattedSummary = Array.isArray(items) && items.length > 0
        ? items.map(item => `[${item.quantity || 1} ${item.productName || item.name || '┘à┘å╪¬╪¼'}]`).join(' - ')
        : (formattedData.notes || `╪╖┘ä╪¿ #${formattedData.orderNumber || shipmentId}`);

      let isOrderVal = 0, returnAmt = 0, defaultReturnSummary = '┘ä╪º ┘è┘ê╪¼╪» ┘à╪▒╪¬╪¼╪╣';
      if (rawReqType === 'partial_delivery' || rawReqType === 'partial' || rawReqType === '╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è') {
        isOrderVal = 1; returnAmt = shippingFeeVal; defaultReturnSummary = '╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è';
      } else if (rawReqType === 'return' || rawReqType === 'returned' || formattedData.orderType === 'RETURN') {
        isOrderVal = 2; returnAmt = parseFloat(formattedData.returnAmount || totalValue || 0); defaultReturnSummary = formattedSummary;
      } else if (rawReqType === 'exchange' || rawReqType === 'exchanged' || formattedData.orderType === 'EXCHANGE') {
        isOrderVal = 1; returnAmt = 0; defaultReturnSummary = '╪╖┘ä╪¿ ╪º╪│╪¬╪¿╪»╪º┘ä';
      } else {
        isOrderVal = 0; returnAmt = parseFloat(formattedData.returnAmount || shippingFeeVal || 0);
      }

      const methodStr = String(formattedData.paymentMethod || '').trim().toUpperCase();
      const isPrepaid = ['PAID', 'ONLINE', 'CARD', 'PAYMOB', 'FAWRY', 'CREDIT_CARD', 'VISA'].includes(methodStr);
      const codAmount = (isOrderVal === 2 || isPrepaid) ? 0 : totalValue;
      let rawPhoneDigits = String(formattedData.customerPhone || '').replace(/\D/g, '');
      let validPhone = rawPhoneDigits;
      if (validPhone.startsWith('20') && validPhone.length === 12) validPhone = validPhone.slice(2);
      if (validPhone.startsWith('1') && validPhone.length === 10) validPhone = '0' + validPhone;
      const finalReceiver = (formattedData.customerName || `╪╣┘à┘è┘ä ╪╖┘ä╪¿ #${formattedData.orderNumber || shipmentId}`).trim();

      const updateData = {
        authentication_key: apiKey, code: String(shipmentId), main_client_code: mainClientCode || 37321,
        remote_order_id: formattedData.orderNumber || `Order ${formattedData.orderNumber}`,
        remote_shipment_id: String(formattedData.orderId || ''), receiver: finalReceiver, phone1: validPhone,
        phone2: formattedData.alternativePhone || null, api_followup_phone: senderNumber || validPhone,
        government: cleanGovernorate, area: cleanArea, address: cleanAddress,
        notes: formattedData.notes || `Order #${formattedData.orderNumber}`,
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
          message: 'Turbo API ┘ä╪º ┘è╪»╪╣┘à ╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪┤╪¡┘å ┘à╪¿╪º╪┤╪▒╪⌐',
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
          message: 'Turbo API ┘ä╪º ┘è╪»╪╣┘à ╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪┤╪¡┘å ┘à╪¿╪º╪┤╪▒╪⌐',
          cost: null, estimatedDelivery: null, currency: 'EGP',
        };
      }
      handleError(error, 'Calculate Shipping Cost');
    }
  }
}

module.exports = ShipmentService;
