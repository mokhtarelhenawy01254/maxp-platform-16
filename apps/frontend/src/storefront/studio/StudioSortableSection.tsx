import React, { useRef, useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { GripDotsIcon } from "./StudioLayersDrawer";
import type { StudioDeviceMode, StudioSelectedElement } from "./StudioTypes";
import { buildSectionStyle } from "./utils/studioStyleUtils";
import { StudioSpacingOverlay } from "./StudioSpacingOverlay";

export function detectElementUnderCursor(target: HTMLElement, sectionSettings?: Record<string, any>) {
  // Ignore clicks on studio chrome, action bar, handles, badges
  if (
    target.closest(
      "[data-studio-floating-bar], [data-studio-badge], [data-studio-drop-indicator], .studio-section-hairline, [data-studio-inline-badge]"
    )
  ) {
    return null;
  }

  // 1. Button / Link (CTA)
  const ctaEl = target.closest<HTMLElement>("a, button, [role='button'], .btn, [data-cta]");
  if (ctaEl) {
    const text = ctaEl.textContent?.trim() || "";
    return {
      type: "button" as const,
      label: "زر",
      field: "ctaText",
      linkField: "ctaLink",
      domElement: ctaEl,
      currentText: sectionSettings?.ctaText ?? sectionSettings?.buttonText ?? text,
      currentLink:
        sectionSettings?.ctaLink ??
        sectionSettings?.buttonUrl ??
        sectionSettings?.primaryHref ??
        ctaEl.getAttribute("href") ??
        "",
    };
  }

  // 2. Heading (h1-h6)
  const headingEl = target.closest<HTMLElement>("h1, h2, h3, h4, h5, h6, [data-heading]");
  if (headingEl) {
    const text = headingEl.textContent?.trim() || "";
    return {
      type: "heading" as const,
      label: "العنوان",
      field: "title",
      domElement: headingEl,
      currentText: sectionSettings?.title ?? sectionSettings?.heading ?? text,
    };
  }

  // 3. Image
  const imgEl = target.closest<HTMLElement>("img, picture, [data-image]");
  if (imgEl) {
    const src = imgEl instanceof HTMLImageElement ? imgEl.src : "";
    return {
      type: "image" as const,
      label: "صورة",
      field:
        sectionSettings?.heroImage !== undefined
          ? "heroImage"
          : sectionSettings?.backgroundImage !== undefined
          ? "backgroundImage"
          : "image",
      domElement: imgEl,
      currentImage:
        sectionSettings?.image ??
        sectionSettings?.backgroundImage ??
        sectionSettings?.heroImage ??
        src,
      currentText: imgEl.getAttribute("alt") || "",
      altField: "imageAlt",
    };
  }

  // 4. Eyebrow / Badge
  const badgeEl = target.closest<HTMLElement>("[data-badge], [data-eyebrow], .badge");
  if (badgeEl) {
    const text = badgeEl.textContent?.trim() || "";
    return {
      type: "badge" as const,
      label: "الشارة",
      field: "eyebrow",
      domElement: badgeEl,
      currentText: sectionSettings?.eyebrow ?? sectionSettings?.badge ?? text,
    };
  }

  // 5. Paragraph / Subtitle / Description
  const pEl = target.closest<HTMLElement>("p, blockquote, [data-subtitle], [data-description]");
  if (pEl) {
    const text = pEl.textContent?.trim() || "";
    const field =
      sectionSettings?.content !== undefined
        ? "content"
        : sectionSettings?.body !== undefined
        ? "body"
        : "subtitle";
    return {
      type: "subtitle" as const,
      label: "الوصف",
      field,
      domElement: pEl,
      currentText: sectionSettings?.[field] ?? sectionSettings?.description ?? text,
    };
  }

  // 6. Match any string setting value in child text nodes
  if (sectionSettings && target.textContent?.trim()) {
    const text = target.textContent.trim();
    if (text.length > 0 && text.length < 150) {
      for (const [key, val] of Object.entries(sectionSettings)) {
        if (typeof val === "string" && val.trim() === text) {
          return {
            type: "custom" as const,
            label: key,
            field: key,
            domElement: target,
            currentText: val,
          };
        }
      }
    }
  }

  return null;
}

interface StudioSortableSectionProps {
  id: string;
  index: number;
  sectionKey: string;
  sectionLabel: string;
  sectionType: string;
  selected: boolean;
  totalSections: number;
  deviceMode?: StudioDeviceMode;
  showSpacingOverlay?: boolean;
  actualPadding?: string | number;
  settings?: Record<string, any>;
  libraryDropSlot?: number | null;
  selectedElement?: StudioSelectedElement | null;
  onSelect: () => void;
  onSelectElement?: (element: StudioSelectedElement) => void;
  onClearSelectedElement?: () => void;
  onUpdateField?: (field: string, value: any) => void;
  onBatchUpdateFields?: (updates: Record<string, any>) => void;
  onSave?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLibraryDragOver?: (targetSlot: number) => void;
  onLibraryDrop?: (sectionType: string, targetSlot: number) => void;
  children: React.ReactNode;
}

export const StudioSortableSection: React.FC<StudioSortableSectionProps> = ({
  id,
  index,
  sectionKey,
  sectionLabel,
  sectionType,
  selected,
  totalSections,
  deviceMode = "desktop",
  showSpacingOverlay = true,
  actualPadding,
  settings,
  libraryDropSlot,
  selectedElement,
  onSelect,
  onSelectElement,
  onClearSelectedElement,
  onUpdateField,
  onBatchUpdateFields,
  onSave,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onLibraryDragOver,
  onLibraryDrop,
  children,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [inlineEditing, setInlineEditing] = useState<{
    domEl: HTMLElement;
    field: string;
    label: string;
    originalText: string;
  } | null>(null);

  const resolvedPadding =
    actualPadding ??
    settings?.padding ??
    settings?.paddingTop ??
    settings?.paddingBlock ??
    settings?.sectionPadding;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({ id });

  const isDropAbove =
    Boolean(isOver && active && active.id !== id && (active.data.current?.sortable?.index ?? 0) > index);

  const isLibraryDropHere =
    typeof libraryDropSlot === "number" &&
    (libraryDropSlot === index || (libraryDropSlot === totalSections && index === totalSections - 1));
  const libraryDropPos = libraryDropSlot === index ? "-top-1" : "-bottom-1";

  const showIndicator = Boolean((isOver && active && active.id !== id) || isLibraryDropHere);
  const indicatorPos = isLibraryDropHere ? libraryDropPos : isDropAbove ? "-top-1" : "-bottom-1";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: "relative",
  };

  const resolvedStyle = buildSectionStyle(settings, style);

  useEffect(() => {
    if (!contentRef.current) return;
    const prev = contentRef.current.querySelectorAll("[data-studio-element-selected='true']");
    prev.forEach((el) => el.removeAttribute("data-studio-element-selected"));

    if (selected && selectedElement && selectedElement.sectionKey === sectionKey) {
      const candidates = contentRef.current.querySelectorAll(
        "h1, h2, h3, h4, h5, h6, p, a, button, img, [role='button'], [data-cta], [data-heading], [data-badge], span, blockquote"
      );
      for (const el of Array.from(candidates)) {
        const detected = detectElementUnderCursor(el as HTMLElement, settings);
        if (
          detected &&
          detected.type === selectedElement.type &&
          detected.field === selectedElement.field
        ) {
          el.setAttribute("data-studio-element-selected", "true");
          break;
        }
      }
    }
  }, [selected, selectedElement, sectionKey, settings]);

  useEffect(() => {
    if (!inlineEditing) return;
    const { domEl, field, originalText } = inlineEditing;
    let saved = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        saved = true;
        domEl.innerText = originalText;
        cleanup();
      } else if (e.key === "Enter") {
        const isMultiline =
          domEl.tagName.toLowerCase() === "p" ||
          domEl.tagName.toLowerCase() === "blockquote";
        if (e.ctrlKey || e.metaKey || !isMultiline) {
          e.preventDefault();
          e.stopPropagation();
          commitSave();
        }
      }
    };

    const handleBlur = () => {
      if (!saved) {
        commitSave();
      }
    };

    const commitSave = () => {
      saved = true;
      const newText = domEl.innerText.trim();
      cleanup();
      if (newText !== originalText) {
        const updates: Record<string, any> = { [field]: newText };
        if (field === "title") updates.heading = newText;
        if (field === "subtitle") updates.description = newText;
        if (field === "ctaText") {
          updates.buttonText = newText;
          updates.primaryButtonText = newText;
        }

        if (onBatchUpdateFields) {
          onBatchUpdateFields(updates);
        }
        if (onUpdateField) {
          onUpdateField(field, newText);
          if (!onBatchUpdateFields) {
            if (field === "title") onUpdateField("heading", newText);
            if (field === "subtitle") onUpdateField("description", newText);
            if (field === "ctaText") onUpdateField("buttonText", newText);
          }
        }
        onSave?.();
      }
    };

    const cleanup = () => {
      domEl.contentEditable = "false";
      domEl.setAttribute("contenteditable", "false");
      domEl.removeAttribute("data-studio-inline-editing");
      domEl.removeEventListener("keydown", handleKeyDown);
      domEl.removeEventListener("blur", handleBlur);
      setInlineEditing(null);
    };

    domEl.addEventListener("keydown", handleKeyDown);
    domEl.addEventListener("blur", handleBlur);

    return () => {
      domEl.contentEditable = "false";
      domEl.setAttribute("contenteditable", "false");
      domEl.removeAttribute("data-studio-inline-editing");
      domEl.removeEventListener("keydown", handleKeyDown);
      domEl.removeEventListener("blur", handleBlur);
    };
  }, [inlineEditing, onUpdateField, onBatchUpdateFields, onSave]);

  const handleSectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "[data-studio-floating-bar], [data-studio-badge], [data-studio-inline-badge]"
      )
    ) {
      return;
    }

    if (contentRef.current && contentRef.current.contains(target)) {
      const detected = detectElementUnderCursor(target, settings);
      if (detected) {
        onSelect();
        onSelectElement?.({
          sectionKey,
          type: detected.type,
          label: detected.label,
          field: detected.field,
          linkField: detected.linkField,
          altField: detected.altField,
          currentText: detected.currentText,
          currentLink: detected.currentLink,
          currentImage: detected.currentImage,
        });
        return;
      }
    }

    onSelect();
    onClearSelectedElement?.();
  };

  const handleSectionDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "[data-studio-floating-bar], [data-studio-badge], [data-studio-inline-badge]"
      )
    ) {
      return;
    }

    if (contentRef.current && contentRef.current.contains(target)) {
      const detected = detectElementUnderCursor(target, settings);
      if (detected && detected.type !== "image") {
        e.stopPropagation();
        e.preventDefault();
        onSelect();
        onSelectElement?.({
          sectionKey,
          type: detected.type,
          label: detected.label,
          field: detected.field,
          linkField: detected.linkField,
          currentText: detected.currentText,
          currentLink: detected.currentLink,
        });

        const targetEl = detected.domElement;
        const originalText = targetEl.innerText || targetEl.textContent || "";
        targetEl.contentEditable = "true";
        targetEl.setAttribute("contenteditable", "true");
        targetEl.setAttribute("data-studio-inline-editing", "true");
        targetEl.focus();

        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(targetEl);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch {
          // ignore selection error
        }

        setInlineEditing({
          domEl: targetEl,
          field: detected.field,
          label: detected.label,
          originalText,
        });
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={resolvedStyle}
      data-studio-sortable-section="true"
      data-studio-section-index={index}
      data-section-type={sectionType}
      onClick={handleSectionClick}
      onDoubleClick={handleSectionDoubleClick}
      onDragOver={(e) => {
        const types = Array.from(e.dataTransfer.types || []);
        if (
          types.includes("application/x-storefront-section") ||
          types.includes("text/plain")
        ) {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
          const rect = e.currentTarget.getBoundingClientRect();
          const isTopHalf = e.clientY < rect.top + rect.height / 2;
          const targetSlot = isTopHalf ? index : index + 1;
          onLibraryDragOver?.(targetSlot);
        }
      }}
      onDrop={(e) => {
        const types = Array.from(e.dataTransfer.types || []);
        if (
          types.includes("application/x-storefront-section") ||
          types.includes("text/plain")
        ) {
          e.preventDefault();
          e.stopPropagation();
          const secType =
            e.dataTransfer.getData("application/x-storefront-section") ||
            e.dataTransfer.getData("text/plain");
          const rect = e.currentTarget.getBoundingClientRect();
          const isTopHalf = e.clientY < rect.top + rect.height / 2;
          const targetSlot = isTopHalf ? index : index + 1;
          if (secType) {
            onLibraryDrop?.(secType, targetSlot);
          }
        }
      }}
      className={`group relative transition-all cursor-pointer ${
        selected ? "z-20" : "z-10 hover:z-15"
      }`}
    >
      {/* Drop insertion line indicator during drag (Sortable or Library) */}
      {showIndicator && (
        <div
          data-studio-drop-indicator="true"
          className={`pointer-events-none absolute inset-x-0 z-50 flex items-center ${indicatorPos}`}
        >
          <div className="h-1 w-full bg-[#2b6cf6] shadow-[0_0_8px_rgba(43,108,246,0.8)]" />
          <span className="absolute start-3 -top-2.5 rounded-full bg-[#2b6cf6] px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
            أفلت هنا
          </span>
        </div>
      )}

      {/* Floating Inline Editing Badge */}
      {inlineEditing && (
        <div
          data-studio-inline-badge="true"
          onClick={(e) => e.stopPropagation()}
          className="absolute -top-7 start-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-[#2b6cf6] px-3 py-1 text-[10.5px] font-bold text-white shadow-xl select-none"
        >
          <span className="flex items-center gap-1">
            <span>✏️</span>
            <span>تحرير: {inlineEditing.label}</span>
          </span>
          <span className="text-[9px] font-normal opacity-90 border-s border-white/20 ps-2">
            Ctrl+Enter للحفظ • Esc للإلغاء
          </span>
        </div>
      )}

      {/* Selected Blue Outline & Handles */}
      {selected && (
        <>
          {/* Main selection outline */}
          <div className="pointer-events-none absolute inset-0 z-30 outline outline-2 outline-[#2b6cf6] outline-offset-[-2px]" />

          {/* 4 Corner Anchor Indicators */}
          <span className="pointer-events-none absolute -top-1 -end-1 z-40 h-2 w-2 rounded-xs bg-[#2b6cf6]" />
          <span className="pointer-events-none absolute -top-1 -start-1 z-40 h-2 w-2 rounded-xs bg-[#2b6cf6]" />
          <span className="pointer-events-none absolute -bottom-1 -end-1 z-40 h-2 w-2 rounded-xs bg-[#2b6cf6]" />
          <span className="pointer-events-none absolute -bottom-1 -start-1 z-40 h-2 w-2 rounded-xs bg-[#2b6cf6]" />

          {/* Section Indicator Badge with Breadcrumb */}
          <div
            data-studio-badge="true"
            className="absolute -top-7 end-2 sm:end-4 z-40 flex items-center rounded-md bg-[#2b6cf6] px-2 py-0.5 text-[10px] sm:text-[10.5px] font-semibold text-white shadow-md select-none"
          >
            <span>
              #{index + 1} {sectionLabel}
              {selectedElement && selectedElement.sectionKey === sectionKey
                ? ` › ${selectedElement.label}`
                : ""}
            </span>
          </div>

          {/* Floating Action Bar (fbtool) */}
          <div
            data-studio-floating-bar="true"
            onClick={(e) => e.stopPropagation()}
            className="absolute -top-7 start-2 sm:start-4 z-40 flex items-center overflow-hidden rounded-lg border border-[#33363c] bg-[#17181c] text-[#d6dae0] shadow-xl text-[10px] sm:text-[11px] select-none max-w-[calc(100%-90px)] sm:max-w-none"
          >
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 font-bold text-white bg-[#202226] truncate max-w-[180px] sm:max-w-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSelectedElement?.();
                }}
                className="hover:underline hover:text-[#3b82f6] truncate transition-colors cursor-pointer"
                title="الرجوع إلى تحديد القسم"
              >
                {sectionLabel}
              </button>
              {selectedElement && selectedElement.sectionKey === sectionKey && (
                <>
                  <span className="text-[#9ba0a8] text-[9px] shrink-0">›</span>
                  <span className="text-[#3b82f6] text-[10.5px] font-extrabold truncate shrink-0">
                    {selectedElement.label}
                  </span>
                </>
              )}
              {(!selectedElement || selectedElement.sectionKey !== sectionKey) && (
                <span className="hidden sm:inline text-[9px] text-[#9ba0a8]">({sectionType})</span>
              )}
            </div>

            {/* Drag handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              tabIndex={0}
              aria-label={`اسحب لإعادة ترتيب ${sectionLabel}`}
              className="flex items-center px-2 py-1 text-[#9ba0a8] hover:bg-[#2b303a] hover:text-white cursor-grab active:cursor-grabbing border-s border-[#2c2f35] focus-visible:ring-2 focus-visible:ring-[#2b6cf6] focus-visible:outline-none"
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

          {/* Real Spacing Overlay (Padding / Margin) */}
          {showSpacingOverlay && (
            <StudioSpacingOverlay
              settings={settings}
              sectionLabel={sectionLabel}
              onUpdateField={onUpdateField}
              onBatchUpdateFields={onBatchUpdateFields}
            />
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

      {/* Resting hairline border, hover outline, and hover pill label when not selected */}
      {!selected && (
        <>
          {/* 1. Resting Hairline Border (0 layout shift via inset shadow) + Hover Border */}
          <div
            className="pointer-events-none absolute inset-0 z-20 studio-section-hairline"
          />

          {/* 2. Hover Section Label Pill */}
          <div className="pointer-events-none absolute top-2.5 start-3 z-30 flex items-center gap-1.5 rounded-md bg-[#1e293b]/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-xs backdrop-blur-xs ring-1 ring-white/10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6]" />
            <span>{sectionLabel}</span>
          </div>
        </>
      )}

      {/* Content wrapper with pointer events isolated */}
      <div
        ref={contentRef}
        onClickCapture={(e) => {
          const anchor = (e.target as HTMLElement).closest("a, button, [type='submit']");
          if (anchor) {
            e.preventDefault();
          }
        }}
        className="relative z-0 [&_input]:pointer-events-none [&_select]:pointer-events-none"
      >
        {children}
      </div>
    </div>
  );
};
