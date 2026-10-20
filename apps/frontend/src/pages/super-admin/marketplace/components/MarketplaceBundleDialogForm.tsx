import React, { useState, useMemo } from "react";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Badge } from "../../../../components/ui/badge";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import type {
  MarketplaceDialogFormData,
  MarketplaceManagementItem,
  MarketplaceItemType,
} from "../types/marketplaceAdminTypes";

export interface MarketplaceBundleDialogFormProps {
  type: MarketplaceItemType;
  formData: MarketplaceDialogFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFieldValue: <K extends keyof MarketplaceDialogFormData>(
    name: K,
    value: MarketplaceDialogFormData[K],
  ) => void;
  availableApps?: MarketplaceManagementItem[];
}

export const MarketplaceBundleDialogForm: React.FC<MarketplaceBundleDialogFormProps> = ({
  type,
  formData,
  onChange,
  setFieldValue,
  availableApps,
}) => {
  const [bundleSearch, setBundleSearch] = useState("");

  const filteredAvailableApps = useMemo(
    () =>
      (availableApps || []).filter((app) => {
        if (!bundleSearch) return true;
        const q = bundleSearch.toLowerCase();
        return (
          (app.name || "").toLowerCase().includes(q) ||
          (app.slug || "").toLowerCase().includes(q)
        );
      }),
    [availableApps, bundleSearch],
  );

  const toggleBundleApp = (app: MarketplaceManagementItem) => {
    const current = formData.apps;
    const exists = current.some(
      (a) =>
        (typeof a === "string" ? a : a.id) === app.id ||
        (typeof a === "string" ? a : a.slug) === app.slug,
    );
    if (exists) {
      setFieldValue(
        "apps",
        current.filter(
          (a) =>
            (typeof a === "string" ? a : a.id) !== app.id &&
            (typeof a === "string" ? a : a.slug) !== app.slug,
        ),
      );
    } else {
      setFieldValue("apps", [
        ...current,
        { id: app.id, name: app.name, slug: app.slug, category: app.category },
      ]);
    }
  };

  if (type === "pricing") {
    return (
      <>
        <div className="col-span-12">
          <div className="space-y-1">
            <Label>الميزة</Label>
            <Input name="feature" value={formData.feature ?? ""} onChange={onChange} />
          </div>
        </div>
        <div className="col-span-6">
          <div className="space-y-1">
            <Label>السعر</Label>
            <Input
              name="price"
              type="number"
              className="tabular-nums font-mono"
              value={formData.price ?? 0}
              onChange={onChange}
            />
          </div>
        </div>
        <div className="col-span-6">
          <div className="space-y-1">
            <Label>الوحدة</Label>
            <Input name="unit" value={formData.unit ?? ""} onChange={onChange} />
          </div>
        </div>
        <div className="col-span-12">
          <div className="flex gap-3">
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="text-sm">نشط:</span>
              <input
                type="checkbox"
                name="isActive"
                checked={!!formData.isActive}
                onChange={onChange}
              />
            </label>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="col-span-12 md:col-span-6">
        <div className="space-y-1">
          <Label>الاسم</Label>
          <Input name="name" value={formData.name ?? ""} onChange={onChange} />
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <div className="space-y-1">
          <Label>Slug</Label>
          <Input
            name="slug"
            value={formData.slug ?? ""}
            onChange={onChange}
            placeholder="اتركه فارغاً للتوليد التلقائي"
          />
        </div>
      </div>
      <div className="col-span-12">
        <div className="space-y-1">
          <Label>الوصف</Label>
          <Textarea
            name="description"
            rows={3}
            value={formData.description ?? ""}
            onChange={onChange}
          />
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
          <Label>الخصم %</Label>
          <Input
            name="discount"
            type="number"
            className="tabular-nums font-mono"
            value={formData.discount ?? 0}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="col-span-6 md:col-span-4">
        <div className="space-y-1">
          <Label>فترة التجربة (أيام)</Label>
          <Input
            name="trialDays"
            type="number"
            min="0"
            max="365"
            className="tabular-nums font-mono"
            value={formData.trialDays ?? 7}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="flex gap-2 items-center h-full">
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="text-sm">نشط:</span>
            <input
              type="checkbox"
              name="isActive"
              checked={!!formData.isActive}
              onChange={onChange}
            />
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="text-sm">مميز:</span>
            <input
              type="checkbox"
              name="isFeatured"
              checked={!!formData.isFeatured}
              onChange={onChange}
            />
          </label>
        </div>
      </div>
      <div className="col-span-12">
        <div className="space-y-1">
          <Label>التطبيقات المضمنة</Label>
          <Input
            placeholder="ابحث عن تطبيق..."
            value={bundleSearch}
            onChange={(e) => setBundleSearch(e.target.value)}
          />
          <ScrollArea className="h-40 rounded-md border p-2">
            {filteredAvailableApps.map((app) => {
              const isSelected = formData.apps.some(
                (a) =>
                  (typeof a === "string" ? a : a.id) === app.id ||
                  (typeof a === "string" ? a : a.slug) === app.slug,
              );
              return (
                <label
                  key={app.id}
                  className="flex items-center gap-2 py-1 cursor-pointer hover:bg-accent rounded px-1"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBundleApp(app)}
                  />
                  <span className="text-sm">{app.name || app.slug || app.id}</span>
                </label>
              );
            })}
            {filteredAvailableApps.length === 0 && (
              <span className="text-xs text-muted-foreground">لا توجد تطبيقات متاحة</span>
            )}
          </ScrollArea>
          <div className="flex flex-wrap gap-1">
            {formData.apps.map((app, idx) => {
              const label =
                typeof app === "string" ? app : app.name || app.slug || app.id || "";
              return (
                <Badge key={idx} variant="outline" className="text-xs">
                  {label}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default MarketplaceBundleDialogForm;
