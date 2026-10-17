import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Archive, X, Download, UploadCloud } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import OrderModal from "../../../components/common/OrderModal";
import { Button } from "@/components/ui/button";

interface BulkOrderItem {
  row: number;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  city: string;
  area?: string;
  governorate: string;
  address?: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  total?: number;
  collectAmount?: number;
  deliverAmount?: number;
  returnContent?: string;
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
  const res = await apiClient.post(`/api/v1/bulk-orders/${bulkOrderId}/import`, formData);
  return res.data?.items || [];
};

const downloadTemplate = () => {
  const link = document.createElement("a");
  link.href = "/bulk_order_template.xlsx";
  link.setAttribute("download", "bulk_order_template.xlsx");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-xs sm:text-sm text-foreground outline-hidden transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const BulkOrderModal = ({ item, onClose, onSaved }: BulkOrderModalProps) => {
  const { t } = useTranslation();
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
    <OrderModal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={item ? t("orders.bulkEditTitle") : t("orders.bulkCreateTitle")}
      tone="primary"
      size="2xl"
      busy={saving}
      flushBody
      hideClose
      footer={
        <div className="flex justify-end gap-2.5 border-t border-border/60 bg-muted/20 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg text-xs"
          >
            {t("orders.bulkCancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg text-xs"
          >
            {saving ? t("orders.processing2") : t("orders.bulkSave")}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.bulkNameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("orders.bulkNamePlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.bulkDescriptionLabel")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("orders.bulkDescriptionPlaceholder")}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-foreground">
            {t("orders.bulkDefaultStatus")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {["DRAFT", "PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{t(`orders.bulkStatus${s}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-semibold text-foreground">
              {t("orders.bulkUploadFile")}
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t("orders.bulkDownloadTemplate") || "تحميل النموذج"}</span>
            </button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : pendingFile
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-border/70 bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
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
                <Archive className="mx-auto mb-2 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{pendingFile.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("orders.bulkFileWillUploadAfterSave") || "سيتم رفع الملف بعد الحفظ"}
                </p>
              </div>
            ) : (
              <>
                <UploadCloud className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{t("orders.bulkUploadHint")}</p>
              </>
            )}
          </div>
        </div>

        {importedItems.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold text-foreground font-mono tabular-nums">
              {t("orders.bulkItems")} ({importedItems.length})
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/70">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemCustomer")}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemPhone")}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemCity")}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemArea") || "Area"}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemGovernorate")}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemProduct")}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">COD</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemQuantity")}</th>
                    <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">{t("orders.bulkItemNotes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {importedItems.slice(0, 50).map((i, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-2.5 py-1.5 text-foreground">{i.customerName || "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground font-mono tabular-nums">{i.customerPhone || "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground">{i.city || "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground">{i.area || "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground">{i.governorate || "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground">{i.productName || "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground font-mono tabular-nums">{Number(i.collectAmount || 0) > 0 ? Number(i.collectAmount).toFixed(2) : "-"}</td>
                      <td className="px-2.5 py-1.5 text-foreground font-mono tabular-nums">{i.quantity}</td>
                      <td className="max-w-[80px] truncate px-2.5 py-1.5 text-foreground">{i.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>
    </OrderModal>
  );
};

export default BulkOrderModal;
