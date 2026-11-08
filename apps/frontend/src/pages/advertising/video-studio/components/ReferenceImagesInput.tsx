// Compact reference-image uploader (product photos / character refs / start frame)
import React, { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import uploadService from "../../../../services/uploadService";

interface ReferenceImagesInputProps {
  images: string[];
  onChange: (images: string[]) => void;
  max?: number;
  label?: string;
  disabled?: boolean;
}

export const ReferenceImagesInput: React.FC<ReferenceImagesInputProps> = ({
  images,
  onChange,
  max = 4,
  label = "صور مرجعية",
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = max - images.length;
    if (room <= 0) {
      toast.error(`الحد الأقصى ${max} صور`);
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) continue;
        const res = await uploadService.uploadMedia(file);
        if (res.success && res.data?.url) uploaded.push(res.data.url);
        else toast.error(res.error || "فشل رفع صورة");
      }
      if (uploaded.length > 0) onChange([...images, ...uploaded].slice(0, max));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{images.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <div key={img} className="group relative size-16 overflow-hidden rounded-md border border-border bg-muted">
            <img src={img} alt="" className="size-full object-cover" loading="lazy" />
            <button
              type="button"
              onClick={() => onChange(images.filter((i) => i !== img))}
              disabled={disabled}
              className="absolute end-0.5 top-0.5 rounded-sm bg-background/90 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="إزالة الصورة"
            >
              <X className="size-3 text-foreground" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex size-16 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
            aria-label={`رفع ${label}`}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
            <span className="text-[10px]">رفع</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
};
