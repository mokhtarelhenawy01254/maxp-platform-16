/**
 * Turbo API Client
 * عميل HTTP لإدارة الاتصال بـ Turbo API
 */

const axios = require('axios');
const { getSharedPrismaClient, safeQuery } = require('../sharedDatabase');
const { isTurboConfigurationError } = require('../../utils/turbo/errorHandler');

class TurboApiClient {
  constructor(apiKey = null, companyId = null) {
    this.apiKey = apiKey;
    this.companyId = companyId;
    this.baseUrl = process.env.TURBO_API_URL || 'https://backoffice.turbo-eg.com/external-api';
    this.timeout = 30000;
  }

  async getApiKey() {
    if (this.apiKey) {
      return this.apiKey;
    }

    if (!this.companyId) {
      throw new Error('Company ID is required to fetch API key');
    }

    try {
      const prisma = getSharedPrismaClient();
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboApiKey: true, turboEnabled: true }
        });
      }, 2);

      if (!company || !company.turboEnabled) {
        throw new Error('Turbo is not enabled for this company');
      }

      if (!company.turboApiKey) {
        throw new Error('Turbo API key is not configured for this company');
      }

      this.apiKey = company.turboApiKey;
      return this.apiKey;
    } catch (error) {
      if (isTurboConfigurationError(error)) {
        console.warn('⚠️ [TURBO] API key unavailable:', {
          companyId: this.companyId,
          reason: error.message,
        });
      } else {
        console.error('❌ [TURBO] Error fetching API key:', error);
      }
      throw error;
    }
  }

  async getHeaders(apiKey = null, isFormData = false) {
    const headers = {
      'Accept': 'application/json'
    };

    if (apiKey) {
      headers['authentication_key'] = apiKey;
    }

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  async getMainClientCode() {
    if (!this.companyId) {
      throw new Error('Company ID is required to fetch main_client_code');
    }

    try {
      const prisma = getSharedPrismaClient();
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboMainClientCode: true }
        });
      }, 2);

      return company?.turboMainClientCode || null;
    } catch (error) {
      console.error('❌ [TURBO] Error fetching main_client_code:', error);
      return null;
    }
  }

  async getSenderNumber() {
    if (!this.companyId) {
      throw new Error('Company ID is required to fetch sender_number');
    }

    try {
      const prisma = getSharedPrismaClient();
      const company = await safeQuery(async () => {
        return await prisma.company.findUnique({
          where: { id: this.companyId },
          select: { turboSenderNumber: true }
        });
      }, 2);

      return company?.turboSenderNumber || null;
    } catch (error) {
      console.error('❌ [TURBO] Error fetching sender_number:', error);
      return null;
    }
  }

  async post(endpoint, data, extraOptions = {}) {
    const headers = await this.getHeaders();
    return axios.post(`${this.baseUrl}${endpoint}`, data, {
      headers,
      timeout: this.timeout,
      ...extraOptions
    });
  }

  async get(endpoint, params = {}, extraOptions = {}) {
    const headers = await this.getHeaders();
    return axios.get(`${this.baseUrl}${endpoint}`, {
      headers,
      params,
      timeout: this.timeout,
      ...extraOptions
    });
  }
}

module.exports = TurboApiClient;
