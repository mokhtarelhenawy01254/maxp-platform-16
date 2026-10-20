import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import {
  type MarketplaceManagementItem,
  type MarketplaceDialogFormData,
  type MarketplaceItemType,
  createDefaultMarketplaceFormData,
  normalizeBundleApps,
  parseStringList,
} from "../types/marketplaceAdminTypes";
import { MarketplaceBundleDialogForm } from "./MarketplaceBundleDialogForm";
import { MarketplaceAppDialogForm } from "./MarketplaceAppDialogForm";

export interface MarketplaceItemDialogProps {
  open: boolean;
  onClose: () => void;
  item: MarketplaceManagementItem | null;
  type: MarketplaceItemType;
  onSave: (data: MarketplaceDialogFormData) => Promise<void> | void;
  availableApps?: MarketplaceManagementItem[];
}

export const MarketplaceItemDialog: React.FC<MarketplaceItemDialogProps> = ({
  open,
  onClose,
  item,
  type,
  onSave,
  availableApps,
}) => {
  const [formData, setFormData] = useState<MarketplaceDialogFormData>(() =>
    createDefaultMarketplaceFormData(type),
  );

  const setFieldValue = useCallback(
    <K extends keyof MarketplaceDialogFormData>(
      name: K,
      value: MarketplaceDialogFormData[K],
    ) => {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [],
  );

  useEffect(() => {
    const defaultFormData = createDefaultMarketplaceFormData(type);

    if (item) {
      setFormData({
        ...defaultFormData,
        ...item,
        apps: normalizeBundleApps(item.apps),
        features: type === "app" ? parseStringList(item.features) : [],
        screenshots:
          type === "app"
            ? parseStringList(item.screenshots ?? item.images)
            : [],
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [item, open, type]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    const { name, value, type: inputType } = target;
    const checked = "checked" in target ? target.checked : undefined;
    const fieldName = name as keyof MarketplaceDialogFormData;
    const nextValue =
      inputType === "checkbox"
        ? checked
        : inputType === "number"
          ? Number(value)
          : value;

    setFieldValue(
      fieldName,
      nextValue as MarketplaceDialogFormData[typeof fieldName],
    );
  };

  const dialogLabel =
    type === "app"
      ? "تطبيق"
      : type === "pricing"
        ? "قاعدة تسعير"
        : "باقة";

  const handleFormSubmit = () => {
    if (type === "app" && !formData.name?.trim()) {
      toast.error("اسم التطبيق مطلوب");
      return;
    }
    if (type === "bundle" && !formData.name?.trim()) {
      toast.error("اسم الباقة مطلوب");
      return;
    }
    if (type === "pricing" && !formData.feature?.trim()) {
      toast.error("اكتب اسم الميزة أولاً");
      return;
    }
    void onSave(formData);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? "تعديل" : "إضافة"} {dialogLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-2 mt-1">
          {type === "pricing" || type === "bundle" ? (
            <MarketplaceBundleDialogForm
              type={type}
              formData={formData}
              onChange={handleChange}
              setFieldValue={setFieldValue}
              availableApps={availableApps}
            />
          ) : (
            <MarketplaceAppDialogForm
              formData={formData}
              onChange={handleChange}
              setFieldValue={setFieldValue}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button variant="default" onClick={handleFormSubmit}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MarketplaceItemDialog;
