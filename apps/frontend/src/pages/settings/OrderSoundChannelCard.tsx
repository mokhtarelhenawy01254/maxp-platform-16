import React from "react";
import { Check, Play, BellRing, LucideIcon } from "lucide-react";
import {
  ORDER_SOUND_PATTERNS,
  type OrderSoundPattern,
} from "../../services/orderSoundPatterns";
import { socketService } from "../../services/socketService";

interface SoundConfig {
  enabled: boolean;
  volume: number;
  pattern: string;
}

interface OrderSoundChannelCardProps {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  sound: SoundConfig;
  onUpdate: (field: "enabled" | "volume" | "pattern", value: unknown) => void;
  accentColor: "amber" | "teal";
}

export const OrderSoundChannelCard: React.FC<OrderSoundChannelCardProps> = ({
  title,
  description,
  badge,
  icon: Icon,
  sound,
  onUpdate,
  accentColor,
}) => {
  const isAmber = accentColor === "amber";

  return (
    <div className="bg-card border border-border/70 rounded-xl overflow-hidden divide-y divide-border/60">
      {/* Top row / Toggle */}
      <div className="p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-muted/15">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-md ${
                isAmber
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
              }`}
            >
              <Icon className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                isAmber
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "bg-teal-500/10 text-teal-700 dark:text-teal-300"
              }`}
            >
              {badge}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pr-8">{description}</p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={sound.enabled}
            onChange={(e) => onUpdate("enabled", e.target.checked)}
            className="sr-only peer"
            aria-label={title}
          />
          <div className="w-10 h-5.5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* Sound configuration body when enabled */}
      {sound.enabled && (
        <div className="p-4 sm:p-5 space-y-4 bg-muted/10">
          {/* Volume slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">مستوى ارتفاع الصوت</span>
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {sound.volume}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sound.volume}
              onChange={(e) => onUpdate("volume", Number(e.target.value))}
              className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              aria-label="مستوى الصوت"
            />
          </div>

          {/* Pattern selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <BellRing className="w-3.5 h-3.5 text-muted-foreground" />
              <span>نغمة التنبيه المعتمدة</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {ORDER_SOUND_PATTERNS.map((pattern) => {
                const isSelected = sound.pattern === pattern.id;
                return (
                  <button
                    key={pattern.id}
                    type="button"
                    onClick={() => onUpdate("pattern", pattern.id as OrderSoundPattern)}
                    className={`flex items-start justify-between gap-2 p-2.5 rounded-lg border text-xs text-right transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary font-medium shadow-2xs"
                        : "border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-foreground truncate">{pattern.label}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">
                        {pattern.description}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5 stroke-[2.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Test preview audio action */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                socketService.testOrderSound(
                  (sound.volume ?? 100) / 100,
                  (sound.pattern || "cash") as OrderSoundPattern
                );
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium transition-colors active:scale-[0.98]"
            >
              <Play className="w-3 h-3 text-primary" />
              <span>تجربة الاستماع للنغمة</span>
            </button>
            <span className="text-[11px] text-muted-foreground">
              اضغط للتأكد من وضوح الصوت عبر سماعات الجهاز الحالية.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderSoundChannelCard;
