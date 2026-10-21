import React, { useState } from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  Squares2X2Icon,
  PhotoIcon,
  Bars3BottomLeftIcon,
  QueueListIcon,
  SparklesIcon,
  CursorArrowRaysIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  TagIcon,
  DocumentTextIcon,
  MinusIcon,
  ArrowsUpDownIcon,
  PlayCircleIcon,
  BookmarkIcon,
  TrashIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { getStudioSectionThumbnail } from "./StudioSectionThumbnails";
import type { SavedStudioSection } from "./StudioTypes";
import { useStudioBridge } from "./hooks/useStorefrontStudioState";

const CONTAINER_THUMBNAIL = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80"><rect width="240" height="80" rx="8" fill="#181a20"/><rect x="10" y="10" width="220" height="60" rx="6" fill="#20242d" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 2"/><rect x="20" y="18" width="60" height="44" rx="4" fill="#2d3340" stroke="#4b5563" stroke-width="1"/><rect x="26" y="24" width="30" height="4" rx="2" fill="#60a5fa"/><rect x="26" y="32" width="46" height="3" rx="1.5" fill="#94a3b8"/><rect x="90" y="18" width="60" height="44" rx="4" fill="#2d3340" stroke="#4b5563" stroke-width="1"/><rect x="96" y="24" width="30" height="4" rx="2" fill="#10b981"/><rect x="96" y="32" width="46" height="3" rx="1.5" fill="#94a3b8"/><rect x="160" y="18" width="60" height="44" rx="4" fill="#2d3340" stroke="#4b5563" stroke-width="1"/><rect x="166" y="24" width="30" height="4" rx="2" fill="#f59e0b"/><rect x="166" y="32" width="46" height="3" rx="1.5" fill="#94a3b8"/></svg>')}`;

interface StudioElementsPanelProps {
  onAddSection: (sectionType: string, insertAtIndex?: number) => void;
  onOpenFullCatalog: () => void;
  onClose: () => void;
  onLibraryDragStart?: (sectionType: string, label: string) => void;
  onLibraryDragEnd?: () => void;
  onLibraryPointerDown?: (e: React.PointerEvent, sectionType: string, label: string) => void;
  savedSections?: SavedStudioSection[];
  onSaveSection?: (label?: string) => void;
  onDeleteSavedSection?: (id: string) => void;
  onAddSavedSection?: (saved: SavedStudioSection, insertAtIndex?: number) => void;
  selectedSectionConfig?: any;
}

