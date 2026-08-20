import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  customerService,
  Customer,
  CustomerFilters,
} from "../../services/customerService";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useDateFormat } from "../../hooks/useDateFormat";
import CustomerImportModal from "./CustomerImportModal";
import { useAuth } from "../../hooks/useAuthSimple";

const LeadsList: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 10,
    sortBy: "updatedAt",
    sortOrder: "desc",
    status: "LEAD", // Default to LEAD
    hasOrders: false,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const statusOptions = customerService.getStatusOptions();

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عميل محتمل؟`)) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => customerService.deleteCustomer(id)),
      );
      setSelectedIds(new Set());
      loadCustomers();
    } catch (err: any) {
      setError(err.message || "فشل في حذف العملاء");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customerService.getCustomers(filters);
      setCustomers(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || t("customers.loadingError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchQuery,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      await customerService.exportCustomers(format, filters);
    } catch (err: any) {
      setError(err.message || t("customers.exportError"));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(
      (option) => option.value === status,
    );
    if (!statusOption) return null;

    const colorClasses = {
      yellow: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
      gray: "bg-gray-100 text-gray-800",
      purple: "bg-purple-100 text-purple-800",
      red: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusOption.color as keyof typeof colorClasses]}`}
      >
        {statusOption.label}
      </span>
    );
  };

  const getRatingBadge = (rating: string | undefined) => {
    if (!rating) return null;
    switch (rating) {
      case "EXCELLENT":
        return (
          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full ring-1 ring-purple-600/20">
            💎 Excellent
          </span>
        );
      case "GOOD":
        return (
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ring-1 ring-blue-600/20">
            ✅ Good
          </span>
        );
      case "AVERAGE":
        return (
          <span className="ml-2 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full ring-1 ring-gray-600/20">
            Average
          </span>
        );
      case "BAD":
        return (
          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full ring-1 ring-red-600/20">
            ⛔ Bad
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              العملاء المحتملين (Leads)
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              إدارة ومتابعة العملاء الذين لم يكملوا عمليات الشراء بعد
            </p>
          </div>
          {isAdmin && (
            <div className="flex space-x-3 space-x-reverse">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowUpTrayIcon className="h-4 w-4 ml-2" />
                استيراد
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
                تصدير CSV
              </button>
              <Link
                to="/customers/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <PlusIcon className="h-4 w-4 ml-2" />
                إضافة عميل محتمل
              </Link>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-md">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث بالاسم، الهاتف أو البريد..."
                  className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:text-gray-100"
                />
              </div>
            </form>

            <div className="flex items-center text-sm text-gray-500 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-md border border-indigo-100 dark:border-indigo-800">
              <UserGroupIcon className="h-5 w-5 ml-2 text-indigo-500" />
              عرض العملاء بحالة:{" "}
              <span className="mr-1 font-bold text-indigo-700 dark:text-indigo-400">
                عميل محتمل (LEAD)
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-md overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === customers.length &&
                        customers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    العميل المحتمل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    معلومات التواصل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الحالة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    الإحصائيات
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    آخر نشاط
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.has(customer.id) ? "bg-indigo-50 dark:bg-indigo-900/10" : ""}`}
                  >
                    <td className="px-4 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                              {customer.firstName &&
                                customer.firstName.charAt(0)}
                              {customer.lastName && customer.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                            {customer.firstName || ""} {customer.lastName || ""}
                            {getRatingBadge(customer.customerRating)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {customer.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {customer.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        المحادثات: {customer._count?.conversations || 0}
                      </div>
                      <div>الطلبات: {customer._count?.orders || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(customer.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 space-x-reverse">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    عرض{" "}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    إلى{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}
                    </span>{" "}
                    من أصل{" "}
                    <span className="font-medium">{pagination.total}</span>{" "}
                    نتيجة
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      السابق
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      التالي
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && customers.length === 0 && (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              لا يوجد عملاء محتملين
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              ابدأ بإضافة أول عميل محتمل لمتابعته
            </p>
          </div>
        )}
      </div>

      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          loadCustomers();
        }}
      />
    </>
  );
};

export default LeadsList;
