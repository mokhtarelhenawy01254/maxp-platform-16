import React from "react";
import {
  ShoppingBagIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  LinkIcon,
  RocketLaunchIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface StudioThemeSettingsPanelProps {
  designTokens: Record<string, unknown>;
  onUpdateThemeTokens?: (nextTokens: Record<string, unknown>) => void;
}

export const StudioThemeSettingsPanel: React.FC<StudioThemeSettingsPanelProps> = ({
  designTokens,
  onUpdateThemeTokens,
}) => {
  const updateTokens = (patch: Record<string, unknown>) => {
    if (onUpdateThemeTokens) {
      onUpdateThemeTokens({ ...designTokens, ...patch });
    }
  };

  const colors = (designTokens?.colors as any) || {
    primary: "#0f172a",
    secondary: "#f8fafc",
    accent: "#3b82f6",
  };

  const typography = (designTokens?.typography as any) || {
    fontFamily: "Cairo",
    baseFontSize: "16px",
  };

  const pdpQuickOrder = (designTokens?.pdpQuickOrder as any) || {
    enabled: true,
    showQuantityOffers: true,
    showGovernorateSelector: true,
  };

  const checkoutSettings = (designTokens?.checkoutSettings as any) || {
    requireEmail: false,
    requireCity: false,
    requirePostalCode: false,
    hideCompany: true,
    autoGovernorates: true,
  };

  const announcement = (designTokens?.announcement as any) || {
    enabled: false,
    text: "شحن مجاني للطلبات فوق 500 جنيه لفترة محدودة!",
  };

  const whatsapp = (designTokens?.whatsapp as any) || {
    enabled: false,
    phoneNumber: "",
    message: "مرحباً، أود الاستفسار عن منتج...",
  };

  const menuLinks = (designTokens?.navigation as any)?.menu || [
    { label: "الرئيسية", url: "/" },
    { label: "كل المنتجات", url: "/shop" },
  ];

  const isLandingMode = Boolean(designTokens?.landingPageMode);

  const handleUpdateMenuLink = (index: number, field: "label" | "url", val: string) => {
    const nextMenu = [...menuLinks];
    nextMenu[index] = { ...nextMenu[index], [field]: val };
    updateTokens({ navigation: { ...((designTokens?.navigation as any) || {}), menu: nextMenu } });
  };

  const handleAddMenuLink = () => {
    const nextMenu = [...menuLinks, { label: "رابط جديد", url: "/shop" }];
    updateTokens({ navigation: { ...((designTokens?.navigation as any) || {}), menu: nextMenu } });
  };

  const handleDeleteMenuLink = (index: number) => {
    const nextMenu = menuLinks.filter((_, idx) => idx !== index);
    updateTokens({ navigation: { ...((designTokens?.navigation as any) || {}), menu: nextMenu } });
  };

  return (
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
            onChange={(e) => updateTokens({ pdpQuickOrder: { ...pdpQuickOrder, enabled: e.target.checked } })}
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
                onChange={(e) => updateTokens({ pdpQuickOrder: { ...pdpQuickOrder, showQuantityOffers: e.target.checked } })}
                className="h-3.5 w-3.5 rounded border-border text-primary"
              />
              <span className="text-[11px] font-bold text-foreground">عرض باقات التوفير التراكمية (اشتري 2 بخصم)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pdpQuickOrder.showGovernorateSelector}
                onChange={(e) => updateTokens({ pdpQuickOrder: { ...pdpQuickOrder, showGovernorateSelector: e.target.checked } })}
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
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>تبسيط صفحة الدفع (1-Step COD)</span>
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          إلغاء الحقول المعقدة لرفع نسبة إتمام الطلب إلى أقصى حد.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!checkoutSettings.requireEmail}
              onChange={(e) => updateTokens({ checkoutSettings: { ...checkoutSettings, requireEmail: !e.target.checked } })}
              className="h-3.5 w-3.5 rounded border-border text-primary"
            />
            <span className="text-[11px] font-medium text-foreground">البريد الإلكتروني اختياري (غير مطلوب)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!checkoutSettings.requirePostalCode}
              onChange={(e) => updateTokens({ checkoutSettings: { ...checkoutSettings, requirePostalCode: !e.target.checked } })}
              className="h-3.5 w-3.5 rounded border-border text-primary"
            />
            <span className="text-[11px] font-medium text-foreground">إخفاء الرمز البريدي (Postal Code)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checkoutSettings.hideCompany}
              onChange={(e) => updateTokens({ checkoutSettings: { ...checkoutSettings, hideCompany: e.target.checked } })}
              className="h-3.5 w-3.5 rounded border-border text-primary"
            />
            <span className="text-[11px] font-medium text-foreground">إخفاء اسم الشركة وحقول الفوترة غير الضرورية</span>
          </label>
        </div>
      </div>

      {/* 3. Global Colors */}
      <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
        <h3 className="font-black text-foreground">ألوان الهوية المتجرية</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">اللون الرئيسي</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colors.primary}
                onChange={(e) => updateTokens({ colors: { ...colors, primary: e.target.value } })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0"
              />
              <span className="font-mono text-[11px] text-foreground">{colors.primary}</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">لون التمييز (Accent)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colors.accent}
                onChange={(e) => updateTokens({ colors: { ...colors, accent: e.target.value } })}
                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-transparent p-0"
              />
              <span className="font-mono text-[11px] text-foreground">{colors.accent}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Global Typography */}
      <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
        <h3 className="font-black text-foreground">الخطوط والطباعة</h3>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">نوع الخط العربي</label>
          <select
            value={typography.fontFamily}
            onChange={(e) => updateTokens({ typography: { ...typography, fontFamily: e.target.value } })}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
          >
            <option value="Cairo">Cairo (الافتراضي المتناسق)</option>
            <option value="Tajawal">Tajawal (عصري خفيف)</option>
            <option value="Almarai">Almarai (رسمي وأنيق)</option>
            <option value="Alexandria">Alexandria (مودرن للتجارة)</option>
          </select>
        </div>
      </div>

      {/* 5. Header Navigation Links */}
      <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-foreground flex items-center gap-1.5">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span>روابط القائمة العلوية</span>
          </h3>
          <button
            type="button"
            onClick={handleAddMenuLink}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            <PlusIcon className="h-3 w-3" />
            <span>إضافة رابط</span>
          </button>
        </div>
        <div className="space-y-2">
          {menuLinks.map((link: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={link.label}
                onChange={(e) => handleUpdateMenuLink(idx, "label", e.target.value)}
                placeholder="عنوان الرابط"
                className="w-1/2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              />
              <input
                type="text"
                value={link.url}
                onChange={(e) => handleUpdateMenuLink(idx, "url", e.target.value)}
                placeholder="/path"
                className="w-1/2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
              />
              {menuLinks.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleDeleteMenuLink(idx)}
                  className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                  title="حذف"
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
            <SpeakerWaveIcon className="h-4 w-4 text-muted-foreground" />
            <span>شريط الإعلانات العلوي</span>
          </h3>
          <input
            type="checkbox"
            checked={announcement.enabled}
            onChange={(e) => updateTokens({ announcement: { ...announcement, enabled: e.target.checked } })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>
        {announcement.enabled && (
          <div className="pt-2 border-t border-border/60">
            <input
              type="text"
              value={announcement.text}
              onChange={(e) => updateTokens({ announcement: { ...announcement, text: e.target.value } })}
              placeholder="نص الإعلان..."
              className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* 7. WhatsApp Floating Widget */}
      <div className="rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-foreground flex items-center gap-1.5">
            <ChatBubbleLeftRightIcon className="h-4 w-4 text-emerald-500" />
            <span>زر واتساب العائم للتواصل السريع</span>
          </h3>
          <input
            type="checkbox"
            checked={whatsapp.enabled}
            onChange={(e) => updateTokens({ whatsapp: { ...whatsapp, enabled: e.target.checked } })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>
        {whatsapp.enabled && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">رقم الواتساب مع كود الدولة</label>
              <input
                type="text"
                value={whatsapp.phoneNumber}
                onChange={(e) => updateTokens({ whatsapp: { ...whatsapp, phoneNumber: e.target.value } })}
                placeholder="201012345678"
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted-foreground">الرسالة المبدئية</label>
              <input
                type="text"
                value={whatsapp.message}
                onChange={(e) => updateTokens({ whatsapp: { ...whatsapp, message: e.target.value } })}
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
            onChange={(e) => updateTokens({ landingPageMode: e.target.checked })}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          إخفاء القوائم العلوية والفوتر لتوجيه تركيز عميل الإعلانات الممولة نحو الشراء الفوري فقط.
        </p>
      </div>
    </div>
  );
};
