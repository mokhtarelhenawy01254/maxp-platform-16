import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";

interface BulkOrderItem {
  row: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  price: number;
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

  const handleFileUpload = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      if (item) {
        const res = await apiClient.post(`/api/v1/bulk-orders/${item.id}/import`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.items) {
          setImportedItems(res.data.items);
        }
      }
    } catch (err) {
      setError("Failed to upload file");
    }
  }, [item]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError(t("orders.bulkNamePlaceholder"));
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (item) {
        await apiClient.put(`/api/v1/bulk-orders/${item.id}`, { name, description, status });
      } else {
        await apiClient.post("/api/v1/bulk-orders", { name, description, status });
      }
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save");
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t("orders.bulkUploadFile")}
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
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
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("orders.bulkUploadHint")}</p>
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemProduct")}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t("orders.bulkItemQuantity")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {importedItems.slice(0, 50).map((i, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.orderNumber || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.customerName || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.productName || "-"}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{i.quantity}</td>
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
