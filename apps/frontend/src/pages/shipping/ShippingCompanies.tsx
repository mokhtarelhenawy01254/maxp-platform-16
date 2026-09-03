import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
} from "@heroicons/react/24/outline";
import { envConfig } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";

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

  const providerLabels: Record<string, string> = {
    MANUAL: t("shipping.k_1") || "يدوي",
    TURBO: "Turbo",
    BOSTA: "Bosta",
    BOSTA_DEMO: "Bosta Demo",
    MYLERZ_DEMO: "Mylerz Demo",
    ARAMEX_DEMO: "Aramex Demo",
  };

  const integrationLabels: Record<string, string> = {
    MANUAL: t("shipping.k_1") || "يدوي",
    DEMO: t("shipping.k_2") || "تجريبي",
    LIVE: t("shipping.k_3") || "مباشر",
  };

  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<ShippingCompany | null>(null);

  // Search & Pagination States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
  });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (modeFilter !== "ALL") params.set("integrationMode", modeFilter);

      const response = await fetch(
        `${envConfig.backendUrl}/api/v1/shipping-companies?${params.toString()}`,
        {
          headers: tokenManager.createAuthHeaders(),
        },
      );
      const data = await response.json();
      if (data.success) {
        setCompanies(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCompanies(data.pagination.total || 0);
        } else {
          setTotalCompanies(Array.isArray(data.data) ? data.data.length : 0);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error("Error fetching shipping companies:", error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, statusFilter, modeFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(search);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = `${envConfig.backendUrl}/api/v1/shipping-companies${editingCompany ? `/${editingCompany.id}` : ""}`;
      const method = editingCompany ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        await fetchCompanies();
        setShowModal(false);
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
        });
      } else {
        alert(data.error || t("shipping.k_4"));
      }
    } catch (error) {
      console.error("Error saving shipping company:", error);
      alert(t("shipping.k_5"));
    }
  };

  const handleEdit = (company: ShippingCompany) => {
    const settings = parseSettings(company.settings);
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      apiKey: company.apiKey || "",
      apiUrl: company.apiUrl || "",
      providerKey: company.providerKey || "MANUAL",
      integrationMode: company.integrationMode || "MANUAL",
      autoCreateShipments: Boolean((settings as { autoCreateShipments?: boolean }).autoCreateShipments),
      isActive: company.isActive,
    });
    setShowModal(true);
  };

  const handleEnsureDemoCarriers = async () => {
    try {
      setCreatingDemo(true);
      const response = await fetch(
        `${envConfig.backendUrl}/api/v1/shipping-companies/demo-carriers`,
        {
          method: "POST",
          headers: tokenManager.createAuthHeaders({
            "Content-Type": "application/json",
          }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        alert(data.error || t("shipping.k_6"));
        return;
      }
      await fetchCompanies();
    } catch (error) {
      console.error("Error creating demo carriers:", error);
      alert(t("shipping.k_7"));
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("shipping.k_8"))) {
      try {
        const response = await fetch(
          `${envConfig.backendUrl}/api/v1/shipping-companies/${id}`,
          {
            method: "DELETE",
            headers: tokenManager.createAuthHeaders(),
          },
        );
        const data = await response.json();
        if (data.success) {
          await fetchCompanies();
        } else {
          alert(data.error || t("shipping.k_9"));
        }
      } catch (error) {
        console.error("Error deleting shipping company:", error);
        alert(t("shipping.k_9"));
      }
    }
  };

  const resetForm = () => {
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
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <TruckIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t("shipping.k_10") || "إدارة شركات الشحن"}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              تهيئة وإدارة الربط مع جميع شركات الشحن والمناديب وتحديد قدرات كل شركة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/orders/shipments"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            عرض سجلات الشحنات
          </Link>
          <button
            onClick={handleEnsureDemoCarriers}
            disabled={creatingDemo}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60 transition shadow-sm"
          >
            {creatingDemo ? t("shipping.k_11") : t("shipping.k_12")}
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <PlusIcon className="h-4 w-4" />
            <span>{t("shipping.k_25")}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Single-depth, responsive) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-3 shadow-sm">
        {/* Integration Mode Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-gray-100 dark:border-gray-700">
          {[
            { key: "ALL", label: "جميع طرق الربط" },
            { key: "LIVE", label: "ربط آلي مباشر (LIVE)" },
            { key: "DEMO", label: "شركات تجريبية (Demo Sandbox)" },
            { key: "MANUAL", label: "أسطول يدوي ومندوب خاص (Manual)" },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => {
                setModeFilter(mode.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                modeFilter === mode.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث باسم شركة الشحن، الرمز، أو الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </form>

          {/* Status Filter */}
          <div className="w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">كل الحالات</option>
              <option value="active">الشركات المفعلة فقط</option>
              <option value="inactive">الشركات المعطلة</option>
            </select>
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {t("shipping.k_17")}
            </p>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center">
            <TruckIcon className="h-14 w-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {t("shipping.k_46")}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("shipping.k_18")}
            </p>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
            >
              {t("shipping.k_25")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
              <thead className="bg-gray-50 dark:bg-gray-900/60 text-xs font-semibold text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">{t("shipping.k_47")}</th>
                  <th className="px-5 py-3.5">{t("shipping.k_48")}</th>
                  <th className="px-5 py-3.5">{t("shipping.k_49")}</th>
                  <th className="px-5 py-3.5">{t("shipping.k_50")}</th>
                  <th className="px-5 py-3.5 text-center">{t("shipping.k_51")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                {companies.map((company) => {
                  const settings = parseSettings(company.settings);
                  const autoCreate = Boolean((settings as any).autoCreateShipments);

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-750 transition"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <Link
                          to={`/shipping-companies/${company.slug || company.id}`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {company.name}
                        </Link>
                        {company.slug && (
                          <span className="block text-[11px] text-gray-400 mt-0.5">
                            /{company.slug}
                          </span>
                        )}
                        {company.website && (
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[11px] text-gray-400 hover:text-gray-600 mt-0.5"
                          >
                            {company.website}
                          </a>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 font-mono text-xs">
                        {company.phone || "-"}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {providerLabels[company.providerKey || "MANUAL"] || company.providerKey || t("shipping.k_1")}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            company.integrationMode === "LIVE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : company.integrationMode === "DEMO"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          }`}>
                            {integrationLabels[company.integrationMode || "MANUAL"] || company.integrationMode || t("shipping.k_1")}
                          </span>
                          {autoCreate && (
                            <span className="inline-flex rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium">
                              إنشاء آلي
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            company.isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {company.isActive ? t("shipping.k_19") : t("shipping.k_20")}
                        </span>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/shipping-companies/${company.slug || company.id}`}
                            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title={t("shipping.k_21")}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(company)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title={t("shipping.k_22")}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            title={t("shipping.k_23")}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              إجمالي {totalCompanies} شركة شحن — صفحة {page} من {totalPages}
            </p>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Adding / Editing Carrier */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingCompany ? t("shipping.k_24") : t("shipping.k_25")}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-right">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_52")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder={t("shipping.k_26")}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_53")}
                  <span className="text-gray-400 text-[11px] mr-1">
                    {t("shipping.k_27")}
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9\u0621-\u064A-]/g, ""),
                    })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="fiora, sola, aramex..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_29")}
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="+20..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_40")}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_41")}
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) =>
                    setFormData({ ...formData, apiKey: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                  placeholder={t("shipping.k_30")}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  API URL
                </label>
                <input
                  type="url"
                  value={formData.apiUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, apiUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono"
                  placeholder="https://api..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_54")}
                </label>
                <select
                  value={formData.providerKey}
                  onChange={(e) => {
                    const providerKey = e.target.value;
                    setFormData({
                      ...formData,
                      providerKey,
                      integrationMode: providerKey.endsWith("_DEMO")
                        ? "DEMO"
                        : formData.integrationMode,
                      autoCreateShipments: providerKey.endsWith("_DEMO")
                        ? true
                        : formData.autoCreateShipments,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="MANUAL">{t("shipping.k_1")}</option>
                  <option value="TURBO">{t("shipping.k_31")}</option>
                  <option value="BOSTA">{t("shipping.k_32")}</option>
                  <option value="BOSTA_DEMO">Bosta Demo</option>
                  <option value="MYLERZ_DEMO">Mylerz Demo</option>
                  <option value="ARAMEX_DEMO">Aramex Demo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("shipping.k_56")}
                </label>
                <select
                  value={formData.integrationMode}
                  onChange={(e) =>
                    setFormData({ ...formData, integrationMode: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="MANUAL">{t("shipping.k_1")}</option>
                  <option value="DEMO">{t("shipping.k_2")}</option>
                  <option value="LIVE">{t("shipping.k_3")}</option>
                </select>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="autoCreateShipments"
                  checked={formData.autoCreateShipments}
                  onChange={(e) =>
                    setFormData({ ...formData, autoCreateShipments: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="autoCreateShipments"
                  className="mr-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t("shipping.k_57")}
                  <span className="block text-[11px] text-gray-400">
                    {t("shipping.k_58")}
                  </span>
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isActive"
                  className="mr-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  {t("shipping.k_19")}
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {t("shipping.k_59")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs sm:text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  {editingCompany ? t("shipping.k_33") : t("shipping.k_34")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingCompanies;
