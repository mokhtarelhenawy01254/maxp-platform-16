import React from "react";
import { Film, Image as ImageIcon, Layers } from "lucide-react";
import type { InstagramMediaType } from "./instagramStudioService";

export const INSTAGRAM_MEDIA_TYPES: {
  value: InstagramMediaType;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "IMAGE", label: "صورة", icon: ImageIcon },
  { value: "REELS", label: "ريلز", icon: Film },
  { value: "VIDEO", label: "فيديو", icon: Film },
  { value: "CAROUSEL", label: "ألبوم", icon: Layers },
];

interface InstagramMediaTypePickerProps {
  value: InstagramMediaType;
  onChange: (value: InstagramMediaType) => void;
}

const InstagramMediaTypePicker: React.FC<InstagramMediaTypePickerProps> = ({ value, onChange }) => (
  <div className="space-y-1.5">
    <span className="text-[11px] font-medium text-muted-foreground">نوع الوسائط</span>
    <div className="grid grid-cols-4 gap-1.5">
      {INSTAGRAM_MEDIA_TYPES.map(({ value: type, label, icon: Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[11px] transition-colors ${
            value === type
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border/70 text-muted-foreground hover:border-primary/40"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  </div>
);

export default InstagramMediaTypePicker;
