import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentCheckIcon,
  ClipboardIcon,
  ArrowsRightLeftIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { getDirection } from "../../i18n";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const CustomDomainPage: React.FC = () => {
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
      if (data.success && data.data) {
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
      alert(
        t("customDomain.domainFormatError"),
      );
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
      if (data.success) {
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
        success: data.success,
        message: data.message,
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
    <div className="max-w-4xl mx-auto py-6 sm:px-4 sm:py-8" dir={getDirection()}>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <GlobeAltIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("customDomain.pageTitle")}
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {t("customDomain.pageDescription")}
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Explanation & Requirements */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 sm:p-6">
            <h2 className="w-full text-start text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
                1
              </span>
              {t("customDomain.step1Title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <ShieldCheckIcon className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("customDomain.domainRegistered")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("customDomain.domainRegisteredDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                <ArrowsRightLeftIcon className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("customDomain.dnsAccess")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("customDomain.dnsAccessDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: DNS Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 sm:p-6">
            <h2 className="w-full text-start text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
                2
              </span>
              {t("customDomain.step2Title")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t("customDomain.dnsStepDesc")}
            </p>

            {/* Step 2: DNS Configuration */}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                <div className="p-3.5 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    {/* Record Type & Host */}
                    <div className="sm:col-span-4 flex items-center gap-2.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-wider">
                        CNAME
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("customDomain.dnsHostValue")}
                      </span>
                    </div>

                    {/* Value / Target */}
                    <div className="sm:col-span-5 min-w-0">
                      <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2">
                        <code
                          dir="ltr"
                          className="w-full truncate text-left font-mono text-xs sm:text-sm text-gray-900 dark:text-white select-all"
                        >
                          {cnameTarget}
                        </code>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="sm:col-span-3 flex sm:justify-end">
                      <button
                        type="button"
                        aria-label={
                          copied === "cname"
                            ? t("customDomain.cnameCopied")
                            : t("customDomain.copyCname")
                        }
                        onClick={() => copyToClipboard(cnameTarget, "cname")}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 min-h-9 px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm"
                      >
                        {copied === "cname" ? (
                          <>
                            <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-500 shrink-0" />
                            <span className="text-green-600 dark:text-green-400">
                              {t("customDomain.cnameCopied")}
                            </span>
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="h-4 w-4 shrink-0" />
                            <span>{t("customDomain.copyCname")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                {t("customDomain.dnsNote")}
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Domain Addition & Verification */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 sm:p-6">
            <h2 className="w-full text-start text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
                3
              </span>
              {t("customDomain.step3Title")}
            </h2>

            <div className="space-y-4">
              <div>
                {editingDomain ? (
                  <label
                    htmlFor="custom-domain-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t("customDomain.customDomainLabel")}
                  </label>
                ) : (
                  <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("customDomain.customDomainLabel")}
                  </span>
                )}
                {editingDomain ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="custom-domain-input"
                      name="customDomain"
                      type="text"
                      autoComplete="url"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="example.com"
                      className="flex-1 min-w-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white outline-none text-sm"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCustomDomainSave}
                        disabled={savingDomain}
                        className="flex-1 sm:flex-initial px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {savingDomain ? t("customDomain.saving") : t("customDomain.save")}
                      </button>
                      <button
                        onClick={() => {
                          setEditingDomain(false);
                          setCustomDomain(company?.customDomain || "");
                        }}
                        className="flex-1 sm:flex-initial px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                      >
                        {t("customDomain.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        {t("customDomain.currentDomain")}
                      </p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {company?.customDomain || t("customDomain.noDomainConnected")}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingDomain(true)}
                      className="px-4 py-2 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    >
                      {company?.customDomain ? t("customDomain.changeDomain") : t("customDomain.addDomain")}
                    </button>
                  </div>
                )}
              </div>

              {company?.customDomain && !editingDomain && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <button
                      onClick={handleVerifyDNS}
                      disabled={verifyingDNS}
                      className="flex items-center justify-center gap-2 px-6 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                      {verifyingDNS && (
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />
                      )}
                      {verifyingDNS
                        ? t("customDomain.checking")
                        : t("customDomain.checkDns")}
                    </button>

                    {dnsStatus && (
                      <div
                        className={`flex items-center gap-2 text-sm font-medium ${dnsStatus.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {dnsStatus.success ? (
                          <CheckCircleIcon className="h-5 w-5" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5" />
                        )}
                        {dnsStatus.message}
                      </div>
                    )}
                  </div>

                  {dnsStatus?.success && (
                    <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex gap-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-green-800 dark:text-green-300">
                              {t("customDomain.dnsVerified")}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                              {t("customDomain.dnsVerifiedDesc", { domain: company?.customDomain })}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`https://${company?.customDomain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          {t("customDomain.visitSite")}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Helpful Tips — MOB-014: restrained card instead of loud purple gradient */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
              {t("customDomain.whyCustomDomain")}
            </h3>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                {t("customDomain.whyList1")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                {t("customDomain.whyList2")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                {t("customDomain.whyList3")}
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                {t("customDomain.whyList4")}
              </li>
            </ul>
          </div>

          <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <InformationCircleIcon className="h-5 w-5 text-indigo-500" />
              {t("customDomain.faqTitle")}
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {t("customDomain.faq1q")}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("customDomain.faq1a")}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">
                  {t("customDomain.faq2q")}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("customDomain.faq2a")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomDomainPage;
