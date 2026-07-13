const axios = require("axios");
const { getMetaGraphApiBaseUrl, getMetaGraphApiVersion } = require("../config/metaApi");

const DEFAULT_AD_LIBRARY_FIELDS = [
  "id",
  "ad_creation_time",
  "ad_creative_bodies",
  "ad_creative_link_captions",
  "ad_creative_link_descriptions",
  "ad_creative_link_titles",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "ad_snapshot_url",
  "bylines",
  "currency",
  "demographic_distribution",
  "impressions",
  "page_id",
  "page_name",
  "publisher_platforms",
  "region_distribution",
  "spend",
];

const ALLOWED_AD_LIBRARY_FIELDS = new Set([
  ...DEFAULT_AD_LIBRARY_FIELDS,
  "beneficiary_payers",
  "delivery_by_region",
  "estimated_audience_size",
  "languages",
  "target_ages",
  "target_gender",
  "target_locations",
]);

const AD_ACTIVE_STATUSES = new Set(["ACTIVE", "INACTIVE", "ALL"]);
const AD_TYPES = new Set(["ALL", "POLITICAL_AND_ISSUE_ADS"]);
const MEDIA_TYPES = new Set(["ALL", "IMAGE", "MEME", "VIDEO", "NONE"]);
const PUBLISHER_PLATFORMS = new Set([
  "FACEBOOK",
  "INSTAGRAM",
  "AUDIENCE_NETWORK",
  "MESSENGER",
  "WHATSAPP",
  "THREADS",
]);

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value || fallback).trim().toUpperCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeFields(fields) {
  const requestedFields = normalizeStringList(fields);
  const safeFields = requestedFields.filter((field) =>
    ALLOWED_AD_LIBRARY_FIELDS.has(field),
  );

  return safeFields.length > 0 ? safeFields : DEFAULT_AD_LIBRARY_FIELDS;
}

function normalizeLimit(value) {
  const limit = Number(value);
  if (!Number.isFinite(limit)) {
    return 25;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

class FacebookAdLibraryService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.apiVersion = getMetaGraphApiVersion();
    this.baseUrl = getMetaGraphApiBaseUrl();
  }

  buildSearchParams(query = {}) {
    const searchTerms = String(query.searchTerms || query.search_terms || "").trim();
    const pageIds = normalizeStringList(query.pageIds || query.search_page_ids)
      .slice(0, 10);

    if (!searchTerms && pageIds.length === 0) {
      throw new Error("searchTerms or up to 10 pageIds are required");
    }

    const countries = normalizeStringList(
      query.countries || query.ad_reached_countries || "EG",
    ).map((country) => country.toUpperCase());
    const publisherPlatforms = normalizeStringList(
      query.publisherPlatforms || query.publisher_platforms,
    )
      .map((platform) => platform.toUpperCase())
      .filter((platform) => PUBLISHER_PLATFORMS.has(platform));
    const fields = normalizeFields(query.fields);
    const params = {
      access_token: this.accessToken,
      ad_active_status: normalizeEnum(
        query.adActiveStatus || query.ad_active_status,
        AD_ACTIVE_STATUSES,
        "ACTIVE",
      ),
      ad_type: normalizeEnum(query.adType || query.ad_type, AD_TYPES, "ALL"),
      fields: fields.join(","),
      limit: normalizeLimit(query.limit),
    };

    if (searchTerms) {
      params.search_terms = searchTerms;
    }

    if (pageIds.length > 0) {
      params.search_page_ids = JSON.stringify(pageIds);
    }

    if (countries.length > 0) {
      params.ad_reached_countries = JSON.stringify(countries);
    }

    if (query.mediaType || query.media_type) {
      params.media_type = normalizeEnum(
        query.mediaType || query.media_type,
        MEDIA_TYPES,
        "ALL",
      );
    }

    if (publisherPlatforms.length > 0) {
      params.publisher_platforms = JSON.stringify(publisherPlatforms);
    }

    if (query.deliveryDateMin || query.ad_delivery_date_min) {
      params.ad_delivery_date_min =
        query.deliveryDateMin || query.ad_delivery_date_min;
    }

    if (query.deliveryDateMax || query.ad_delivery_date_max) {
      params.ad_delivery_date_max =
        query.deliveryDateMax || query.ad_delivery_date_max;
    }

    return params;
  }

  async search(query = {}) {
    try {
      const params = this.buildSearchParams(query);
      const response = await axios.get(`${this.baseUrl}/ads_archive`, {
        params,
      });

      return {
        success: true,
        apiVersion: this.apiVersion,
        data: response.data.data || [],
        paging: response.data.paging || null,
        request: {
          adActiveStatus: params.ad_active_status,
          adType: params.ad_type,
          countries: params.ad_reached_countries
            ? JSON.parse(params.ad_reached_countries)
            : [],
          fields: params.fields.split(","),
          limit: params.limit,
          mediaType: params.media_type || null,
          publisherPlatforms: params.publisher_platforms
            ? JSON.parse(params.publisher_platforms)
            : [],
          searchTerms: params.search_terms || null,
          pageIds: params.search_page_ids ? JSON.parse(params.search_page_ids) : [],
        },
      };
    } catch (error) {
      const metaError = error.response?.data?.error;
      return {
        success: false,
        error: metaError?.message || error.message,
        errorCode: metaError?.code || null,
        errorSubcode: metaError?.error_subcode || null,
        data: [],
      };
    }
  }
}

module.exports = {
  DEFAULT_AD_LIBRARY_FIELDS,
  FacebookAdLibraryService,
};
