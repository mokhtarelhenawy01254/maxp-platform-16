import React from "react";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import type {
  MarketplaceDialogFormData,
  PricingModel,
} from "../types/marketplaceAdminTypes";

export interface AppEditPricingSectionProps {
  formData: MarketplaceDialogFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFieldValue: <K extends keyof MarketplaceDialogFormData>(
    name: K,
    value: MarketplaceDialogFormData[K],
  ) => void;
}

export const AppEditPricingSection: React.FC<AppEditPricingSectionProps> = ({
  formData,
  onChange,
  setFieldValue,
}) => {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-12 md:col-span-4">
        <div className="space-y-2">
          <Label>نظام التسعير</Label>
          <Select
            value={formData.pricingModel ?? "SUBSCRIPTION"}
            onValueChange={(v) => setFieldValue("pricingModel", v as PricingModel)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">مجاني</SelectItem>
              <SelectItem value="SUBSCRIPTION">اشتراك شهري/سنوي</SelectItem>
              <SelectItem value="PAY_PER_USE">حسب الاستخدام (PPU)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="col-span-6 md:col-span-4">
        <div className="space-y-1">
          <Label>السعر الشهري</Label>
          <Input
            name="monthlyPrice"
            type="number"
            className="tabular-nums font-mono"
            value={formData.monthlyPrice ?? 0}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="col-span-6 md:col-span-4">
        <div className="space-y-1">
          <Label>السعر السنوي</Label>
          <Input
            name="yearlyPrice"
            type="number"
            className="tabular-nums font-mono"
            value={formData.yearlyPrice ?? 0}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="col-span-6 md:col-span-4">
        <div className="space-y-1">
          <Label>سعر الوحدة (لـ PPU)</Label>
          <Input
            name="unitPrice"
            type="number"
            className="tabular-nums font-mono"
            value={formData.unitPrice ?? 0}
            onChange={onChange}
            disabled={formData.pricingModel !== "PAY_PER_USE"}
          />
        </div>
      </div>
      <div className="col-span-6 md:col-span-4">
        <div className="space-y-1">
          <Label>اسم الوحدة (لـ PPU)</Label>
          <Input
            name="unitName"
            value={formData.unitName ?? ""}
            onChange={onChange}
            disabled={formData.pricingModel !== "PAY_PER_USE"}
            placeholder="مثال: رسالة، موظف"
          />
        </div>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="space-y-1">
          <Label>طريقة احتساب التكلفة (PPU)</Label>
          <Select
            value={formData.ppuBillingMethod ?? "PER_ORDER"}
            onValueChange={(v) =>
              setFieldValue("ppuBillingMethod", v as "PER_ORDER" | "PER_ITEM" | "PERCENTAGE")
            }
            disabled={formData.pricingModel !== "PAY_PER_USE"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PER_ORDER">ثابت لكل طلب (unitPrice × 1)</SelectItem>
              <SelectItem value="PER_ITEM">حسب عدد المنتجات (unitPrice × عدد items)</SelectItem>
              <SelectItem value="PERCENTAGE">نسبة من إجمالي الطلب (unitPrice%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default AppEditPricingSection;
