import React, { useState, useId } from "react";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  WindowIcon,
} from "@heroicons/react/24/outline";

export interface StorefrontGlobalHeaderConfig {
  variant?: string;
  logoText?: string;
  logoUrl?: string;
  transparentOnHome?: boolean;
  tagline?: string;
  sticky?: boolean;
  showSearch?: boolean;
  announcement?: {
    text: string;
    bg?: string;
    fg?: string;
    enabled: boolean;
  };
  menu: Array<{ id: string; label: string; href: string }>;
}

export interface StorefrontGlobalFooterColumnLink {
  label: string;
  href: string;
}

export interface StorefrontGlobalFooterColumn {
  id: string;
  title: string;
  links: StorefrontGlobalFooterColumnLink[];
}

export type SocialPlatform = "facebook" | "instagram" | "tiktok" | "whatsapp" | "x";

export interface StorefrontGlobalFooterSocial {
  platform: SocialPlatform;
  href: string;
}

export interface StorefrontGlobalFooterConfig {
  variant?: string;
  description?: string;
  columns: StorefrontGlobalFooterColumn[];
  social: StorefrontGlobalFooterSocial[];
  copyright?: string;
  showPaymentBadges?: boolean;
}

export interface StorefrontGlobalTokens {
  header?: StorefrontGlobalHeaderConfig;
  footer?: StorefrontGlobalFooterConfig;
}

interface StudioHeaderFooterPanelProps {
  designTokens: Record<string, unknown>;
  onChange: (nextTokens: Record<string, unknown>) => void;
  onClose: () => void;
}

const DEFAULT_MENU = [
  { id: "m1", label: "الرئيسية", href: "/" },
  { id: "m2", label: "المتجر", href: "/shop" },
];

const DEFAULT_COLUMNS: StorefrontGlobalFooterColumn[] = [
  {
    id: "col1",
    title: "المتجر",
    links: [
      { label: "كل المنتجات", href: "/shop" },
      { label: "وصل حديثاً", href: "/shop" },
    ],
  },
  {
    id: "col2",
    title: "الدعم",
    links: [
      { label: "اتصل بنا", href: "/" },
      { label: "الأسئلة الشائعة", href: "/" },
    ],
  },
];

const SOCIAL_PLATFORMS: Array<{ key: SocialPlatform; label: string; placeholder: string }> = [
  { key: "facebook", label: "فيسبوك", placeholder: "https://facebook.com/..." },
  { key: "instagram", label: "انستجرام", placeholder: "https://instagram.com/..." },
  { key: "tiktok", label: "تيك توك", placeholder: "https://tiktok.com/@..." },
  { key: "whatsapp", label: "واتساب", placeholder: "https://wa.me/20..." },
  { key: "x", label: "X (تويتر)", placeholder: "https://x.com/..." },
];

