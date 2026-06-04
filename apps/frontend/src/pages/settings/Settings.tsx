import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BellIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  UserIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";

import { themes } from "../../config/themes";
import { useVisualTheme } from "../../contexts/VisualThemeContext";
import { getApiUrl } from "../../config/environment";
import { useAuth } from "../../hooks/useAuthSimple";
import { useTheme } from "../../hooks/useTheme";
import tokenManager from "../../utils/tokenManager";
import CompanySettings from "./CompanySettings";
import CustomDomainPage from "./CustomDomainPage";
import SidebarSettings from "./SidebarSettings";

type SettingsIcon = React.ComponentType<{ className?: string }>;

interface SettingsTab {
  id: string;
  name: string;
  icon: SettingsIcon;
  component: React.ComponentType;
  description: string;
}

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

const DEFAULT_TAB = "profile";

const SectionHeader: React.FC<{
  title: string;
  description: string;
}> = ({ title, description }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
      {title}
    </h2>
    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  const tabs: SettingsTab[] = [
    {
      id: "profile",
      name: "الملف الشخصي",
      icon: UserIcon,
      component: ProfileSettings,
      description: "تعديل بيانات الحساب الأساسية.",
    },
    {
      id: "company",
      name: "إعدادات الشركة",
      icon: BuildingOfficeIcon,
      component: CompanySettings,
      description: "إدارة بيانات الشركة الرسمية والإعدادات العامة.",
    },
    {
      id: "custom-domain",
      name: "الدومين المخصص",
      icon: GlobeAltIcon,
      component: CustomDomainPage,
      description: "ربط وإدارة الدومين الخاص بمتجرك.",
    },
    {
      id: "store",
      name: "إعدادات المتجر",
      icon: BuildingStorefrontIcon,
      component: StoreSettingsRedirect,
      description: "الانتقال إلى إعدادات المتجر التفصيلية.",
    },
    {
      id: "notifications",
      name: "الإشعارات",
      icon: BellIcon,
      component: NotificationSettings,
      description: "تخصيص أنواع وقنوات التنبيهات.",
    },
    {
      id: "security",
      name: "الأمان",
      icon: ShieldCheckIcon,
      component: SecuritySettings,
      description: "تحديث كلمة المرور وتأمين الحساب.",
    },
    {
      id: "appearance",
      name: "المظهر",
      icon: PaintBrushIcon,
      component: AppearanceSettings,
      description: "التحكم في الوضع الليلي وألوان لوحة التحكم.",
    },
    {
      id: "integrations",
      name: "التكاملات",
      icon: GlobeAltIcon,
      component: IntegrationSettings,
      description: "مراجعة التكاملات والخدمات المرتبطة.",
    },
    {
      id: "sidebar",
      name: "القائمة الجانبية",
      icon: QueueListIcon,
      component: SidebarSettings,
      description: "التحكم في عناصر القائمة الجانبية وترتيبها وصلاحياتها.",
    },
  ];

  const validTabIds = tabs.map((item) => item.id);

  useEffect(() => {
    if (tab === "billing") {
      navigate("/subscription", { replace: true });
      return;
    }

    if (!tab || !validTabIds.includes(tab)) {
      navigate(`/settings/${DEFAULT_TAB}`, { replace: true });
    }
  }, [navigate, tab, validTabIds]);

  const activeTab = tab && validTabIds.includes(tab) ? tab : DEFAULT_TAB;
  const activeTabConfig =
    tabs.find((item) => item.id === activeTab) ?? tabs[0]!;
  const ActiveComponent = activeTabConfig.component;

  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold text-gray-900 dark:text-gray-100">
            <Cog6ToothIcon className="mr-3 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            الإعدادات
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            إدارة إعدادات الحساب والنظام من مكان واحد.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
        >
          <CreditCardIcon className="h-5 w-5" />
          إدارة الاشتراك والفواتير
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <nav className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-5 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                الأقسام
              </h3>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/settings/${item.id}`)}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-right transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        isActive
                          ? "text-indigo-500 dark:text-indigo-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {item.name}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formData, setFormData] = useState<ProfileFormState>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: "",
    timezone: user?.timezone || "Africa/Cairo",
    language: "ar",
  });

  const handleFieldChange =
    (field: keyof ProfileFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch(`${getApiUrl()}/companies/profile/me`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          timezone: formData.timezone,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setFeedback({
          type: "error",
          message: payload?.message || "فشل في حفظ البيانات.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "تم حفظ الملف الشخصي بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "حدث خطأ أثناء حفظ الإعدادات.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-6 py-6">
      <SectionHeader
        title="الملف الشخصي"
        description="حدّث بياناتك الأساسية التي تظهر على الحساب."
      />

      {feedback && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              الاسم الأول
            </span>
            <input
              id="profile-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={handleFieldChange("firstName")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              الاسم الأخير
            </span>
            <input
              id="profile-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleFieldChange("lastName")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              البريد الإلكتروني
            </span>
            <input
              id="profile-email"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleFieldChange("email")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              رقم الهاتف
            </span>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleFieldChange("phone")}
              placeholder="+201234567890"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              المنطقة الزمنية
            </span>
            <select
              id="profile-timezone"
              name="timezone"
              autoComplete="off"
              value={formData.timezone}
              onChange={handleFieldChange("timezone")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="Africa/Cairo">القاهرة (GMT+2)</option>
              <option value="Asia/Riyadh">الرياض (GMT+3)</option>
              <option value="Asia/Dubai">دبي (GMT+4)</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              اللغة
            </span>
            <select
              id="profile-language"
              name="language"
              autoComplete="language"
              value={formData.language}
              onChange={handleFieldChange("language")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
          </button>
        </div>
      </form>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newMessages: true,
    newOrders: true,
    lowStock: true,
    systemAlerts: true,
  });

  const notificationGroups = [
    {
      title: "قنوات الإشعارات",
      items: [
        { key: "emailNotifications", label: "البريد الإلكتروني" },
        { key: "pushNotifications", label: "الإشعارات الفورية" },
        { key: "smsNotifications", label: "الرسائل النصية" },
      ],
    },
    {
      title: "أنواع الإشعارات",
      items: [
        { key: "newMessages", label: "رسائل جديدة" },
        { key: "newOrders", label: "طلبات جديدة" },
        { key: "lowStock", label: "تنبيهات المخزون" },
        { key: "systemAlerts", label: "تنبيهات النظام" },
      ],
    },
  ] as const;

  return (
    <div className="px-6 py-6">
      <SectionHeader
        title="الإشعارات"
        description="راجع القنوات والتنبيهات التي ترغب في استقبالها."
      />

      <div className="space-y-8">
        {notificationGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {group.title}
            </h3>
            <div className="space-y-4">
              {group.items.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        [item.key]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SecuritySettings: React.FC = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const updateField =
    (field: keyof typeof formData) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const validatePassword = (password: string) => {
    const errors: string[] = [];

    if (password.length < 6) {
      errors.push("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("أضف حرفًا كبيرًا واحدًا على الأقل.");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("أضف حرفًا صغيرًا واحدًا على الأقل.");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("أضف رقمًا واحدًا على الأقل.");
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);

    if (formData.newPassword !== formData.confirmPassword) {
      setFeedback({
        type: "error",
        message: "كلمتا المرور الجديدتان غير متطابقتين.",
      });
      return;
    }

    const passwordErrors = validatePassword(formData.newPassword);
    if (passwordErrors.length > 0) {
      setFeedback({
        type: "error",
        message: passwordErrors.join(" "),
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${getApiUrl()}/auth/change-password`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        setFeedback({
          type: "error",
          message: payload?.message || "فشل في تغيير كلمة المرور.",
        });
        return;
      }

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setFeedback({
        type: "success",
        message: "تم تحديث كلمة المرور بنجاح.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: "حدث خطأ أثناء تغيير كلمة المرور.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const passwordChecks = [
    {
      label: "6 أحرف على الأقل",
      passed: formData.newPassword.length >= 6,
    },
    {
      label: "حرف كبير واحد على الأقل",
      passed: /[A-Z]/.test(formData.newPassword),
    },
    {
      label: "حرف صغير واحد على الأقل",
      passed: /[a-z]/.test(formData.newPassword),
    },
    {
      label: "رقم واحد على الأقل",
      passed: /[0-9]/.test(formData.newPassword),
    },
  ];

  return (
    <div className="px-6 py-6">
      <SectionHeader
        title="الأمان"
        description="غيّر كلمة المرور وراجع معايير الأمان الأساسية."
      />

      <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-300" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            استخدم كلمة مرور قوية وفريدة لحسابك، وغيّرها دوريًا لحماية بيانات
            الشركة.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            كلمة المرور الحالية
          </span>
          <input
            id="security-current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={formData.currentPassword}
            onChange={updateField("currentPassword")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            كلمة المرور الجديدة
          </span>
          <input
            id="security-new-password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={formData.newPassword}
            onChange={updateField("newPassword")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            تأكيد كلمة المرور الجديدة
          </span>
          <input
            id="security-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={formData.confirmPassword}
            onChange={updateField("confirmPassword")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </label>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
          <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
            متطلبات كلمة المرور
          </p>
          <div className="space-y-2">
            {passwordChecks.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 text-sm ${
                  item.passed
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    item.passed
                      ? "bg-green-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {isSaving ? "جاري التحديث..." : "تحديث كلمة المرور"}
          </button>
        </div>
      </form>
    </div>
  );
};

const AppearanceSettings: React.FC = () => {
  const {
    theme,
    actualTheme,
    derivedTheme,
    darkStyle,
    setTheme,
    setDarkStyle,
  } = useTheme();
  const { currentTheme, setTheme: setVisualTheme } = useVisualTheme();

  const themeModeOptions = [
    {
      value: "light",
      label: "فاتح",
      preview: "bg-white text-gray-900",
    },
    {
      value: "dark",
      label: "داكن",
      preview: "bg-gray-900 text-white",
    },
    {
      value: "system",
      label: "نظام الجهاز",
      preview: "bg-gradient-to-br from-white to-gray-900 text-gray-700",
    },
  ] as const;

  const darkStyleOptions = [
    {
      value: "classic",
      label: "Classic Dark",
      description: "رمادي هادئ ومتوازن.",
      accent: "#3b82f6",
      background: "#111827",
    },
    {
      value: "midnight",
      label: "Midnight Luxury",
      description: "أزرق ليلي عميق.",
      accent: "#8b5cf6",
      background: "#081223",
    },
    {
      value: "aurora",
      label: "Aurora Teal",
      description: "داكن مع لمسة تركواز حادة.",
      accent: "#22d3ee",
      background: "#061018",
    },
    {
      value: "amethyst",
      label: "Amethyst Glow",
      description: "بنفسجي غني وواضح.",
      accent: "#a78bfa",
      background: "#120b1f",
    },
    {
      value: "royal",
      label: "Royal Violet",
      description: "بنفسجي ملكي أكثر فخامة.",
      accent: "#8b5cf6",
      background: "#140b33",
    },
    {
      value: "oled",
      label: "True Black",
      description: "أسود صافي بحد أدنى من الإضاءة.",
      accent: "#e5e7eb",
      background: "#000000",
    },
  ] as const;

  const selectedModeLabel =
    theme === "system"
      ? `نظام الجهاز (${actualTheme === "dark" ? "داكن" : "فاتح"})`
      : theme === "dark"
        ? "داكن"
        : "فاتح";

  return (
    <div className="px-6 py-6">
      <SectionHeader
        title="المظهر"
        description="اختر وضع الواجهة والألوان المناسبة لفريقك."
      />

      <div className="space-y-8">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              وضع الواجهة
            </h3>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              الحالي: {selectedModeLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {themeModeOptions.map((option) => {
              const isActive = theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`rounded-2xl border-2 p-4 text-center transition ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <div
                    className={`mb-3 flex h-24 items-center justify-center rounded-xl border border-white/20 text-2xl ${option.preview}`}
                  >
                    Aa
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {option.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {derivedTheme === "dark" && (
          <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              نمط الوضع الليلي
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {darkStyleOptions.map((option) => {
                const isActive = darkStyle === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDarkStyle(option.value)}
                    className={`rounded-2xl border-2 p-4 text-right transition ${
                      isActive
                        ? "border-indigo-500 ring-2 ring-indigo-500/20"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                    }`}
                  >
                    <div
                      className="mb-3 h-16 rounded-xl border p-3"
                      style={{
                        backgroundColor: option.background,
                        borderColor: option.accent,
                      }}
                    >
                      <div
                        className="h-2 w-8 rounded-full"
                        style={{ backgroundColor: option.accent }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {option.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      {isActive && (
                        <span className="rounded-full bg-indigo-500 px-2 py-1 text-xs font-semibold text-white">
                          الحالي
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            ألوان لوحة التحكم
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            هذا الاختيار يؤثر على ألوان واجهة الإدارة فقط، وليس المتجر العام.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {themes.map((visualTheme) => {
              const isActive = currentTheme.id === visualTheme.id;

              return (
                <button
                  key={visualTheme.id}
                  type="button"
                  onClick={() => setVisualTheme(visualTheme.id)}
                  className={`rounded-2xl border p-3 text-right transition ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50/70 shadow-sm dark:bg-indigo-900/20"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <div
                    className="h-20 rounded-xl border border-white/20"
                    style={{ background: visualTheme.gradient }}
                  />

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <h4
                        className={`font-semibold ${
                          isActive
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {visualTheme.name}
                      </h4>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-white/30"
                          style={{
                            backgroundColor: `rgb(${visualTheme.colors.primary})`,
                          }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-white/30"
                          style={{
                            backgroundColor: `rgb(${visualTheme.colors.secondary})`,
                          }}
                        />
                        <span
                          className="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"
                          style={{
                            backgroundColor: `rgb(${visualTheme.colors.background})`,
                          }}
                        />
                      </div>
                    </div>

                    {isActive && (
                      <span className="rounded-full bg-indigo-500 px-2.5 py-1 text-xs font-semibold text-white">
                        الحالي
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const IntegrationSettings: React.FC = () => {
  const integrations = [
    {
      name: "Facebook Messenger",
      status: "متصل",
      href: "/settings/facebook-oauth",
      accent: "text-green-600 dark:text-green-400",
      note: "إدارة الربط الآمن وصفحات الاستقبال.",
    },
    {
      name: "Telegram",
      status: "إعدادات متاحة",
      href: "/settings/telegram",
      accent: "text-blue-600 dark:text-blue-400",
      note: "ربط البوت وقنوات المحادثة.",
    },
  ];

  return (
    <div className="px-6 py-6">
      <SectionHeader
        title="التكاملات"
        description="نظرة سريعة على أهم التكاملات وروابط إدارتها."
      />

      <div className="space-y-4">
        {integrations.map((integration) => (
          <a
            key={integration.name}
            href={integration.href}
            className="block rounded-2xl border border-gray-200 p-5 transition hover:border-indigo-300 hover:shadow-sm dark:border-gray-700 dark:hover:border-indigo-700"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {integration.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {integration.note}
                </p>
              </div>
              <span className={`text-sm font-semibold ${integration.accent}`}>
                {integration.status}
              </span>
            </div>
          </a>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-900/20">
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          تم نقل إدارة الفواتير والاشتراك إلى صفحة مستقلة لسهولة الوصول وعدم
          تكرار الإعدادات.
        </p>
      </div>
    </div>
  );
};

const StoreSettingsRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/settings/store", { replace: true });
  }, [navigate]);

  return (
    <div className="px-6 py-10">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          جاري التحويل إلى إعدادات المتجر...
        </p>
      </div>
    </div>
  );
};

export default Settings;
