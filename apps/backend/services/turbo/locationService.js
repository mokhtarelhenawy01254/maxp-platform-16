const axios = require('axios');
const { FALLBACK_GOVERNMENTS, CACHE_TTL } = require('../../utils/turbo/constants');
const { findGovernmentByCity } = require('../../utils/turbo/governorateMapper');

const cache = { governments: { data: null, timestamp: 0 }, areas: {} };

class LocationService {
  constructor(apiClient) {
    this._client = apiClient;
  }

  async getGovernments() {
    try {
      const now = Date.now();
      if (cache.governments.data && (now - cache.governments.timestamp < CACHE_TTL)) {
        return { success: true, governments: cache.governments.data, count: cache.governments.data.length, fromCache: true };
      }

      let apiKey = null;
      try { apiKey = await this._client.getApiKey(); } catch (error) {
        return { success: true, governments: FALLBACK_GOVERNMENTS, count: FALLBACK_GOVERNMENTS.length, isFallback: true, reason: 'No API key configured' };
      }

      const headers = await this._client.getHeaders();
      const mainClientCode = await this._client.getMainClientCode();

      const response = await axios.get(`${this._client.baseUrl}/get-government?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`, { headers, timeout: this._client.timeout });
      const responseData = response.data;

      let governments = [];
      if ((responseData.success === true || responseData.success === 1) && responseData.feed) governments = Array.isArray(responseData.feed) ? responseData.feed : [];
      else if (Array.isArray(responseData)) governments = responseData;
      else if (responseData.governments) governments = responseData.governments;
      else if (responseData.governorates) governments = responseData.governorates;
      else if (responseData.data) governments = Array.isArray(responseData.data) ? responseData.data : [];
      else if (responseData.result) governments = Array.isArray(responseData.result) ? responseData.result : [];

      const cleanedGovernments = governments.map(gov => {
        if (typeof gov === 'string') return { name: gov, id: gov };
        if (gov.name) return { name: gov.name, id: gov.id || gov.name };
        if (gov.government) return { name: gov.government, id: gov.id || gov.government };
        if (gov.governorate) return { name: gov.governorate, id: gov.id || gov.governorate };
        return { name: String(gov), id: String(gov) };
      });

      if (cleanedGovernments.length > 0) cache.governments = { data: cleanedGovernments, timestamp: now };
      return { success: true, governments: cleanedGovernments, count: cleanedGovernments.length };
    } catch (error) {
      return { success: true, governments: FALLBACK_GOVERNMENTS, count: FALLBACK_GOVERNMENTS.length, isFallback: true, error: error.message };
    }
  }

  async getAreas(governmentId) {
    try {
      if (!governmentId) throw new Error('Government ID is required');
      const govId = String(governmentId);
      const now = Date.now();

      if (cache.areas[govId]?.data && (now - cache.areas[govId].timestamp < CACHE_TTL)) {
        return { success: true, areas: cache.areas[govId].data, count: cache.areas[govId].data.length, fromCache: true };
      }

      const headers = await this._client.getHeaders();
      const apiKey = await this._client.getApiKey();
      const mainClientCode = await this._client.getMainClientCode();

      const response = await axios.get(`${this._client.baseUrl}/get-area/${governmentId}?main_client_code=${mainClientCode || 37321}&authentication_key=${encodeURIComponent(apiKey)}`, { headers, timeout: this._client.timeout });
      const responseData = response.data;

      let areas = [];
      if ((responseData.success === true || responseData.success === 1) && responseData.feed) areas = Array.isArray(responseData.feed) ? responseData.feed : [];
      else if (Array.isArray(responseData)) areas = responseData;
      else if (responseData.areas) areas = responseData.areas;
      else if (responseData.data) areas = Array.isArray(responseData.data) ? responseData.data : [];

      const cleanedAreas = areas.map(area => {
        if (typeof area === 'string') return { name: area, id: area };
        if (area.name) return { name: area.name, id: area.id || area.name };
        return { name: String(area), id: String(area) };
      });

      cache.areas[govId] = { data: cleanedAreas, timestamp: now };
      return { success: true, areas: cleanedAreas, count: cleanedAreas.length };
    } catch (error) {
      return { success: true, areas: [], count: 0, error: error.message };
    }
  }

