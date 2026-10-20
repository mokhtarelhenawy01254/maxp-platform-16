import React, { useState, useEffect, useRef } from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  LockOpenIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripDotsIcon } from "./StudioLayersDrawer";

export interface StudioSortableLayerRowProps {
  index: number;
  sectionKey: string;
  sectionType: string;
  label: string;
  isHidden: boolean;
  isLocked: boolean;
  isSelected: boolean;
  totalSections: number;
  onSelect: () => void;
  onRename: (newLabel: string) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const StudioSortableLayerRow: React.FC<StudioSortableLayerRowProps> = ({
  index,
  sectionKey,
  sectionType,
  label,
  isHidden,
  isLocked,
  isSelected,
  totalSections,
  onSelect,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when label prop changes from outside
  useEffect(() => {
    if (!isEditing) {
      setEditValue(label);
    }
  }, [label, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id: sectionKey, disabled: isLocked });

  const isDropAbove =
    Boolean(isOver && active && active.id !== sectionKey && (active.data.current?.sortable?.index ?? 0) > index);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : isHidden ? 0.65 : 1,
  };

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== label) {
      onRename(trimmed);
    } else {
      setEditValue(label);
    }
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      data-studio-layer-row={sectionKey}
      data-is-hidden={isHidden ? "true" : "false"}
      data-is-locked={isLocked ? "true" : "false"}
      className={`group relative flex items-center justify-between rounded-xl border p-2 transition-all cursor-pointer ${
        isSelected
          ? "border-[#2b6cf6] bg-[#2b6cf6]/15 text-white shadow-xs ring-1 ring-[#2b6cf6]/40"
          : isHidden
          ? "border-[#33363c]/60 bg-[#1c1e23] hover:border-[#424752] text-[#8a8f96]"
          : "border-[#33363c] bg-[#26292f] hover:border-[#424752] hover:bg-[#2c313a] text-[#c3c7cd]"
      } ${isDragging ? "border-dashed border-[#2b6cf6]" : ""}`}
    >
      {/* Drop insertion line indicator during drag in tree */}
      {isOver && active && active.id !== sectionKey && (
        <div
          data-studio-tree-drop-indicator="true"
          className={`pointer-events-none absolute inset-x-1 z-30 h-1 bg-[#2b6cf6] rounded-full shadow-[0_0_8px_rgba(43,108,246,0.8)] ${
            isDropAbove ? "-top-1" : "-bottom-1"
          }`}
        />
      )}

      <div className="flex items-center gap-2 min-w-0 flex-1 me-1">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          disabled={isLocked}
          className={`flex h-6 w-5 shrink-0 items-center justify-center rounded transition-colors ${
            isLocked
              ? "text-[#555a63] cursor-not-allowed opacity-40"
              : "text-[#8b9199] hover:text-[#2b6cf6] hover:bg-[#2b6cf6]/10 active:cursor-grabbing cursor-grab touch-none"
          }`}
          title={isLocked ? "القسم مقفل" : "اسحب لإعادة الترتيب"}
          aria-label={isLocked ? "القسم مقفل" : "اسحب لإعادة الترتيب"}
        >
          <GripDotsIcon className="h-3.5 w-3.5" />
        </button>

        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            isSelected
              ? "bg-[#2b6cf6]/30 text-white"
              : isLocked
              ? "bg-[#2a241b] text-amber-400"
              : isHidden
              ? "bg-[#18191c] text-[#6b7280]"
              : "bg-[#1a1b20] text-[#8fa4c8] group-hover:text-[#2b6cf6]"
          }`}
        >
          {isLocked ? (
            <LockClosedIcon className="h-4 w-4" />
          ) : isHidden ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <Bars3Icon className="h-4 w-4" />
          )}
        </span>

        {/* Title / Inline Rename */}
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditValue(label);
                  setIsEditing(false);
                }
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full rounded-md bg-[#16171a] border border-[#2b6cf6] px-1.5 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#2b6cf6]"
              aria-label="تعديل اسم القسم"
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="flex items-center gap-1 group/title"
              title="دبل-كليك أو اضغط على القلم للتسمية"
            >
              <p
                className={`truncate text-xs font-black select-none ${
                  isSelected ? "text-white" : isHidden ? "text-[#9ca3af] line-through decoration-[#6b7280]/60" : "text-[#e8eaee]"
                }`}
              >
                {label}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="opacity-0 group-hover/title:opacity-100 hover:text-[#2b6cf6] p-0.5 rounded text-[#8a8f96] transition-opacity"
                title="تعديل الاسم"
                aria-label="تعديل الاسم"
              >
                <PencilSquareIcon className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="truncate text-[10px] text-[#8a8f96] font-mono">
              {sectionType}
            </span>
            {isHidden && (
              <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                مخفي
              </span>
            )}
            {isLocked && (
              <span className="rounded bg-amber-500/15 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                مقفل
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Visibility | Lock | MoveUp | MoveDown | Duplicate | Delete */}
      <div className="flex items-center gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Toggle Visibility (Eye) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className={`rounded-md p-1 transition-colors ${
            isHidden
              ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
              : "text-[#8a8f96] hover:bg-[#34383f] hover:text-white"
          }`}
          title={isHidden ? "إظهار في المتجر والكانفس" : "إخفاء من المتجر"}
          aria-label={isHidden ? "إظهار في المتجر والكانفس" : "إخفاء من المتجر"}
        >
          {isHidden ? <EyeSlashIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
        </button>

        {/* Toggle Lock */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
          className={`rounded-md p-1 transition-colors ${
            isLocked
              ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25"
              : "text-[#8a8f96] hover:bg-[#34383f] hover:text-white"
          }`}
          title={isLocked ? "فك قفل القسم" : "قفل القسم لمنع تحريكه أو تعديله بالكانفس"}
          aria-label={isLocked ? "فك قفل القسم" : "قفل القسم"}
        >
          {isLocked ? <LockClosedIcon className="h-3.5 w-3.5" /> : <LockOpenIcon className="h-3.5 w-3.5" />}
        </button>

        {/* Move Up */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (index > 0) onMoveUp();
          }}
          disabled={index === 0 || isLocked}
          className="rounded-md p-1 text-[#8a8f96] hover:bg-[#34383f] hover:text-white disabled:opacity-20"
          title="تحريك لأعلى"
        >
          <ChevronUpIcon className="h-3.5 w-3.5" />
        </button>

        {/* Move Down */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (index < totalSections - 1) onMoveDown();
          }}
          disabled={index === totalSections - 1 || isLocked}
          className="rounded-md p-1 text-[#8a8f96] hover:bg-[#34383f] hover:text-white disabled:opacity-20"
          title="تحريك لأسفل"
        >
          <ChevronDownIcon className="h-3.5 w-3.5" />
        </button>

        {/* Duplicate */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="rounded-md p-1 text-[#8a8f96] hover:bg-[#34383f] hover:text-white"
          title="تكرار القسم"
        >
          <DocumentDuplicateIcon className="h-3.5 w-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-md p-1 text-red-400 hover:bg-red-950/40 hover:text-red-300"
          title="حذف القسم"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
