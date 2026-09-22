import React, { useCallback, useMemo, useState } from "react";
import {
  Briefcase,
  Layers,
  Loader2,
  Package,
  Pencil,
  Save,
  Search,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../../../components/ui/sheet";
import { Switch } from "../../../../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { Textarea } from "../../../../components/ui/textarea";
import { SpecialtyIconPicker } from "./SpecialtyIconPicker";
import {
  STORE_THEME_OPTIONS,
  createDefaultFormPayload,
  getCategoryLabel,
  slugify,
  type BusinessSpecialty,
  type BusinessSpecialtyFormPayload,
  type MarketplaceAppOption,
} from "../types";

interface SpecialtyEditSheetProps {
  open: boolean;
  specialty: BusinessSpecialty | null;
  appOptions: MarketplaceAppOption[];
  onClose: () => void;
  onSave: (payload: BusinessSpecialtyFormPayload) => Promise<void>;
  saving: boolean;
}

export const SpecialtyEditSheet: React.FC<SpecialtyEditSheetProps> = ({
  open,
  specialty,
  appOptions,
  onClose,
  onSave,
  saving,
}) => {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [appSearch, setAppSearch] = useState<string>("");

  const [form, setForm] = useState<BusinessSpecialtyFormPayload>(() =>
    specialty
      ? {
          slug: specialty.slug,
          nameAr: specialty.nameAr,
          nameEn: specialty.nameEn,
          descriptionAr: specialty.descriptionAr || "",
          descriptionEn: specialty.descriptionEn || "",
          icon: specialty.icon || "Briefcase",
          appSlugs: specialty.appSlugs || [],
          autoInstallOnSignup: specialty.autoInstallOnSignup,
          themeId: specialty.themeId || null,
          sortOrder: specialty.sortOrder || 0,
          isActive: specialty.isActive,
        }
      : createDefaultFormPayload(),
  );

  // Sync state when specialty changes
  React.useEffect(() => {
    if (open) {
      setForm(
        specialty
          ? {
              slug: specialty.slug,
              nameAr: specialty.nameAr,
              nameEn: specialty.nameEn,
              descriptionAr: specialty.descriptionAr || "",
              descriptionEn: specialty.descriptionEn || "",
              icon: specialty.icon || "Briefcase",
              appSlugs: specialty.appSlugs || [],
              autoInstallOnSignup: specialty.autoInstallOnSignup,
              themeId: specialty.themeId || null,
              sortOrder: specialty.sortOrder || 0,
              isActive: specialty.isActive,
            }
          : createDefaultFormPayload(),
      );
      setActiveTab("general");
      setAppSearch("");
    }
  }, [open, specialty]);

  const setField = useCallback(
    <K extends keyof BusinessSpecialtyFormPayload>(
      key: K,
      value: BusinessSpecialtyFormPayload[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const toggleAppSlug = (slug: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      appSlugs: checked
        ? Array.from(new Set([...prev.appSlugs, slug]))
        : prev.appSlugs.filter((s) => s !== slug),
    }));
  };

  const toggleCategoryApps = (slugs: string[]) => {
    const allSelected = slugs.every((s) => form.appSlugs.includes(s));
    setForm((prev) => ({
      ...prev,
      appSlugs: allSelected
        ? prev.appSlugs.filter((s) => !slugs.includes(s))
        : Array.from(new Set([...prev.appSlugs, ...slugs])),
    }));
  };

  // Group apps by category
  const groupedApps = useMemo(() => {
    const map = new Map<string, MarketplaceAppOption[]>();
    appOptions.forEach((opt) => {
      const cat = opt.category || "general";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(opt);
    });
    return Array.from(map.entries()).sort((a, b) =>
      getCategoryLabel(a[0]).localeCompare(getCategoryLabel(b[0]), "ar"),
    );
  }, [appOptions]);

  const filteredGroups = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    if (!q) return groupedApps;
    return groupedApps
      .map(([category, options]) => [
        category,
        options.filter((opt) =>
          [opt.name, opt.nameEn, opt.slug].filter(Boolean).join(" ").toLowerCase().includes(q),
        ),
      ] as [string, MarketplaceAppOption[]])
      .filter(([, options]) => options.length > 0);
  }, [groupedApps, appSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
  };

  const isEditMode = Boolean(specialty?.id);

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-xl p-0 flex flex-col justify-between overflow-hidden"
      >
        {/* Form element wrapping content & footer */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <SheetHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 text-right">
            <SheetTitle className="text-base sm:text-lg font-bold">
              {isEditMode
                ? `تعديل النشاط التجاري: ${specialty?.nameAr || ""}`
                : "إنشاء نشاط تجاري جديد"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              حدد اسم النشاط التجاري وأيقونته والتطبيقات التي تُثبت تلقائياً لشركاته عند التسجيل.
            </SheetDescription>
          </SheetHeader>

          {/* Navigation Tabs */}
          <div className="border-b border-border/40 px-4 pt-2 bg-muted/10">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-9 w-full justify-start rounded-lg bg-muted/50 p-1">
                <TabsTrigger value="general" className="h-7 text-xs rounded-md">
                  <Briefcase className="h-3 w-3 ml-1.5" />
                  البيانات الأساسية
                </TabsTrigger>
                <TabsTrigger value="description" className="h-7 text-xs rounded-md">
                  <Pencil className="h-3 w-3 ml-1.5" />
                  الوصف
                </TabsTrigger>
                <TabsTrigger value="apps" className="h-7 text-xs rounded-md">
                  <Package className="h-3 w-3 ml-1.5" />
                  التطبيقات المرتبطة
                  <Badge
                    variant="secondary"
                    className="mr-1.5 h-4 px-1 text-[0.65rem] font-mono tabular-nums"
                  >
                    {form.appSlugs.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Tab Content */}
          <ScrollArea className="flex-1 p-4 sm:p-5">
            {activeTab === "general" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty-name-ar" className="text-xs font-semibold">
                      الاسم بالعربي <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="specialty-name-ar"
                      value={form.nameAr}
                      onChange={(e) => setField("nameAr", e.target.value)}
                      placeholder="مثال: التجارة والمتاجر"
                      className="h-9 text-xs rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="specialty-name-en" className="text-xs font-semibold">
                      الاسم بالإنجليزي <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="specialty-name-en"
                      dir="ltr"
                      value={form.nameEn}
                      onChange={(e) => setField("nameEn", e.target.value)}
                      placeholder="e.g. E-commerce & Retail"
                      className="h-9 text-xs rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty-slug" className="text-xs font-semibold">
                      الرابط المختصر (slug)
                    </Label>
                    <Input
                      id="specialty-slug"
                      dir="ltr"
                      value={form.slug}
                      onChange={(e) => setField("slug", slugify(e.target.value))}
                      placeholder={slugify(form.nameEn) || "ecommerce-retail"}
                      className="h-9 text-xs rounded-lg font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">الأيقونة المعبرة</Label>
                    <SpecialtyIconPicker
                      value={form.icon}
                      onChange={(iconName) => setField("icon", iconName)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty-sort" className="text-xs font-semibold">
                      ترتيب الظهور (Sort Order)
                    </Label>
                    <Input
                      id="specialty-sort"
                      type="number"
                      min={0}
                      value={form.sortOrder}
                      onChange={(e) =>
                        setField("sortOrder", Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="h-9 text-xs rounded-lg font-mono tabular-nums"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="specialty-theme" className="text-xs font-semibold">
                      ثيم المتجر التلقائي
                    </Label>
                    <Select
                      value={form.themeId || "default"}
                      onValueChange={(val) => setField("themeId", val === "default" ? null : val)}
                    >
                      <SelectTrigger id="specialty-theme" className="h-9 text-xs rounded-lg">
                        <SelectValue placeholder="افتراضي المنصة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">افتراضي المنصة (Modern Minimal)</SelectItem>
                        {STORE_THEME_OPTIONS.map((theme) => (
                          <SelectItem key={theme.value} value={theme.value}>
                            {theme.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="toggle-auto-install" className="text-xs font-semibold cursor-pointer">
                        تثبيت التطبيقات تلقائياً
                      </Label>
                      <p className="text-[0.68rem] text-muted-foreground">
                        تثبيت التطبيقات المحددة للشركات الجديدة المسجلة بهذا النشاط فوراً.
                      </p>
                    </div>
                    <Switch
                      id="toggle-auto-install"
                      checked={form.autoInstallOnSignup}
                      onCheckedChange={(val) => setField("autoInstallOnSignup", val)}
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="toggle-is-active" className="text-xs font-semibold cursor-pointer">
                        تفعيل النشاط
                      </Label>
                      <p className="text-[0.68rem] text-muted-foreground">
                        إظهار النشاط للعملاء في شاشة إنشاء حساب جديد.
                      </p>
                    </div>
                    <Switch
                      id="toggle-is-active"
                      checked={form.isActive}
                      onCheckedChange={(val) => setField("isActive", val)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "description" && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="specialty-desc-ar" className="text-xs font-semibold">
                    الوصف بالعربي
                  </Label>
                  <Textarea
                    id="specialty-desc-ar"
                    rows={4}
                    value={form.descriptionAr}
                    onChange={(e) => setField("descriptionAr", e.target.value)}
                    placeholder="نبذة عن طبيعة النشاط والخدمات المتاحة..."
                    className="text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="specialty-desc-en" className="text-xs font-semibold">
                    الوصف بالإنجليزي
                  </Label>
                  <Textarea
                    id="specialty-desc-en"
                    dir="ltr"
                    rows={4}
                    value={form.descriptionEn}
                    onChange={(e) => setField("descriptionEn", e.target.value)}
                    placeholder="Short description about the specialty..."
                    className="text-xs rounded-lg"
                  />
                </div>
              </div>
            )}

            {activeTab === "apps" && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    placeholder="ابحث عن تطبيق لربطه..."
                    className="h-8 pr-8 text-xs rounded-lg"
                  />
                </div>

                <div className="space-y-3.5">
                  {filteredGroups.map(([cat, apps]) => {
                    const catSlugs = apps.map((a) => a.slug);
                    const allCatSelected = catSlugs.every((s) => form.appSlugs.includes(s));

                    return (
                      <div key={cat} className="rounded-xl border border-border/50 bg-muted/10 p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[0.7rem]">
                            <Layers className="h-3 w-3" />
                            {getCategoryLabel(cat)} ({apps.length})
                          </Badge>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryApps(catSlugs)}
                            className="h-6 text-[0.68rem] px-2 text-primary"
                          >
                            {allCatSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {apps.map((app) => {
                            const isChecked = form.appSlugs.includes(app.slug);
                            return (
                              <label
                                key={app.slug}
                                className={`flex items-start gap-2.5 rounded-lg border p-2 cursor-pointer transition-colors ${
                                  isChecked
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-border/60 hover:bg-muted/40"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    toggleAppSlug(app.slug, Boolean(checked))
                                  }
                                  aria-label={`تفعيل تطبيق ${app.name}`}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-semibold text-foreground">
                                    {app.name}
                                  </span>
                                  <span className="block truncate text-[0.65rem] text-muted-foreground font-mono" dir="ltr">
                                    {app.slug}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-3 rounded-lg text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={saving}
              className="h-9 px-4 rounded-lg text-xs font-semibold"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 ml-1 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5 ml-1" />
              )}
              {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
