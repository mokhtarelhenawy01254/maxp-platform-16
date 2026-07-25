const axios = require('axios');
const { handleError, getTurboErrorMessage } = require('../../utils/turbo/errorHandler');
const { TURBO_STATUS_CODE_MAP } = require('../../utils/turbo/constants');

class TrackingService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  async trackShipment(trackingNumber) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const trackingNumberStr = String(trackingNumber || '');

      try {
        const searchResponse = await axios.post(`${this._client.baseUrl}/search-order`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, search_Key: trackingNumberStr }, { headers, timeout: this._client.timeout });
        const searchData = searchResponse.data;
        console.log(`🔍 [TURBO-TRACK] search-order for ${trackingNumberStr}: success=${searchData?.success}, hasData=${!!searchData?.data}`);
        if (searchData && (searchData.success === 1 || searchData.success === true) && searchData.data) {
          const shipment = Array.isArray(searchData.data) ? searchData.data[0] : searchData.data;
          if (shipment) return { success: true, data: { code: trackingNumberStr, status: shipment.status || shipment.status_text || 'created', status_code: shipment.status_code || null, internalStatus: shipment.status || shipment.status_text || 'created', raw: shipment } };
        }
        return { success: false, error: 'Shipment not found in Turbo' };
      } catch (searchErr) {
        console.warn(`⚠️ [TURBO-TRACK] search-order failed for ${trackingNumberStr}:`, searchErr.response?.status, searchErr.response?.data?.message || searchErr.message);
      }

      const today = new Date().toISOString().split('T')[0];
      const from90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      try {
        const statusResp = await axios.post(`${this._client.baseUrl}/get-status`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, from: from90, to: today }, { headers, timeout: this._client.timeout });
        const found = (statusResp.data?.data || []).find(s => String(s.code) === trackingNumberStr || String(s.bar_code) === trackingNumberStr || String(s.invoice_number) === trackingNumberStr);
        if (found) return { success: true, data: { code: found.code, status: found.status, status_code: found.status_code, internalStatus: found.status, raw: found } };
      } catch (statusErr) {
        console.warn(`⚠️ [TURBO-TRACK] get-status fallback failed for ${trackingNumberStr}:`, statusErr.response?.status, statusErr.response?.data?.message || statusErr.message);
      }

      return { success: false, error: 'Shipment not found in Turbo خلال آخر 90 يوم' };
    } catch (outerErr) {
      return { success: false, error: outerErr.message || 'Unknown error', trackingNumber: String(trackingNumber || ''), status: null, currentLocation: null, estimatedDelivery: null, history: [], data: null };
    }
  }

  async getShipmentStatus(shipmentId) {
    try {
      const headers = await this._client.getHeaders();
      const response = await axios.get(`${this._client.baseUrl}/shipments/${shipmentId}`, { headers, timeout: this._client.timeout });
      const shipment = response.data;
      return { success: true, shipmentId: shipment.id || shipment.shipment_id, status: shipment.status, trackingNumber: shipment.tracking_number, currentLocation: shipment.current_location || null, estimatedDelivery: shipment.estimated_delivery || null, deliveredAt: shipment.delivered_at || null, data: shipment };
    } catch (error) {
      handleError(error, 'Get Shipment Status');
    }
  }

  async fetchAllStatuses(fromDate, toDate) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();
      const today = new Date();
      const ninetyDaysAgo = new Date(today); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const from = fromDate || ninetyDaysAgo.toISOString().split('T')[0];
      const to = toDate || today.toISOString().split('T')[0];
      const response = await axios.post(`${this._client.baseUrl}/get-status`, { authentication_key: apiKey, main_client_code: mainClientCode || 37321, from, to }, { headers, timeout: this._client.timeout });
      const result = response.data;
      if (result.success === 0 || result.success === false) throw new Error(`Turbo API error: ${result.error_msg || result.message || 'Unknown error'}`);
      const shipments = result.data || [];

      return {
        success: true,
        shipments: shipments.map(s => {
          const rawStatus = (s.status || '').trim();
          const statusCodeStr = String(s.status_code || '');
          const mapped = TURBO_STATUS_CODE_MAP[statusCodeStr] || TURBO_STATUS_CODE_MAP[rawStatus] || TURBO_STATUS_CODE_MAP[rawStatus.toLowerCase()] || (rawStatus ? rawStatus.toLowerCase() : 'turbo_saved');
          return { code: s.code, barCode: s.bar_code, status: s.status, statusCode: s.status_code, internalStatus: mapped, returnReason: s.return_reason, delayReason: s.delay_reason, branch: s.branch, captain: s.captain, captainNumber1: s.captain_number1, captainNumber2: s.captain_number2, receivedAmount: s.received_amount, expectedBranch: s.expected_branch, invoiceNumber: s.invoice_number, returnedInventoryStatus: s.returned_inventory_status, raw: s };
        }),
        count: shipments.length,
        dateRange: { from, to }
      };
    } catch (error) {
      handleError(error, 'Fetch All Statuses');
    }
  }
}

module.exports = TrackingService;
