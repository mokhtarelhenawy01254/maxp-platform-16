import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Lock, Phone, Stethoscope } from "lucide-react";

import { dentalLogin, savePortalAuth } from "./shared";

const DentalPortalLoginPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      if (error) setError("");
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) {
      setError(t("dentalPortal.login.errorRequired"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await dentalLogin(phone.trim(), pin.trim());
      savePortalAuth(result.token, result.dentist);
      navigate("/dental-portal/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("dentalPortal.login.errorInvalid"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-4"
    >
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <Stethoscope size={28} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("dentalPortal.portalName")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("dentalPortal.login.subtitle")}
            </p>
          </div>

          {error ? (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="dp-phone"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
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
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pr-10 pl-3 text-right text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="01xxxxxxxxx"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="dp-pin"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
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
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white pr-10 pl-11 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="••••••"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin((s) => !s)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={t("dentalPortal.login.togglePin")}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !phone.trim() || !pin.trim()}
              className="h-11 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading
                ? t("dentalPortal.login.submitting")
                : t("dentalPortal.login.submit")}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          {t("dentalPortal.login.footerNote")}
        </p>
      </div>
    </div>
  );
};

export default DentalPortalLoginPage;