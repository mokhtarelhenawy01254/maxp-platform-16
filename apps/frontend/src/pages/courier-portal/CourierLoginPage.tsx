import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TruckIcon,
  PhoneIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { getApiUrl } from '../../config/environment';
import {
  resolveBrandingLogoUrl,
  useCompanyBranding,
} from '../../hooks/useCompanyBranding';
import {
  portalSessionManager,
  type PortalCompanyOption,
} from '../../utils/portalSessionManager';
import PortalCompanyPicker from '../../components/auth/PortalCompanyPicker';
import courierPortalApi, { getCourierToken } from './services/courierPortalApi';

export const CourierLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const branding = useCompanyBranding();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyOptions, setCompanyOptions] = useState<PortalCompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const accentColor = branding.accent?.trim() || '#2563eb';
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;

  useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  // Verify host subdomain compatibility before reusing any existing courier session
  useEffect(() => {
    let active = true;
    const checkExistingSession = async () => {
      const subdomain = portalSessionManager.getCurrentSubdomainFromHost();
      if (subdomain) {
        await portalSessionManager.syncPortalSessionWithHost('courier', getApiUrl());
      }
      if (active && getCourierToken()) {
        navigate('/courier-portal', { replace: true });
      }
    };
    void checkExistingSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  const submitLogin = async (companyIdOverride?: string) => {
    setErrorMessage(null);

    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
    const cleanPin = pin.trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setErrorMessage('رمز PIN يجب أن يتكون من 4 أرقام على الأقل');
      return;
    }

    setLoading(true);
    try {
      const res = await courierPortalApi.login(
        cleanPhone,
        cleanPin,
        companyIdOverride,
      );
      if (res.requiresCompanySelection && res.companies?.length) {
        setCompanyOptions(res.companies);
        setSelectedCompanyId(null);
        return;
      }
      if (res.success && res.token) {
        navigate('/courier-portal', { replace: true });
      } else {
        setErrorMessage(
          res.message || 'تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات',
        );
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const msg =
        axiosErr?.response?.data?.message ||
        axiosErr?.response?.data?.error ||
        axiosErr?.message ||
        'بيانات الدخول غير صحيحة، يرجى مراجعة إدارة العمليات';
      setErrorMessage(typeof msg === 'string' ? msg : 'تعذر تسجيل الدخول');
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
    setErrorMessage(null);
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 text-slate-900 dark:text-slate-100"
      dir="rtl"
      style={{ '--portal-primary': accentColor, '--auth-accent': accentColor } as React.CSSProperties}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt={branding.name || 'بوابة كابتن التوصيل'}
              onError={() => setLogoError(true)}
              className="w-14 h-14 rounded-2xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 shadow-sm"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <TruckIcon className="w-8 h-8" />
            </div>
          )}
        </div>
        {branding.name ? (
          <p className="text-center text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 truncate">
            {branding.name}
          </p>
        ) : null}
        <h2 className="text-center text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          بوابة كابتن التوصيل
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          سجل دخولك برقم الهاتف والـ PIN لمتابعة مأمورياتك اليومية
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-6 px-5 sm:px-8 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          {errorMessage ? (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
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
                <label
                  htmlFor="courier-phone"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  رقم الهاتف المحمول
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <PhoneIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="courier-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full min-h-[44px] pr-10 pl-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="courier-pin"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  رمز الـ PIN الميداني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="courier-pin"
                    name="pin"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    dir="ltr"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••"
                    className="w-full min-h-[44px] pr-10 pl-11 py-2.5 text-sm font-mono tracking-widest rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 left-0 pl-2 pr-2 flex min-w-[44px] items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
                    aria-label="تبديل إظهار رمز PIN"
                  >
                    {showPin ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  رمز الـ PIN الخاص بك المسجل لدى إدارة العمليات
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  style={{ backgroundColor: accentColor }}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm text-white hover:opacity-95 active:scale-[0.97] transition flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span>جاري تسجيل الدخول…</span>
                  ) : (
                    <>
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>دخول البوابة</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              في حال فقدان رمز PIN، يرجى مراجعة مشرف الحركة أو مسؤول الأسطول.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierLoginPage;
