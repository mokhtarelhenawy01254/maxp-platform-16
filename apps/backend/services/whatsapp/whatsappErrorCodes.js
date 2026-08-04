const WHATSAPP_ERROR_CODES = {
  1: {
    reason: 'api_unknown',
    retryable: true,
  },
  2: {
    reason: 'api_service_unavailable',
    retryable: true,
  },
  4: {
    reason: 'rate_limit_app',
    retryable: true,
  },
  33: {
    reason: 'phone_deleted',
    retryable: false,
  },
  100: {
    reason: 'invalid_parameter',
    retryable: false,
  },
  190: {
    reason: 'token_expired',
    retryable: false,
  },
  368: {
    reason: 'account_blocked_policy',
    retryable: false,
  },
  130429: {
    reason: 'rate_limit_throughput',
    retryable: true,
  },
  130472: {
    reason: 'user_in_experiment',
    retryable: false,
  },
  130497: {
    reason: 'country_restricted',
    retryable: false,
  },
  131000: {
    reason: 'unknown_error',
    retryable: true,
  },
  131005: {
    reason: 'access_denied',
    retryable: false,
  },
  131008: {
    reason: 'missing_parameter',
    retryable: false,
  },
  131009: {
    reason: 'invalid_parameter_value',
    retryable: false,
  },
  131016: {
    reason: 'service_unavailable',
    retryable: true,
  },
  131021: {
    reason: 'recipient_is_sender',
    retryable: false,
  },
  131026: {
    reason: 'message_undeliverable',
    retryable: false,
  },
  131031: {
    reason: 'account_locked',
    retryable: false,
  },
  131037: {
    reason: 'display_name_not_approved',
    retryable: false,
  },
  131042: {
    reason: 'billing_error',
    retryable: false,
  },
  131045: {
    reason: 'certificate_error',
    retryable: false,
  },
  131047: {
    reason: 're_engagement_needed',
    retryable: false,
  },
  131048: {
    reason: 'spam_rate_limit',
    retryable: true,
  },
  131049: {
    reason: 'meta_did_not_deliver',
    retryable: true,
  },
  131050: {
    reason: 'user_stopped_marketing',
    retryable: false,
  },
  131051: {
    reason: 'unsupported_message_type',
    retryable: false,
  },
  131052: {
    reason: 'media_download_error',
    retryable: true,
  },
  131053: {
    reason: 'media_upload_error',
    retryable: true,
  },
  131056: {
    reason: 'pair_rate_limit',
    retryable: true,
  },
  131057: {
    reason: 'account_maintenance',
    retryable: true,
  },
  131063: {
    reason: 'marketing_templates_disabled',
    retryable: false,
  },
  132000: {
    reason: 'template_param_count_mismatch',
    retryable: false,
  },
  132001: {
    reason: 'template_not_found',
    retryable: false,
  },
  132005: {
    reason: 'template_text_too_long',
    retryable: false,
  },
  132007: {
    reason: 'template_policy_violation',
    retryable: false,
  },
  132012: {
    reason: 'template_param_format_mismatch',
    retryable: false,
  },
  132015: {
    reason: 'template_paused',
    retryable: true,
  },
  132016: {
    reason: 'template_disabled',
    retryable: false,
  },
  132018: {
    reason: 'template_validation_error',
    retryable: false,
  },
  132068: {
    reason: 'flow_blocked',
    retryable: false,
  },
  132069: {
    reason: 'flow_throttled',
    retryable: true,
  },
  133000: {
    reason: 'incomplete_deregistration',
    retryable: false,
  },
  133004: {
    reason: 'server_temporarily_unavailable',
    retryable: true,
  },
  133005: {
    reason: 'pin_mismatch',
    retryable: false,
  },
  133006: {
    reason: 'phone_requires_verification',
    retryable: false,
  },
  133008: {
    reason: 'too_many_pin_guesses',
    retryable: true,
  },
  133009: {
    reason: 'pin_guessed_too_fast',
    retryable: true,
  },
  133010: {
    reason: 'phone_not_registered',
    retryable: false,
  },
  133015: {
    reason: 'phone_recently_deleted',
    retryable: true,
  },
  133016: {
    reason: 'register_deregister_rate_limit',
    retryable: true,
  },
  134011: {
    reason: 'payments_terms_not_accepted',
    retryable: false,
  },
  135000: {
    reason: 'generic_user_error',
    retryable: false,
  },
  80007: {
    reason: 'waba_rate_limit',
    retryable: true,
  },
};

const HTTP_STATUS_TO_ERROR = {
  401: { reason: 'unauthorized', retryable: false },
  403: { reason: 'forbidden', retryable: false },
  404: { reason: 'not_found', retryable: false },
  429: { reason: 'too_many_requests', retryable: true },
  500: { reason: 'internal_server_error', retryable: true },
  502: { reason: 'bad_gateway', retryable: true },
  503: { reason: 'service_unavailable', retryable: true },
  504: { reason: 'gateway_timeout', retryable: true },
};

const NETWORK_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ETIMEDOUT',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENETDOWN',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'ERR_SOCKET_CLOSED',
]);

function extractErrorCode(err) {
  if (err?.response?.data?.error?.code) {
    return err.response.data.error.code;
  }
  return null;
}

function extractErrorDetails(err) {
  return err?.response?.data?.error?.error_data?.details || null;
}

function extractErrorMessage(err) {
  return err?.response?.data?.error?.message || null;
}

function mapError(err) {
  const code = extractErrorCode(err);
  const httpStatus = err?.response?.status;
  const details = extractErrorDetails(err);
  const apiMessage = extractErrorMessage(err);

  if (code && WHATSAPP_ERROR_CODES[code]) {
    return {
      code,
      reason: WHATSAPP_ERROR_CODES[code].reason,
      retryable: WHATSAPP_ERROR_CODES[code].retryable,
      details,
      apiMessage,
      httpStatus,
    };
  }

  if (httpStatus && HTTP_STATUS_TO_ERROR[httpStatus]) {
    return {
      code: null,
      reason: HTTP_STATUS_TO_ERROR[httpStatus].reason,
      retryable: HTTP_STATUS_TO_ERROR[httpStatus].retryable,
      details,
      apiMessage,
      httpStatus,
    };
  }

  const sysCode = typeof err?.code === 'string' ? err.code.toUpperCase() : null;
  if (sysCode && NETWORK_ERROR_CODES.has(sysCode)) {
    return {
      code: null,
      reason: 'network_error',
      retryable: true,
      details,
      apiMessage: apiMessage || err?.message,
      httpStatus,
    };
  }

  // لا استجابة HTTP (timeout/network) أو أي 5xx غير معرّف = خطأ عابر قابل لإعادة المحاولة
  if (!httpStatus || httpStatus >= 500) {
    return {
      code: null,
      reason: httpStatus ? 'server_error' : 'network_error',
      retryable: true,
      details,
      apiMessage: apiMessage || err?.message,
      httpStatus,
    };
  }

  return {
    code: null,
    reason: 'send_failed',
    retryable: false,
    details,
    apiMessage: apiMessage || err?.message,
    httpStatus,
  };
}

module.exports = {
  WHATSAPP_ERROR_CODES,
  HTTP_STATUS_TO_ERROR,
  NETWORK_ERROR_CODES,
  extractErrorCode,
  extractErrorDetails,
  extractErrorMessage,
  mapError,
};
