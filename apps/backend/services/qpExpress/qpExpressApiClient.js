/**
 * QP Express API Client
 * عميل HTTP لإدارة الاتصال والمصادقة التلقائية بـ QP Express API
 */

const axios = require('axios');
const https = require('https');

class QpExpressApiClient {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || process.env.QP_EXPRESS_API_URL || 'https://qpxpress.com:8001').replace(/\/+$/, '');
    this.username = options.username || process.env.QP_EXPRESS_USERNAME || 'ArJk@Qpx';
    this.password = options.password || process.env.QP_EXPRESS_PASSWORD || '192521995';
    this.customerId = options.customerId || process.env.QP_EXPRESS_CUSTOMER_ID || 8002;
    this.timeout = options.timeout || 25000;
    this.httpsAgent = new https.Agent({ rejectUnauthorized: false });

    this._token = null;
    this._tokenExpiresAt = 0;
  }

  /**
   * جلب التوكن من السيرفر أو من الكاش في حال لا يزال صالحاً
   */
  async getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (this._token && this._tokenExpiresAt > (now + 60)) {
      return this._token;
    }

    if (!this.username || !this.password) {
      throw new Error('QP Express credentials (username and password) are missing.');
    }

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/api/token/`,
        data: {
          username: this.username,
          password: this.password,
        },
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: this.timeout,
        httpsAgent: this.httpsAgent,
      });

      if (response.data && response.data.access) {
        this._token = response.data.access;
        // SimpleJWT token expiration or default 1 hour
        try {
          const payload = JSON.parse(Buffer.from(this._token.split('.')[1], 'base64').toString('utf8'));
          this._tokenExpiresAt = payload.exp || (now + 3600);
        } catch {
          this._tokenExpiresAt = now + 3600;
        }
        return this._token;
      }

      throw new Error('Invalid response from QP Express token endpoint.');
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      const detail = data?.detail || error.message;
      console.error('❌ [QP_EXPRESS] Auth Error:', { status, detail });
      throw new Error(`QP Express authentication failed: ${detail}`);
    }
  }

  /**
   * إرسال طلب محمي لـ QP Express API
   */
  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    try {
      const response = await axios({
        url,
        method: options.method || 'GET',
        headers,
        data: options.data,
        params: options.params,
        timeout: options.timeout || this.timeout,
        httpsAgent: this.httpsAgent,
      });

      return response.data;
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      // If token expired or invalidated, clear cache and retry once
      if (status === 401 && !options._isRetry) {
        console.warn('⚠️ [QP_EXPRESS] 401 Unauthorized encountered. Refreshing token and retrying...');
        this._token = null;
        this._tokenExpiresAt = 0;
        return this.request(endpoint, { ...options, _isRetry: true });
      }

      const msg = data?.detail || data?.message || error.message;
      console.error(`❌ [QP_EXPRESS] API Error [${status}] ${url}:`, data || msg);
      throw new Error(`QP Express API error [${status}]: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
    }
  }

  async get(endpoint, params = {}, options = {}) {
    return this.request(endpoint, { method: 'GET', params, ...options });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { method: 'POST', data, ...options });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, { method: 'PUT', data, ...options });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { method: 'DELETE', ...options });
  }
}

module.exports = QpExpressApiClient;
