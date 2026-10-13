import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LayoutList, Loader2, PanelsTopLeft, Sidebar as SidebarIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import i18n from "../../i18n";
import {
  platformDefaultSidebarService,
  type DefaultSidebarSettings,
} from "../../services/platformDefaultSidebarService";

type SidebarLayout =
  | "classic"
  | "three-tier"
  | "horizontal"
  | "floating"
  | "minimal"
  | "app-dashboard";

type SidebarLayoutOption = {
  id: SidebarLayout;
  nameKey: string;
  descriptionKey: string;
};

const SIDEBAR_LAYOUT_OPTIONS: SidebarLayoutOption[] = [
  {
    id: "classic",
    nameKey: "appDashboard.layoutOptions.classic.name",
    descriptionKey: "appDashboard.layoutOptions.classic.description",
  },
  {
    id: "three-tier",
    nameKey: "appDashboard.layoutOptions.threeTier.name",
    descriptionKey: "appDashboard.layoutOptions.threeTier.description",
  },
  {
    id: "horizontal",
    nameKey: "appDashboard.layoutOptions.horizontal.name",
    descriptionKey: "appDashboard.layoutOptions.horizontal.description",
  },
  {
    id: "floating",
    nameKey: "appDashboard.layoutOptions.floating.name",
    descriptionKey: "appDashboard.layoutOptions.floating.description",
  },
  {
    id: "minimal",
    nameKey: "appDashboard.layoutOptions.minimal.name",
    descriptionKey: "appDashboard.layoutOptions.minimal.description",
  },
  {
    id: "app-dashboard",
    nameKey: "appDashboard.layoutOptions.appDashboard.name",
    descriptionKey: "appDashboard.layoutOptions.appDashboard.description",
  },
];

const normalizeSidebarLayout = (value: unknown): SidebarLayout =>
  SIDEBAR_LAYOUT_OPTIONS.some((option) => option.id === value)
    ? (value as SidebarLayout)
    : "three-tier";

const SuperAdminDefaultSidebar: React.FC = () => {
  const [layout, setLayout] = useState<SidebarLayout>("three-tier");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await platformDefaultSidebarService.getSettings();
      setLayout(normalizeSidebarLayout(data.layout));
    } catch (error) {
      console.error("Failed to load default sidebar settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleLayoutChange = async (newLayout: SidebarLayout) => {
    try {
      setSaving(true);
      await platformDefaultSidebarService.updateSettings({ layout: newLayout });
      setLayout(newLayout);
      toast.success("تم تحديث نمط القائمة الجانبية الافتراضية بنجاح");
    } catch (error) {
      console.error("Error updating layout:", error);
      toast.error(i18n.t("companySettings.error_error_d9e4") || "حدث خطأ أثناء حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" dir="rtl">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4 md:p-6 max-w-5xl mx-auto" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <SidebarIcon className="size-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              نظام القائمة الجانبية الافتراضي
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
              Platform Shell Defaults
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            القيمة الافتراضية لهيكل القائمة الجانبية التي تُطبَّق تلقائياً على حسابات التجار والشركات الجديدة
          </p>
        </div>

        {saving && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
            <Loader2 className="size-3.5 animate-spin" />
            جاري الحفظ...
          </div>
        )}
      </div>

      {/* Single-Surface Layout Grid */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PanelsTopLeft className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              الأنماط المتاحة
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {SIDEBAR_LAYOUT_OPTIONS.length} خيارات متاحة
          </span>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SIDEBAR_LAYOUT_OPTIONS.map((option) => {
            const isSelected = layout === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleLayoutChange(option.id)}
                disabled={saving}
                className={`relative p-4 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                    : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`text-sm font-semibold ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {i18n.t(option.nameKey)}
                    </h3>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CheckCircle2 className="size-4" />
                        المحدد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {i18n.t(option.descriptionKey)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>ID: {option.id}</span>
                  {isSelected && (
                    <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-semibold">
                      ACTIVE DEFAULT
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDefaultSidebar;
