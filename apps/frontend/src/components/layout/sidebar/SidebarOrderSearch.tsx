import React, { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  Phone,
  X,
  Loader2,
  ExternalLink,
  PackageSearch,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { getStatusDisplay } from "../../../utils/statusRegistry";

interface OrderSearchResult {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status?: string;
  total?: number;
  currency?: string;
  conversationId?: string | null;
}

interface OrderSearchResponse {
  success?: boolean;
  data?: OrderSearchResult;
}

interface SidebarOrderSearchProps {
  collapsed?: boolean;
  mobileMode?: boolean;
  onNavigate?: () => void;
}

const SidebarOrderSearch: React.FC<SidebarOrderSearchProps> = ({
  collapsed = false,
  mobileMode = false,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderSearchResult | null>(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const reset = useCallback(() => {
    setResult(null);
    setError("");
    setNotFound(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setCode("");
    reset();
  }, [reset]);

  const handleOpen = useCallback(() => {
    if (collapsed) return;
    setOpen((prev) => {
      const next = !prev;
      if (!next) {
        setCode("");
        reset();
      }
      return next;
    });
  }, [collapsed, reset]);

  const handleSearch = useCallback(async () => {
    const query = code.trim();
    if (!query) return;

    setLoading(true);
    setError("");
    setNotFound(false);
    setResult(null);

    try {
      const response = await apiClient.get<OrderSearchResponse>(
        `/orders-enhanced/${encodeURIComponent(query)}`,
      );
      const body = response.data;
      if (body?.success && body?.data) {
        setResult({
          id: body.data.id,
          orderNumber: body.data.orderNumber || query,
          customerName:
            body.data.customerName ||
            body.data.customer?.name ||
            t("sidebar.orderCustomerUnknown"),
          customerPhone:
            body.data.customerPhone ||
            body.data.customer?.phone ||
            "",
          status: body.data.status || "PENDING",
          total:
            typeof body.data.total === "number"
              ? body.data.total
              : parseFloat(body.data.total) || 0,
          currency: body.data.currency || "EGP",
          conversationId: body.data.conversationId || null,
        });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 404) {
        setNotFound(true);
      } else if (
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 403
      ) {
        setError(t("sidebar.orderSearchSessionError"));
      } else {
        setError(t("sidebar.orderSearchError"));
      }
    } finally {
      setLoading(false);
    }
  }, [code, t]);

  const handleOpenConversation = useCallback(() => {
    if (!result?.conversationId) return;
    if (mobileMode) onNavigate?.();
    navigate(
      `/facebook-inbox?conversation=${encodeURIComponent(result.conversationId)}`,
    );
  }, [result, mobileMode, navigate, onNavigate]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => {
          if (mobileMode) onNavigate?.();
          navigate("/orders?search=");
        }}
        className="business-sidebar-nav-link"
        title={t("sidebar.orderSearchByCode")}
      >
        <span className="business-sidebar-nav-icon">
          <PackageSearch className="h-4 w-4" />
        </span>
      </button>
    );
  }

  const statusInfo = result?.status
    ? getStatusDisplay(result.status)
    : null;

  return (
    <div className="business-sidebar-order-search">
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className="business-sidebar-nav-link"
          data-active="false"
        >
          <span className="business-sidebar-nav-icon">
            <PackageSearch className="h-4 w-4" />
          </span>
          <span className="business-sidebar-nav-text">
            {t("sidebar.orderSearchByCode")}
          </span>
        </button>
      ) : (
        <div className="business-sidebar-order-search-open">
          <div className="business-sidebar-order-search-header">
            <span className="business-sidebar-nav-icon">
              <PackageSearch className="h-4 w-4" />
            </span>
            <span className="business-sidebar-order-search-title">
              {t("sidebar.orderSearchByCode")}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="business-sidebar-order-search-close"
              aria-label={t("sidebar.orderSearchClose")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="business-sidebar-order-search-input-row">
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder={t("sidebar.orderSearchPlaceholder")}
              className="business-sidebar-order-search-input"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading || !code.trim()}
              className="business-sidebar-order-search-button"
              aria-label={t("sidebar.orderSearchAction")}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="business-sidebar-order-search-error">{error}</div>
          )}

          {notFound && (
            <div className="business-sidebar-order-search-error">
              {t("sidebar.orderSearchNotFound", { code })}
            </div>
          )}

          {result && (
            <div className="business-sidebar-order-search-result">
              <div className="business-sidebar-order-search-result-head">
                <span className="business-sidebar-order-search-result-code">
                  #{result.orderNumber}
                </span>
                {statusInfo && (
                  <span
                    className={`business-sidebar-order-search-result-status ${statusInfo.colorClass}`}
                  >
                    {statusInfo.label}
                  </span>
                )}
              </div>

              <div className="business-sidebar-order-search-result-row">
                <User className="h-3.5 w-3.5" />
                <span>{result.customerName}</span>
              </div>

              {result.customerPhone && (
                <div className="business-sidebar-order-search-result-row">
                  <Phone className="h-3.5 w-3.5" />
                  <span dir="ltr">{result.customerPhone}</span>
                </div>
              )}

              <div className="business-sidebar-order-search-result-total">
                {t("sidebar.orderSearchTotal")}: {result.total?.toLocaleString()}{" "}
                {result.currency}
              </div>

              {result.conversationId ? (
                <button
                  type="button"
                  onClick={handleOpenConversation}
                  className="business-sidebar-order-search-result-action"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("sidebar.orderSearchOpenConversation")}
                </button>
              ) : (
                <div className="business-sidebar-order-search-result-noconv">
                  {t("sidebar.orderSearchNoConversation")}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SidebarOrderSearch;
