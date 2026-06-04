/**
 * TikTok Events API Service
 *
 * This service sends server-side conversion events to TikTok Events API.
 * NOTE: The endpoint must be provided via TIKTOK_EVENTS_API_ENDPOINT.
 */

const crypto = require('crypto');
const axios = require('axios');

class TikTokEventsService {
  constructor(pixelId, accessToken, testEventCode = null, endpoint = null) {
    this.pixelId = pixelId;
    this.accessToken = accessToken;
    this.testEventCode = testEventCode;
    this.endpoint = endpoint || process.env.TIKTOK_EVENTS_API_ENDPOINT || null;
  }

  hashData(data) {
    if (!data) return null;
    try {
      const cleanData = data.toString().toLowerCase().trim();
      return crypto.createHash('sha256').update(cleanData).digest('hex');
    } catch (error) {
      console.error('❌ [TikTok Events API] Error hashing data:', error);
      return null;
    }
  }

  cleanPhone(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  }

  buildUserContext(userData) {
    const user = {};

    if (userData.email) {
      user.email = this.hashData(userData.email);
    }
    if (userData.phone) {
      user.phone_number = this.hashData(this.cleanPhone(userData.phone));
    }
    if (userData.ip) {
      user.ip = userData.ip;
    }
    if (userData.userAgent) {
      user.user_agent = userData.userAgent;
    }
    if (userData.ttp) {
      user.ttp = userData.ttp;
    }
    if (userData.ttclid) {
      user.ttclid = userData.ttclid;
    }

    return user;
  }

  buildPayload(eventName, userData, properties, eventId) {
    const payload = {
      pixel_code: this.pixelId,
      event: eventName,
      event_id: eventId,
      timestamp: Math.floor(Date.now() / 1000),
      context: {
        user: this.buildUserContext(userData),
        page: {
          url: userData.pageUrl || null,
          referrer: userData.referrer || null,
        },
      },
      properties: {
        ...properties,
      },
    };

    if (this.testEventCode) {
      payload.test_event_code = this.testEventCode;
    }

    return payload;
  }

  async trackPurchase(userData, order, eventId) {
    const contentIds = order.items.map((item) => item.productId);
    const contents = order.items.map((item) => ({
      content_id: item.productId,
      quantity: item.quantity,
      price: parseFloat(item.price),
    }));

    const properties = {
      content_ids: contentIds,
      content_type: 'product',
      currency: 'EGP',
      value: parseFloat(order.total),
      quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      contents,
      order_id: order.orderNumber,
    };

    const payload = this.buildPayload(
      'CompletePayment',
      userData,
      properties,
      eventId,
    );

    return this.sendEvent(payload);
  }

  async sendEvent(payload) {
    if (!this.endpoint) {
      console.warn('⚠️ [TikTok Events API] Endpoint not configured. Skipping.');
      return { success: false, skipped: true, reason: 'missing_endpoint' };
    }

    if (!this.accessToken) {
      console.warn('⚠️ [TikTok Events API] Access token missing. Skipping.');
      return { success: false, skipped: true, reason: 'missing_token' };
    }

    try {
      const response = await axios.post(this.endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': this.accessToken,
        },
        timeout: 10000,
      });

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ [TikTok Events API] Request failed:', {
        message: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }
}

module.exports = TikTokEventsService;
