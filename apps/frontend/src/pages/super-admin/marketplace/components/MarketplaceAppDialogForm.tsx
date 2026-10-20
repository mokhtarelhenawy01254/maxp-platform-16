import React, { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
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
import { parseStringList } from "../types/marketplaceAdminTypes";
import { ImageField } from "./ImageField";
import { uploadSingleImage, uploadMultipleImages } from "../utils/marketplaceUploadUtils";

export interface MarketplaceAppDialogFormProps {
  formData: MarketplaceDialogFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFieldValue: <K extends keyof MarketplaceDialogFormData>(
    name: K,
    value: MarketplaceDialogFormData[K],
  ) => void;
}

export const MarketplaceAppDialogForm: React.FC<MarketplaceAppDialogFormProps> = ({
  formData,
  onChange,
  setFieldValue,
}) => {
  const [uploadingField, setUploadingField] = useState<
    "logo" | "coverImage" | "screenshots" | null
  >(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);

  const categoryMap = [
    { id: "ECOMMERCE", name: "التجارة الإلكترونية" },
    { id: "HR", name: "الموارد البشرية" },
    { id: "AI", name: "الأتمتة" },
    { id: "COMMUNICATION", name: "التواصل" },
    { id: "CRM", name: "إدارة العملاء" },
    { id: "ANALYTICS", name: "التحليلات" },
    { id: "INTEGRATION", name: "التكاملات" },
    { id: "PRODUCTIVITY", name: "الإنتاجية" },
    { id: "FINANCE", name: "المالية" },
    { id: "MARKETING", name: "التسويق" },
  ];

  const uploadToField = async (field: "logo" | "coverImage", file: File) => {
    setUploadingField(field);
    const url = await uploadSingleImage(file);
    if (url) setFieldValue(field, url);
    setUploadingField(null);
  };

  const handleScreenshotsUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingField("screenshots");
    const urls = await uploadMultipleImages(Array.from(files));
    if (urls.length > 0) {
      setFieldValue("screenshots", [...(formData.screenshots || []), ...urls]);
    }
    setUploadingField(null);
  };

  const removeScreenshot = (index: number) => {
    setFieldValue(
      "screenshots",
      (formData.screenshots || []).filter((_, i) => i !== index),
    );
  };

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
            rows={2}
            value={formData.description ?? ""}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <div className="space-y-2">
          <Label>الفئة</Label>
          <Select
            value={formData.category ?? "ECOMMERCE"}
            onValueChange={(v) => setFieldValue("category", v ?? undefined)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryMap.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="col-span-6 md:col-span-3">
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
      <div className="col-span-6 md:col-span-3">
        <div className="space-y-1">
          <Label>أيام التجربة</Label>
          <Input
            name="trialDays"
            type="number"
            className="tabular-nums font-mono"
            value={formData.trialDays ?? 14}
            onChange={onChange}
          />
        </div>
      </div>

      <div className="col-span-12 md:col-span-4">
        <div className="space-y-1">
          <Label>الأيقونة (Emoji or Icon Name)</Label>
          <Input name="icon" value={formData.icon ?? ""} onChange={onChange} />
        </div>
      </div>
      <div className="col-span-12 md:col-span-2">
        <label className="flex items-center gap-1 h-full cursor-pointer">
          <span className="text-sm">تثبيت تلقائي:</span>
          <input
            type="checkbox"
            name="isAutoInstall"
            checked={!!formData.isAutoInstall}
            onChange={onChange}
          />
        </label>
      </div>
      <div className="col-span-12 md:col-span-6">
        <ImageField
          label="شعار التطبيق (Logo)"
          value={formData.logo ?? ""}
          onChange={(v) => setFieldValue("logo", v)}
          onUpload={(file) => uploadToField("logo", file)}
          uploading={uploadingField === "logo"}
          placeholder="رابط مباشر أو ارفع صورة"
        />
      </div>
      <div className="col-span-12 md:col-span-6">
        <ImageField
          label="صورة الغلاف / الميديا"
          value={formData.coverImage ?? ""}
          onChange={(v) => setFieldValue("coverImage", v)}
          onUpload={(file) => uploadToField("coverImage", file)}
          uploading={uploadingField === "coverImage"}
          placeholder="رابط مباشر للصورة أو يوتيوب/فيديو"
          hint="تُعرض كغلاف في صفحة التطبيق. تدعم صورًا وفيديو."
        />
      </div>
      <div className="col-span-12">
        <div className="space-y-2">
          <Label>لقطات الشاشة (Screenshots)</Label>
          <div className="flex flex-wrap items-start gap-2">
            {formData.screenshots.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="group relative h-20 w-28 overflow-hidden rounded-lg border bg-muted/30"
              >
                <img
                  src={url}
                  alt={`لقطة ${idx + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => removeScreenshot(idx)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="حذف"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => screenshotsInputRef.current?.click()}
              disabled={uploadingField === "screenshots"}
              className="flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {uploadingField === "screenshots" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              رفع
            </button>
            <input
              ref={screenshotsInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) =>
                void handleScreenshotsUpload(event.target.files)
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            تُعرض في تبويب «لقطات الشاشة» داخل صفحة التطبيق. يمكنك رفع أكثر من صورة.
          </p>
        </div>
      </div>

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

      <div className="col-span-12 md:col-span-6">
        <div className="space-y-1">
          <Label>المسار الرئيسي (Main Route)</Label>
          <Input
            name="mainRoute"
            value={formData.mainRoute ?? ""}
            onChange={onChange}
            placeholder="/my-apps/something"
          />
        </div>
      </div>
      <div className="col-span-12 md:col-span-6">
        <div className="space-y-1">
          <Label>مسار الإدارة (Admin Route)</Label>
          <Input
            name="adminRoute"
            value={formData.adminRoute ?? ""}
            onChange={onChange}
            placeholder="/settings/something"
          />
        </div>
      </div>

      <div className="col-span-12">
        <div className="space-y-1">
          <Label>الأدوات والمميزات (Tools Included)</Label>
          <Textarea
            name="features"
            rows={3}
            value={Array.isArray(formData.features) ? formData.features.join(", ") : ""}
            onChange={(event) =>
              setFieldValue("features", parseStringList(event.target.value))
            }
            placeholder="افصل بين كل ميزة بفاصلة (،) .. مثال: نظام تقارير، ربط واتساب، دعم فني"
          />
          <p className="text-xs text-muted-foreground">
            افصل بين الأدوات بفاصلة لكي تظهر كنقاط منفصلة للمستخدم
          </p>
        </div>
      </div>

      <div className="col-span-12">
        <div className="flex gap-3 flex-wrap">
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
            <span className="text-sm">عام (Public):</span>
            <input
              type="checkbox"
              name="isPublic"
              checked={!!formData.isPublic}
              onChange={onChange}
            />
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="text-sm">مميز (Featured):</span>
            <input
              type="checkbox"
              name="isFeatured"
              checked={!!formData.isFeatured}
              onChange={onChange}
            />
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <span className="text-sm">شائع (Popular):</span>
            <input
              type="checkbox"
              name="isPopular"
              checked={!!formData.isPopular}
              onChange={onChange}
            />
          </label>
        </div>
      </div>
    </>
  );
};

export default MarketplaceAppDialogForm;
