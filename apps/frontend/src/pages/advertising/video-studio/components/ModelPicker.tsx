// Model picker with price + character-stability badges (video/image models)
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { modelPriceLabel } from "../presets";
import type { VideoModel } from "../types";

export function StabilityDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`ثبات الشخصية ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${i <= level ? "bg-primary" : "bg-muted-foreground/25"}`}
        />
      ))}
    </span>
  );
}

interface ModelPickerProps {
  models: VideoModel[];
  value: string;
  onChange: (modelId: string) => void;
  kind?: "video" | "image";
  disabled?: boolean;
  id?: string;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({ models, value, onChange, kind = "video", disabled, id }) => {
  const filtered = models.filter((m) => m.kind === kind);
  const selected = filtered.find((m) => m.id === value);

  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={(v) => { if (v !== null) onChange(v); }} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="اختر الموديل" />
        </SelectTrigger>
        <SelectContent>
          {filtered.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex flex-col">
                  <span className="text-sm">{m.name}</span>
                  {m.recommendedFor && (
                    <span className="text-[11px] text-muted-foreground">{m.recommendedFor}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {kind === "video" && (m.characterStability ?? 0) >= 2 && <StabilityDots level={m.characterStability ?? 0} />}
                  <span className="text-xs tabular-nums text-muted-foreground">{modelPriceLabel(m)}</span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (selected.supportsCharacterRefs === false) && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">هذا الموديل لا يدعم مراجع الشخصيات — للنصوص فقط</p>
      )}
    </div>
  );
};
