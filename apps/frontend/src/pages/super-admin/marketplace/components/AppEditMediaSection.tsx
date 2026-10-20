import React, { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Label } from "../../../../components/ui/label";
import type { MarketplaceDialogFormData } from "../types/marketplaceAdminTypes";
import { ImageField } from "./ImageField";
import { uploadSingleImage, uploadMultipleImages } from "../utils/marketplaceUploadUtils";

export interface AppEditMediaSectionProps {
  formData: MarketplaceDialogFormData;
  setFieldValue: <K extends keyof MarketplaceDialogFormData>(
    name: K,
    value: MarketplaceDialogFormData[K],
  ) => void;
}

export const AppEditMediaSection: React.FC<AppEditMediaSectionProps> = ({
  formData,
  setFieldValue,
}) => {
  const [uploadingField, setUploadingField] = useState<
    "logo" | "coverImage" | "screenshots" | null
  >(null);
  const screenshotsInputRef = useRef<HTMLInputElement>(null);

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
    <div className="grid grid-cols-12 gap-4">
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
                  aria-label="حذف اللقطة"
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
              onChange={(event) => void handleScreenshotsUpload(event.target.files)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            تُعرض في تبويب «لقطات الشاشة» داخل صفحة التطبيق. يمكنك رفع أكثر من صورة.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppEditMediaSection;
