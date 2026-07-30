import { Globe as GlobeAltIcon, Check as CheckCircleIcon, AlertTriangle as ExclamationTriangleIcon, Info as InformationCircleIcon, ExternalLink as ArrowTopRightOnSquareIcon, Clipboard as ClipboardDocumentCheckIcon, Clipboard as ClipboardIcon, Circle as ArrowsRightLeftIcon, ShieldCheck as ShieldCheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
;
import { useAuth } from "../../hooks/useAuthSimple";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { getDirection } from "../../i18n";

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const CustomDomainPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [customDomain, setCustomDomain] = useState("");
  const [editingDomain, setEditingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDNS, setVerifyingDNS] = useState(false);
  const [dnsStatus, setDnsStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const response = await fetch(
        `${getApiUrl()}/companies/${user?.companyId}`,
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();
      if (data.success) {
        setCompany(data.data);
        setCustomDomain(data.data.customDomain || "");
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
    <div className="max-w-4xl mx-auto px-4 py-8" dir={getDirection()}>
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
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
                1
              </span>
              {t("customDomain.step1Title")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
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
              <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
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
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
                2
              </span>
              {t("customDomain.step2Title")}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t("customDomain.dnsStepDesc")}
            </p>

            <div className="overflow-x-auto border border-gray-100 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("customDomain.dnsType")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("customDomain.dnsHost")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("customDomain.dnsValue")}
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      CNAME
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {t("customDomain.dnsHostValue")}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      mokhtarelhenawy.online
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <button
                        type="button"
                        aria-label={
                          copied === "cname"
                            ? t("customDomain.cnameCopied")
                            : t("customDomain.copyCname")
                        }
                        onClick={() =>
                          copyToClipboard("mokhtarelhenawy.online", "cname")
                        }
                        className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {copied === "cname" ? (
                          <ClipboardDocumentCheckIcon className="h-5 w-5" />
                        ) : (
                          <ClipboardIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex gap-3">
              <InformationCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                {t("customDomain.dnsNote")}
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Domain Addition & Verification */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs">
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
                  <div className="flex gap-2">
                    <input
                      id="custom-domain-input"
                      name="customDomain"
                      type="text"
                      autoComplete="url"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      placeholder="example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white outline-none"
                    />
                    <button
                      onClick={handleCustomDomainSave}
                      disabled={savingDomain}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {savingDomain ? t("customDomain.saving") : t("customDomain.save")}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDomain(false);
                        setCustomDomain(company?.customDomain || "");
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {t("customDomain.cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
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

        {/* Helpful Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg">
            <h3 className="font-bold flex items-center gap-2 mb-3">
              <InformationCircleIcon className="h-5 w-5" />
              {t("customDomain.whyCustomDomain")}
            </h3>
            <ul className="text-xs space-y-2 opacity-90">
              <li>{t("customDomain.whyList1")}</li>
              <li>{t("customDomain.whyList2")}</li>
              <li>{t("customDomain.whyList3")}</li>
              <li>{t("customDomain.whyList4")}</li>
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