  async getBranches(city = null, governorate = null) {
    try {
      const headers = await this._client.getHeaders();
      const apiKey = await this._client.getApiKey();
      const params = {};
      if (city) params.city = city;
      if (governorate) params.governorate = governorate;
      const response = await axios.get(`${this._client.baseUrl}/branches`, { headers, params, timeout: this._client.timeout });
      const branches = response.data.branches || response.data || [];
      return { success: true, branches: branches.map(b => ({ id: b.id || b.branch_id, name: b.name, address: b.address, city: b.city, governorate: b.governorate, phone: b.phone, workingHours: b.working_hours || b.workingHours, isActive: b.is_active !== false })), count: branches.length };
    } catch (error) {
      require('../../utils/turbo/errorHandler').handleError(error, 'Get Branches');
    }
  }

  async searchAreaByText(text, options = {}) {
    const limit = Number(options.limit) || 10;
    const query = String(text || '').trim();
    if (!query) {
      return { success: true, query: text, matches: [], count: 0 };
    }

    const govs = (await this.getGovernments()).governments || [];
    if (!govs.length) {
      return { success: true, query: text, matches: [], count: 0 };
    }

    const normalize = (s) => String(s || '').toLowerCase().trim()
      .replace(/[╪ú╪Ñ╪ó]/g, '╪º')
      .replace(/╪⌐/g, '┘ç')
      .replace(/┘ë/g, '┘è')
      .replace(/╪ñ/g, '┘ê')
      .replace(/╪ª/g, '┘è')
      .replace(/\s+/g, ' ');

    const nQuery = normalize(query);
    const queryWords = nQuery.split(' ').filter((w) => w.length > 2);
    const matches = [];
    const pushMatch = (g, a, score) => {
      matches.push({
        governorateId: String(g.id || ''),
        governorate: g.name || '',
        areaId: a ? String(a.id || '') : '',
        area: a ? a.name || '' : '',
        confidence: Number(score.toFixed(2)),
      });
    };

    // 1) Governorate appears in the text ΓåÆ restrict search to those govs only.
    const matchedGovs = govs.filter((g) => {
      const gn = normalize(g.name);
      return nQuery.includes(gn) || gn.includes(nQuery)
        || queryWords.some((w) => w.length > 3 && (gn.includes(w) || w.includes(gn)));
    });

    const candidates = matchedGovs.length ? matchedGovs.slice(0, 3) : govs;

    // 2) Load areas for candidate governorates (cached), then match area names.
    for (const g of candidates) {
      let areas = [];
      try {
        const areasRes = await this.getAreas(g.id);
        areas = Array.isArray(areasRes.areas) ? areasRes.areas : [];
      } catch (e) {
        continue;
      }
      for (const a of areas) {
        const an = normalize(a.name);
        let score = 0;
        if (an === nQuery) score = 1;
        else if (nQuery.includes(an) && an.length > 2) score = 0.85;
        else if (an.includes(nQuery) && nQuery.length > 2) score = 0.75;
        else {
          const hit = queryWords.filter((w) => w.length > 2 && (an.includes(w) || w.includes(an)));
          if (hit.length) score = 0.45 + 0.15 * Math.min(hit.length, 2);
        }
        if (score > 0) pushMatch(g, a, score);
      }
    }

    // Governorate-only match (no area name found) ΓåÆ include governorate as a fallback row.
    if (!matches.length && matchedGovs.length) {
      for (const g of matchedGovs.slice(0, 3)) {
        pushMatch(g, null, 0.6);
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence || a.area.length - b.area.length);
    const top = matches.slice(0, limit);
    return { success: true, query: text, matches: top, count: top.length };
  }
}

module.exports = LocationService;