export const StudioHeaderFooterPanel: React.FC<StudioHeaderFooterPanelProps> = ({
  designTokens,
  onChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"header" | "footer">("header");
  const fallbackId = useId();

  const globalTokens = (designTokens?.global as StorefrontGlobalTokens) || {};
  const header: StorefrontGlobalHeaderConfig = {
    sticky: true,
    showSearch: true,
    menu: DEFAULT_MENU,
    ...globalTokens.header,
  };

  const footer: StorefrontGlobalFooterConfig = {
    columns: DEFAULT_COLUMNS,
    social: [],
    showPaymentBadges: true,
    ...globalTokens.footer,
  };

  const updateHeader = (partial: Partial<StorefrontGlobalHeaderConfig>) => {
    const nextHeader: StorefrontGlobalHeaderConfig = {
      ...header,
      ...partial,
    };
    onChange({
      ...designTokens,
      global: {
        ...globalTokens,
        header: nextHeader,
      },
    });
  };

  const updateFooter = (partial: Partial<StorefrontGlobalFooterConfig>) => {
    const nextFooter: StorefrontGlobalFooterConfig = {
      ...footer,
      ...partial,
    };
    onChange({
      ...designTokens,
      global: {
        ...globalTokens,
        footer: nextFooter,
      },
    });
  };

  // Header Menu Handlers (Limit <= 8)
  const menuItems = header.menu || [];
  const handleAddMenuItem = () => {
    if (menuItems.length >= 8) return;
    const newItem = {
      id: `menu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: "رابط جديد",
      href: "/shop",
    };
    updateHeader({ menu: [...menuItems, newItem] });
  };

  const handleUpdateMenuItem = (index: number, field: "label" | "href", val: string) => {
    const next = [...menuItems];
    next[index] = { ...next[index], [field]: val };
    updateHeader({ menu: next });
  };

  const handleDeleteMenuItem = (index: number) => {
    const next = menuItems.filter((_, i) => i !== index);
    updateHeader({ menu: next });
  };

  const handleMoveMenuItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= menuItems.length) return;
    const next = [...menuItems];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    updateHeader({ menu: next });
  };

  // Footer Columns Handlers (Limit <= 4)
  const columns = footer.columns || [];
  const handleAddColumn = () => {
    if (columns.length >= 4) return;
    const newCol: StorefrontGlobalFooterColumn = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `عمود ${columns.length + 1}`,
      links: [{ label: "رابط جديد", href: "/" }],
    };
    updateFooter({ columns: [...columns, newCol] });
  };

  const handleUpdateColumnTitle = (colIndex: number, title: string) => {
    const next = [...columns];
    next[colIndex] = { ...next[colIndex], title };
    updateFooter({ columns: next });
  };

  const handleDeleteColumn = (colIndex: number) => {
    const next = columns.filter((_, i) => i !== colIndex);
    updateFooter({ columns: next });
  };

  const handleAddLinkToColumn = (colIndex: number) => {
    const next = [...columns];
    const col = next[colIndex];
    col.links = [...(col.links || []), { label: "رابط جديد", href: "/" }];
    updateFooter({ columns: next });
  };

  const handleUpdateColumnLink = (
    colIndex: number,
    linkIndex: number,
    field: "label" | "href",
    val: string
  ) => {
    const next = [...columns];
    const col = next[colIndex];
    const links = [...col.links];
    links[linkIndex] = { ...links[linkIndex], [field]: val };
    col.links = links;
    updateFooter({ columns: next });
  };

  const handleDeleteColumnLink = (colIndex: number, linkIndex: number) => {
    const next = [...columns];
    const col = next[colIndex];
    col.links = col.links.filter((_, i) => i !== linkIndex);
    updateFooter({ columns: next });
  };

  // Footer Social Handlers (5 platforms)
  const socialList = footer.social || [];
  const getSocialHref = (platform: SocialPlatform) => {
    const item = socialList.find((s) => s.platform === platform);
    return item?.href || "";
  };

  const handleUpdateSocial = (platform: SocialPlatform, href: string) => {
    const filtered = socialList.filter((s) => s.platform !== platform);
    if (href.trim()) {
      filtered.push({ platform, href: href.trim() });
    }
    updateFooter({ social: filtered });
  };

  return (
    <aside
      data-testid="studio-header-footer-panel"
      className="flex h-full w-[340px] max-w-[85vw] shrink-0 flex-col border-e border-[#0c0d0f] bg-[#202226] text-[#e8eaee] select-none z-10"
      dir="rtl"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2c2f35]">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2b6cf6]/20 text-[#2b6cf6]">
            <WindowIcon className="h-4 w-4" />
          </div>
          <div>
            <b className="text-[12.5px] font-bold text-[#f0f2f5]">الهيدر والفوتر</b>
            <p className="text-[10px] text-[#8b9199]">إعدادات رأس وتذييل كل الصفحات</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[#8b9199] hover:bg-[#2c2f35] hover:text-white transition-colors"
          title="إغلاق اللوحة"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Segmented Switcher */}
      <div className="flex border-b border-[#2c2f35] p-2 gap-1 bg-[#1a1b1f]">
        <button
          type="button"
          onClick={() => setActiveTab("header")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "header"
              ? "bg-[#2b6cf6] text-white shadow-sm"
              : "text-[#8b9199] hover:text-white hover:bg-[#25272c]"
          }`}
        >
          الهيدر (Header)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("footer")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "footer"
              ? "bg-[#2b6cf6] text-white shadow-sm"
              : "text-[#8b9199] hover:text-white hover:bg-[#25272c]"
          }`}
        >
          الفوتر (Footer)
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs [scrollbar-width:thin]">
        {activeTab === "header" ? (
          <>
            {/* Header Variant */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#cfd3db]">
                شكل الترويسة (Header Variant)
              </label>
              <select
                data-testid="hf-header-variant"
                value={header.variant || "default"}
                onChange={(e) => updateHeader({ variant: e.target.value })}
                className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-2 text-xs text-white focus:border-[#2b6cf6] focus:outline-none cursor-pointer"
              >
                <option value="default">افتراضي قياسي (Default)</option>
                <option value="floating-dark">عائم داكن فاخر (Floating Dark)</option>
                <option value="editorial-soft">تحريري ناعم (Editorial Soft)</option>
                <option value="utility-frame">إطار تقني عملي (Utility Frame)</option>
                <option value="retail-direct">تجاري مباشر وسريع (Retail Direct)</option>
                <option value="fashion-retail">بوتيك أزياء (Fashion Retail)</option>
                <option value="digital-command">لوحة رقمية متقدمة (Digital Command)</option>
                <option value="butcher-atelier">أتيليه تخصصي (Butcher Atelier)</option>
                <option value="vela-fashion">فيلا فاشون الراقي (Vela Fashion)</option>
              </select>
            </div>

            {/* Logo Text */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#cfd3db]">
                شعار المتجر النصي (logoText)
              </label>
              <input
                data-testid="hf-logo-text"
                type="text"
                value={header.logoText || ""}
                onChange={(e) => updateHeader({ logoText: e.target.value })}
                placeholder="بديل نصي لشعار المتجر"
                className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-2 text-xs text-white placeholder-[#686d76] focus:border-[#2b6cf6] focus:outline-none"
              />
            </div>

            {/* Logo Image URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#cfd3db]">
                رابط صورة الشعار (logoUrl)
              </label>
              <input
                data-testid="hf-logo-url"
                type="text"
                dir="ltr"
                value={header.logoUrl || ""}
                onChange={(e) => updateHeader({ logoUrl: e.target.value })}
                placeholder="https://... أو /logo.png"
                className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-2 text-xs text-white placeholder-[#686d76] focus:border-[#2b6cf6] focus:outline-none font-mono"
              />
            </div>

            {/* Sticky, Search & Transparent Toggles */}
            <div className="rounded-xl border border-[#2c2f35] bg-[#1a1b1f] p-3 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11.5px] font-semibold text-[#cfd3db]">
                  تثبيت الهيدر أعلى الصفحة (Sticky)
                </span>
                <input
                  data-testid="hf-sticky-toggle"
                  type="checkbox"
                  checked={header.sticky !== false}
                  onChange={(e) => updateHeader({ sticky: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-600 accent-[#2b6cf6]"
                />
              </label>
              <div className="h-px bg-[#26282e]" />
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11.5px] font-semibold text-[#cfd3db]">
                  إظهار حقل البحث (showSearch)
                </span>
                <input
                  data-testid="hf-show-search"
                  type="checkbox"
                  checked={header.showSearch !== false}
                  onChange={(e) => updateHeader({ showSearch: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-600 accent-[#2b6cf6]"
                />
              </label>
              <div className="h-px bg-[#26282e]" />
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11.5px] font-semibold text-[#cfd3db]">
                  شفاف فوق بنر الرئيسية (transparentOnHome)
                </span>
                <input
                  data-testid="hf-transparent-home"
                  type="checkbox"
                  checked={header.transparentOnHome === true}
                  onChange={(e) => updateHeader({ transparentOnHome: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-600 accent-[#2b6cf6]"
                />
              </label>
            </div>

            {/* Announcement Bar — inputs always visible (HF-1.1), switch controls appearance on storefront */}
            <div className="rounded-xl border border-[#2c2f35] bg-[#1a1b1f] p-3 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-[11.5px] font-bold text-[#cfd3db] block">
                    شريط الإعلان العلوي (Announcement)
                  </span>
                  <span className="text-[10px] text-[#8b9199]">
                    تفعيل ظهور شريط الإعلان أعلى الهيدر في المتجر
                  </span>
                </div>
                <input
                  data-testid="hf-announcement-enabled"
                  type="checkbox"
                  checked={header.announcement?.enabled === true}
                  onChange={(e) =>
                    updateHeader({
                      announcement: {
                        text: header.announcement?.text || "",
                        bg: header.announcement?.bg || "#000000",
                        fg: header.announcement?.fg || "#ffffff",
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-gray-600 accent-[#2b6cf6]"
                />
              </label>

              <div className="space-y-2 pt-1 border-t border-[#26282e]">
                <input
                  data-testid="hf-announcement-text"
                  type="text"
                  value={header.announcement?.text || ""}
                  onChange={(e) =>
                    updateHeader({
                      announcement: {
                        bg: header.announcement?.bg || "#000000",
                        fg: header.announcement?.fg || "#ffffff",
                        enabled: header.announcement?.enabled === true,
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="نص شريط الإعلان..."
                  className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-1.5 text-xs text-white placeholder-[#686d76] focus:border-[#2b6cf6] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div>
                    <span className="block text-[#8b9199] mb-1">لون الخلفية:</span>
                    <input
                      data-testid="hf-announcement-bg"
                      type="color"
                      value={header.announcement?.bg || "#000000"}
                      onChange={(e) =>
                        updateHeader({
                          announcement: {
                            text: header.announcement?.text || "",
                            fg: header.announcement?.fg || "#ffffff",
                            enabled: header.announcement?.enabled === true,
                            bg: e.target.value,
                          },
                        })
                      }
                      className="h-8 w-full cursor-pointer rounded border border-[#34373e] bg-transparent"
                    />
                  </div>
                  <div>
                    <span className="block text-[#8b9199] mb-1">لون الخط:</span>
                    <input
                      data-testid="hf-announcement-fg"
                      type="color"
                      value={header.announcement?.fg || "#ffffff"}
                      onChange={(e) =>
                        updateHeader({
                          announcement: {
                            text: header.announcement?.text || "",
                            bg: header.announcement?.bg || "#000000",
                            enabled: header.announcement?.enabled === true,
                            fg: e.target.value,
                          },
                        })
                      }
                      className="h-8 w-full cursor-pointer rounded border border-[#34373e] bg-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Links (Max 8) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-[#cfd3db]">روابط القائمة (المنيو)</span>
                  <span className="text-[10px] rounded bg-[#2b6cf6]/20 px-1.5 py-0.5 font-bold text-[#60a5fa]">
                    {menuItems.length}/8
                  </span>
                </div>
                <button
                  data-testid="hf-add-menu-item"
                  type="button"
                  onClick={handleAddMenuItem}
                  disabled={menuItems.length >= 8}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#2b6cf6] hover:text-[#60a5fa] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  إضافة رابط
                </button>
              </div>

              <div data-testid="hf-menu-list" className="space-y-1.5">
                {menuItems.map((item, idx) => (
                  <div
                    key={item.id || `${fallbackId}-m-${idx}`}
                    data-testid={`hf-menu-item-${idx}`}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2c2f35] bg-[#1a1b1f] p-2"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveMenuItem(idx, "up")}
                        disabled={idx === 0}
                        className="p-0.5 text-[#8b9199] hover:text-white disabled:opacity-30"
                        title="تحريك لأعلى"
                      >
                        <ArrowUpIcon className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveMenuItem(idx, "down")}
                        disabled={idx === menuItems.length - 1}
                        className="p-0.5 text-[#8b9199] hover:text-white disabled:opacity-30"
                        title="تحريك لأسفل"
                      >
                        <ArrowDownIcon className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        data-testid={`hf-menu-label-${idx}`}
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateMenuItem(idx, "label", e.target.value)}
                        placeholder="عنوان الرابط"
                        className="w-full rounded border border-[#34373e] bg-[#16171a] px-2 py-1 text-xs text-white focus:border-[#2b6cf6] focus:outline-none"
                      />
                      <input
                        data-testid={`hf-menu-href-${idx}`}
                        type="text"
                        value={item.href}
                        onChange={(e) => handleUpdateMenuItem(idx, "href", e.target.value)}
                        placeholder="المسار (/shop)"
                        className="w-full rounded border border-[#34373e] bg-[#16171a] px-2 py-1 text-[11px] font-mono text-[#8b9199] focus:border-[#2b6cf6] focus:outline-none"
                      />
                    </div>
                    <button
                      data-testid={`hf-delete-menu-${idx}`}
                      type="button"
                      onClick={() => handleDeleteMenuItem(idx)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="حذف الرابط"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Footer Variant */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#cfd3db]">
                شكل التذييل (Footer Variant)
              </label>
              <select
                data-testid="hf-footer-variant"
                value={footer.variant || "default"}
                onChange={(e) => updateFooter({ variant: e.target.value })}
                className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-2 text-xs text-white focus:border-[#2b6cf6] focus:outline-none cursor-pointer"
              >
                <option value="default">افتراضي (Default)</option>
                <option value="standard">قياسي بأعمدة (Standard)</option>
                <option value="editorial-soft">تحريري ناعم (Editorial Soft)</option>
                <option value="signature-panel">لوحة التوقيع الفاخرة (Signature Panel)</option>
                <option value="retail-direct">تجاري مباشر (Retail Direct)</option>
                <option value="fashion-retail">بوتيك أزياء (Fashion Retail)</option>
                <option value="digital-command">لوحة رقمية متقدمة (Digital Command)</option>
                <option value="butcher-atelier">أتيليه تخصصي (Butcher Atelier)</option>
                <option value="vela-fashion">فيلا فاشون (Vela Fashion)</option>
                <option value="automotive-chassis">شاسيه ديناميكي (Automotive Chassis)</option>
              </select>
            </div>

            {/* Footer Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#cfd3db]">
                نبذة المتجر في الفوتر (description)
              </label>
              <textarea
                data-testid="hf-footer-description"
                value={footer.description || ""}
                onChange={(e) => updateFooter({ description: e.target.value })}
                placeholder="نبذة عن المتجر وأنشطته وخدمة العملاء..."
                rows={2}
                className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-2 text-xs text-white placeholder-[#686d76] focus:border-[#2b6cf6] focus:outline-none"
              />
            </div>

            {/* Footer Columns (Max 4) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11.5px] font-bold text-[#cfd3db]">أعمدة الروابط (أعمدة الفوتر)</span>
                  <span className="text-[10px] rounded bg-[#2b6cf6]/20 px-1.5 py-0.5 font-bold text-[#60a5fa]">
                    {columns.length}/4
                  </span>
                </div>
                <button
                  data-testid="hf-add-column"
                  type="button"
                  onClick={handleAddColumn}
                  disabled={columns.length >= 4}
                  className="flex items-center gap-1 text-[11px] font-bold text-[#2b6cf6] hover:text-[#60a5fa] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  إضافة عمود
                </button>
              </div>

              <div data-testid="hf-columns-list" className="space-y-3">
                {columns.map((col, colIdx) => (
                  <div
                    key={col.id || `${fallbackId}-col-${colIdx}`}
                    data-testid={`hf-column-${colIdx}`}
                    className="rounded-xl border border-[#2c2f35] bg-[#1a1b1f] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[#26282e] pb-2">
                      <input
                        data-testid={`hf-col-title-${colIdx}`}
                        type="text"
                        value={col.title}
                        onChange={(e) => handleUpdateColumnTitle(colIdx, e.target.value)}
                        placeholder="عنوان العمود"
                        className="flex-1 font-bold rounded border border-[#34373e] bg-[#16171a] px-2 py-1 text-xs text-white focus:border-[#2b6cf6] focus:outline-none"
                      />
                      <button
                        data-testid={`hf-delete-col-${colIdx}`}
                        type="button"
                        onClick={() => handleDeleteColumn(colIdx)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="حذف العمود"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {(col.links || []).map((link, linkIdx) => (
                        <div
                          key={`${col.id}-link-${linkIdx}`}
                          className="flex items-center gap-1.5"
                        >
                          <input
                            data-testid={`hf-col-${colIdx}-link-label-${linkIdx}`}
                            type="text"
                            value={link.label}
                            onChange={(e) =>
                              handleUpdateColumnLink(colIdx, linkIdx, "label", e.target.value)
                            }
                            placeholder="اسم الرابط"
                            className="flex-1 rounded border border-[#34373e] bg-[#16171a] px-2 py-1 text-xs text-white focus:border-[#2b6cf6] focus:outline-none"
                          />
                          <input
                            data-testid={`hf-col-${colIdx}-link-href-${linkIdx}`}
                            type="text"
                            value={link.href}
                            onChange={(e) =>
                              handleUpdateColumnLink(colIdx, linkIdx, "href", e.target.value)
                            }
                            placeholder="/link"
                            className="w-24 rounded border border-[#34373e] bg-[#16171a] px-2 py-1 text-[11px] font-mono text-[#8b9199] focus:border-[#2b6cf6] focus:outline-none"
                          />
                          <button
                            data-testid={`hf-col-${colIdx}-delete-link-${linkIdx}`}
                            type="button"
                            onClick={() => handleDeleteColumnLink(colIdx, linkIdx)}
                            className="p-1 text-[#8b9199] hover:text-red-400 rounded"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        data-testid={`hf-col-${colIdx}-add-link`}
                        type="button"
                        onClick={() => handleAddLinkToColumn(colIdx)}
                        className="text-[10.5px] font-semibold text-[#2b6cf6] hover:text-[#60a5fa] pt-1 block"
                      >
                        + إضافة رابط للعمود
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Media (5 platforms) */}
            <div className="rounded-xl border border-[#2c2f35] bg-[#1a1b1f] p-3 space-y-2">
              <span className="text-[11.5px] font-bold text-[#cfd3db] block">
                روابط التواصل الاجتماعي
              </span>
              <div className="space-y-1.5">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <div key={platform.key} className="flex items-center gap-2">
                    <span className="w-16 text-[10.5px] text-[#8b9199] shrink-0">
                      {platform.label}:
                    </span>
                    <input
                      data-testid={`hf-social-${platform.key}`}
                      type="text"
                      value={getSocialHref(platform.key)}
                      onChange={(e) => handleUpdateSocial(platform.key, e.target.value)}
                      placeholder={platform.placeholder}
                      className="flex-1 rounded border border-[#34373e] bg-[#16171a] px-2 py-1 text-xs text-white placeholder-[#686d76] focus:border-[#2b6cf6] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Copyright Text */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#cfd3db]">
                نص حقوق النشر (copyright)
              </label>
              <input
                data-testid="hf-copyright-text"
                type="text"
                value={footer.copyright || ""}
                onChange={(e) => updateFooter({ copyright: e.target.value })}
                placeholder="مثال: © {year} متجري. جميع الحقوق محفوظة."
                className="w-full rounded-lg border border-[#34373e] bg-[#16171a] px-3 py-2 text-xs text-white placeholder-[#686d76] focus:border-[#2b6cf6] focus:outline-none"
              />
            </div>

            {/* Payment Badges Toggle */}
            <div className="rounded-xl border border-[#2c2f35] bg-[#1a1b1f] p-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-[11.5px] font-bold text-[#cfd3db] block">
                    شارات الدفع (showPaymentBadges)
                  </span>
                  <span className="text-[10px] text-[#8b9199]">
                    عرض شعارات وسائل الدفع (Visa, Mastercard, ميزة, InstaPay)
                  </span>
                </div>
                <input
                  data-testid="hf-payment-badges-toggle"
                  type="checkbox"
                  checked={footer.showPaymentBadges !== false}
                  onChange={(e) => updateFooter({ showPaymentBadges: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-600 accent-[#2b6cf6]"
                />
              </label>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
