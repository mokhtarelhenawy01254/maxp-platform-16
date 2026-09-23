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
    // 2026 hardening: fail fast in 5s instead of hanging client requests for 30s
    this.timeout = 5000;
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

      if (!company?.turboApiKey) {
        const carrier = await safeQuery(async () => {
          return await prisma.shippingCompany.findFirst({
            where: {
              companyId: this.companyId,
              providerKey: 'TURBO',
              isActive: true,
            },
          });
        }, 2);

        if (carrier) {
          let s = {};
          try {
            s = carrier.settings ? (typeof carrier.settings === 'string' ? JSON.parse(carrier.settings) : carrier.settings) : {};
          } catch {}
          if (carrier.apiKey || s.apiKey) {
            this.apiKey = carrier.apiKey || s.apiKey;
            return this.apiKey;
          }
        }
      }

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
      'Accept': 'application/json',
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

      if (company?.turboMainClientCode) {
        return company.turboMainClientCode;
      }

      const carrier = await safeQuery(async () => {
        return await prisma.shippingCompany.findFirst({
          where: {
            companyId: this.companyId,
            providerKey: 'TURBO',
            isActive: true,
          },
        });
      }, 2);

      if (carrier?.settings) {
        let s = {};
        try {
          s = typeof carrier.settings === 'string' ? JSON.parse(carrier.settings) : carrier.settings;
        } catch {}
        if (s.mainClientCode || s.clientCode || s.customerId) {
          return s.mainClientCode || s.clientCode || s.customerId;
        }
      }

      return null;
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

      if (company?.turboSenderNumber) {
        return company.turboSenderNumber;
      }

      const carrier = await safeQuery(async () => {
        return await prisma.shippingCompany.findFirst({
          where: {
            companyId: this.companyId,
            providerKey: 'TURBO',
            isActive: true,
          },
        });
      }, 2);

      if (carrier?.settings) {
        let s = {};
        try {
          s = typeof carrier.settings === 'string' ? JSON.parse(carrier.settings) : carrier.settings;
        } catch {}
        if (s.senderNumber || s.phone || s.senderPhone) {
          return s.senderNumber || s.phone || s.senderPhone;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [TURBO] Error fetching sender_number:', error);
      return null;
    }
  }

  async post(endpoint, data, extraOptions = {}) {
    const headers = await this.getHeaders();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return axios.post(url, data, {
      headers,
      timeout: this.timeout,
      ...extraOptions
    });
  }

  async get(endpoint, params = {}, extraOptions = {}) {
    const headers = await this.getHeaders();
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    return axios.get(url, {
      headers,
      params,
      timeout: this.timeout,
      ...extraOptions
    });
  }
}

module.exports = TurboApiClient;
