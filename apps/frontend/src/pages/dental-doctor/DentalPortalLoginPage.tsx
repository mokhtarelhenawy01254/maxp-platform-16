import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, Phone, Stethoscope } from "lucide-react";

import { getApiUrl } from "@/config/environment";
import {
  resolveBrandingLogoUrl,
  useCompanyBranding,
} from "@/hooks/useCompanyBranding";
import {
  portalSessionManager,
  type PortalCompanyOption,
} from "@/utils/portalSessionManager";
import PortalCompanyPicker from "@/components/auth/PortalCompanyPicker";
import { dentalLogin, savePortalAuth } from "./shared";

const DentalPortalLoginPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const navigate = useNavigate();
  const branding = useCompanyBranding();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyOptions, setCompanyOptions] = useState<PortalCompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const accentColor = branding.accent?.trim() || "#4f46e5";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;
  const portalTitle = branding.name?.trim() || t("dentalPortal.portalName");

  useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  useEffect(() => {
    void portalSessionManager.syncPortalSessionWithHost("dental", getApiUrl());
  }, []);

  const handleChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError("");
    };

  const submitLogin = async (companyIdOverride?: string) => {
    if (!phone.trim() || !pin.trim()) {
      setError(t("dentalPortal.login.errorRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await dentalLogin(phone.trim(), pin.trim(), companyIdOverride);
      if (result.requiresCompanySelection) {
        setCompanyOptions(result.companies);
        setSelectedCompanyId(null);
        return;
      }
      savePortalAuth(result.token, result.dentist, result.company);
      navigate("/dental-portal/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("dentalPortal.login.errorInvalid"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitLogin();
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    void submitLogin(companyId);
  };

  const handleBackToCredentials = () => {
    setCompanyOptions([]);
    setSelectedCompanyId(null);
    setError("");
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-4"
      style={{ "--portal-primary": accentColor, "--auth-accent": accentColor } as React.CSSProperties}
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-6 sm:p-8 shadow-sm">
          <div className="mb-6 text-center">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt={portalTitle}
                onError={() => setLogoError(true)}
                className="mx-auto mb-3 h-14 w-14 rounded-2xl border border-gray-200 bg-white object-contain p-1 shadow-2xs"
              />
            ) : (
              <div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
              >
                <Stethoscope size={28} />
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {portalTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {branding.name?.trim() ? t("dentalPortal.portalName") : t("dentalPortal.login.subtitle")}
            </p>
          </div>

          {error ? (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {companyOptions.length > 0 ? (
            <PortalCompanyPicker
              variant="card"
              companies={companyOptions}
              selectedCompanyId={selectedCompanyId}
              loading={loading}
              onSelect={handleSelectCompany}
              onBack={handleBackToCredentials}
            />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="dp-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("dentalPortal.login.phone")}
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="dp-phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={handleChange(setPhone)}
                    className="min-h-[44px] h-11 w-full rounded-lg border border-gray-300 bg-white pr-10 pl-3 text-right text-sm focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300"
                    placeholder="01xxxxxxxxx"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="dp-pin" className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t("dentalPortal.login.pin")}
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="dp-pin"
                    name="pin"
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={handleChange(setPin)}
                    className="min-h-[44px] h-11 w-full rounded-lg border border-gray-300 bg-white pr-10 pl-11 text-sm focus-visible:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-300"
                    placeholder="••••••"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((s) => !s)}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 cursor-pointer"
                    aria-label={t("dentalPortal.login.togglePin")}
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !phone.trim() || !pin.trim()}
                style={{ backgroundColor: accentColor }}
                className="min-h-[44px] h-11 w-full rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-50 cursor-pointer"
              >
                {loading ? t("dentalPortal.login.submitting") : t("dentalPortal.login.submit")}
              </button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          {t("dentalPortal.login.footerNote")}
        </p>
      </div>
    </div>
  );
};

export default DentalPortalLoginPage;
