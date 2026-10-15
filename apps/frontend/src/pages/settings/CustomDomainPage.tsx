import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  HelpCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { getDirection } from "../../i18n";
import { CustomDomainDnsCard } from "./CustomDomainDnsCard";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

export const CustomDomainPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(user?.company || null);
  const [customDomain, setCustomDomain] = useState(user?.company?.customDomain || "");
  const [editingDomain, setEditingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDNS, setVerifyingDNS] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const cnameTarget =
    typeof window !== "undefined" && window.location.hostname
      ? (window.location.hostname.includes("maxp.online")
          ? "maxp.online"
          : window.location.hostname.includes("mokhtarelhenawy.online")
            ? "mokhtarelhenawy.online"
            : window.location.hostname.replace(/^(app|dashboard|admin)\./, ""))
      : "maxp.online";

  useEffect(() => {
    if (user?.company) {
      setCompany(user.company);
      if (!editingDomain) {
        setCustomDomain(user.company.customDomain || "");
      }
    }
  }, [user?.company, editingDomain]);

  useEffect(() => {
    if (user?.companyId) {
      fetchCompanyData();
    }
  }, [user?.companyId]);

  const fetchCompanyData = async () => {
    if (!user?.companyId) return;
    try {
      const response = await fetch(
        `${getApiUrl()}/companies/${user.companyId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      if (data?.success && data?.data) {
        setCompany(data.data);
        if (!editingDomain) {
          setCustomDomain(data.data.customDomain || "");
        }
      }
    } catch (error) {
      console.error("Error fetching company:", error);
    }
  };

  const handleCustomDomainSave = async () => {
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (customDomain && !domainRegex.test(customDomain)) {
      alert(t("customDomain.domainFormatError"));
      return;
    }

    try {
      setSavingDomain(true);
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}`,
        {
          method: "PUT",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ customDomain: customDomain || null }),
        },
      );

      const data = await response.json();
      if (data?.success) {
        setCompany((prev: any) => ({
          ...prev,
          customDomain: customDomain || null,
        }));
        setEditingDomain(false);
        setDnsStatus(null);
        alert(t("customDomain.domainUpdated"));
      } else {
        alert(data.message || data.error || t("customDomain.domainUpdateFailed"));
      }
    } catch (error) {
      console.error("Error updating custom domain:", error);
      alert(t("customDomain.domainUpdateError"));
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDNS = async () => {
    if (!user?.companyId) return;

    try {
      setVerifyingDNS(true);
      setDnsStatus(null);
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}/verify-dns`,
        {
          headers: getAuthHeaders(),
        },
      );

      const data = await response.json();
      setDnsStatus({
        success: Boolean(data?.success),
        message: data?.message || (data?.success ? "تم التحقق بنجاح" : "فشل التحقق من DNS"),
      });
    } catch (error) {
      console.error("Error verifying DNS:", error);
      setDnsStatus({
        success: false,
        message: t("customDomain.dnsVerifyError"),
      });
    } finally {
      setVerifyingDNS(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background" dir={getDirection()}>
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
            {t("customDomain.pageTitle")}
          </h1>
          <span className="hidden md:inline-block text-[10px] text-muted-foreground font-mono">
            Custom Domain
          </span>
        </div>

        {company?.customDomain && !editingDomain && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleVerifyDNS}
              disabled={verifyingDNS}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${verifyingDNS ? "animate-spin" : ""}`} />
              <span>{verifyingDNS ? t("customDomain.checking") : t("customDomain.checkDns")}</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        <div className="p-4 sm:p-5 max-w-4xl space-y-4">
          
          {/* Subcomponent: Steps 1 & 2 */}
          <CustomDomainDnsCard
            cnameTarget={cnameTarget}
            copied={copied}
            onCopy={copyToClipboard}
          />

          {/* Step 3: Domain Connection & State */}
          <div className="p-3.5 sm:p-4 rounded-md border border-border/70 bg-card space-y-3">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-mono">
                3
              </span>
              {t("customDomain.step3Title")}
            </h2>

            {editingDomain ? (
              <div className="space-y-2">
                <label htmlFor="custom-domain-input" className="text-xs font-semibold text-foreground">
                  {t("customDomain.customDomainLabel")}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="custom-domain-input"
                    name="customDomain"
                    type="text"
                    autoComplete="url"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="store.yourdomain.com"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCustomDomainSave}
                      disabled={savingDomain}
                      className="px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
                    >
                      {savingDomain ? t("customDomain.saving") : t("customDomain.save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDomain(false);
                        setCustomDomain(company?.customDomain || "");
                      }}
                      className="px-3 py-1.5 bg-muted text-muted-foreground text-xs rounded-md hover:bg-accent transition-colors"
                    >
                      {t("customDomain.cancel")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-md border border-border/60 bg-muted/20">
                <div>
                  <span className="text-[11px] text-muted-foreground">
                    {t("customDomain.currentDomain")}
                  </span>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    {company?.customDomain || t("customDomain.noDomainConnected")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingDomain(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-[0.97]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{company?.customDomain ? t("customDomain.changeDomain") : t("customDomain.addDomain")}</span>
                </button>
              </div>
            )}

            {/* DNS Check Result Notification */}
            {dnsStatus && (
              <div
                className={`p-2.5 rounded-md border flex items-center gap-2 text-xs font-medium ${
                  dnsStatus.success
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                }`}
              >
                {dnsStatus.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                )}
                <span>{dnsStatus.message}</span>
              </div>
            )}

            {/* Verified Direct Link Box */}
            {company?.customDomain && (
              <div className="p-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("customDomain.dnsVerified")}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("customDomain.dnsVerifiedDesc", { domain: company?.customDomain })}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://${company?.customDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.97] whitespace-nowrap self-start sm:self-auto"
                >
                  <span>{t("customDomain.visitSite")}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Step 4: FAQ & Value Props */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span>{t("customDomain.whyCustomDomain")}</span>
              </h3>
              <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>{t("customDomain.whyList1")}</li>
                <li>{t("customDomain.whyList2")}</li>
                <li>{t("customDomain.whyList3")}</li>
                <li>{t("customDomain.whyList4")}</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-md border border-border/70 bg-card space-y-2">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                <span>{t("customDomain.faqTitle")}</span>
              </h3>
              <div className="space-y-2 text-[11px]">
                <div>
                  <p className="font-semibold text-foreground">{t("customDomain.faq1q")}</p>
                  <p className="text-muted-foreground mt-0.5">{t("customDomain.faq1a")}</p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t("customDomain.faq2q")}</p>
                  <p className="text-muted-foreground mt-0.5">{t("customDomain.faq2a")}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default CustomDomainPage;
