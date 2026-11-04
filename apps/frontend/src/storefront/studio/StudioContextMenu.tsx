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

/**
 * Studio 2026 — right-click menu for a canvas section.
 *
 * `StorefrontStudioShell` renders this at the pointer position and owns every action; the menu
 * itself only reports the click and closes. Restored because the shell imported it while the file
 * was missing from the tree, which failed the whole frontend build.
 */

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

  const canMoveUp = state.index > 0;
  const canMoveDown =
    typeof state.totalSections === "number" ? state.index < state.totalSections - 1 : true;

  const item = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    { disabled = false, danger = false }: { disabled?: boolean; danger?: boolean } = {},
  ) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        action();
        onClose();
      }}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-start text-xs font-medium transition-colors ${
        disabled
          ? "cursor-not-allowed text-muted-foreground/50"
          : danger
            ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
            : "text-foreground hover:bg-muted"
      }`}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      dir="rtl"
      style={{ left, top, width: MENU_WIDTH }}
      className="fixed z-[80] rounded-xl border border-border/80 bg-card p-1.5 shadow-xl"
      onClick={(event) => event.stopPropagation()}
    >
      {state.label ? (
        <div className="truncate px-2.5 pb-1 pt-0.5 text-[11px] font-semibold text-muted-foreground">
          {state.label}
        </div>
      ) : null}

      {item("تكرار", <CopyPlus className="h-3.5 w-3.5" />, onDuplicate)}
      {item("نسخ", <Copy className="h-3.5 w-3.5" />, onCopy)}
      {item(
        "لصق بعد",
        <ClipboardPaste className="h-3.5 w-3.5" />,
        onPasteAfter,
        { disabled: !hasClipboard },
      )}

      <div className="my-1 h-px bg-border/70" />

      {item("تحريك لأعلى", <ArrowUp className="h-3.5 w-3.5" />, onMoveUp, { disabled: !canMoveUp })}
      {item("تحريك لأسفل", <ArrowDown className="h-3.5 w-3.5" />, onMoveDown, {
        disabled: !canMoveDown,
      })}

      <div className="my-1 h-px bg-border/70" />

      {item(
        state.isHidden ? "إظهار" : "إخفاء",
        state.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />,
        onToggleVisibility,
      )}
      {item(
        state.isLocked ? "فك القفل" : "قفل",
        state.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />,
        onToggleLock,
      )}

      <div className="my-1 h-px bg-border/70" />

      {item("حذف", <Trash2 className="h-3.5 w-3.5" />, onDelete, { danger: true })}
    </div>
  );
};

export default StudioContextMenu;
