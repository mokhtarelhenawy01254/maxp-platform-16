/**
 * Turbo Shipment Messages & Action Requests Service
 * إدارة محادثات الشحنات وطلبات إعادة الإرسال والإلغاء عبر Turbo External API
 */

const axios = require('axios');
const { handleError } = require('../../utils/turbo/errorHandler');

class TurboMessageService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  /**
   * Resend Request for an order in Turbo
   * طلب إعادة إرسال الشحنة
   */
  async resendRequest(shipmentCodeOrId) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const response = await axios.post(
        `${this._client.baseUrl}/resend-request`,
        {
          authentication_key: apiKey,
          id: String(shipmentCodeOrId),
        },
        { headers, timeout: this._client.timeout }
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Turbo Resend Request');
    }
  }

  /**
   * Cancel Request for an order in Turbo
   * طلب إلغاء الشحنة
   */
  async cancelRequest(shipmentCodeOrId) {
    try {
      const apiKey = await this._client.getApiKey();
      const headers = await this._client.getHeaders();
      const response = await axios.post(
        `${this._client.baseUrl}/canceled`,
        {
          authentication_key: apiKey,
          id: String(shipmentCodeOrId),
        },
        { headers, timeout: this._client.timeout }
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Turbo Cancel Request');
    }
  }

  /**
   * Fetch shipment conversations
   * جلب قائمة محادثات الشحنات
   */
  async getConversations(options = {}) {
    try {
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const headers = await this._client.getHeaders();

      const payload = {
        authentication_key: apiKey,
        main_client_code: String(mainClientCode || ''),
        page: options.page || 1,
      };

      if (options.code) payload.code = String(options.code);
      if (options.isRead !== undefined) payload.is_read = options.isRead ? 1 : 0;

      const response = await axios.post(
        `${this._client.baseUrl}/shipment-messages/conversations`,
        payload,
        { headers, timeout: this._client.timeout }
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Turbo Get Conversations');
    }
  }

  /**
   * Get messages for a specific shipment
   * جلب رسائل شحنة محددة
   */
  async getShipmentMessages(shipmentCode) {
    try {
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const headers = await this._client.getHeaders();

      const payload = {
        authentication_key: apiKey,
        main_client_code: String(mainClientCode || ''),
        code: String(shipmentCode),
      };

      const response = await axios.post(
        `${this._client.baseUrl}/shipment-messages/messages`,
        payload,
        { headers, timeout: this._client.timeout }
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Turbo Get Shipment Messages');
    }
  }

  /**
   * Send a message on a specific shipment
   * إرسال رسالة بخصوص شحنة لمندوب أو إدارة تربو
   */
  async sendShipmentMessage(shipmentCode, messageText) {
    try {
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();
      const headers = await this._client.getHeaders();

      const payload = {
        authentication_key: apiKey,
        main_client_code: String(mainClientCode || ''),
        code: String(shipmentCode),
        message: String(messageText || ''),
      };

      const response = await axios.post(
        `${this._client.baseUrl}/shipment-messages/send`,
        payload,
        { headers, timeout: this._client.timeout }
      );
      return response.data;
    } catch (error) {
      handleError(error, 'Turbo Send Shipment Message');
    }
  }
}

module.exports = TurboMessageService;
