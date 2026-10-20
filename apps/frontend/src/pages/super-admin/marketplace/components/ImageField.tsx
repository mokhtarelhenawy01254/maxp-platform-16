import React, { useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { isLikelyImageUrl, isLikelyVideoUrl } from "../types/marketplaceAdminTypes";

export interface ImageFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onUpload: (file: File) => void | Promise<void>;
  uploading: boolean;
  placeholder?: string;
  hint?: string;
  accept?: string;
}

export const ImageField: React.FC<ImageFieldProps> = ({
  label,
  value,
  onChange,
  onUpload,
  uploading,
  placeholder,
  hint,
  accept = "image/*",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showImage = isLikelyImageUrl(value);
  const showVideo = isLikelyVideoUrl(value);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          dir="ltr"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="رفع صورة من الجهاز"
          aria-label="رفع صورة"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange("")}
            title="حذف"
            aria-label="حذف الصورة"
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
          event.target.value = "";
        }}
      />
      {(showImage || showVideo) && (
        <div className="relative h-28 w-full overflow-hidden rounded-xl border bg-muted/30">
          {showVideo ? (
            <video
              src={value}
              controls
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              src={value}
              alt={label}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          )}
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};

export default ImageField;
