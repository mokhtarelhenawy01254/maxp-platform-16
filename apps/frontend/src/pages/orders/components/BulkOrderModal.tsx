import React from "react";
import { useTranslation } from "react-i18next";
import OrderModal from "../../../components/common/OrderModal";
import { Button } from "@/components/ui/button";
import type { BulkOrderModalProps } from "./bulk-modal/types";
import { useBulkOrderModalController } from "./bulk-modal/useBulkOrderModalController";
import { BulkOrderFormFields } from "./bulk-modal/BulkOrderFormFields";
import { BulkOrderFileDropzone } from "./bulk-modal/BulkOrderFileDropzone";
import { BulkOrderImportedItemsTable } from "./bulk-modal/BulkOrderImportedItemsTable";

export const BulkOrderModal: React.FC<BulkOrderModalProps> = ({
  item,
  onClose,
  onSaved,
}) => {
  const { t } = useTranslation();
  const {
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
  } = useBulkOrderModalController(item, onSaved);

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
        <BulkOrderFormFields
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          status={status}
          setStatus={setStatus}
        />

        <BulkOrderFileDropzone
          dragOver={dragOver}
          pendingFile={pendingFile}
          fileInputRef={fileInputRef}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
          onDownloadTemplate={downloadTemplate}
        />

        <BulkOrderImportedItemsTable importedItems={importedItems} />

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
