const axios = require('axios');
const { handleError } = require('../../utils/turbo/errorHandler');
const { getBestShippingAddressFields } = require('../../utils/turbo/addressParser');
const { cleanLocationName } = require('../../utils/turbo/addressParser');

class LabelService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  async printLabel(shipmentId) {
    try {
      const headers = await this._client.getHeaders();
      const apiKey = await this._client.getApiKey();
      const shipmentIdStr = String(shipmentId);
      const possibleEndpoints = ['/print-label', '/get-label', '/label', '/print-order'];
      let response, lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          response = await axios.post(`${this._client.baseUrl}${endpoint}`, { authentication_key: apiKey, search_Key: shipmentIdStr }, { headers, timeout: this._client.timeout, responseType: 'arraybuffer' });
          break;
        } catch (postError) {
          lastError = postError;
          if (postError.response?.status === 405 || postError.response?.status === 404) {
            try {
              response = await axios.get(`${this._client.baseUrl}${endpoint}?authentication_key=${apiKey}&search_Key=${shipmentIdStr}`, { headers, timeout: this._client.timeout, responseType: 'arraybuffer' });
              break;
            } catch (getError) { continue; }
          } else if (postError.response?.data && Buffer.isBuffer(postError.response.data)) {
            response = postError.response; break;
          } else throw postError;
        }
      }

      if (!response) throw lastError || new Error('All endpoints failed for print label');
      const pdfBuffer = Buffer.from(response.data);
      return { success: true, shipmentId: shipmentIdStr, labelUrl: response.headers['x-label-url'] || response.headers['label-url'] || null, labelPdf: pdfBuffer.toString('base64'), contentType: 'application/pdf' };
    } catch (error) {
      handleError(error, 'Print Label');
    }
  }

  async printWaybill(shipmentId, orderData = null) {
    try {
      const headers = await this._client.getHeaders();
      const apiKey = await this._client.getApiKey();
      const shipmentIdStr = String(shipmentId);
      const possibleEndpoints = ['/get-waybill', '/waybill', '/print-waybill'];
      let apiWaybill = null, lastError = null;

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.post(`${this._client.baseUrl}${endpoint}`, { authentication_key: apiKey, search_Key: shipmentIdStr }, { headers, timeout: this._client.timeout, responseType: 'arraybuffer' });
          apiWaybill = { success: true, waybillPdf: Buffer.from(response.data).toString('base64'), contentType: 'application/pdf', fromApi: true };
          break;
        } catch (postError) {
          lastError = postError;
          if (postError.response?.status === 405 || postError.response?.status === 404) {
            try {
              const response = await axios.get(`${this._client.baseUrl}${endpoint}?authentication_key=${apiKey}&search_Key=${shipmentIdStr}`, { headers, timeout: this._client.timeout, responseType: 'arraybuffer' });
              apiWaybill = { success: true, waybillPdf: Buffer.from(response.data).toString('base64'), contentType: 'application/pdf', fromApi: true };
              break;
            } catch (getError) { continue; }
          } else throw postError;
        }
      }

      if (apiWaybill) return apiWaybill;
      if (orderData) return { success: true, waybillData: this.generateLocalWaybill(orderData, shipmentIdStr), fromApi: false };
      throw lastError || new Error('Failed to get waybill from API and no order data provided');
    } catch (error) {
      handleError(error, 'Print Waybill');
    }
  }

  generateLocalWaybill(orderData, shipmentId) {
    const { orderId, orderNumber, customerName, customerPhone, customerEmail,
      shippingAddress, customerAddress, city, governorate, items = [],
      totalWeight = 0, totalValue = 0, shipping = 0, notes = '', createdAt } = orderData;

    const addressFields = getBestShippingAddressFields(shippingAddress, customerAddress);
    const address = addressFields.formattedAddress || addressFields.primaryAddress || '';
    let cityName = city || addressFields.city || '';
    if (cityName.includes(':')) { const parts = cityName.split(':'); cityName = parts[1] || parts[0]; }

    return {
      turboOrderCode: shipmentId, orderId, orderNumber, orderDate: createdAt || new Date().toISOString(),
      status: orderData.turboShipmentStatus || 'غير محدد', senderName: 'غير محدد', senderAddress: '', senderCity: '', senderPhone: '',
      receiverName: customerName || '', receiverPhone: customerPhone || '', receiverPhone2: orderData.alternativePhone || '',
      receiverEmail: customerEmail || '', receiverAddress: address, receiverAddress2: addressFields.secondaryAddress || '',
      receiverCity: cityName, receiverState: governorate || '', receiverCountry: 'Egypt',
      items: items.map(item => ({ name: item.productName || item.name || '', quantity: item.quantity || 0, weight: item.weight || 0, price: item.price || 0, total: (item.price || 0) * (item.quantity || 0) })),
      itemsCount: items.length, totalWeight: totalWeight || 0, subtotal: orderData.subtotal || totalValue || 0,
      totalValue: (orderData.total || (totalValue || 0) + (shipping || 0)), shippingCost: shipping || 0,
      actualShippingCost: orderData.actualShippingCost || 0, amountToCollect: orderData.total || (totalValue || 0) + (shipping || 0),
      returnAmount: 0, notes, canOpen: 1
    };
  }
}

module.exports = LabelService;
