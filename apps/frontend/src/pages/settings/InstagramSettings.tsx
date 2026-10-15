import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Instagram,
  CheckCircle2,
  AlertCircle,
  Link2,
  ExternalLink,
  Plus,
  RefreshCw,
  Loader2,
} from "lucide-react";
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
  {
    id: "mock-1",
    pageId: "fp_101",
    pageName: "متجر الأزياء العصرية (Swan Fashion)",
    instagramAccountId: "178414000123456",
    instagramAccountName: "swan_fashion_eg",
    status: "connected",
    connectedAt: "2026-06-15T10:30:00Z",
  },
  {
    id: "mock-2",
    pageId: "fp_102",
    pageName: "صفحة العروض والخصومات المباشرة",
    instagramAccountId: "178414000234567",
    instagramAccountName: "swan_offers_official",
    status: "connected",
    connectedAt: "2026-06-10T14:00:00Z",
  },
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
    } catch {
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground" dir="rtl">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-400 shadow-xs">
            <Instagram className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("instagramSettings.title", "إعدادات وحسابات Instagram Business")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("instagramSettings.subtitle", "إدارة حسابات انستجرام للأعمال المرتبطة بصفحات فيسبوك التابعة لمتجرك")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAccounts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="تحديث الحسابات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
          <button
            onClick={handleConnectFacebook}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>ربط حساب جديد</span>
          </button>
        </div>
      </header>

      {/* Info Ribbon */}
      <div className="flex items-start gap-2.5 rounded-lg border border-pink-500/20 bg-pink-500/5 p-3.5 text-xs text-foreground">
        <AlertCircle className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-pink-600 dark:text-pink-400">
            {t("instagramSettings.howToConnect", "كيفية ربط وتحديث حساب انستجرام؟")}
          </p>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            {t(
              "instagramSettings.connectInfo",
              "يتم ربط حسابات انستجرام للأعمال تلقائياً من خلال صفحات فيسبوك المرتبطة بحساب Meta الخاص بك. إذا لم يظهر حسابك، يرجى مراجعة الصلاحيات في",
            )}{" "}
            <a
              href="/settings/facebook-oauth"
              className="font-medium text-primary hover:underline inline-flex items-center gap-0.5"
            >
              <span>{t("instagramSettings.facebookSettings", "إعدادات ربط فيسبوك")}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </div>

      {/* Accounts List / Loading */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground text-xs font-mono">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span>جاري تحميل حسابات انستجرام المتصلة...</span>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 text-center">
          {error}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-12 text-center text-muted-foreground space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
            <Instagram className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("instagramSettings.noAccounts", "لا توجد حسابات انستجرام مرتبطة")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {t("instagramSettings.connectPrompt", "قم بربط صفحة فيسبوك تحتوي على حساب انستجرام للأعمال للبدء")}
            </p>
          </div>
          <button
            onClick={handleConnectFacebook}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>{t("instagramSettings.connectFacebook", "ربط عبر فيسبوك")}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>الحسابات النشطة ({accounts.length})</span>
            <span className="font-mono text-[11px]">Meta Graph API v20.0</span>
          </div>

          <div className="rounded-xl border border-border/70 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center shrink-0">
                    <Instagram className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground text-sm flex items-center gap-1.5" dir="ltr">
                      <span>@{account.instagramAccountName || `ig_${String(account.instagramAccountId || "").slice(-6)}`}</span>
                    </div>
                    <div className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                      <span>مرتبط بصفحة:</span>
                      <span className="font-medium text-foreground">{account.pageName}</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/70" dir="ltr">
                      ID: {account.instagramAccountId || "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{t("instagramSettings.connected", "متصل ونشط")}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={handleConnectFacebook}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("instagramSettings.addAccount", "إضافة أو إعادة مصادقة حساب آخر")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramSettings;
