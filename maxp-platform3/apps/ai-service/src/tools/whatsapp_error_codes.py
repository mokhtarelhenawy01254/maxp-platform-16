WHATSAPP_ERROR_CODES = {
    1: {"reason": "api_unknown", "retryable": True},
    2: {"reason": "api_service_unavailable", "retryable": True},
    4: {"reason": "rate_limit_app", "retryable": True},
    33: {"reason": "phone_deleted", "retryable": False},
    100: {"reason": "invalid_parameter", "retryable": False},
    190: {"reason": "token_expired", "retryable": False},
    368: {"reason": "account_blocked_policy", "retryable": False},
    130429: {"reason": "rate_limit_throughput", "retryable": True},
    130472: {"reason": "user_in_experiment", "retryable": False},
    130497: {"reason": "country_restricted", "retryable": False},
    131000: {"reason": "unknown_error", "retryable": True},
    131005: {"reason": "access_denied", "retryable": False},
    131008: {"reason": "missing_parameter", "retryable": False},
    131009: {"reason": "invalid_parameter_value", "retryable": False},
    131016: {"reason": "service_unavailable", "retryable": True},
    131021: {"reason": "recipient_is_sender", "retryable": False},
    131026: {"reason": "message_undeliverable", "retryable": False},
    131031: {"reason": "account_locked", "retryable": False},
    131037: {"reason": "display_name_not_approved", "retryable": False},
    131042: {"reason": "billing_error", "retryable": False},
    131045: {"reason": "certificate_error", "retryable": False},
    131047: {"reason": "re_engagement_needed", "retryable": False},
    131048: {"reason": "spam_rate_limit", "retryable": True},
    131049: {"reason": "meta_did_not_deliver", "retryable": True},
    131050: {"reason": "user_stopped_marketing", "retryable": False},
    131051: {"reason": "unsupported_message_type", "retryable": False},
    131052: {"reason": "media_download_error", "retryable": True},
    131053: {"reason": "media_upload_error", "retryable": True},
    131056: {"reason": "pair_rate_limit", "retryable": True},
    131057: {"reason": "account_maintenance", "retryable": True},
    131063: {"reason": "marketing_templates_disabled", "retryable": False},
    132000: {"reason": "template_param_count_mismatch", "retryable": False},
    132001: {"reason": "template_not_found", "retryable": False},
    132005: {"reason": "template_text_too_long", "retryable": False},
    132007: {"reason": "template_policy_violation", "retryable": False},
    132012: {"reason": "template_param_format_mismatch", "retryable": False},
    132015: {"reason": "template_paused", "retryable": True},
    132016: {"reason": "template_disabled", "retryable": False},
    132018: {"reason": "template_validation_error", "retryable": False},
    132068: {"reason": "flow_blocked", "retryable": False},
    132069: {"reason": "flow_throttled", "retryable": True},
    133000: {"reason": "incomplete_deregistration", "retryable": False},
    133004: {"reason": "server_temporarily_unavailable", "retryable": True},
    133005: {"reason": "pin_mismatch", "retryable": False},
    133006: {"reason": "phone_requires_verification", "retryable": False},
    133008: {"reason": "too_many_pin_guesses", "retryable": True},
    133009: {"reason": "pin_guessed_too_fast", "retryable": True},
    133010: {"reason": "phone_not_registered", "retryable": False},
    133015: {"reason": "phone_recently_deleted", "retryable": True},
    133016: {"reason": "register_deregister_rate_limit", "retryable": True},
    134011: {"reason": "payments_terms_not_accepted", "retryable": False},
    135000: {"reason": "generic_user_error", "retryable": False},
    80007: {"reason": "waba_rate_limit", "retryable": True},
}

HTTP_STATUS_TO_REASON = {
    401: ("unauthorized", False),
    403: ("forbidden", False),
    404: ("not_found", False),
    429: ("too_many_requests", True),
    500: ("internal_server_error", True),
    503: ("service_unavailable", True),
}


def map_whatsapp_error(error: Exception):
    code = None
    http_status = None
    api_message = None
    details = None

    if hasattr(error, "response") and error.response is not None:
        http_status = error.response.status_code
        try:
            body = error.response.json()
            err_info = body.get("error", {})
            code = err_info.get("code")
            api_message = err_info.get("message")
            error_data = err_info.get("error_data", {})
            if isinstance(error_data, dict):
                details = error_data.get("details")
        except Exception:
            pass

    if code and code in WHATSAPP_ERROR_CODES:
        entry = WHATSAPP_ERROR_CODES[code]
        return {
            "code": code,
            "reason": entry["reason"],
            "retryable": entry["retryable"],
            "api_message": api_message,
            "http_status": http_status,
            "details": details,
        }

    if http_status and http_status in HTTP_STATUS_TO_REASON:
        reason, retryable = HTTP_STATUS_TO_REASON[http_status]
        return {
            "code": None,
            "reason": reason,
            "retryable": retryable,
            "api_message": api_message,
            "http_status": http_status,
            "details": details,
        }

    return {
        "code": None,
        "reason": "send_failed",
        "retryable": False,
        "api_message": api_message or str(error),
        "http_status": http_status,
        "details": details,
    }


class WhatsAppAPIError(Exception):
    def __init__(self, code, reason, retryable, api_message, http_status, details):
        self.code = code
        self.reason = reason
        self.retryable = retryable
        self.api_message = api_message
        self.http_status = http_status
        self.details = details
        msg = f"[{code}] {api_message}" if code else (api_message or reason)
        super().__init__(msg)
