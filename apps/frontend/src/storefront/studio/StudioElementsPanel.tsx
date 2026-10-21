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
} from "@heroicons/react/24/outline";
import { getStudioSectionThumbnail } from "./StudioSectionThumbnails";

const CONTAINER_THUMBNAIL = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80" width="240" height="80">
    <rect width="240" height="80" rx="8" fill="#181a20"/>
    <rect x="10" y="10" width="220" height="60" rx="6" fill="#20242d" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 2"/>
    <rect x="20" y="18" width="60" height="44" rx="4" fill="#2d3340" stroke="#4b5563" stroke-width="1"/>
    <rect x="26" y="24" width="30" height="4" rx="2" fill="#60a5fa"/>
    <rect x="26" y="32" width="46" height="3" rx="1.5" fill="#94a3b8"/>
    <rect x="90" y="18" width="60" height="44" rx="4" fill="#2d3340" stroke="#4b5563" stroke-width="1"/>
    <rect x="96" y="24" width="30" height="4" rx="2" fill="#10b981"/>
    <rect x="96" y="32" width="46" height="3" rx="1.5" fill="#94a3b8"/>
    <rect x="160" y="18" width="60" height="44" rx="4" fill="#2d3340" stroke="#4b5563" stroke-width="1"/>
    <rect x="166" y="24" width="30" height="4" rx="2" fill="#f59e0b"/>
    <rect x="166" y="32" width="46" height="3" rx="1.5" fill="#94a3b8"/>
  </svg>
`.trim())}`;

interface StudioElementsPanelProps {
  onAddSection: (sectionType: string, insertAtIndex?: number) => void;
  onOpenFullCatalog: () => void;
  onClose: () => void;
  onLibraryDragStart?: (sectionType: string, label: string) => void;
  onLibraryDragEnd?: () => void;
  onLibraryPointerDown?: (e: React.PointerEvent, sectionType: string, label: string) => void;
}

export const StudioElementsPanel: React.FC<StudioElementsPanelProps> = ({
  onAddSection,
  onOpenFullCatalog,
  onClose,
  onLibraryDragStart,
  onLibraryDragEnd,
  onLibraryPointerDown,
}) => {
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
    {
      id: "preset-products",
      title: "شبكة منتجات",
      sub: "4 أعمدة مع فلاتر",
      type: "featured-products",
      icon: Squares2X2Icon,
    },
    {
      id: "preset-deal",
      title: "شريط عروض ومؤقت",
      sub: "عرض كامل بمؤقت",
      type: "countdown-banner",
      icon: TagIcon,
    },
    {
      id: "preset-hero",
      title: "واجهة البطل الرئيسية",
      sub: "نص + زر + صورة",
      type: "hero-banner",
      icon: SparklesIcon,
    },
    {
      id: "preset-trust",
      title: "شريط الموثوقية والضمان",
      sub: "4 شارات أمان وشحن",
      type: "features-bar",
      icon: ShieldCheckIcon,
    },
    {
      id: "preset-reviews",
      title: "آراء وتجارب العملاء",
      sub: "تقييمات بالنجوم",
      type: "reviews",
      icon: ChatBubbleBottomCenterTextIcon,
    },
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

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col border-e border-[#0c0d0f] bg-[#202226] text-[#e8eaee] select-none z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2c2f35]">
        <div className="flex items-center gap-1.5">
          <b className="text-[12.5px] font-bold text-[#f0f2f5]">إضافة عناصر وأقسام</b>
          <span className="rounded-full bg-[#2b6cf6]/20 px-1.5 py-0.2 text-[9px] font-bold text-[#60a5fa]">
            سحب وإفلات
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#8a8f96] hover:bg-[#2a2d33] hover:text-white"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
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
                  draggable={true}
                  data-studio-draggable="true"
                  data-section-type={el.type}
                  data-section-label={el.label}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-storefront-section", el.type);
                    e.dataTransfer.setData("text/plain", el.type);
                    e.dataTransfer.effectAllowed = "copy";
                    onLibraryDragStart?.(el.type, el.label);
                  }}
                  onDragEnd={() => {
                    onLibraryDragEnd?.();
                  }}
                  onPointerDown={(e) => {
                    onLibraryPointerDown?.(e, el.type, el.label);
                  }}
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
                  draggable={true}
                  data-studio-draggable="true"
                  data-section-type={preset.type}
                  data-section-label={preset.title}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-storefront-section", preset.type);
                    e.dataTransfer.setData("text/plain", preset.type);
                    e.dataTransfer.effectAllowed = "copy";
                    onLibraryDragStart?.(preset.type, preset.title);
                  }}
                  onDragEnd={() => {
                    onLibraryDragEnd?.();
                  }}
                  onPointerDown={(e) => {
                    onLibraryPointerDown?.(e, preset.type, preset.title);
                  }}
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
