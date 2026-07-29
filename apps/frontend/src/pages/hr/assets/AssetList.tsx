import React, { useState, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { useCurrency } from "../../../hooks/useCurrency";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import AssetForm from "./AssetForm";
import AssetAssignmentModal from "./AssetAssignmentModal";

interface AssetListProps {
  refreshTrigger: number;
}

const AssetList: React.FC<AssetListProps> = ({ refreshTrigger }) => {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "", categoryId: "" });
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { formatPrice } = useCurrency();

  // Modals
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [assigningAsset, setAssigningAsset] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    // reset pagination on filters/search/refresh change
    setPage(1);
    setHasMore(true);
    fetchAssets(1, true);
  }, [refreshTrigger, search, filters]);

  const fetchCategories = async () => {
    try {
      const response = await companyAwareApi.get("/hr/assets/categories");
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchAssets = async (targetPage = page, replace = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", targetPage.toString());
      params.append("limit", "20");
      if (search) params.append("search", search);
      if (filters.status) params.append("status", filters.status);
      if (filters.categoryId) params.append("categoryId", filters.categoryId);

      const response = await companyAwareApi.get(
        `/hr/assets?${params.toString()}`,
      );
      if (response.data.success) {
        const newData = response.data.data || [];
        const pagination = response.data.pagination;
        setHasMore(
          pagination
            ? targetPage < pagination.totalPages
            : newData.length === 20
        );
        setAssets((prev) => {
          const combined = replace ? newData : [...prev, ...newData];
          // Ensure unique IDs to prevent key warnings
          const uniqueMap = new Map();
          combined.forEach((item: any) => uniqueMap.set(item.id, item));
          return Array.from(uniqueMap.values());
        });
        setPage(targetPage);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من استنساخ هذا الأصل؟")) return;

    const toastId = tToast.loading("AssetList.msg_b785");
    try {
      const response = await companyAwareApi.post(`/hr/assets/${id}/clone`);
      if (response.data.success) {
        toast.success(response.data.message || i18n.t("AssetList.msg_c0e9"), { id: toastId });
        fetchAssets(1, true); // Refresh list
      } else {
        toast.error(response.data.message || i18n.t("AssetList.msg_20bb"), { id: toastId });
      }
    } catch (error: any) {
      console.error("Error cloning asset:", error);
      toast.error(error.response?.data?.message || "فشل في استنساخ الأصل", { id: toastId });
    }
  };

  const handleDelete = async (id: string | string[]) => {
    const ids = Array.isArray(id) ? id : [id];
    if (ids.length === 0) return;

    const msg = ids.length > 1
      ? `هل أنت متأكد من حذف ${ids.length} أصول مختارة؟`
      : "هل أنت متأكد من حذف هذا الأصل؟";
    if (!window.confirm(msg)) return;

    const toastId = toast.loading(ids.length > 1 ? "جاري حذف الأصول..." : "جاري حذف الأصل...");
    try {
      await Promise.all(ids.map((assetId) => 
        companyAwareApi.delete(`/hr/assets/${assetId}`).catch(err => {
          console.error(`Failed to delete asset ${assetId}:`, err);
          throw err;
        })
      ));
      
      toast.success(ids.length > 1 ? `تم حذف ${ids.length} أصول بنجاح` : "تم حذف الأصل بنجاح", { id: toastId });
      setSelectedIds((prev) => prev.filter((i) => !ids.includes(i)));
      fetchAssets(1, true);
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      toast.error(error.response?.data?.message || "فشل في حذف الأصل", { id: toastId });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800/50",
      IN_USE: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50",
      MAINTENANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50",
      RETIRED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600",
      LOST: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/50",
      RESERVED: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50",
    };

    const labels: Record<string, string> = {
      AVAILABLE: "متاح",
      IN_USE: "في الاستخدام",
      MAINTENANCE: "في الصيانة",
      RETIRED: "تالف/مكهن",
      LOST: "مفقود",
      RESERVED: "محجوز",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100"}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="بحث بالاسم، الكود، الرقم التسلسلي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex space-x-2 space-x-reverse">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع الحالات</option>
              <option value="AVAILABLE">متاح</option>
              <option value="IN_USE">في الاستخدام</option>
              <option value="MAINTENANCE">في الصيانة</option>
              <option value="RETIRED">تالف/مكهن</option>
              <option value="LOST">مفقود</option>
            </select>

            <select
              value={filters.categoryId}
              onChange={(e) =>
                setFilters({ ...filters, categoryId: e.target.value })
              }
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-right w-12">
                <input
                  type="checkbox"
                  checked={assets.length > 0 && selectedIds.length === assets.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-white/30 text-violet-400 focus:ring-violet-400 focus:ring-offset-0 bg-white/10 cursor-pointer"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                الأصل
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                التصنيف
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                الحالة
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                العهدة الحالية
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                القيمة
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {search || filters.status || filters.categoryId
                    ? "لا توجد نتائج مطابقة للبحث/الفلاتر"
                    : "لا توجد أصول مسجلة حالياً"}
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                <tr
                  key={asset.id}
                  className={`transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-violet-50/70 dark:bg-violet-900/20 ring-1 ring-inset ring-violet-200 dark:ring-violet-700/30"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                  onClick={(e) => {
                    // Don't toggle on button/input clicks
                    if ((e.target as HTMLElement).closest('button, input, a')) return;
                    toggleSelect(asset.id);
                  }}
                >
                  <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(asset.id)}
                      className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-2 text-sm leading-tight">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {asset.name}
                      </span>
                      {asset.code && (
                        <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-200">
                          {asset.code}
                        </span>
                      )}
                      {asset.model && (
                        <span className="text-gray-500 dark:text-gray-400">
                          {asset.model}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {asset.category?.name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(asset.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {asset.currentHolder ? (
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold ml-2">
                          {asset.currentHolder.firstName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {asset.currentHolder.firstName}{" "}
                            {asset.currentHolder.lastName}
                          </div>
                          <div className="text-xs">
                            {asset.currentHolder.employeeNumber}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {asset.purchaseValue
                      ? formatPrice(asset.purchaseValue)
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2 space-x-reverse">
                      {asset.status === "AVAILABLE" ? (
                        <button
                          onClick={() =>
                            setAssigningAsset({ ...asset, type: "assign" })
                          }
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 bg-indigo-50 dark:bg-indigo-900/40 p-1.5 rounded-xl hover:bg-indigo-100 transition-all"
                          title="تسليم عهدة"
                        >
                          <UserPlusIcon className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            setAssigningAsset({ ...asset, type: "return" })
                          }
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 bg-orange-50 dark:bg-orange-900/40 p-1.5 rounded-xl hover:bg-orange-100 transition-all"
                          title="استرجاع عهدة"
                        >
                          <ArrowUturnLeftIcon className="h-5 w-5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleClone(asset.id)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-900 bg-amber-50 dark:bg-amber-900/40 p-1.5 rounded-xl hover:bg-amber-100 transition-all"
                        title="استنساخ"
                      >
                        <DocumentDuplicateIcon className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => setEditingAsset(asset)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 bg-blue-50 dark:bg-blue-900/40 p-1.5 rounded-xl hover:bg-blue-100 transition-all"
                        title="تعديل"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 bg-red-50 dark:bg-red-900/40 p-1.5 rounded-xl hover:bg-red-100 transition-all"
                        title="حذف"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {editingAsset && (
        <AssetForm
          initialData={editingAsset}
          usePortal={false}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null);
            fetchAssets(1, true);
          }}
        />
      )}

      {assigningAsset && (
        <AssetAssignmentModal
          asset={assigningAsset}
          type={assigningAsset.type}
          usePortal
          onClose={() => setAssigningAsset(null)}
          onSuccess={() => {
            setAssigningAsset(null);
            fetchAssets(1, true);
          }}
        />
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="p-4 text-center border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => fetchAssets(page + 1)}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            تحميل المزيد
          </button>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-[#1a1040] to-[#251858] text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-violet-900/40 border border-white/10 flex items-center gap-5 backdrop-blur-xl">
              {/* Counter */}
              <div className="flex items-center gap-3 border-l border-white/10 pl-5">
                <div className="p-2 bg-violet-500/30 rounded-lg">
                  <CheckIcon className="h-5 w-5 text-violet-300" />
                </div>
                <span className="font-bold text-sm whitespace-nowrap">
                  {selectedIds.length} عنصر محدد
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Delete */}
                <button
                  onClick={() => handleDelete(selectedIds)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-300 hover:text-white border border-red-400/20 hover:border-red-500 rounded-xl transition-all duration-200 font-medium text-sm group"
                >
                  <TrashIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">حذف</span>
                </button>

                {/* Status change */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl transition-all font-medium text-sm">
                    <span className="hidden sm:inline">تغيير الحالة</span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-44 bg-[#251854] border border-white/10 p-1">
                    {[
                      { key: "AVAILABLE", label: "متاح", dot: "bg-green-400" },
                      { key: "MAINTENANCE", label: "صيانة", dot: "bg-yellow-400" },
                      { key: "RETIRED", label: "تكهين", dot: "bg-gray-400" },
                      { key: "LOST", label: "مفقود", dot: "bg-red-400" },
                    ].map((status) => (
                      <DropdownMenuItem
                        key={status.key}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-right text-white focus:bg-white/10"
                        onSelect={async () => {
                          const toastId = tToast.loading("AssetList.loading_update_4408");
                          try {
                            await Promise.all(
                              selectedIds.map((assetId) =>
                                companyAwareApi.put(`/hr/assets/${assetId}`, { status: status.key })
                              )
                            );
                            toast.success(`تم تغيير حالة ${selectedIds.length} أصول إلى ${status.label}`, { id: toastId });
                            setSelectedIds([]);
                            fetchAssets(1, true);
                          } catch {
                            toast.error("فشل في تحديث الحالة", { id: toastId });
                          }
                        }}
                      >
                        <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                        <span className="flex-1">{status.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear selection */}
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  title="إلغاء التحديد"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetList;
