import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArchiveBoxIcon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
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
  const res = await apiClient.post(`/api/v1/bulk-orders/${bulkOrderId}/import`, formData, {
    // boundary set by browser
  });
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
  "w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

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
        <div className="flex justify-end gap-3 border-t border-border/60 bg-muted/30 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            {t("orders.bulkCancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("orders.processing2") : t("orders.bulkSave")}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
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
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {t("orders.bulkDescriptionLabel")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("orders.bulkDescriptionPlaceholder")}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
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
            <label className="block text-sm font-medium text-foreground">
              {t("orders.bulkUploadFile")}
            </label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              {t("orders.bulkDownloadTemplate") || "Download Template"}
            </button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : pendingFile
                ? "border-success bg-success/5"
                : "border-border bg-muted/30 hover:border-foreground/20"
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
                <ArchiveBoxIcon className="mx-auto mb-3 h-10 w-10 text-success" />
                <p className="text-sm font-medium text-success">{pendingFile.name}</p>
                <p className="mt-1 text-xs text-success/80">
                  {t("orders.bulkFileWillUploadAfterSave") || "Will be uploaded after save"}
                </p>
              </div>
            ) : (
              <>
                <ArrowDownTrayIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("orders.bulkUploadHint")}</p>
              </>
            )}
          </div>
        </div>

        {importedItems.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium text-foreground">
              {t("orders.bulkItems")} ({importedItems.length})
            </h4>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemCustomer")}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemPhone")}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemCity")}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemArea") || "Area"}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemGovernorate")}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemProduct")}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">COD</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemQuantity")}</th>
                    <th className="px-3 py-2 text-start text-xs font-medium text-muted-foreground">{t("orders.bulkItemNotes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importedItems.slice(0, 50).map((i, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="px-3 py-1.5 text-foreground">{i.customerName || "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{i.customerPhone || "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{i.city || "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{i.area || "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{i.governorate || "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{i.productName || "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{Number(i.collectAmount || 0) > 0 ? Number(i.collectAmount).toFixed(2) : "-"}</td>
                      <td className="px-3 py-1.5 text-foreground">{i.quantity}</td>
                      <td className="max-w-[80px] truncate px-3 py-1.5 text-foreground">{i.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </OrderModal>
  );
};

export default BulkOrderModal;
