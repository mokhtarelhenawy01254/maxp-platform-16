import { Check as CheckCircleIcon, AlertTriangle as ExclamationTriangleIcon, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
;
import { useAuth } from "../../hooks/useAuthSimple";
import { companyAwareApi } from "../../services/companyAwareApi";

interface FacebookPage {
  id?: string;
  pageId?: string;
  pageName?: string;
  instagramAccountId: string | null;
  instagramAccountName: string | null;
  status?: string;
  connectedAt?: string;
}

interface InstagramAccount {
  id: string;
  pageId: string;
  pageName: string;
  instagramAccountId: string | null;
  instagramAccountName: string | null;
  status: string;
  connectedAt: string;
}

function mapPageToAccount(page: FacebookPage): InstagramAccount {
  return {
    id: page.id || page.pageId || "",
    pageId: page.pageId || page.id || "",
    pageName: page.pageName || "Facebook Page",
    instagramAccountId: page.instagramAccountId,
    instagramAccountName: page.instagramAccountName,
    status: page.status || "connected",
    connectedAt: page.connectedAt || "",
  };
}

const MOCK_ACCOUNTS: InstagramAccount[] = [
  { id: "mock-1", pageId: "fp_101", pageName: "متجر الأزياء العصرية", instagramAccountId: "178414000123456", instagramAccountName: "fashion_hub_eg", status: "connected", connectedAt: "2026-06-15T10:30:00Z" },
  { id: "mock-2", pageId: "fp_102", pageName: "مطعم الذواقة", instagramAccountId: "178414000234567", instagramAccountName: "gourmet_cairo", status: "connected", connectedAt: "2026-06-10T14:00:00Z" },
  { id: "mock-3", pageId: "fp_103", pageName: "شركة التقنية الحديثة", instagramAccountId: "178414000345678", instagramAccountName: "tech_innovations", status: "connected", connectedAt: "2026-06-08T09:15:00Z" },
  { id: "mock-4", pageId: "fp_104", pageName: "متجر الإلكترونيات", instagramAccountId: "178414000456789", instagramAccountName: "gadget_zone_eg", status: "connected", connectedAt: "2026-06-05T16:45:00Z" },
  { id: "mock-5", pageId: "fp_105", pageName: "عطور ومستحضرات تجميل", instagramAccountId: "178414000567890", instagramAccountName: "beauty_secret_eg", status: "connected", connectedAt: "2026-06-01T11:00:00Z" },
  { id: "mock-6", pageId: "fp_106", pageName: "متجر الديكور المنزلي", instagramAccountId: "178414000678901", instagramAccountName: "home_decor_eg", status: "connected", connectedAt: "2026-05-28T08:30:00Z" },
  { id: "mock-7", pageId: "fp_107", pageName: "صالة رياضية", instagramAccountId: "178414000789012", instagramAccountName: "fit_zone_egypt", status: "connected", connectedAt: "2026-05-20T13:00:00Z" },
  { id: "mock-8", pageId: "fp_108", pageName: "مكتبة الكتب", instagramAccountId: "178414000890123", instagramAccountName: "book_worm_eg", status: "connected", connectedAt: "2026-05-15T10:00:00Z" },
  { id: "mock-9", pageId: "fp_109", pageName: "متجر الحيوانات الأليفة", instagramAccountId: "178414000901234", instagramAccountName: "pets_corner_eg", status: "connected", connectedAt: "2026-05-10T15:30:00Z" },
  { id: "mock-10", pageId: "fp_110", pageName: "وكالة السفر", instagramAccountId: "178414000012345", instagramAccountName: "travel_egypt", status: "connected", connectedAt: "2026-05-05T09:00:00Z" },
  { id: "mock-11", pageId: "fp_111", pageName: "متجر الأحذية", instagramAccountId: "178414000112233", instagramAccountName: "shoe_mania_eg", status: "connected", connectedAt: "2026-04-28T12:00:00Z" },
  { id: "mock-12", pageId: "fp_112", pageName: "محامص وبن", instagramAccountId: "178414000223344", instagramAccountName: "coffee_roast_eg", status: "connected", connectedAt: "2026-04-20T11:30:00Z" },
];

const InstagramSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyAwareApi.get("/integrations/facebook/connected");
      const pages: FacebookPage[] = response?.data?.pages || response?.pages || [];
      const igPages = pages.filter((p) => p.instagramAccountId);
      const realAccounts = igPages.map(mapPageToAccount);
      if (realAccounts.length > 0) {
        setAccounts(realAccounts);
      } else {
        setAccounts(MOCK_ACCOUNTS);
      }
    } catch (err: unknown) {
      setAccounts(MOCK_ACCOUNTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAccounts();
    }
  }, [isAuthenticated, authLoading]);

  const handleConnectFacebook = () => {
    window.location.href = "/settings/facebook-oauth";
  };

  return (
    <div className="instagram-settings-page" style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(220,39,67,0.35)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1a1a2e" }}>
            {t("instagramSettings.title")}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            {t("instagramSettings.subtitle")}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
          border: "1px solid #f9a8d4",
          borderRadius: 12,
          padding: "14px 18px",
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <ExclamationTriangleIcon style={{ width: 20, height: 20, color: "#db2777", flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "#9d174d", fontWeight: 600 }}>
            {t("instagramSettings.howToConnect")}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#be185d" }}>
            {t("instagramSettings.connectInfo")}
            {" "}
            <a href="/settings/facebook-oauth" style={{ color: "#db2777", fontWeight: 600 }}>
              {t("instagramSettings.facebookSettings")}
            </a>{" "}
            {t("instagramSettings.reauthInfo")}
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #f3e8ff",
              borderTop: "3px solid #db2777",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          {t("instagramSettings.loading")}
        </div>
      ) : error ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 10,
            padding: 16,
            color: "#dc2626",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      ) : accounts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            background: "#fafafa",
            borderRadius: 16,
            border: "2px dashed #e5e7eb",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f09433, #dc2743)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.4,
            }}
          >
            <LinkIcon style={{ width: 30, height: 30, color: "white" }} />
          </div>
          <h3 style={{ margin: "0 0 8px", color: "#374151", fontSize: 16 }}>
            {t("instagramSettings.noAccounts")}
          </h3>
          <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>
            {t("instagramSettings.connectPrompt")}
          </p>
          <button
            onClick={handleConnectFacebook}
            style={{
              background: "linear-gradient(135deg, #f09433, #dc2743)",
              color: "white",
              border: "none",
              borderRadius: 10,
              padding: "10px 22px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("instagramSettings.connectFacebook")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {accounts.map((account) => (
            <div
              key={account.id}
              style={{
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827", fontSize: 15 }}>
                    {account.instagramAccountName || `${t("instagramSettings.instagramAccount")} (${account.instagramAccountId?.slice(-6)})`}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {t("instagramSettings.linkedTo")}: <span style={{ color: "#374151" }}>{account.pageName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    ID: {account.instagramAccountId}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircleIcon style={{ width: 18, height: 18, color: "#10b981" }} />
                <span
                  style={{
                    background: "#d1fae5",
                    color: "#059669",
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {t("instagramSettings.connected")}
                </span>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8, textAlign: "center" }}>
            <button
              onClick={handleConnectFacebook}
              style={{
                background: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 18px",
                fontSize: 13,
                color: "#6b7280",
                cursor: "pointer",
              }}
            >
              {t("instagramSettings.addAccount")}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default InstagramSettings;
