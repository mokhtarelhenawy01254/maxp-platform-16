import React, { useState } from "react";
import {
  Bars3Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentDuplicateIcon,
  PaintBrushIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  SwatchIcon,
  RocketLaunchIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  LinkIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  SparklesIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { getStorefrontSectionLabel } from "../sections/manifest";
import type { StudioLeftPanelTab } from "./StudioTypes";
import type { StudioDragPayload, StudioDropTarget } from "./hooks/useStudioSectionDnD";

export const GripDotsIcon: React.FC<{ className?: string }> = ({ className = "h-3.5 w-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <circle cx="9" cy="6" r="1.55" />
    <circle cx="15" cy="6" r="1.55" />
    <circle cx="9" cy="12" r="1.55" />
    <circle cx="15" cy="12" r="1.55" />
    <circle cx="9" cy="18" r="1.55" />
    <circle cx="15" cy="18" r="1.55" />
  </svg>
);

interface StudioLayersDrawerProps {
  sections: any[];
  selectedSectionKey: string;
  leftPanelTab: StudioLeftPanelTab;
  designTokens?: Record<string, unknown>;
  isDragging?: boolean;
  activeDragKey?: string;
  dropTarget?: StudioDropTarget | null;
  onStartDrag?: (e: React.PointerEvent, payload: StudioDragPayload) => void;
  onSelectSection: (key: string) => void;
  onMoveSection: (index: number, direction: "up" | "down") => void;
  onDuplicateSection: (index: number) => void;
  onDeleteSection: (key: string) => void;
  onOpenSectionCatalog: () => void;
  onTabChange: (tab: StudioLeftPanelTab) => void;
  onUpdateThemeTokens?: (tokens: Record<string, unknown>) => void;
  onCollapse?: () => void;
}

export const StudioLayersDrawer: React.FC<StudioLayersDrawerProps> = ({
  sections,
  selectedSectionKey,
  leftPanelTab,
  designTokens,
  isDragging = false,
  activeDragKey = "",
  dropTarget = null,
  onStartDrag,
  onSelectSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  onOpenSectionCatalog,
  onTabChange,
  onUpdateThemeTokens,
  onCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const primaryColor = (designTokens?.colors as any)?.primary || "#0f172a";
  const fontFamily = (designTokens?.typography as any)?.fontFamily || "Cairo";
  const isLandingMode = Boolean(designTokens?.landingPageMode);

  // Announcement Bar & WhatsApp
  const announcement = (designTokens?.announcement as any) || {
    enabled: true,
    text: "🔥 شحن مجاني للطلبات فوق 500 جنيه • دفع عند الاستلام",
  };

  const whatsapp = (designTokens?.whatsapp as any) || {
    enabled: true,
    phone: "01000000000",
    message: "مرحباً، أود الاستفسار عن منتجات المتجر",
  };

  // Header Navigation Menu Links
  const menuLinks: Array<{ label: string; url: string }> = Array.isArray((designTokens?.navigation as any)?.menu)
    ? (designTokens?.navigation as any).menu
    : [
        { label: "الرئيسية", url: "/" },
        { label: "كل المنتجات", url: "/shop" },
        { label: "العروض والتخفيضات", url: "/shop?discount=true" },
        { label: "تواصل معنا", url: "/contact" },
      ];

  // PDP 1-Click Fast COD Buybox Settings
  const pdpQuickOrder = (designTokens?.pdpQuickOrder as any) || {
    enabled: true,
    surfaceMode: "merged-buybox",
    showQuantityOffers: true,
    showGovernorateSelector: true,
  };

  // Checkout Fields Settings
  const checkoutSettings = (designTokens?.checkoutSettings as any) || {
    hideZipCode: true,
    hideCompany: true,
    autoGovernorates: true,
  };

  const updateTokens = (patch: Record<string, unknown>) => {
    if (onUpdateThemeTokens) {
      onUpdateThemeTokens({
        ...designTokens,
        ...patch,
      });
    }
  };

  const handleUpdateMenuLink = (index: number, field: "label" | "url", val: string) => {
    const nextMenu = [...menuLinks];
    nextMenu[index] = {
      ...nextMenu[index],
      [field]: val,
    };
    updateTokens({
      navigation: {
        ...(designTokens?.navigation as any || {}),
        menu: nextMenu,
      },
    });
  };

  const handleAddMenuLink = () => {
    const nextMenu = [...menuLinks, { label: "رابط جديد", url: "/shop" }];
    updateTokens({
      navigation: {
        ...(designTokens?.navigation as any || {}),
        menu: nextMenu,
      },
    });
  };

  const handleDeleteMenuLink = (index: number) => {
    const nextMenu = menuLinks.filter((_, idx) => idx !== index);
    updateTokens({
      navigation: {
        ...(designTokens?.navigation as any || {}),
        menu: nextMenu,
      },
    });
  };

  return (
    <aside className="flex h-full w-full flex-col border-e border-border/80 bg-card/95 backdrop-blur-md">
      {/* Tab Switcher (Layers vs Theme) */}
      <div className="flex items-center border-b border-border/80 p-2 gap-1">
        <button
          type="button"
          onClick={() => onTabChange("layers")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
            leftPanelTab === "layers"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Squares2X2Icon className="h-4 w-4" />
          <span>الهيكل ({sections.length})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("theme")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
            leftPanelTab === "theme"
              ? "bg-secondary text-foreground shadow-sm ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PaintBrushIcon className="h-4 w-4" />
          <span>الأنماط</span>
        </button>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="إخفاء لوحة الهيكل"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content Area */}
      {leftPanelTab === "layers" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Section Search */}
          <div className="px-3 pt-3">
            <div className="relative flex items-center">
              <MagnifyingGlassIcon className="absolute start-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الأقسام…"
                className="w-full rounded-xl border border-border/80 bg-background/60 py-1.5 ps-8 pe-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  title="مسح البحث"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Add Section Action Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={onOpenSectionCatalog}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 py-2.5 text-xs font-black text-primary transition-all hover:bg-primary/10 hover:border-primary active:scale-98"
            >
              <PlusIcon className="h-4 w-4" />
              <span>إضافة قسم جديد</span>
            </button>
          </div>

          {/* Section Layers List */}
          <div
            data-studio-dropzone="rail"
            className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 [scrollbar-width:none]"
          >
            {sections.map((section, index) => {
              const sectionType = typeof section === "string" ? section : section.type;
              const sectionKey = typeof section === "string" ? `${section}-${index}` : section.key || `${sectionType}-${index}`;
              const isSelected = selectedSectionKey === sectionKey;
              const label = getStorefrontSectionLabel(sectionType);

              const normalizedQuery = searchQuery.trim().toLowerCase();
              if (
                normalizedQuery &&
                !label.toLowerCase().includes(normalizedQuery) &&
                !sectionType.toLowerCase().includes(normalizedQuery)
              ) {
                return null;
              }

              const isDropTargetBefore = dropTarget?.zone === "rail" && dropTarget.slot === index;
              const isDropTargetAfter =
                dropTarget?.zone === "rail" &&
                dropTarget.slot === sections.length &&
                index === sections.length - 1;
              const isBeingDragged = isDragging && activeDragKey === sectionKey;

              return (
                <div
                  key={sectionKey}
                  data-studio-rail-item="true"
                  data-index={index}
                  onClick={() => onSelectSection(sectionKey)}
                  className={`group relative flex items-center justify-between rounded-xl border p-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/25"
                      : "border-border/60 bg-background/50 hover:border-border hover:bg-muted/40"
                  } ${isBeingDragged ? "opacity-40 scale-[0.99] border-dashed border-primary/50" : ""}`}
                >
                  {/* Drop line before row */}
                  {isDropTargetBefore && (
                    <div className="absolute -top-1.5 inset-x-2 z-30 h-[3px] rounded-full bg-primary shadow-[0_0_0_2px_rgba(59,130,246,0.35)] pointer-events-none" />
                  )}
                  {/* Drop line after last row */}
                  {isDropTargetAfter && (
                    <div className="absolute -bottom-1.5 inset-x-2 z-30 h-[3px] rounded-full bg-primary shadow-[0_0_0_2px_rgba(59,130,246,0.35)] pointer-events-none" />
                  )}

                  <div className="flex items-center gap-2 min-w-0">
                    {/* Grip Drag Handle */}
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if (onStartDrag) {
                          onStartDrag(e, {
                            source: "rail",
                            index,
                            sectionKey,
                            label,
                            type: sectionType,
                          });
                        }
                      }}
                      className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/10 active:cursor-grabbing cursor-grab touch-none transition-colors"
                      title="اسحب لإعادة الترتيب"
                      aria-label="اسحب لإعادة الترتيب"
                    >
                      <GripDotsIcon className="h-3.5 w-3.5" />
                    </button>

                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Bars3Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className={`truncate text-xs font-black ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {label}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground font-mono">
                        {sectionType}
                      </p>
                    </div>
                  </div>

                  {/* Quick Layer Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index > 0) onMoveSection(index, "up");
                      }}
                      disabled={index === 0}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      title="تحريك لأعلى"
                    >
                      <ChevronUpIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (index < sections.length - 1) onMoveSection(index, "down");
                      }}
                      disabled={index === sections.length - 1}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                      title="تحريك لأسفل"
                    >
                      <ChevronDownIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateSection(index);
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="تكرار القسم"
                    >
                      <DocumentDuplicateIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSection(sectionKey);
                      }}
                      className="rounded-md p-1 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                      title="حذف القسم"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Drag Hint */}
          <div className="border-t border-border/60 py-2.5 px-3 text-center text-[10px] text-muted-foreground">
            <span>اسحب المقبض <b>⠿</b> لإعادة ترتيب الأقسام</span>
          </div>
        </div>
      ) : (
        /* Global Theme & E-commerce Settings Tab */
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs [scrollbar-width:none]">
          {/* 1. 1-Click Fast COD Buybox on Product Page */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-foreground flex items-center gap-1.5">
                <ShoppingBagIcon className="h-4 w-4 text-primary" />
                <span>الشراء الفوري COD بصفحة المنتج</span>
              </h3>
              <input
                type="checkbox"
                checked={pdpQuickOrder.enabled}
                onChange={(e) => {
                  updateTokens({
                    pdpQuickOrder: { ...pdpQuickOrder, enabled: e.target.checked },
                  });
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              نموذج طلب فوري (الاسم + الهاتف + المحافظة) في صفحة المنتج بدون المرور بالسلة لمضاعفة المبيعات.
            </p>
            {pdpQuickOrder.enabled && (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdpQuickOrder.showQuantityOffers}
                    onChange={(e) => {
                      updateTokens({
                        pdpQuickOrder: { ...pdpQuickOrder, showQuantityOffers: e.target.checked },
                      });
                    }}
                    className="h-3.5 w-3.5 rounded border-border text-primary"
                  />
                  <span className="text-[11px] font-bold text-foreground">عرض باقات التوفير التراكمية (اشتري 2 بخصم)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pdpQuickOrder.showGovernorateSelector}
                    onChange={(e) => {
                      updateTokens({
                        pdpQuickOrder: { ...pdpQuickOrder, showGovernorateSelector: e.target.checked },
                      });
                    }}
                    className="h-3.5 w-3.5 rounded border-border text-primary"
                  />
                  <span className="text-[11px] font-bold text-foreground">قائمة المحافظات بحساب الشحن التلقائي</span>
                </label>
              </div>
            )}
          </div>

          {/* 2. Simplified Checkout Fields */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-foreground flex items-center gap-1.5">
                <CreditCardIcon className="h-4 w-4 text-emerald-600" />
                <span>تبسيط حقول صفحة الدفع</span>
              </h3>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkoutSettings.hideZipCode}
                  onChange={(e) => {
                    updateTokens({
                      checkoutSettings: { ...checkoutSettings, hideZipCode: e.target.checked },
                    });
                  }}
                  className="h-3.5 w-3.5 rounded border-border text-emerald-600"
                />
                <span className="text-[11px] font-bold text-foreground">إخفاء الرمز البريدي (Zip Code)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkoutSettings.hideCompany}
                  onChange={(e) => {
                    updateTokens({
                      checkoutSettings: { ...checkoutSettings, hideCompany: e.target.checked },
                    });
                  }}
                  className="h-3.5 w-3.5 rounded border-border text-emerald-600"
                />
                <span className="text-[11px] font-bold text-foreground">إخفاء حقل اسم الشركة الإضافي</span>
              </label>
            </div>
          </div>

          {/* 3. Brand Colors */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <h3 className="font-black text-foreground flex items-center gap-1.5">
              <SwatchIcon className="h-4 w-4 text-primary" />
              <span>ألوان هوية المتجر (Global Colors)</span>
            </h3>
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                لون الهوية الرئيسي (Primary Brand)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => {
                    updateTokens({
                      colors: { ...(designTokens?.colors as any || {}), primary: e.target.value },
                    });
                  }}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => {
                    updateTokens({
                      colors: { ...(designTokens?.colors as any || {}), primary: e.target.value },
                    });
                  }}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          {/* 4. Typography */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <h3 className="font-black text-foreground">الخط العربي للمتجر</h3>
            <select
              value={fontFamily}
              onChange={(e) => {
                updateTokens({
                  typography: { ...(designTokens?.typography as any || {}), fontFamily: e.target.value },
                });
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none"
            >
              <option value="Cairo">خط كايرو (Cairo - افتراضي وعصري)</option>
              <option value="Readex Pro">خط ريدكس برو (Readex Pro - تقني وفاخر)</option>
              <option value="Tajawal">خط تجوال (Tajawal - ناعم للمنتجات)</option>
              <option value="IBM Plex Sans Arabic">خط آي بي إم (IBM Plex Sans Arabic)</option>
            </select>
          </div>

          {/* 5. Header Navigation Menu Links */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-foreground flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-primary" />
                <span>روابط القائمة العلوية (الهيدر)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddMenuLink}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20"
              >
                <PlusIcon className="h-3 w-3" />
                <span>إضافة رابط</span>
              </button>
            </div>

            <div className="space-y-2">
              {menuLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                  <div className="grid grid-cols-2 gap-1.5 flex-1">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => handleUpdateMenuLink(idx, "label", e.target.value)}
                      placeholder="اسم الرابط"
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => handleUpdateMenuLink(idx, "url", e.target.value)}
                      placeholder="/shop"
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                    />
                  </div>
                  {menuLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteMenuLink(idx)}
                      className="rounded-lg p-1 text-destructive hover:bg-destructive/10"
                      title="حذف الرابط"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 6. Announcement Bar */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-foreground flex items-center gap-1.5">
                <MegaphoneIcon className="h-4 w-4 text-primary" />
                <span>شريط الإعلانات العلوي</span>
              </h3>
              <input
                type="checkbox"
                checked={announcement.enabled}
                onChange={(e) => {
                  updateTokens({
                    announcement: { ...announcement, enabled: e.target.checked },
                  });
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
            {announcement.enabled && (
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                  نص العرض الترويجي
                </label>
                <input
                  type="text"
                  value={announcement.text}
                  onChange={(e) => {
                    updateTokens({
                      announcement: { ...announcement, text: e.target.value },
                    });
                  }}
                  placeholder="مثال: خصم 20% لفترة محدودة..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* 7. Floating WhatsApp Widget */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-foreground flex items-center gap-1.5">
                <ChatBubbleLeftRightIcon className="h-4 w-4 text-emerald-500" />
                <span>زر الواتساب العائم</span>
              </h3>
              <input
                type="checkbox"
                checked={whatsapp.enabled}
                onChange={(e) => {
                  updateTokens({
                    whatsapp: { ...whatsapp, enabled: e.target.checked },
                  });
                }}
                className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            {whatsapp.enabled && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    رقم الواتساب
                  </label>
                  <input
                    type="text"
                    value={whatsapp.phone}
                    onChange={(e) => {
                      updateTokens({
                        whatsapp: { ...whatsapp, phone: e.target.value },
                      });
                    }}
                    placeholder="01xxxxxxxxx"
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1">
                    رسالة الترحيب المسبقة
                  </label>
                  <input
                    type="text"
                    value={whatsapp.message}
                    onChange={(e) => {
                      updateTokens({
                        whatsapp: { ...whatsapp, message: e.target.value },
                      });
                    }}
                    placeholder="مرحباً، أود الاستفسار عن منتج..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 8. Landing Page Mode */}
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RocketLaunchIcon className="h-4 w-4 text-primary" />
                <span className="font-black text-foreground">وضع صفحة الهبوط الإعلانية</span>
              </div>
              <input
                type="checkbox"
                checked={isLandingMode}
                onChange={(e) => {
                  updateTokens({
                    landingPageMode: e.target.checked,
                  });
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              إخفاء القوائم العلوية والفوتر لتوجيه تركيز عميل الإعلانات الممولة نحو الشراء الفوري فقط.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
