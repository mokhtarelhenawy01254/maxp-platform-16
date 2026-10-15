import React, { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ConversationStatus } from "../../../types/inbox.types";

interface StatusDropdownProps {
  currentStatus: ConversationStatus;
  onStatusChange: (status: ConversationStatus) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<
  ConversationStatus,
  {
    label: string;
    dotClass: string;
    badgeClass: string;
  }
> = {
  open: {
    label: "مفتوح",
    dotClass: "bg-sky-500 ring-sky-500/20",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  pending: {
    label: "قيد المعالجة",
    dotClass: "bg-amber-500 ring-amber-500/20",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  resolved: {
    label: "محلول",
    dotClass: "bg-emerald-500 ring-emerald-500/20",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  done: {
    label: "منتهي",
    dotClass: "bg-zinc-400 ring-zinc-400/20",
    badgeClass: "bg-muted text-muted-foreground border-border/60",
  },
};

const ALL_STATUSES: ConversationStatus[] = ["open", "pending", "resolved", "done"];

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentCfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.open;

  const handleSelect = (status: ConversationStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" dir="rtl">
      {/* Trigger Button (Zero Emojis) */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition-colors shadow-2xs ${
          currentCfg.badgeClass
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span className={`w-2 h-2 rounded-full ring-2 ${currentCfg.dotClass}`} />
        <span>{currentCfg.label}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-xl border border-border/70 bg-card p-1 shadow-xl text-card-foreground animate-in fade-in duration-100">
            <div className="space-y-0.5">
              {ALL_STATUSES.map((statusKey) => {
                const cfg = STATUS_CONFIG[statusKey];
                const isSelected = statusKey === currentStatus;
                return (
                  <button
                    type="button"
                    key={statusKey}
                    onClick={() => handleSelect(statusKey)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-right ${
                      isSelected
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ring-2 ${cfg.dotClass}`} />
                      <span>{cfg.label}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusDropdown;
