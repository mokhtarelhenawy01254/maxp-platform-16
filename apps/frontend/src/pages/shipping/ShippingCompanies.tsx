import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  TruckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ClipboardDocumentIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";
import { envConfig } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { apiClient } from "../../services/apiClient";

interface ShippingCompany {
  id: string;
  name: string;
  slug?: string;
  phone?: string;
  email?: string;
  website?: string;
  apiKey?: string;
  apiUrl?: string;
  providerKey?: string;
  integrationMode?: string;
  settings?: string | null;
  isActive: boolean;
  createdAt: string;
}

const parseSettings = (value?: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const ShippingCompanies: React.FC = () => {
  const { t: tVal } = useTranslation();
  const t = tVal as any;

  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Modal & Drawer State
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testedProfile, setTestedProfile] = useState<{ customerId?: number; customerName?: string; address?: string } | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [modeFilter, setModeFilter] = useState<string>("ALL");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    phone: "",
    email: "",
    website: "",
    apiKey: "",
    apiUrl: "",
    providerKey: "MANUAL",
    integrationMode: "MANUAL",
    autoCreateShipments: false,
    isActive: true,
    username: "",
    password: "",
    customerId: "",
    defaultNotes: "",
    pickupAddress: "",
    mainClientCode: "",
    senderNumber: "",
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { all: "true" };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;
      if (modeFilter !== "ALL") params.integrationMode = modeFilter;

      const res = await apiClient.get("/shipping-companies", { params });
      if (res.data?.success) {
        setCompanies(res.data.data || []);
      }
    } catch (err: any) {
      console.error("Failed to load shipping companies:", err);
      toast.error("تعذر تحميل قائمة شركات الشحن");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modeFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);


  const handleToggleActive = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(company.id);
    try {
      const res: any = await apiClient.patch(`/shipping-companies/${company.id}/toggle`, {
        isActive: !company.isActive,
      });
      if (res.data?.success) {
        toast.success(
          company.isActive ? `تم إيقاف ${company.name}` : `تم تفعيل ${company.name} للعمل`
        );
        fetchCompanies();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء تغيير الحالة");
    } finally {
      setTogglingId(null);
    }
  };

  // Test API Connection
  const handleTestConnection = async (companyId?: string) => {
    const targetId = companyId || editingCompany?.id;
    if (!targetId) return;

    setTestingConnection(true);
    try {
      const payload = {
        username: formData.username,
        password: formData.password,
        apiKey: formData.apiKey,
        apiUrl: formData.apiUrl,
      };
      const res: any = await apiClient.post(`/shipping-companies/${targetId}/test-connection`, payload);
      if (res.data?.success) {
        toast.success(res.data.message || "الاتصال ناجح ومكتمل");
        if (res.data.data) {
          setTestedProfile(res.data.data);
          if (res.data.data.customerId) {
            setFormData((prev) => ({
              ...prev,
              customerId: String(res.data.data.customerId),
              pickupAddress: prev.pickupAddress || res.data.data.address || "",
            }));
          }
        }
        fetchCompanies();
      } else {
        toast.error(res.data?.error || "فشل الاتصال بشركة الشحن");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر فحص الاتصال");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenSettings = (company: ShippingCompany, autoActivate = false) => {
    const settings = parseSettings(company.settings) as any;
    setEditingCompany(company);
    setShowAdvanced(false);
    setTestedProfile(null);
    setFormData({
      name: company.name,
      slug: company.slug || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      apiKey: company.apiKey || settings.apiKey || "",
      apiUrl: company.apiUrl || (company.providerKey === "QP_EXPRESS" ? "https://qpxpress.com:8001" : company.providerKey === "BOSTA" ? "https://app.bosta.co" : ""),
      providerKey: company.providerKey || "MANUAL",
      integrationMode: company.integrationMode || "MANUAL",
      autoCreateShipments: Boolean(settings.autoCreateShipments),
      isActive: autoActivate ? true : company.isActive,
      username: settings.username || "",
      password: settings.password || "",
      customerId: settings.customerId ? String(settings.customerId) : "",
      defaultNotes: settings.defaultNotes || "",
      pickupAddress: settings.pickupAddress || "",
      mainClientCode: settings.mainClientCode ? String(settings.mainClientCode) : "",
      senderNumber: settings.senderNumber || "",
    });
    setShowModal(true);
  };

  const handleOpenNewModal = () => {
    setEditingCompany(null);
    setShowAdvanced(false);
    setTestedProfile(null);
    setFormData({
      name: "",
      slug: "",
      phone: "",
      email: "",
      website: "",
      apiKey: "",
      apiUrl: "",
      providerKey: "MANUAL",
      integrationMode: "MANUAL",
      autoCreateShipments: false,
      isActive: true,
      username: "",
      password: "",
      customerId: "",
      defaultNotes: "",
      pickupAddress: "",
      mainClientCode: "",
      senderNumber: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `/shipping-companies${editingCompany ? `/${editingCompany.id}` : ""}`;
      const method = editingCompany ? "put" : "post";

      const settingsPayload = {
        autoCreateShipments: formData.autoCreateShipments,
        username: formData.username || undefined,
        password: formData.password || undefined,
        customerId: formData.customerId ? Number(formData.customerId) : undefined,
        defaultNotes: formData.defaultNotes || undefined,
        pickupAddress: formData.pickupAddress || undefined,
        mainClientCode: formData.mainClientCode || undefined,
        senderNumber: formData.senderNumber || undefined,
        apiKey: formData.apiKey || undefined,
      };

      const resolvedIntegrationMode =
        (formData.providerKey === "QP_EXPRESS" && (formData.username || formData.password))
          ? "LIVE"
          : (formData.providerKey === "BOSTA" && formData.apiKey)
          ? "LIVE"
          : (formData.providerKey === "TURBO" && formData.apiKey)
          ? "LIVE"
          : formData.integrationMode;

      const payload = {
        ...formData,
        integrationMode: resolvedIntegrationMode,
        settings: JSON.stringify(settingsPayload),
      };

      const res = await (apiClient as any)[method](url, payload);
      if (res.data?.success) {
        toast.success(
          editingCompany
            ? "تم حفظ إعدادات الربط بنجاح"
            : "تمت إضافة شركة الشحن بنجاح"
        );
        setShowModal(false);
        fetchCompanies();
      } else {
        toast.error(res.data?.error || "تعذر حفظ إعدادات الشركة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء الحفظ");
    }
  };

  const handleDelete = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف شركة الشحن "${company.name}"؟`)) {
      try {
        const res: any = await apiClient.delete(`/shipping-companies/${company.id}`);
        if (res.data?.success) {
          toast.success("تم حذف شركة الشحن بنجاح");
          fetchCompanies();
        } else {
          toast.error(res.data?.error || "فشل الحذف");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "تعذر الحذف");
      }
    }
  };

  // Deduplicate and prioritize standard carriers at the top
  const displayedCompanies = useMemo(() => {
    const seenStandardKeys = new Set<string>();
    const result: ShippingCompany[] = [];

    // Priority ordering: QP Express first, Bosta second, Turbo third, then custom/manual
    const priorityWeight = (item: ShippingCompany) => {
      if (item.providerKey === "QP_EXPRESS") return 1;
      if (item.providerKey === "BOSTA") return 2;
      if (item.providerKey === "TURBO") return 3;
      return 10;
    };

    const sorted = [...companies].sort((a, b) => {
      const diff = priorityWeight(a) - priorityWeight(b);
      if (diff !== 0) return diff;
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    for (const c of sorted) {
      if (c.providerKey && ["QP_EXPRESS", "BOSTA", "TURBO"].includes(c.providerKey)) {
        if (seenStandardKeys.has(c.providerKey)) continue;
        seenStandardKeys.add(c.providerKey);
      }
      result.push(c);
    }

    return result;
  }, [companies]);

  const copyWebhookUrl = () => {
    const webhookUrl = `${envConfig.backendUrl}/api/v1/shipments/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    toast.success("تم نسخ رابط الـ Webhook");
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TruckIcon className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            <span>مركز شركات الشحن والربط الآلي</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            إدارة وتفعيل شركات الشحن والمناديب، وضبط مفاتيح الـ API وفحص الاتصال من مكان واحد
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/settings/turbo/status-mapping"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            ربط حالات الشحن (Turbo)
          </Link>
          <Link
            to="/shipping/couriers"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            إدارة المناديب الداخليين
          </Link>
          <Link
            to="/orders/shipments"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
          >
            سجلات الشحنات
          </Link>
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            <span>إضافة شركة شحن خاصة / مندوب</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم شركة الشحن، الرمز، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mode & Status Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="all">كل الحالات</option>
              <option value="active">المفعلة للعمل</option>
              <option value="inactive">المتوقفة</option>
            </select>

            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="ALL">جميع أنواع الربط</option>
              <option value="LIVE">ربط مباشر (LIVE)</option>
              <option value="DEMO">تجريبي (DEMO)</option>
              <option value="MANUAL">يدوي / مناديب (MANUAL)</option>
            </select>

            {/* View Switcher (Cards vs Table) */}
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-2 ${viewMode === "cards" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                title="عرض بطاقات"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-2 ${viewMode === "table" ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                title="عرض جدول"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            جاري جلب شركات الشحن وإعدادات الربط...
          </p>
        </div>
      ) : displayedCompanies.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TruckIcon className="h-14 w-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            لا توجد شركات شحن مسجلة
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            ابدأ بإضافة أول شركة شحن أو تفعيل شركات الشحن المعتمدة
          </p>
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
          >
            إضافة شركة شحن الآن
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* 1. CARDS / GRID VIEW (Modern Hub) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCompanies.map((company) => {
            const hasApiKey = Boolean(company.apiKey);
            const isLive = company.integrationMode === "LIVE";
            const isDemo = company.integrationMode === "DEMO";
            const isManual = company.integrationMode === "MANUAL";

            return (
              <div
                key={company.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border transition shadow-sm hover:shadow-md flex flex-col justify-between p-4 sm:p-5 ${
                  company.isActive
                    ? "border-gray-200 dark:border-gray-700"
                    : "border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-50/25 to-transparent dark:from-indigo-950/20"
                }`}
              >
                {/* Card Top: Logo, Name & Toggle Switch */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        company.isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                          : "bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      }`}>
                        <TruckIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          {company.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">
                          /{company.slug || company.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    {/* Quick Toggle Active Switch */}
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${
                        company.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                      }`}>
                        {company.isActive ? "مفعلة" : "جاهزة للربط"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleToggleActive(company, e)}
                        disabled={togglingId === company.id}
                        className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          company.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                        title={company.isActive ? "إيقاف العمل بالشركة" : "تفعيل العمل بالشركة"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            company.isActive ? "translate-x-0" : "-translate-x-5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      isLive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : isDemo
                        ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      <SignalIcon className="h-3 w-3" />
                      <span>{company.integrationMode || "MANUAL"}</span>
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {company.providerKey || "MANUAL"}
                    </span>

                    {!company.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                        ⚡ غير مفعلة (جاهزة للربط)
                      </span>
                    )}

                    {/* Connection Indicator */}
                    {isLive && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        company.providerKey === "QP_EXPRESS"
                          ? (company.apiKey || (parseSettings(company.settings) as any).username) && (parseSettings(company.settings) as any).customerId
                            ? "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300"
                            : "text-amber-600 dark:text-amber-400"
                          : hasApiKey
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}>
                        {company.providerKey === "QP_EXPRESS"
                          ? (parseSettings(company.settings) as any).customerId
                            ? `● عميل كيو بي #${(parseSettings(company.settings) as any).customerId}`
                            : "▲ ينقص كود العميل"
                          : hasApiKey
                          ? "● مفتاح الـ API مسجل"
                          : "▲ ينقص الـ API Key"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Action Buttons */}
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenSettings(company, !company.isActive)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition shadow-sm ${
                      company.isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {company.isActive ? (
                      <>
                        <PencilIcon className="h-3.5 w-3.5" />
                        <span>إعدادات الربط والـ API</span>
                      </>
                    ) : (
                      <>
                        <KeyIcon className="h-3.5 w-3.5" />
                        <span>تفعيل وإعدادات الربط</span>
                      </>
                    )}
                  </button>

                  {isLive && company.isActive && (
                    <button
                      type="button"
                      onClick={() => handleTestConnection(company.id)}
                      disabled={testingConnection}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title="فحص واختبار الاتصال بالسيرفر"
                    >
                      <ArrowPathIcon className={`h-3 w-3 ${testingConnection ? "animate-spin" : ""}`} />
                      <span>فحص</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(company, e)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    title="حذف الشركة"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. TABLE VIEW */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3.5">شركة الشحن</th>
                <th className="px-5 py-3.5">طريقة الربط</th>
                <th className="px-5 py-3.5">حالة العمل</th>
                <th className="px-5 py-3.5">تفعيل / إيقاف</th>
                <th className="px-5 py-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
              {displayedCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-750">
                  <td className="px-5 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                    {company.name}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {company.integrationMode || "MANUAL"}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      company.isActive
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                    }`}>
                      {company.isActive ? "● مفعلة وتعمل" : "⚡ جاهزة للربط"}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => handleToggleActive(company, e)}
                      disabled={togglingId === company.id}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                        company.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                          company.isActive ? "translate-x-0" : "-translate-x-5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenSettings(company, !company.isActive)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                        company.isActive
                          ? "text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/40"
                          : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      }`}
                    >
                      {company.isActive ? "إعدادات الربط" : "تفعيل والربط"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings / Configure Drawer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto space-y-4 p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
                  <KeyIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {editingCompany ? `إعدادات ربط ${editingCompany.name}` : "إضافة شركة شحن جديدة"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    تهيئة مفاتيح الاتصال البرمجي وتدفق الشحنات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 text-right">
              {/* 1. QP Express Dedicated Wizard */}
              {formData.providerKey === "QP_EXPRESS" && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/60 dark:from-indigo-950/40 dark:to-blue-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                          كيو بي إكسبريس (QP Express)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                          ربط مباشر حقيقي (LIVE)
                        </span>
                      </div>
                      {(testedProfile?.customerId || formData.customerId) && (
                        <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 rounded-md">
                          كود العميل: #{testedProfile?.customerId || formData.customerId}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-indigo-950 dark:text-indigo-300/90 leading-relaxed">
                      💡 <strong>كل ما تحتاجه للربط:</strong> أدخل فقط <strong>اسم المستخدم وكلمة المرور</strong> لحسابك في كيو بي إكسبريس. سيقوم النظام تلقائياً بالتحقق واستخراج كود العميل وبيانات متجرك وربطها بدون أي خطوات يدوية معقدة.
                    </p>

                    {(testedProfile?.customerName || (formData.customerId && editingCompany)) && (
                      <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>
                          تم التعرف على الحساب بنجاح: <strong>{testedProfile?.customerName || "حساب معتمد"}</strong> (كود العميل #{testedProfile?.customerId || formData.customerId})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        اسم المستخدم أو البريد الإلكتروني *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="مثال: your-account@qpxpress.com"
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-0.5">اسم الدخول لحسابك في موقع QP Express</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                        كلمة المرور *
                      </label>
                      <input
                        type="password"
                        required={!editingCompany || !formData.username}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingCompany ? "•••••••• (اتركها للإبقاء على الحالية)" : "كلمة مرور حسابك في كيو بي"}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-0.5">كلمة مرور حسابك في موقع QP Express</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ملاحظات المعاينة والتسليم الافتراضية للبوليصة (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.defaultNotes}
                      onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                      placeholder="مثال: المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <p className="text-[11px] text-gray-400 mt-0.5">تطبع هذه الملاحظات تلقائياً على كل بوليصة شحن تصدرها لعملائك</p>
                  </div>
                </div>
              )}

              {/* 2. Bosta Dedicated Wizard */}
              {formData.providerKey === "BOSTA" && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-gradient-to-r from-orange-50/90 to-amber-50/60 dark:from-orange-950/40 dark:to-amber-950/20 rounded-xl border border-orange-200 dark:border-orange-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-orange-950 dark:text-orange-200">
                        بوستا (Bosta Courier)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                        ربط مباشر حقيقي (LIVE)
                      </span>
                    </div>

                    <p className="text-xs text-orange-950 dark:text-orange-300/90 leading-relaxed">
                      💡 <strong>كل ما تحتاجه للربط:</strong> مفتاح الـ API الخاص بحسابك في بوستا. يمكنك نسخه من لوحة تحكم بوستا (من القائمة: الإعدادات ⇦ مفاتيح الـ API ⇦ API Keys).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      مفتاح الـ API (Bosta API Key) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="ألصق الـ API Key من لوحة تحكم حسابك في بوستا..."
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-[11px] text-gray-400 mt-0.5">يمكنك نسخه من حسابك في بوستا: الإعدادات ⇦ مفاتيح API</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      عنوان أو كود نقطة الاستلام (Pickup Hub) - اختياري
                    </label>
                    <input
                      type="text"
                      value={formData.pickupAddress}
                      onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                      placeholder="اتركه فارغاً ليتم الاستلام من العنوان الافتراضي لحسابك"
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* 3. Turbo Dedicated Wizard */}
              {formData.providerKey === "TURBO" && (
                <div className="space-y-3.5">
                  <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/20 rounded-xl border border-blue-200 dark:border-blue-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-blue-950 dark:text-blue-200">
                        تربو (Turbo Courier)
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                        ربط مباشر حقيقي (LIVE)
                      </span>
                    </div>
                    <p className="text-xs text-blue-950 dark:text-blue-300/90 leading-relaxed">
                      💡 أدخل مفتاح الـ API الخاص بحسابك لدى شركة تربو.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                      مفتاح الـ API (Turbo API Key) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="مفتاح الـ API الخاص بحساب تربو..."
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        كود العميل الرئيسي (اختياري)
                      </label>
                      <input
                        type="text"
                        value={formData.mainClientCode}
                        onChange={(e) => setFormData({ ...formData, mainClientCode: e.target.value })}
                        placeholder="كود العميل في تربو..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        هاتف الراسل (اختياري)
                      </label>
                      <input
                        type="text"
                        value={formData.senderNumber}
                        onChange={(e) => setFormData({ ...formData, senderNumber: e.target.value })}
                        placeholder="رقم الهاتف المسجل..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Custom Manual / Fleet */}
              {formData.providerKey === "MANUAL" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      اسم شركة الشحن أو المندوب *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="مثال: أسطول التوصيل الداخلي، مندوب الجيزة..."
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رقم هاتف المندوب
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="01xxxxxxxxx"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        البريد الإلكتروني (اختياري)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="driver@company.com"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Advanced Settings (For Developers/Integrators) */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-3">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-900/40 text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <span>⚙️ خيارات متقدمة وروابط الاتصال (للمطورين)</span>
                  <span className="text-[11px] text-gray-400 font-mono">{showAdvanced ? "▲ إخفاء" : "▼ إظهار"}</span>
                </button>

                {showAdvanced && (
                  <div className="p-3.5 space-y-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        اسم العرض المسجل
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          نوع الناقل البرمجي (Provider)
                        </label>
                        <select
                          value={formData.providerKey}
                          onChange={(e) => setFormData({ ...formData, providerKey: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        >
                          <option value="QP_EXPRESS">كيو بي إكسبريس (QP Express)</option>
                          <option value="BOSTA">بوستا (Bosta Courier)</option>
                          <option value="TURBO">تربو (Turbo Courier)</option>
                          <option value="MANUAL">أسطول يدوي / مناديب (Manual)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          وضع التكامل
                        </label>
                        <select
                          value={formData.integrationMode}
                          onChange={(e) => setFormData({ ...formData, integrationMode: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        >
                          <option value="LIVE">مباشر حقيقي (LIVE API)</option>
                          <option value="DEMO">بيئة تجريبية (Demo Sandbox)</option>
                          <option value="MANUAL">يدوي بدون API (Manual)</option>
                        </select>
                      </div>
                    </div>

                    {formData.providerKey === "QP_EXPRESS" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            رابط السيرفر الخارجي (API Base URL)
                          </label>
                          <input
                            type="text"
                            value={formData.apiUrl}
                            onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                            placeholder="https://qpxpress.com:8001"
                            className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            كود العميل اليدوي (يتم استخراجه آلياً)
                          </label>
                          <input
                            type="text"
                            value={formData.customerId}
                            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                            placeholder="يكتشفه النظام تلقائياً"
                            className="w-full px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Webhook URL */}
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-200 dark:border-gray-700/80 space-y-1">
                      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        رابط الـ Webhook الخاص بنظامك لاستقبال التحديثات:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${envConfig.backendUrl}/api/v1/shipments/webhook`}
                          className="flex-1 px-2 py-1 text-[11px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono text-gray-600 dark:text-gray-300"
                        />
                        <button
                          type="button"
                          onClick={copyWebhookUrl}
                          className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-gray-700 dark:text-gray-200"
                          title="نسخ"
                        >
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Status Checkbox */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <input
                  type="checkbox"
                  id="modalIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="modalIsActive" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <span className="font-bold text-gray-900 dark:text-white">تفعيل شركة الشحن للعمل بالمتجر فوراً</span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                    عند التفعيل تظهر الشركة مباشرة في شحن الطلبات الفردية والجماعية وتوليد البوالص
                  </span>
                </label>
              </div>

              {/* Auto Create Shipments Checkbox */}
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modalAutoCreate"
                  checked={formData.autoCreateShipments}
                  onChange={(e) => setFormData({ ...formData, autoCreateShipments: e.target.checked })}
                  className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="modalAutoCreate" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <span className="font-semibold">إنشاء الشحنات تلقائياً</span>
                  <span className="block text-[11px] text-gray-400">
                    إرسال الطلب لشركة الشحن آلياً بمجرد تأكيد الطلب أو نقله للتجهيز
                  </span>
                </label>
              </div>

              {/* Action Buttons & Test Connection */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                {editingCompany ? (
                  <button
                    type="button"
                    onClick={() => handleTestConnection(editingCompany.id)}
                    disabled={testingConnection}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${testingConnection ? "animate-spin" : ""}`} />
                    <span>فحص واختبار الاتصال</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    حفظ الإعدادات
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCompanies;
