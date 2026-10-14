import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { GripDotsIcon } from "./StudioLayersDrawer";

interface StudioSortableSectionProps {
  id: string;
  index: number;
  sectionKey: string;
  sectionLabel: string;
  sectionType: string;
  selected: boolean;
  totalSections: number;
  showSpacingOverlay?: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export const StudioSortableSection: React.FC<StudioSortableSectionProps> = ({
  id,
  index,
  sectionLabel,
  sectionType,
  selected,
  totalSections,
  showSpacingOverlay = true,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group relative transition-all cursor-pointer ${
        selected ? "z-20" : "z-10 hover:z-15"
      }`}
    >
      {/* Selected Blue Outline & Handles */}
      {selected && (
        <>
          {/* Main selection outline */}
          <div className="pointer-events-none absolute inset-0 z-30 outline outline-2 outline-[#2b6cf6] outline-offset-[-2px]" />

          {/* 4 Corner Anchor Handles */}
          <span className="pointer-events-none absolute -top-1 -end-1 z-40 h-2.5 w-2.5 rounded-[2px] border-2 border-[#2b6cf6] bg-white shadow-sm" />
          <span className="pointer-events-none absolute -top-1 -start-1 z-40 h-2.5 w-2.5 rounded-[2px] border-2 border-[#2b6cf6] bg-white shadow-sm" />
          <span className="pointer-events-none absolute -bottom-1 -end-1 z-40 h-2.5 w-2.5 rounded-[2px] border-2 border-[#2b6cf6] bg-white shadow-sm" />
          <span className="pointer-events-none absolute -bottom-1 -start-1 z-40 h-2.5 w-2.5 rounded-[2px] border-2 border-[#2b6cf6] bg-white shadow-sm" />

          {/* Pixel Size Badge */}
          <div className="absolute -top-7 end-0 z-40 flex items-center rounded-md bg-[#2b6cf6] px-2 py-0.5 text-[10.5px] font-semibold text-white shadow-md select-none font-mono">
            <span>1,180 × 420 px*</span>
          </div>

          {/* Floating Action Bar (fbtool) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute -top-7 start-0 sm:start-auto sm:end-28 z-40 flex items-center overflow-hidden rounded-lg border border-[#33363c] bg-[#17181c] text-[#d6dae0] shadow-xl text-[11px] select-none"
          >
            <span className="flex items-center gap-1 px-2.5 py-1 font-bold text-white bg-[#202226]">
              <span>{sectionLabel}</span>
              <span className="text-[9px] text-[#9ba0a8]">({sectionType})</span>
            </span>

            {/* Drag handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="flex items-center px-2 py-1 text-[#9ba0a8] hover:bg-[#2b303a] hover:text-white cursor-grab active:cursor-grabbing border-s border-[#2c2f35]"
              title="اسحب لإعادة الترتيب"
            >
              <GripDotsIcon className="h-3.5 w-3.5" />
            </button>

            {/* Move Up */}
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="flex items-center px-1.5 py-1 text-[#9ba0a8] hover:bg-[#2b303a] hover:text-white disabled:opacity-30 border-s border-[#2c2f35]"
              title="تحريك لأعلى"
            >
              <ChevronUpIcon className="h-3 w-3" />
            </button>

            {/* Move Down */}
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalSections - 1}
              className="flex items-center px-1.5 py-1 text-[#9ba0a8] hover:bg-[#2b303a] hover:text-white disabled:opacity-30 border-s border-[#2c2f35]"
              title="تحريك لأسفل"
            >
              <ChevronDownIcon className="h-3 w-3" />
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={onDuplicate}
              className="flex items-center px-2 py-1 text-[#9ba0a8] hover:bg-[#2b303a] hover:text-white border-s border-[#2c2f35]"
              title="تكرار القسم"
            >
              <DocumentDuplicateIcon className="h-3 w-3" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="flex items-center px-2 py-1 text-red-400 hover:bg-red-950/40 hover:text-red-300 border-s border-[#2c2f35]"
              title="حذف القسم"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>

          {/* Colored Spacing Overlay (Padding / Margin) */}
          {showSpacingOverlay && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              {/* Outer Margin outline in orange */}
              <div className="absolute inset-0 border border-dashed border-[#e29142]/60" />
              {/* Inner Padding in green with label */}
              <div className="absolute inset-[18px] sm:inset-[24px] border border-dashed border-[#3faa6f]/60 bg-[#3faa6f]/10">
                <span className="absolute top-1 end-1.5 rounded bg-[#eaf7ef] px-1.5 py-0.5 text-[8.5px] font-bold text-[#2d8554] shadow-xs">
                  padding 24
                </span>
              </div>
            </div>
          )}

          {/* Subtle blueprint grid overlay */}
          <div
            style={{
              backgroundImage:
                "linear-gradient(rgba(43,108,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(43,108,246,0.06) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
            className="pointer-events-none absolute inset-0 z-10"
          />
        </>
      )}

      {/* Hover outline when not selected */}
      {!selected && (
        <div className="pointer-events-none absolute inset-0 z-20 border-2 border-transparent transition-all group-hover:border-[#2b6cf6]/50 group-hover:bg-[#2b6cf6]/[0.02]" />
      )}

      {/* Content wrapper with pointer events isolated */}
      <div className="relative z-0 select-none [&_a]:pointer-events-none [&_button]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none">
        {children}
      </div>
    </div>
  );
};
