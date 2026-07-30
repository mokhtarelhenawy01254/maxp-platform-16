import React, { useState } from "react";
import { X, Clock, Calendar } from 'lucide-react';

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
    date.setHours(9, 0, 0, 0); // 9:00 AM
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="business-modal-surface w-full max-w-md overflow-hidden">
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: "1px solid var(--business-muted-line)" }}
        >
          <h3
            className="flex items-center gap-2 text-lg font-semibold"
            style={{ color: "var(--color-foreground)" }}
          >
            <Clock
              className="h-5 w-5"
              style={{ color: "var(--color-muted-foreground)" }}
            />
            تأجيل المحادثة
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button business-icon-button--sm"
          >
            <X size={20} style={{ color: "var(--color-muted-foreground)" }} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p
            className="mb-2 text-sm"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            اختر متى تريد تذكيرك بهذه المحادثة:
          </p>

          <button
            type="button"
            onClick={() => handlePresets(1)}
            className="business-dropdown-option rounded-2xl border"
            style={{ borderColor: "var(--business-card-border)" }}
          >
            <Clock size={16} />
            <span>لاحقاً اليوم (خلال 1 ساعة)</span>
          </button>

          <button
            type="button"
            onClick={() => handlePresets(4)}
            className="business-dropdown-option rounded-2xl border"
            style={{ borderColor: "var(--business-card-border)" }}
          >
            <Clock size={16} />
            <span>بعد الظهيرة (خلال 4 ساعات)</span>
          </button>

          <button
            type="button"
            onClick={handleTomorrow}
            className="business-dropdown-option rounded-2xl border"
            style={{ borderColor: "var(--business-card-border)" }}
          >
            <Calendar size={16} />
            <span>غداً صباحاً (9:00 ص)</span>
          </button>

          <div
            className="mt-3 border-t pt-3"
            style={{ borderColor: "var(--business-muted-line)" }}
          >
            <p
              className="mb-2 text-xs font-medium"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              اختار وقت محدد
            </p>
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                type="date"
                className="business-control-input flex-1 p-2 text-sm"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                required
              />
              <input
                type="time"
                className="business-control-input w-24 p-2 text-sm"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                required
              />
              <button
                type="submit"
                className="business-chip-button px-4 py-2 text-sm"
                data-active={customDate && customTime}
                disabled={!customDate || !customTime}
              >
                تأكيد
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnoozeModal;
