import { ChevronDown as ChevronDownIcon, Check as CheckIcon } from 'lucide-react';
import React, { useState } from "react";
;
import { ConversationStatus } from "../../../types/inbox.types";

interface StatusDropdownProps {
  currentStatus: ConversationStatus;
  onStatusChange: (status: ConversationStatus) => void;
  disabled?: boolean;
}

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getToneStyle = (
    tone: "primary" | "warning" | "success" | "neutral",
  ): React.CSSProperties => {
    if (tone === "warning") {
      return {
        background: "color-mix(in srgb, var(--business-warning) 10%, white)",
        borderColor:
          "color-mix(in srgb, var(--business-warning) 18%, transparent)",
        color: "color-mix(in srgb, var(--business-warning) 72%, black)",
      };
    }

    if (tone === "success") {
      return {
        background: "color-mix(in srgb, var(--business-success) 10%, white)",
        borderColor:
          "color-mix(in srgb, var(--business-success) 18%, transparent)",
        color: "color-mix(in srgb, var(--business-success) 74%, black)",
      };
    }

    if (tone === "neutral") {
      return {
        background: "var(--shell-control-bg)",
        borderColor: "var(--shell-control-border)",
        color: "var(--color-foreground)",
      };
    }

    return {
      background: "color-mix(in srgb, var(--color-primary) 10%, white)",
      borderColor: "color-mix(in srgb, var(--color-primary) 18%, transparent)",
      color: "var(--color-primary)",
    };
  };

  const statuses: Array<{
    value: ConversationStatus;
    label: string;
    tone: "primary" | "warning" | "success" | "neutral";
    icon: string;
  }> = [
    { value: "open", label: "مفتوح", tone: "primary", icon: "🔵" },
    { value: "pending", label: "قيد المعالجة", tone: "warning", icon: "🟡" },
    { value: "resolved", label: "محلول", tone: "success", icon: "🟢" },
    { value: "done", label: "منتهي", tone: "neutral", icon: "✅" },
  ];

  const currentStatusObj =
    statuses.find((s) => s.value === currentStatus) || statuses[0]!;

  const handleSelect = (status: ConversationStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-medium shadow-sm transition-all ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
        style={getToneStyle(currentStatusObj.tone)}
      >
        <span>{currentStatusObj.icon}</span>
        <span>{currentStatusObj.label}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="business-dropdown-surface absolute left-0 z-20 mt-2 w-48 p-2">
            <div className="space-y-1">
              {statuses.map((status) => (
                <button
                  type="button"
                  key={status.value}
                  onClick={() => handleSelect(status.value)}
                  className="business-dropdown-option"
                  data-active={status.value === currentStatus}
                >
                  <span>{status.icon}</span>
                  <span className="flex-1 text-right">{status.label}</span>
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full border"
                    style={getToneStyle(status.tone)}
                  />
                  {status.value === currentStatus && (
                    <CheckIcon
                      className="h-4 w-4"
                      style={{ color: "var(--color-primary)" }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatusDropdown;
