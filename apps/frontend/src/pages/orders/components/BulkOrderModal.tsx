import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";

interface BulkOrderItem {
  row: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  governorate: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  notes: string;
}

interface BulkOrderModalProps {
  item?: {
    id: string;
    name: string;
    description?: string;
    operationNumber: string;
    status: string;
    totalOrders: number;
  } | null;
  onClose: () => void;
  onSaved: () => void;
}

const uploadFile = async (bulkOrderId: string, file: File): Promise<BulkOrderItem[]> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post(`/api/v1/bulk-orders/${bulkOrderId}/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data?.items || [];
};

const downloadTemplate = () => {
  const headers = [
    "Order Number",
    "Customer Name",
    "Phone",
    "City",
    "Governorate",
    "Product Name",
    "SKU",
    "Size",
    "Color",
    "Quantity",
    "Price",
    "Notes",
  ];
  const sample = ["ORD-2026-0001", "Ahmed Mohamed", "01001234567", "Nasr City", "Cairo", "Nike Air Max 270", "NIKE-AM270-BLK", "42", "Black", "2", "150.00", "عاجل - توصيل سريع"];
  const csvContent = "\uFEFF" + [headers, sample].map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "bulk_order_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const BulkOrderModal = ({ item, onClose, onSaved }: BulkOrderModalProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const [status, setStatus] = useState(item?.status || "DRAFT");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importedItems, setImportedItems] = useState<BulkOrderItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    if (item) {
      try {
        const items = await uploadFile(item.id, file);
        if (items.length > 0) {
          setImportedItems(items);
          toast.success(t("orders.bulkImportSuccess", { count: items.length }));
        }
      } catch (err) {
        setError(t("orders.bulkUploadFailed") || "Failed to upload file");
      }
    } else {
      setPendingFile(file);
      setError("");
      toast.info(t("orders.bulkFileWillUploadAfterSave") || "File will be uploaded after saving");
    }
  }, [item, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t("orders.bulkNamePlaceholder"));
      return;
    }
    setSaving(true);
    setError("");

    try {
      let savedId: string | null = item?.id || null;

      if (item) {
        await apiClient.put(`/api/v1/bulk-orders/${item.id}`, { name, description, status });
        toast.success(t("orders.bulkUpdated"));
      } else {
        const res = await apiClient.post("/api/v1/bulk-orders", { name, description, status });
        savedId = res.data?.data?.id;
        toast.success(t("orders.bulkCreated"));
      }

      if (pendingFile && savedId) {
        try {
          const items = await uploadFile(savedId, pendingFile);
          if (items.length > 0) {
            toast.success(t("orders.bulkImportSuccess", { count: items.length }));
          }
        } catch {
          toast.error(t("orders.bulkUploadFailed") || "File upload failed after save");
        }
      }

      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || t("orders.saveFailed") || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl mx-4 shadow-xl" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {item ? t("orders.bulkEditTitle") : t("orders.bulkCreateTitle")}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("orders.bulkNameLabel")}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("orders.bulkNamePlaceholder")}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("orders.bulkDescriptionLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("orders.bulkDescriptionPlaceholder")}
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("orders.bulkDefaultStatus")}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"].map((s) => (
                <option key={s} value={s}>{t(`orders.bulkStatus${s}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("orders.bulkUploadFile")}
              </label>
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("orders.bulkDownloadTemplate") || "Download Template"}
              </button>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                  : pendingFile
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              {pendingFile ? (
                <div className="text-center">
                  <svg className="w-10 h-10 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">{pendingFile.name}</p>
                  <p className="text-xs text-green-500 dark:text-green-400 mt-1">
                    {t("orders.bulkFileWillUploadAfterSave") || "Will be uploaded after save"}
                  </p>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t("orders.bulkUploadHint")}</p>
                </>
              )}
            </div>
          </div>

          {importedItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("orders.bulkItems")} ({importedItems.length})
              </h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkOrderNumber")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemCustomer")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemCity")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemGovernorate")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemProduct")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemSKU")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemSize")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemColor")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemQuantity")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemNotes")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {importedItems.slice(0, 50).map((i, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.orderNumber || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.customerName || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.city || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.governorate || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.productName || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.sku || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.size || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                          {i.color ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="inline-block w-3 h-3 rounded-full border border-gray-300 dark:border-gray-500 flex-shrink-0"
                                style={{ backgroundColor: {
                                  'black':'#000','white':'#fff','red':'#ef4444','blue':'#3b82f6',
                                  'green':'#22c55e','yellow':'#eab308','orange':'#f97316',
                                  'purple':'#a855f7','pink':'#ec4899','gray':'#6b7280','grey':'#6b7280',
                                  'brown':'#92400e','navy':'#1e3a5f','beige':'#f5f0e1','gold':'#f59e0b',
                                  'silver':'#cbd5e1',
                                }[i.color?.toLowerCase()] || '#d1d5db' }}
                              />
                              {i.color}
                            </span>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.quantity}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 max-w-[120px] truncate">{i.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t("orders.bulkCancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium transition-colors"
          >
            {saving ? t("orders.processing2") : t("orders.bulkSave")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkOrderModal;
