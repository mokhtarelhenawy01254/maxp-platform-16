import React, { useState } from "react";
import { X, Clock, Calendar, Sun, Check, ArrowRight } from "lucide-react";

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (until: Date) => void;
}

const SnoozeModal: React.FC<SnoozeModalProps> = ({
  isOpen,
  onClose,
  onSnooze,
}) => {
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  if (!isOpen) return null;

  const handlePresets = (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    onSnooze(date);
  };

  const handleTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    onSnooze(date);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDate && customTime) {
      const date = new Date(`${customDate}T${customTime}`);
      onSnooze(date);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/70 rounded-xl shadow-xl max-w-md w-full overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                تأجيل المحادثة
              </h3>
              <p className="text-xs text-muted-foreground">
                إخفاء المحادثة مؤقتاً والتذكير بها في وقت لاحق
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors active:scale-95"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets & Custom */}
        <div className="p-5 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">
            اختر توقيت التذكير المفضل:
          </p>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handlePresets(1)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all active:scale-[0.99] text-start group"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-xs font-medium text-foreground block">
                    لاحقاً اليوم
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    خلال ساعة واحدة من الآن
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px] transition-all" />
            </button>

            <button
              type="button"
              onClick={() => handlePresets(4)}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all active:scale-[0.99] text-start group"
            >
              <div className="flex items-center gap-2.5">
                <Sun className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="text-xs font-medium text-foreground block">
                    بعد الظهيرة
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    خلال 4 ساعات من الآن
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px] transition-all" />
            </button>

            <button
              type="button"
              onClick={handleTomorrow}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all active:scale-[0.99] text-start group"
            >
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <div>
                  <span className="text-xs font-medium text-foreground block">
                    صباح الغد
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    في تمام الساعة 9:00 صباحاً
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px] transition-all" />
            </button>
          </div>

          {/* Custom Date/Time */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <span className="text-xs font-medium text-foreground block">
              تحديد موعد وتاريخ مخصص
            </span>
            <form onSubmit={handleCustomSubmit} className="flex flex-wrap sm:flex-nowrap gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-28 px-3 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
                required
              />
              <button
                type="submit"
                disabled={!customDate || !customTime}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>تأكيد</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnoozeModal;
