import React, { useState, useEffect, useCallback } from "react";
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
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Modal & Drawer State
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);

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

      const res: any = await apiClient.get("/shipping-companies", { params });
      if (res.data?.success) {
        setCompanies(res.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching shipping companies:", error);
      toast.error("تعذر جلب شركات الشحن");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, modeFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Toggle company active status with single click
  const handleToggleActive = async (company: ShippingCompany, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(company.id);
    const newStatus = !company.isActive;
    try {
      const res: any = await apiClient.patch(`/shipping-companies/${company.id}/toggle`, {
        isActive: newStatus,
      });
      if (res.data?.success) {
        toast.success(
          newStatus
            ? `تم تفعيل العمل مع ${company.name}`
            : `تم إيقاف العمل مع ${company.name}`
        );
        setCompanies((prev) =>
          prev.map((c) => (c.id === company.id ? { ...c, isActive: newStatus } : c))
        );
      } else {
        toast.error(res.data?.error || "تعذر تغيير حالة الشركة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء تغيير الحالة");
    } finally {
      setTogglingId(null);
    }
  };

  // Test API Connection
  const handleTestConnection = async (companyId: string) => {
    setTestingConnection(true);
    try {
      const res: any = await apiClient.post(`/shipping-companies/${companyId}/test-connection`);
      if (res.data?.success) {
        toast.success(res.data.message || "الاتصال ناجح ومكتمل");
      } else {
        toast.error(res.data?.error || "فشل الاتصال بشركة الشحن");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر فحص الاتصال");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleOpenSettings = (company: ShippingCompany) => {
    const settings = parseSettings(company.settings) as any;
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      apiKey: company.apiKey || settings.apiKey || "",
      apiUrl: company.apiUrl || "",
      providerKey: company.providerKey || "MANUAL",
      integrationMode: company.integrationMode || "MANUAL",
      autoCreateShipments: Boolean(settings.autoCreateShipments),
      isActive: company.isActive,
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

      const payload = {
        ...formData,
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

  const handleEnsureDemoCarriers = async () => {
    setCreatingDemo(true);
    try {
      const res: any = await apiClient.post("/shipping-companies/demo-carriers");
      if (res.data?.success) {
        toast.success("تم تجهيز شركات الشحن التجريبية بنجاح");
        fetchCompanies();
      } else {
        toast.error(res.data?.error || "فشل تجهيز الشركات التجريبية");
      }
    } catch {
      toast.error("تعذر إنشاء الشركات التجريبية");
    } finally {
      setCreatingDemo(false);
    }
  };

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
            to="/orders/shipments"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition"
          >
            سجلات الشحنات
          </Link>
          <button
            onClick={handleEnsureDemoCarriers}
            disabled={creatingDemo}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60 transition shadow-sm"
          >
            {creatingDemo ? "جاري التجهيز..." : "تفعيل شركات تجريبية (Demo)"}
          </button>
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            <span>إضافة شركة شحن</span>
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
      ) : companies.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <TruckIcon className="h-14 w-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            لا توجد شركات شحن مسجلة
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
            ابدأ بإضافة أول شركة شحن أو تفعيل الشركات التجريبية بنقرة واحدة
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
          {companies.map((company) => {
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
                    : "border-gray-200 dark:border-gray-700 opacity-75 bg-gray-50/50"
                }`}
              >
                {/* Card Top: Logo, Name & Toggle Switch */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        company.isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400"
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
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        {company.isActive ? "مفعلة" : "متوقفة"}
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
                    onClick={() => handleOpenSettings(company)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    <span>إعدادات الربط والـ API</span>
                  </button>

                  {isLive && (
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
              {companies.map((company) => (
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.isActive ? "text-emerald-600" : "text-gray-400"
                    }`}>
                      {company.isActive ? "● تعمل حالياً" : "○ متوقفة"}
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
                      onClick={() => handleOpenSettings(company)}
                      className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      فتح الإعدادات
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
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  اسم شركة الشحن *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: بوستا، أرامكس، مندوب القاهرة..."
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Provider Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    محول الربط البرمجي (Provider Driver)
                  </label>
                  <select
                    value={formData.providerKey}
                    onChange={(e) => {
                      const providerKey = e.target.value;
                      let defaultName = formData.name;
                      let defaultApiUrl = formData.apiUrl;
                      let defaultMode = formData.integrationMode;

                      if (providerKey === "QP_EXPRESS") {
                        if (!formData.name || formData.name.includes("تربو") || formData.name.includes("بوستا")) {
                          defaultName = "كيو بي إكسبريس (QP Express)";
                        }
                        defaultApiUrl = defaultApiUrl || "https://qpxpress.com:8001";
                        defaultMode = "LIVE";
                      } else if (providerKey === "BOSTA") {
                        if (!formData.name || formData.name.includes("تربو") || formData.name.includes("كيو بي")) {
                          defaultName = "بوستا (Bosta)";
                        }
                        defaultApiUrl = defaultApiUrl || "https://app.bosta.co";
                        defaultMode = "LIVE";
                      } else if (providerKey === "TURBO") {
                        if (!formData.name || formData.name.includes("بوستا") || formData.name.includes("كيو بي")) {
                          defaultName = "تربو (Turbo)";
                        }
                        defaultMode = "LIVE";
                      }

                      setFormData({
                        ...formData,
                        providerKey,
                        name: defaultName,
                        apiUrl: defaultApiUrl,
                        integrationMode: providerKey.endsWith("_DEMO")
                          ? "DEMO"
                          : providerKey === "MANUAL"
                          ? "MANUAL"
                          : defaultMode,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="MANUAL">أسطول يدوي / مندوب خاص (Manual)</option>
                    <option value="QP_EXPRESS">كيو بي إكسبريس (QP Express)</option>
                    <option value="BOSTA">بوستا (Bosta Courier)</option>
                    <option value="TURBO">تربو (Turbo Courier)</option>
                    <option value="ARAMEX_DEMO">أرامكس (Aramex Demo)</option>
                    <option value="MYLERZ_DEMO">مايلرز (Mylerz Demo)</option>
                    <option value="BOSTA_DEMO">بوستا ديمو (Bosta Demo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    وضع التكامل (Integration Mode)
                  </label>
                  <select
                    value={formData.integrationMode}
                    onChange={(e) => setFormData({ ...formData, integrationMode: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="LIVE">مباشر حقيقي (LIVE API)</option>
                    <option value="DEMO">بيئة تجريبية (Demo Sandbox)</option>
                    <option value="MANUAL">يدوي بدون API (Manual)</option>
                  </select>
                </div>
              </div>

              {/* DYNAMIC CARRIER CREDENTIALS SECTION */}

              {/* 1. QP Express Credentials */}
              {formData.providerKey === "QP_EXPRESS" && (
                <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      بيانات حساب شركتك لدى كيو بي إكسبريس (QP Express)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 font-semibold">
                      JWT Auth
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        اسم المستخدم / البريد الإلكتروني *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="مثال: company@qpxpress.com"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        كلمة المرور *
                      </label>
                      <input
                        type="password"
                        required={!editingCompany}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder={editingCompany ? "اتركها فارغة للإبقاء على الحالية" : "كلمة مرور حسابك في كيو بي"}
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        كود العميل لدى كيو بي (Customer ID) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.customerId}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                        placeholder="مثال: 8002"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رابط الـ API الخارجي
                      </label>
                      <input
                        type="text"
                        value={formData.apiUrl}
                        onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                        placeholder="https://qpxpress.com:8001"
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ملاحظات التسليم والمعاينة الافتراضية للبوليصة
                    </label>
                    <input
                      type="text"
                      value={formData.defaultNotes}
                      onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                      placeholder="مثال: المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* 2. Bosta Credentials */}
              {formData.providerKey === "BOSTA" && (
                <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                      إعدادات ربط حساب بوستا (Bosta Integration)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-semibold">
                      API Key
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      مفتاح الـ API (Bosta API Key) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="ألصق الـ API Key من لوحة تحكم حسابك في بوستا..."
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      معرف أو عنوان نقطة الاستلام (Pickup Hub / Location ID)
                    </label>
                    <input
                      type="text"
                      value={formData.pickupAddress}
                      onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                      placeholder="اختياري - يحدد نقطة استلام الشحنات من مخزنك"
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* 3. Turbo Credentials */}
              {formData.providerKey === "TURBO" && (
                <div className="p-3.5 bg-orange-50/40 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-900 dark:text-orange-300">
                      إعدادات ربط شركة تربو (Turbo Courier)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      مفتاح الـ API (Turbo API Key) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="مفتاح الـ API الخاص بحساب تربو..."
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        كود العميل الرئيسي (Main Client Code)
                      </label>
                      <input
                        type="text"
                        value={formData.mainClientCode}
                        onChange={(e) => setFormData({ ...formData, mainClientCode: e.target.value })}
                        placeholder="كود العميل..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رقم هاتف الراسل (Sender Phone)
                      </label>
                      <input
                        type="text"
                        value={formData.senderNumber}
                        onChange={(e) => setFormData({ ...formData, senderNumber: e.target.value })}
                        placeholder="رقم الهاتف..."
                        className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Manual Fleet or Demo info */}
              {formData.providerKey === "MANUAL" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      رقم هاتف المندوب أو مسؤول الشحن
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
              )}

              {formData.providerKey.endsWith("_DEMO") && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  شركة تجريبية تحاكي إنشاء الشحنات وتوليد أرقام التتبع تلقائياً للاختبار دون الحاجة لـ API Key حقيقي.
                </div>
              )}

              {/* Webhook URL for Receiving Carrier Status Updates */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-1.5">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  رابط الـ Webhook الخاص بالنظام
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  انسخ هذا الرابط وضعه في إعدادات حسابك في شركة الشحن لاستقبال تحديثات التوصيل آلياً:
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    readOnly
                    value={`${envConfig.backendUrl}/api/v1/shipments/webhook`}
                    className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded font-mono text-gray-600 dark:text-gray-300"
                  />
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded text-gray-700 dark:text-gray-200"
                    title="نسخ الرابط"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
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
