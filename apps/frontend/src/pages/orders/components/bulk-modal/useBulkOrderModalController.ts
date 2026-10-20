/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import type { BulkOrderItem, BulkOrderModalProps } from "./types";

const uploadFile = async (
  bulkOrderId: string,
  file: File
): Promise<BulkOrderItem[]> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post(
    `/api/v1/bulk-orders/${bulkOrderId}/import`,
    formData
  );
  return res.data?.items || [];
};

export const downloadTemplate = () => {
  const link = document.createElement("a");
  link.href = "/bulk_order_template.xlsx";
  link.setAttribute("download", "bulk_order_template.xlsx");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function useBulkOrderModalController(
  item: BulkOrderModalProps["item"],
  onSaved: () => void
) {
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

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (item) {
        try {
          const items = await uploadFile(item.id, file);
          if (items.length > 0) {
            setImportedItems(items);
            toast.success(t("orders.bulkImportSuccess", { count: items.length }));
          }
        } catch {
          setError(t("orders.bulkUploadFailed") || "Failed to upload file");
        }
      } else {
        setPendingFile(file);
        setError("");
        toast.info(
          t("orders.bulkFileWillUploadAfterSave") ||
            "File will be uploaded after saving"
        );
      }
    },
    [item, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

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
        await apiClient.put(`/api/v1/bulk-orders/${item.id}`, {
          name,
          description,
          status,
        });
        toast.success(t("orders.bulkUpdated"));
      } else {
        const res = await apiClient.post("/api/v1/bulk-orders", {
          name,
          description,
          status,
        });
        savedId = res.data?.data?.id;
        toast.success(t("orders.bulkCreated"));
      }

      if (pendingFile && savedId) {
        try {
          const items = await uploadFile(savedId, pendingFile);
          if (items.length > 0) {
            toast.success(
              t("orders.bulkImportSuccess", { count: items.length })
            );
          }
        } catch {
          toast.error(
            t("orders.bulkUploadFailed") || "File upload failed after save"
          );
        }
      }

      onSaved();
    } catch (err: any) {
      setError(
        err.response?.data?.error || t("orders.saveFailed") || "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    name,
    setName,
    description,
    setDescription,
    status,
    setStatus,
    saving,
    error,
    importedItems,
    dragOver,
    setDragOver,
    pendingFile,
    fileInputRef,
    handleDrop,
    handleFileSelect,
    handleSave,
    downloadTemplate,
  };
}
