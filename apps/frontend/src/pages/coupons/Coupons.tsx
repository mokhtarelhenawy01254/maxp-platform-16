import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useCurrency } from "../../hooks/useCurrency";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import {
  TicketIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface Coupon {
  id: string;
  name: string;
  description: string;
  type: "percentage" | "fixed" | "free_shipping";
  value: number;
  minOrderAmount: number;
  maxDiscountAmount: number;
  usageLimit: number;
  usageCount: number;
  userUsageLimit: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  customerSegments: string[];
  createdAt: string;
  createdBy: string;
}

type CouponType = Coupon["type"];

const Coupons: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    isActive: "",
    type: "",
    customerSegment: "",
  });

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    name: "",
    description: "",
    type: "percentage" as "percentage" | "fixed" | "free_shipping",
    value: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 100,
    userUsageLimit: 1,
    validFrom: "",
    validTo: "",
    isActive: true,
    customerSegments: ["all"],
  });

  const getTypeText = (type: string) => {
    switch (type?.toLowerCase()) {
      case "percentage":
        return t("coupons.typePercentage");
      case "fixed":
      case "fixed_amount":
        return t("coupons.typeFixed");
      case "free_shipping":
        return t("coupons.typeFreeShipping");
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "percentage":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "fixed":
      case "fixed_amount":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "free_shipping":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.isActive) queryParams.append("isActive", filters.isActive);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.customerSegment)
        queryParams.append("customerSegment", filters.customerSegment);

      const response = await fetch(`${getApiUrl()}/coupons?${queryParams}`, {
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCoupons(data.data);
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
      alert(t("coupons.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const createCoupon = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/coupons`, {
        method: "POST",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(newCoupon),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`,
        );
      }

      const data = await response.json();
      if (data.success) {
        fetchCoupons();
        setShowCreateModal(false);
        setNewCoupon({
          code: "",
          name: "",
          description: "",
          type: "percentage",
          value: 0,
          minOrderAmount: 0,
          maxDiscountAmount: 0,
          usageLimit: 100,
          userUsageLimit: 1,
          validFrom: "",
          validTo: "",
          isActive: true,
          customerSegments: ["all"],
        });
        alert(t("coupons.created"));
      } else {
        alert(data.error || t("coupons.createFailed"));
      }
    } catch (error: unknown) {
      console.error("Error creating coupon:", error);
      alert(
        `${t("coupons.createFailed")}: ${
          error instanceof Error ? error.message : t("coupons.createError")
        }`,
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(t("coupons.codeCopied"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <TicketIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-3" />
              {t("coupons.pageTitle")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t("coupons.pageDescription")}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t("coupons.newCoupon")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border border-transparent dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("coupons.filterStatus")}
            </label>
            <select
              value={filters.isActive}
              onChange={(e) =>
                setFilters({ ...filters, isActive: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("coupons.filterAllStatuses")}</option>
              <option value="true">{t("coupons.filterActive")}</option>
              <option value="false">{t("coupons.filterInactive")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("coupons.filterType")}
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("coupons.filterAllTypes")}</option>
              <option value="percentage">{t("coupons.filterPercentage")}</option>
              <option value="fixed">{t("coupons.filterFixed")}</option>
              <option value="free_shipping">{t("coupons.filterFreeShipping")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("coupons.filterSegment")}
            </label>
            <select
              value={filters.customerSegment}
              onChange={(e) =>
                setFilters({ ...filters, customerSegment: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t("coupons.filterAllSegments")}</option>
              <option value="all">{t("coupons.filterAllCustomers")}</option>
              <option value="new">{t("coupons.filterNewCustomers")}</option>
              <option value="VIP">{t("coupons.filterVip")}</option>
              <option value="regular">{t("coupons.filterRegular")}</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({ isActive: "", type: "", customerSegment: "" })
              }
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              {t("coupons.filterReset")}
            </button>
          </div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-transparent dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableCode")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableName")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableType")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableValue")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableUsage")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableValidity")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableStatus")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("coupons.tableActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {coupons.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {coupon.id}
                      </div>
                      <button
                        onClick={() => copyToClipboard(coupon.id)}
                        className="mr-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {coupon.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatPrice(coupon.minOrderAmount || 0)}
                      {coupon.description.substring(0, 50)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(coupon.type)}`}
                    >
                      {getTypeText(coupon.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {coupon.type === "percentage" ||
                    coupon.type === "PERCENTAGE"
                      ? `${coupon.value}%`
                      : coupon.type === "fixed" ||
                          coupon.type === "FIXED" ||
                          coupon.type === "FIXED_AMOUNT"
                        ? `${coupon.value}`
                        : t("coupons.typeFreeShipping")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {coupon.usageCount} / {coupon.usageLimit}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full"
                        style={{
                          width: `${(coupon.usageCount / coupon.usageLimit) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div>{t("coupons.fromLabel")}: {formatDate(coupon.validFrom)}</div>
                    <div>{t("coupons.toLabel")}: {formatDate(coupon.validTo)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        coupon.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {coupon.isActive ? t("coupons.active") : t("coupons.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2 space-x-reverse">
                      <button
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setShowCouponModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {coupons.length === 0 && (
          <div className="text-center py-12">
            <TicketIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {t("coupons.noCoupons")}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("coupons.noCouponsDesc")}
            </p>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t("coupons.modalCreateTitle")}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.couponCode")} *
                  </label>
                  <input
                    type="text"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.codePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.couponName")} *
                  </label>
                  <input
                    type="text"
                    value={newCoupon.name}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.namePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t("coupons.description")}
                </label>
                <textarea
                  value={newCoupon.description}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder={t("coupons.descPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.discountType")} *
                  </label>
                  <select
                    value={newCoupon.type}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        type: e.target.value as CouponType,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="percentage">{t("coupons.typePercentage")}</option>
                    <option value="fixed">{t("coupons.typeFixed")}</option>
                    <option value="free_shipping">{t("coupons.typeFreeShipping")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.value")} *
                  </label>
                  <input
                    type="number"
                    value={newCoupon.value}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        value: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.valuePlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.minOrderAmount")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.minOrderAmount}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        minOrderAmount: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.minOrderPlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.maxDiscount")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.maxDiscountAmount}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        maxDiscountAmount: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.maxDiscountPlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.totalUsageLimit")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.usageLimit}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        usageLimit: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.totalUsagePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.perCustomerLimit")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.userUsageLimit}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        userUsageLimit: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t("coupons.perCustomerPlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.startDate")} *
                  </label>
                  <input
                    type="datetime-local"
                    value={newCoupon.validFrom}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, validFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.endDate")} *
                  </label>
                  <input
                    type="datetime-local"
                    value={newCoupon.validTo}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, validTo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newCoupon.isActive}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:border-gray-600"
                />
                <label className="mr-2 block text-sm text-gray-900 dark:text-gray-300">
                  {t("coupons.activateCoupon")}
                </label>
              </div>

              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t("coupons.cancel")}
                </button>
                <button
                  onClick={createCoupon}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  {t("coupons.create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Coupon Modal */}
      {showCouponModal && selectedCoupon && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t("coupons.modalViewTitle")}
              </h3>
              <button
                onClick={() => setShowCouponModal(false)}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {selectedCoupon.id}
                  </div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white mt-2">
                    {selectedCoupon.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedCoupon.description}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.tableType")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {getTypeText(selectedCoupon.type)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.value")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {selectedCoupon.type === "percentage" ||
                    selectedCoupon.type === "PERCENTAGE"
                      ? `${selectedCoupon.value}%`
                      : selectedCoupon.type === "fixed" ||
                          selectedCoupon.type === "FIXED" ||
                          selectedCoupon.type === "FIXED_AMOUNT"
                        ? `${selectedCoupon.value}`
                        : t("coupons.typeFreeShipping")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.minOrderAmount")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatPrice(selectedCoupon.minOrderAmount || 0)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.maxDiscount")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {selectedCoupon.maxDiscountAmount
                      ? formatPrice(selectedCoupon.maxDiscountAmount)
                      : t("coupons.notSpecified")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.totalUsageLimit")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {selectedCoupon.usageCount} /{" "}
                    {selectedCoupon.usageLimit || "∞"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.tableStatus")}
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedCoupon.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {selectedCoupon.isActive ? t("coupons.active") : t("coupons.inactive")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.startDate")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(selectedCoupon.validFrom)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.endDate")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(selectedCoupon.validTo)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t("coupons.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
