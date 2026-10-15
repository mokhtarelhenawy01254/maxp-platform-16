import React from "react";
import { Info, RotateCcw, Check, Mail, Phone, MapPin, Globe, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FooterSettings } from "../../services/footerSettingsService";

interface FooterSettingsSectionProps {
  settings: Partial<FooterSettings>;
  onChange: (settings: Partial<FooterSettings>) => void;
  socialLinks?: Record<string, string>;
  onSocialLinksChange?: (socialLinks: Record<string, string>) => void;
  onSave: () => void;
  onReset: () => void;
  loading: boolean;
}

const SOCIAL_LINK_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/your-store" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-store" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@your-store" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/201xxxxxxxxx" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@your-store" },
] as const;

export const FooterSettingsSection: React.FC<FooterSettingsSectionProps> = ({
  settings,
  onChange,
  socialLinks = {},
  onSocialLinksChange,
  onSave,
  onReset,
  loading,
}) => {
  const { t } = useTranslation();

  const handleChange = (field: keyof FooterSettings, value: any) => {
    onChange({ ...settings, [field]: value });
  };

  const handleSocialChange = (field: string, value: string) => {
    onSocialLinksChange?.({
      ...socialLinks,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {t("storeFooter.footerTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("storeFooter.footerSubtitleDetails")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium border border-border/70 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t("storeFooter.reset")}</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>{loading ? t("storeFooter.saving") : t("storeFooter.save")}</span>
          </button>
        </div>
      </div>

      {/* About Store Section */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            {t("storeFooter.aboutStore")}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.showAboutStore ?? true}
              onChange={(e) => handleChange("showAboutStore", e.target.checked)}
              className="w-4 h-4 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">
              {t("storeFooter.show")}
            </span>
          </label>
        </div>
        <textarea
          value={settings.aboutStore || ""}
          onChange={(e) => handleChange("aboutStore", e.target.value)}
          rows={3}
          placeholder={t("storeFooter.aboutStorePlaceholder")}
          className="w-full px-3 py-2 text-xs bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all resize-none"
        />
      </div>

      {/* Contact Information */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-semibold text-foreground">
          {t("storeFooter.contactInfo")}
        </h4>

        {/* Email */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              {t("storeFooter.email")}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.showEmail ?? true}
                onChange={(e) => handleChange("showEmail", e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground">
                {t("storeFooter.show")}
              </span>
            </label>
          </div>
          <input
            type="email"
            value={settings.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="info@store.com"
            dir="ltr"
            className="w-full px-3 py-2 text-xs bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all text-right"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              {t("storeFooter.phone")}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.showPhone ?? true}
                onChange={(e) => handleChange("showPhone", e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground">
                {t("storeFooter.show")}
              </span>
            </label>
          </div>
          <input
            type="tel"
            value={settings.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+20 123 456 7890"
            dir="ltr"
            className="w-full px-3 py-2 text-xs bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all font-mono tabular-nums text-right"
          />
        </div>

        {/* Address */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              {t("storeFooter.address")}
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.showAddress ?? true}
                onChange={(e) => handleChange("showAddress", e.target.checked)}
                className="w-3.5 h-3.5 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
              />
              <span className="text-[11px] text-muted-foreground">
                {t("storeFooter.show")}
              </span>
            </label>
          </div>
          <textarea
            value={settings.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            rows={2}
            placeholder={t("storeFooter.addressPlaceholder")}
            className="w-full px-3 py-2 text-xs bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all resize-none"
          />
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground">
            {t("storeFooter.socialLinks")}
          </label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("storeFooter.socialLinksDesc")}
          </p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SOCIAL_LINK_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {field.label}
              </label>
              <input
                type="url"
                value={socialLinks[field.key] || ""}
                onChange={(event) =>
                  handleSocialChange(field.key, event.target.value)
                }
                placeholder={field.placeholder}
                dir="ltr"
                className="w-full px-3 py-1.5 text-xs bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all text-right font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-card border border-border/70 rounded-xl p-4 flex items-center justify-between">
        <div>
          <label className="text-xs font-semibold text-foreground">
            {t("storeFooter.quickLinks")}
          </label>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {t("storeFooter.quickLinksDesc")}
          </p>
        </div>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={settings.showQuickLinks ?? true}
            onChange={(e) => handleChange("showQuickLinks", e.target.checked)}
            className="w-4 h-4 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
          />
          <span className="text-xs text-muted-foreground">
            {t("storeFooter.show")}
          </span>
        </label>
      </div>

      {/* Copyright */}
      <div className="bg-card border border-border/70 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            {t("storeFooter.copyright")}
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.showCopyright ?? true}
              onChange={(e) => handleChange("showCopyright", e.target.checked)}
              className="w-4 h-4 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">
              {t("storeFooter.show")}
            </span>
          </label>
        </div>
        <input
          type="text"
          value={settings.copyrightText || ""}
          onChange={(e) => handleChange("copyrightText", e.target.value)}
          placeholder={t("storeFooter.copyrightPlaceholder")}
          className="w-full px-3 py-2 text-xs bg-background border border-border/70 text-foreground rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
        />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <p>{t("storeFooter.copyrightNote")}</p>
        </div>
      </div>

      {/* Live Preview (Zero Emojis, Pure Lucide Icons) */}
      <div className="bg-muted/30 border border-border/70 rounded-xl p-5 space-y-4 text-foreground">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("storeFooter.previewTitle")}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          {/* About Store */}
          {settings.showAboutStore && settings.aboutStore && (
            <div className="space-y-1">
              <h5 className="font-semibold text-foreground">
                {t("storeFooter.aboutStore")}
              </h5>
              <p className="text-muted-foreground leading-relaxed">
                {settings.aboutStore}
              </p>
            </div>
          )}

          {/* Contact Info (Pure Lucide Icons) */}
          <div className="space-y-2">
            <h5 className="font-semibold text-foreground">
              {t("storeFooter.contactUs")}
            </h5>
            <div className="space-y-1.5 text-muted-foreground">
              {settings.showEmail && settings.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span dir="ltr">{settings.email}</span>
                </div>
              )}
              {settings.showPhone && settings.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-mono tabular-nums" dir="ltr">
                    {settings.phone}
                  </span>
                </div>
              )}
              {settings.showAddress && settings.address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{settings.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Social Links & Quick Links */}
          <div className="space-y-2">
            {Object.entries(socialLinks).some(([, url]) => Boolean(url?.trim())) && (
              <div className="space-y-1 mb-3">
                <h5 className="font-semibold text-foreground">
                  {t("storeFooter.socialPreview")}
                </h5>
                <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                  {Object.entries(socialLinks)
                    .filter(([, url]) => Boolean(url?.trim()))
                    .map(([key]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded bg-card border border-border/60 text-foreground"
                      >
                        {SOCIAL_LINK_FIELDS.find((f) => f.key === key)?.label ||
                          key}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {settings.showQuickLinks && (
              <div className="space-y-1">
                <h5 className="font-semibold text-foreground">
                  {t("storeFooter.quickLinksPreview")}
                </h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li>{t("storeFooter.aboutUs")}</li>
                  <li>{t("storeFooter.contactUsLink")}</li>
                  <li>{t("storeFooter.privacyPolicy")}</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Copyright */}
        {settings.showCopyright && settings.copyrightText && (
          <div className="pt-3 border-t border-border/60 text-center text-[11px] text-muted-foreground font-mono tabular-nums">
            {settings.copyrightText.replace(
              "{year}",
              new Date().getFullYear().toString(),
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FooterSettingsSection;