export const StudioElementsPanel: React.FC<StudioElementsPanelProps> = ({
  onAddSection,
  onOpenFullCatalog,
  onClose,
  onLibraryDragStart,
  onLibraryDragEnd,
  onLibraryPointerDown,
  savedSections,
  onSaveSection,
  onDeleteSavedSection,
  onAddSavedSection,
  selectedSectionConfig,
}) => {
  const bridge = useStudioBridge();
  const currentSaved = savedSections !== undefined ? savedSections : (bridge.savedSections ?? []);
  const handleSave = onSaveSection || bridge.handleSaveSection;
  const handleDeleteSaved = onDeleteSavedSection || bridge.handleDeleteSavedSection;
  const handleAddSaved = onAddSavedSection || bridge.handleAddSavedSection;
  const currentSelectedSection = selectedSectionConfig !== undefined ? selectedSectionConfig : bridge.selectedSectionConfig;

  const [isSavingSection, setIsSavingSection] = useState(false);
  const [saveSectionLabel, setSaveSectionLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const quickElements = [
    { id: "container", label: "حاوية", type: "container", icon: Squares2X2Icon },
    { id: "heading", label: "عنوان", type: "heading", icon: Bars3BottomLeftIcon },
    { id: "text", label: "نص", type: "text", icon: DocumentTextIcon },
    { id: "hero", label: "بانر رئيسي", type: "hero-banner", icon: QueueListIcon },
    { id: "image", label: "صورة", type: "image", icon: PhotoIcon },
    { id: "button", label: "زر", type: "button", icon: CursorArrowRaysIcon },
    { id: "icon", label: "أيقونة", type: "icon", icon: SparklesIcon },
    { id: "divider", label: "فاصل", type: "divider", icon: MinusIcon },
    { id: "spacer", label: "مسافة", type: "spacer", icon: ArrowsUpDownIcon },
    { id: "video", label: "فيديو", type: "video", icon: PlayCircleIcon },
  ];

  const presets = [
    { id: "preset-products", title: "شبكة منتجات", sub: "4 أعمدة مع فلاتر", type: "featured-products", icon: Squares2X2Icon },
    { id: "preset-deal", title: "شريط عروض ومؤقت", sub: "عرض كامل بمؤقت", type: "countdown-banner", icon: TagIcon },
    { id: "preset-hero", title: "واجهة البطل الرئيسية", sub: "نص + زر + صورة", type: "hero-banner", icon: SparklesIcon },
    { id: "preset-trust", title: "شريط الموثوقية والضمان", sub: "4 شارات أمان وشحن", type: "features-bar", icon: ShieldCheckIcon },
    { id: "preset-reviews", title: "آراء وتجارب العملاء", sub: "تقييمات بالنجوم", type: "reviews", icon: ChatBubbleBottomCenterTextIcon },
  ];

  const filteredElements = quickElements.filter(
    (el) => el.label.includes(searchQuery) || el.type.includes(searchQuery)
  );
  const filteredPresets = presets.filter(
    (p) =>
      p.title.includes(searchQuery) ||
      p.sub.includes(searchQuery) ||
      p.type.includes(searchQuery)
  );
  const filteredSavedSections = currentSaved.filter(
    (s) =>
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDragProps = (type: string, label: string, savedPayload?: any) => ({
    draggable: true,
    "data-studio-draggable": "true",
    "data-section-type": type,
    "data-section-label": label,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData("application/x-storefront-section", type);
      if (savedPayload) e.dataTransfer.setData("application/x-storefront-saved-section", JSON.stringify(savedPayload));
      e.dataTransfer.setData("text/plain", type);
      e.dataTransfer.effectAllowed = "copy";
      onLibraryDragStart?.(type, label);
    },
    onDragEnd: () => onLibraryDragEnd?.(),
    onPointerDown: (e: React.PointerEvent) => onLibraryPointerDown?.(e, type, label),
  });

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-e border-[#0c0d0f] bg-[#202226] text-[#e8eaee] select-none z-10">
      {/* Header */}
      <div className="flex flex-col border-b border-[#2c2f35]">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <div className="flex items-center gap-1.5">
            <b className="text-[12.5px] font-bold text-[#f0f2f5]">إضافة عناصر وأقسام</b>
            <span className="rounded-full bg-[#2b6cf6]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#60a5fa]">
              سحب وإفلات
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Save Section Button */}
            <button
              type="button"
              data-testid="save-section-button"
              disabled={!currentSelectedSection}
              onClick={() => {
                if (!currentSelectedSection) return;
                const defaultLabel =
                  currentSelectedSection.label ||
                  currentSelectedSection.settings?.title ||
                  currentSelectedSection.type ||
                  "قسم محفوظ";
                setSaveSectionLabel(defaultLabel);
                setIsSavingSection(true);
              }}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold transition-all ${
                currentSelectedSection
                  ? "bg-[#2b6cf6]/20 text-[#60a5fa] hover:bg-[#2b6cf6]/30 active:scale-95"
                  : "bg-[#26292f] text-[#676c76] opacity-60 cursor-not-allowed"
              }`}
              title={
                currentSelectedSection
                  ? `احفظ القسم المحدد (${currentSelectedSection.label || currentSelectedSection.type}) في مكتبة أقسامي`
                  : "يرجى تحديد قسم في الكانفس أولاً لحفظه"
              }
            >
              <BookmarkIcon className="h-3.5 w-3.5" />
              <span>احفظ القسم</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#2a2d33] hover:text-white"
              title="إغلاق اللوحة"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inline Save Section Form when active */}
        {isSavingSection && (
          <div
            data-testid="save-section-modal"
            className="flex flex-col gap-1.5 p-2.5 bg-[#17181c] border-t border-[#32353b] animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-[#e6e8ec]">
                حفظ في «أقسامي»:
              </span>
              <span className="text-[9.5px] font-mono text-[#8b9199]">
                {currentSelectedSection?.type}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={saveSectionLabel}
                onChange={(e) => setSaveSectionLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSave(saveSectionLabel.trim());
                    setIsSavingSection(false);
                  } else if (e.key === "Escape") {
                    setIsSavingSection(false);
                  }
                }}
                data-testid="save-section-input"
                className="flex-1 bg-[#202226] border border-[#3b414d] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#2b6cf6] font-bold"
                placeholder="اسم القسم المحفوظ"
              />
              <button
                type="button"
                data-testid="save-section-confirm"
                onClick={() => {
                  handleSave(saveSectionLabel.trim());
                  setIsSavingSection(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2b6cf6] text-white hover:bg-[#2b6cf6]/80 text-[11px] font-bold active:scale-95 transition-all shadow-xs"
              >
                <CheckIcon className="h-3 w-3 stroke-[2.5]" />
                <span>حفظ</span>
              </button>
              <button
                type="button"
                data-testid="save-section-cancel"
                onClick={() => setIsSavingSection(false)}
                className="p-1 rounded-lg text-[#8a8f96] hover:bg-[#26292f] hover:text-white"
                title="إلغاء"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative flex h-[34px] w-full items-center rounded-lg border border-[#32353b] bg-[#17181c] px-2.5 text-[11.5px] text-[#7e848d] focus-within:border-[#2b6cf6]">
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[#7e848d] ms-0.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن عنصر أو سيكشن…"
            className="w-full bg-transparent px-2 text-[#e6e8ec] placeholder-[#7e848d] outline-none text-[11.5px]"
          />
        </div>
      </div>

      {/* Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3.5 [scrollbar-width:thin]">
        {/* Quick Elements Grid */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-[10px] font-bold tracking-wider text-[#8b9199]">
              العناصر الأساسية
            </span>
            <span className="text-[9px] text-[#707680]">اسحب أو انقر</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {filteredElements.map((el) => {
              const thumbnail =
                el.type === "container"
                  ? CONTAINER_THUMBNAIL
                  : getStudioSectionThumbnail(el.type);
              return (
                <div
                  key={el.id}
                  {...getDragProps(el.type, el.label)}
                  onClick={() => onAddSection(el.type)}
                  className="group flex flex-col rounded-xl border border-[#33363c] bg-[#26292f] p-1.5 text-start cursor-grab active:cursor-grabbing transition-all hover:border-[#2b6cf6] hover:bg-[#2c313a] hover:shadow-md"
                  title={`اسحب ${el.label} للكانفس أو انقر للإضافة`}
                >
                  {/* Miniature Visual Layout Preview (>= 120x48) */}
                  <div className="studio-element-preview-wrapper relative w-full h-[54px] overflow-hidden rounded-lg border border-[#333740] bg-[#1a1c22] pointer-events-none group-hover:border-[#2b6cf6] transition-colors mb-1 flex items-center justify-center">
                    <img
                      src={thumbnail}
                      alt={el.label}
                      data-studio-preview="true"
                      className="studio-element-preview-img w-full h-full object-cover pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
                      loading="eager"
                    />
                  </div>

                  <div className="flex items-center justify-between w-full px-1 pt-0.5">
                    <span className="text-[11px] font-bold text-[#e6e8ec] group-hover:text-white truncate">
                      {el.label}
                    </span>
                    <span className="text-[8.5px] font-mono text-[#7e8590] group-hover:text-[#60a5fa]">
                      +{el.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Saved Sections («أقسامي») */}
        <div className="pt-2 border-t border-[#2c2f35]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider text-[#8b9199]">
                أقسامي
              </span>
              <span
                data-testid="saved-sections-count"
                className="rounded-full bg-[#2b6cf6]/20 px-1.5 py-0.2 text-[8.5px] font-bold text-[#60a5fa]"
              >
                {currentSaved.length}/50
              </span>
            </div>
            {currentSaved.length > 0 && (
              <span className="text-[9px] text-[#707680]">اسحب أو انقر للإدراج</span>
            )}
          </div>

          {filteredSavedSections.length === 0 ? (
            <div
              data-testid="saved-sections-empty"
              className="rounded-xl border border-dashed border-[#33363c] p-2.5 text-center bg-[#181a20]/40"
            >
              <p className="text-[10px] text-[#8b9199] leading-relaxed">
                {searchQuery
                  ? "لا توجد نتائج في أقسامي المحفوظة."
                  : "لا توجد أقسام محفوظة بعد. حدد قسماً واضغط «احفظ القسم» بالأعلى."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSavedSections.map((saved) => (
                <div
                  key={saved.id}
                  {...getDragProps(saved.type, saved.label, saved)}
                  data-saved-section-id={saved.id}
                  data-testid={`saved-section-card-${saved.id}`}
                  onClick={() => handleAddSaved(saved)}
                  className="group relative flex items-center justify-between rounded-xl border border-[#33363c] bg-[#26292f] p-2 text-start cursor-grab active:cursor-grabbing transition-all hover:border-[#2b6cf6] hover:bg-[#2c313a] hover:shadow-md"
                  title={`اسحب «${saved.label}» للكانفس أو انقر للإضافة`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1a1c22] border border-[#333740] text-[#60a5fa] group-hover:border-[#2b6cf6]">
                      <BookmarkIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block text-[11px] font-bold text-[#e6e8ec] group-hover:text-white truncate">
                        {saved.label}
                      </b>
                      <span className="text-[9px] font-mono text-[#8b9199]">
                        {saved.type}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    data-testid={`delete-saved-section-${saved.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSaved(saved.id);
                    }}
                    className="p-1 rounded-md text-[#8a8f96] hover:bg-red-500/20 hover:text-red-400 transition-colors shrink-0"
                    title="حذف من أقسامي"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ready Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-wider text-[#8b9199]">
              أقسام جاهزة ✦
            </span>
            <button
              type="button"
              onClick={onOpenFullCatalog}
              className="text-[10px] text-[#2b6cf6] hover:underline"
            >
              الكتالوج الكامل ↗
            </button>
          </div>

          <div className="space-y-2">
            {filteredPresets.map((preset) => {
              const thumbnail =
                getStudioSectionThumbnail(preset.id) ||
                getStudioSectionThumbnail(preset.type);
              return (
                <div
                  key={preset.id}
                  {...getDragProps(preset.type, preset.title)}
                  onClick={() => onAddSection(preset.type)}
                  className="group w-full overflow-hidden rounded-xl border border-[#33363c] bg-[#26292f] text-start cursor-grab active:cursor-grabbing transition-all hover:border-[#2b6cf6] hover:bg-[#2b3038] hover:shadow-md"
                  title={`اسحب ${preset.title} للكانفس أو انقر للإضافة`}
                >
                  {/* Miniature Visual Layout Banner (>= 120x48) */}
                  <div className="studio-element-preview-wrapper relative w-full h-[62px] overflow-hidden rounded-t-xl border-b border-[#333740] bg-[#1a1c22] pointer-events-none group-hover:border-[#2b6cf6] transition-colors flex items-center justify-center">
                    <img
                      src={thumbnail}
                      alt={preset.title}
                      data-studio-preview="true"
                      className="studio-element-preview-img w-full h-full object-cover pointer-events-none select-none transition-transform duration-200 group-hover:scale-105"
                      loading="eager"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2">
                    <b className="text-[11px] font-bold text-[#e6e8ec] group-hover:text-white truncate">
                      {preset.title}
                    </b>
                    <span className="text-[9.5px] text-[#98a0ab] shrink-0">{preset.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="border-t border-dashed border-[#33363c] p-2.5 text-center bg-[#1c1d22]/50">
        <p className="text-[10px] leading-relaxed text-[#8b9199]">
          اسحب أي عنصر وأفلته مباشرة بين الأقسام، أو انقر للإدراج السريع
        </p>
      </div>
    </div>
  );
};
