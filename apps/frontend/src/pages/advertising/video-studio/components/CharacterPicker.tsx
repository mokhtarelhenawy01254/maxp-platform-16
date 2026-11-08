// Character multi-select chips (from the studio character library)
import React from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VideoCharacter } from "../types";

interface CharacterPickerProps {
  characters: VideoCharacter[];
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  disabled?: boolean;
}

export const CharacterPicker: React.FC<CharacterPickerProps> = ({
  characters,
  selected,
  onChange,
  max = 3,
  disabled,
}) => {
  if (characters.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        مفيش شخصيات بعد — أنشئ شخصية من تابة «شخصيات» لتثبيتها عبر المشاهد
      </p>
    );
  }

  const toggle = (id: string) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else if (selected.length < max) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {characters.map((c) => {
        const isSelected = selected.includes(c.id);
        const hasRefs = Array.isArray(c.referenceImages) && c.referenceImages.length > 0;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            disabled={disabled}
            aria-pressed={isSelected}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50",
              isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/40",
            )}
          >
            {c.thumbnailUrl ? (
              <img src={c.thumbnailUrl} alt="" className="size-4 rounded-full object-cover" loading="lazy" />
            ) : (
              <UserRound className="size-3.5" />
            )}
            <span className="max-w-24 truncate">{c.name}</span>
            {!hasRefs && (
              <span
                className="text-[10px] text-amber-600 dark:text-amber-400"
                title="الشخصية بدون مراجع بعد — ولّد الشيت أولًا"
              >
                بلا مراجع
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
