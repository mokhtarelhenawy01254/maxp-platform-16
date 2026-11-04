import React, { useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  ClipboardPaste,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
  CopyPlus,
} from "lucide-react";

export interface StudioContextMenuState {
  x: number;
  y: number;
  sectionKey: string;
  index: number;
  parentKey?: string;
  totalSections?: number;
  isHidden?: boolean;
  isLocked?: boolean;
  label?: string;
}

export interface StudioContextMenuProps {
  state: StudioContextMenuState;
  hasClipboard: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPasteAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
}

const MENU_WIDTH = 224;
const MENU_HEIGHT = 344;

export const StudioContextMenu: React.FC<StudioContextMenuProps> = ({
  state,
  hasClipboard,
  onClose,
  onDuplicate,
  onCopy,
  onPasteAfter,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const left = Math.max(8, Math.min(state.x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(state.y, window.innerHeight - MENU_HEIGHT - 8));

  const canMoveUp = state.index > 0 && !state.isLocked;
  const canMoveDown =
    typeof state.totalSections === "number"
      ? state.index < state.totalSections - 1 && !state.isLocked
      : !state.isLocked;

  const item = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    testId: string,
    shortcut?: string,
    { disabled = false, danger = false }: { disabled?: boolean; danger?: boolean } = {},
  ) => (
    <button
      type="button"
      data-studio-context-menu-item={testId}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        action();
        onClose();
      }}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-start text-xs font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-40 text-muted-foreground"
          : danger
            ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            : "text-foreground hover:bg-muted"
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {shortcut ? (
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
          {shortcut}
        </kbd>
      ) : null}
    </button>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      dir="rtl"
      data-studio-context-menu="true"
      style={{ left, top, width: MENU_WIDTH }}
      className="fixed z-[80] rounded-xl border border-border/80 bg-card p-1.5 shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      {state.label ? (
        <div className="truncate px-2.5 pb-1 pt-0.5 text-[11px] font-semibold text-muted-foreground border-b border-border/40 mb-1">
          {state.label}
        </div>
      ) : null}

      {item("تكرار", <CopyPlus className="h-3.5 w-3.5" />, onDuplicate, "duplicate", undefined, { disabled: state.isLocked })}
      {item("نسخ", <Copy className="h-3.5 w-3.5" />, onCopy, "copy", "Ctrl+C")}
      {item("لصق بعد", <ClipboardPaste className="h-3.5 w-3.5" />, onPasteAfter, "paste", "Ctrl+V", { disabled: !hasClipboard || state.isLocked })}

      <div className="my-1 border-t border-border/40" />

      {item("تحريك لأعلى", <ArrowUp className="h-3.5 w-3.5" />, onMoveUp, "move-up", undefined, { disabled: !canMoveUp })}
      {item("تحريك لأسفل", <ArrowDown className="h-3.5 w-3.5" />, onMoveDown, "move-down", undefined, { disabled: !canMoveDown })}

      <div className="my-1 border-t border-border/40" />

      {item(
        state.isHidden ? "إظهار في المتجر" : "إخفاء من المتجر",
        state.isHidden ? <Eye className="h-3.5 w-3.5 text-emerald-500" /> : <EyeOff className="h-3.5 w-3.5 text-amber-500" />,
        onToggleVisibility,
        "toggle-visibility"
      )}

      {item(
        state.isLocked ? "فك قفل القسم" : "قفل القسم",
        state.isLocked ? <Unlock className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-amber-500" />,
        onToggleLock,
        "toggle-lock"
      )}

      <div className="my-1 border-t border-border/40" />

      {item("حذف القسم", <Trash2 className="h-3.5 w-3.5" />, onDelete, "delete", "Del", { danger: true, disabled: state.isLocked })}
    </div>
  );
};
export default StudioContextMenu;
