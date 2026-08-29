import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  Coffee,
  Dumbbell,
  Eye,
  Gamepad2,
  Globe,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  Layers,
  Loader2,
  Music,
  Package,
  Palette,
  PawPrint,
  Pencil,
  PiggyBank,
  Plane,
  Plus,
  RefreshCw,
  Rocket,
  Save,
  Scissors,
  Search,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Sun,
  Trash2,
  Truck,
  Users,
  UtensilsCrossed,
  Wrench,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { CardContent } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  businessSpecialtyService,
  type BusinessSpecialty,
  type BusinessSpecialtyFormPayload,
  type MarketplaceAppOption,
} from "../../services/businessSpecialtyService";

const createDefaultForm = (): BusinessSpecialtyFormPayload => ({
  slug: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  icon: "Briefcase",
  appSlugs: [],
  autoInstallOnSignup: true,
  themeId: null,
  sortOrder: 0,
  isActive: true,
});

const STORE_THEME_OPTIONS = [
  { value: "mens-grooming-pro", label: "Mens Grooming Pro (مدونة أفليت + SEO)" },
  { value: "modern-minimal", label: "Modern Minimal (افتراضي)" },
  { value: "khemet-luxe-eg", label: "Khemet Luxe" },
  { value: "ink-paper", label: "Ink & Paper" },
  { value: "crafted", label: "Crafted" },
];

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categoryLabels: Record<string, string> = {
  general: "عام",
  ecommerce: "متجر إلكتروني",
  ECOMMERCE: "متجر إلكتروني",
  marketing: "تسويق",
  operations: "عمليات",
  support: "خدمة عملاء",
  crm: "إدارة العملاء",
  ai: "ذكاء اصطناعي",
};

const categoryLabel = (category: string) =>
  categoryLabels[category] || category || "عام";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === "object") {
    const candidate = error as {
      response?: { data?: { message?: string } };
      message?: string;
    };
    return candidate.response?.data?.message || candidate.message || fallback;
  }

  return fallback;
};

const specialtyIconMap: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Briefcase,
  Store,
  ShoppingBag,
  Building2,
  HeartPulse,
  GraduationCap,
  UtensilsCrossed,
  Car,
  Wrench,
  Plane,
  Smartphone,
  Dumbbell,
  Scissors,
  Coffee,
  Home,
  Heart,
  Stethoscope,
  Landmark,
  PiggyBank,
  Palette,
  Camera,
  Music,
  Gamepad2,
  BookOpen,
  Shirt,
  Sparkles,
  Zap,
  Package,
  Globe,
  Users,
  Truck,
  Laptop,
  Baby,
  PawPrint,
  Rocket,
  Sun,
};

const getSpecialtyIcon = (
  name: string,
): React.ComponentType<React.SVGProps<SVGSVGElement>> =>
  specialtyIconMap[name] || Briefcase;

const specialtyGradients = [
  "bg-gradient-to-br from-blue-500 to-indigo-600",
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-emerald-500 to-teal-600",
  "bg-gradient-to-br from-amber-500 to-orange-600",
  "bg-gradient-to-br from-rose-500 to-red-600",
  "bg-gradient-to-br from-cyan-500 to-sky-600",
  "bg-gradient-to-br from-fuchsia-500 to-pink-600",
  "bg-gradient-to-br from-lime-500 to-green-600",
];

const specialtyAccentColors = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#d946ef",
  "#84cc16",
];

const formatDate = (value?: string | null): string => {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return date.toLocaleString("ar-EG");
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "AUTO";
type SortOption = "sortOrder" | "name";

const statusFilters: {
  id: StatusFilter;
  label: string;
  color: string;
}[] = [
  { id: "ALL", label: "الكل", color: "var(--muted-foreground)" },
  { id: "ACTIVE", label: "نشط", color: "#10b981" },
  { id: "INACTIVE", label: "موقوف", color: "#ef4444" },
  { id: "AUTO", label: "تثبيت تلقائي", color: "#8b5cf6" },
];

// ═══════════════════════════════════════════════════════════════════════
// Specialty Edit Screen — نفس أسلوب محرر التطبيقات في صفحة الماركت بليس
// ═══════════════════════════════════════════════════════════════════════
const SpecialtyEditScreen = ({
  specialty,
  appOptions,
  onClose,
  onRefresh,
}: {
  specialty: BusinessSpecialty | null;
  appOptions: MarketplaceAppOption[];
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
}) => {
  const [formState, setFormState] = useState<BusinessSpecialtyFormPayload>(
    () =>
      specialty
        ? {
            slug: specialty.slug,
            nameAr: specialty.nameAr,
            nameEn: specialty.nameEn,
            descriptionAr: specialty.descriptionAr || "",
            descriptionEn: specialty.descriptionEn || "",
            icon: specialty.icon || "Briefcase",
            appSlugs: specialty.appSlugs,
            autoInstallOnSignup: specialty.autoInstallOnSignup,
            themeId: specialty.themeId || null,
            sortOrder: specialty.sortOrder,
            isActive: specialty.isActive,
          }
        : createDefaultForm(),
  );
  const [activeSection, setActiveSection] = useState("general");
  const [appQuery, setAppQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const groupedAppOptions = useMemo(() => {
    const groups = new Map<string, MarketplaceAppOption[]>();
    appOptions.forEach((option) => {
      const category = option.category || "general";
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category)!.push(option);
    });
    return Array.from(groups.entries()).sort((a, b) =>
      categoryLabel(a[0]).localeCompare(categoryLabel(b[0]), "ar"),
    );
  }, [appOptions]);

  const filteredAppGroups = useMemo(() => {
    const query = appQuery.trim().toLowerCase();
    if (!query) return groupedAppOptions;
    return groupedAppOptions
      .map(([category, options]) => [
        category,
        options.filter((option) =>
          [option.name, option.nameEn, option.slug]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query),
        ),
      ] as [string, MarketplaceAppOption[]])
      .filter(([, options]) => options.length > 0);
  }, [groupedAppOptions, appQuery]);

  const setFieldValue = useCallback(
    <K extends keyof BusinessSpecialtyFormPayload>(
      name: K,
      value: BusinessSpecialtyFormPayload[K],
    ) => {
      setFormState((previous) => ({ ...previous, [name]: value }));
    },
    [],
  );

  const toggleAppSlug = (slug: string, checked: boolean) => {
    setFormState((previous) => ({
      ...previous,
      appSlugs: checked
        ? Array.from(new Set([...previous.appSlugs, slug]))
        : previous.appSlugs.filter((item) => item !== slug),
    }));
  };

  const handleSave = async () => {
    if (!formState.nameAr.trim() || !formState.nameEn.trim()) {
      toast.error("الاسم بالعربي والإنجليزي مطلوب");
      return;
    }

    setSaving(true);
    try {
      const payload: BusinessSpecialtyFormPayload = {
        ...formState,
        slug: formState.slug.trim() || slugify(formState.nameEn),
        nameAr: formState.nameAr.trim(),
        nameEn: formState.nameEn.trim(),
        descriptionAr: formState.descriptionAr?.trim() || undefined,
        descriptionEn: formState.descriptionEn?.trim() || undefined,
        sortOrder: Math.max(0, formState.sortOrder || 0),
      };

      if (specialty) {
        await businessSpecialtyService.updateSpecialty(specialty.id, payload);
        toast.success("تم تحديث النشاط التجاري");
      } else {
        await businessSpecialtyService.createSpecialty(payload);
        toast.success("تم إنشاء النشاط التجاري");
      }

      onClose();
      void onRefresh();
    } catch (error) {
      console.error("Failed to save business specialty", error);
      toast.error(getErrorMessage(error, "فشل حفظ النشاط التجاري"));
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "general", label: "عام", icon: Briefcase },
    { id: "description", label: "الوصف", icon: Pencil },
    { id: "apps", label: "التطبيقات", icon: Package },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="رجوع للقائمة"
            onClick={onClose}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold">
              {specialty?.id
                ? `تعديل النشاط التجاري: ${specialty.nameAr || ""}`
                : "إنشاء نشاط تجاري جديد"}
            </h2>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-1.5">
          <Button variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="h-9 rounded-lg px-3 text-sm data-active:bg-primary data-active:text-primary-foreground"
              >
                <SectionIcon className="size-4" />
                {section.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        {activeSection === "general" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label htmlFor="specialty-name-ar">الاسم بالعربي</Label>
                <Input
                  id="specialty-name-ar"
                  name="nameAr"
                  value={formState.nameAr}
                  onChange={(event) =>
                    setFieldValue("nameAr", event.target.value)
                  }
                  placeholder="التجارة والمتاجر"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label htmlFor="specialty-name-en">الاسم بالإنجليزي</Label>
                <Input
                  id="specialty-name-en"
                  name="nameEn"
                  dir="ltr"
                  value={formState.nameEn}
                  onChange={(event) =>
                    setFieldValue("nameEn", event.target.value)
                  }
                  placeholder="E-commerce & Retail"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label htmlFor="specialty-slug">الرابط المختصر (slug)</Label>
                <Input
                  id="specialty-slug"
                  name="slug"
                  dir="ltr"
                  value={formState.slug}
                  onChange={(event) =>
                    setFieldValue("slug", slugify(event.target.value))
                  }
                  placeholder="ecommerce-retail"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label htmlFor="specialty-icon">الأيقونة</Label>
                <Input
                  id="specialty-icon"
                  name="icon"
                  value={formState.icon}
                  onChange={(event) =>
                    setFieldValue("icon", event.target.value)
                  }
                  placeholder="Briefcase"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label htmlFor="specialty-sort-order">الترتيب</Label>
                <Input
                  id="specialty-sort-order"
                  name="sortOrder"
                  type="number"
                  min={0}
                  value={formState.sortOrder}
                  onChange={(event) =>
                    setFieldValue(
                      "sortOrder",
                      Math.max(
                        0,
                        Number.parseInt(event.target.value, 10) || 0,
                      ),
                    )
                  }
                  placeholder="10"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label htmlFor="specialty-theme">ثيم المتجر التلقائي</Label>
                <Select
                  value={formState.themeId || ""}
                  onValueChange={(value) =>
                    setFieldValue("themeId", value || null)
                  }
                >
                  <SelectTrigger id="specialty-theme">
                    <SelectValue placeholder="افتراضي (Elegance V1)" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORE_THEME_OPTIONS.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  يُفعَّل تلقائيًا عند إنشاء شركة جديدة بهذا النشاط التجاري.
                </p>
              </div>
            </div>
            <div className="col-span-12">
              <div className="flex gap-3 flex-wrap rounded-xl bg-muted/40 p-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="autoInstallOnSignup"
                    checked={formState.autoInstallOnSignup}
                    onChange={(event) =>
                      setFieldValue(
                        "autoInstallOnSignup",
                        event.target.checked,
                      )
                    }
                  />
                  <span className="text-sm">
                    تثبيت التطبيقات تلقائيًا عند التسجيل
                  </span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formState.isActive}
                    onChange={(event) =>
                      setFieldValue("isActive", event.target.checked)
                    }
                  />
                  <span className="text-sm">تفعيل النشاط</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeSection === "description" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label htmlFor="specialty-desc-ar">الوصف بالعربي</Label>
                <Textarea
                  id="specialty-desc-ar"
                  name="descriptionAr"
                  rows={5}
                  value={formState.descriptionAr}
                  onChange={(event) =>
                    setFieldValue("descriptionAr", event.target.value)
                  }
                  placeholder="متجر إلكتروني، منتجات، طلبات، عروض ومشتريات."
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label htmlFor="specialty-desc-en">الوصف بالإنجليزي</Label>
                <Textarea
                  id="specialty-desc-en"
                  name="descriptionEn"
                  dir="ltr"
                  rows={5}
                  value={formState.descriptionEn}
                  onChange={(event) =>
                    setFieldValue("descriptionEn", event.target.value)
                  }
                  placeholder="Online store, products, orders, offers and procurement."
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === "apps" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Label className="text-base">التطبيقات المرتبطة</Label>
                <p className="text-sm text-muted-foreground">
                  اختر التطبيقات التي ستظهر وتُثبّت لشركات هذا النشاط (
                  {formState.appSlugs.length} مختار).
                </p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={appQuery}
                  onChange={(event) => setAppQuery(event.target.value)}
                  placeholder="ابحث عن تطبيق..."
                  className="pr-10 text-right"
                />
              </div>
            </div>

            <ScrollArea className="h-72 rounded-xl border bg-muted/20 p-3">
              {filteredAppGroups.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد تطبيقات متاحة مطابقة للبحث.
                </p>
              ) : (
                <div className="space-y-5">
                  {filteredAppGroups.map(([category, options]) => (
                    <div key={category} className="space-y-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full px-3 py-1"
                      >
                        <Layers className="size-3" />
                        {categoryLabel(category)} ({options.length})
                      </Badge>
                      <div className="grid gap-2 md:grid-cols-2">
                        {options.map((option) => {
                          const checked =
                            formState.appSlugs.includes(option.slug);
                          return (
                            <label
                              key={option.slug}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${
                                checked
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border/70 hover:bg-accent/40"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) =>
                                  toggleAppSlug(option.slug, Boolean(value))
                                }
                                aria-label={`تفعيل تطبيق ${option.name}`}
                              />
                              <span className="min-w-0 flex-1 space-y-0.5">
                                <span className="block text-sm font-medium text-foreground">
                                  {option.name}
                                </span>
                                <span
                                  className="block truncate text-xs text-muted-foreground"
                                  dir="ltr"
                                >
                                  {option.slug}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

const BusinessSpecialtiesManagement: React.FC = () => {
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);
  const [appOptions, setAppOptions] = useState<MarketplaceAppOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("sortOrder");
  const [editingSpecialty, setEditingSpecialty] = useState<{
    item: BusinessSpecialty | null;
  } | null>(null);
  const [detailSpecialty, setDetailSpecialty] =
    useState<BusinessSpecialty | null>(null);
  const [specialtyPendingRemoval, setSpecialtyPendingRemoval] =
    useState<BusinessSpecialty | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [items, options] = await Promise.all([
        businessSpecialtyService.listSpecialties(),
        businessSpecialtyService.listAppOptions(),
      ]);
      setSpecialties(items);
      setAppOptions(options);
    } catch (error) {
      console.error("Failed to load business specialties", error);
      toast.error(getErrorMessage(error, "فشل تحميل النشاطات التجارية"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const appOptionBySlug = useMemo(
    () => new Map(appOptions.map((option) => [option.slug, option])),
    [appOptions],
  );

  const filteredSpecialties = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = specialties.filter((specialty) => {
      const matchesQuery =
        !query ||
        [
          specialty.nameAr,
          specialty.nameEn,
          specialty.slug,
          specialty.descriptionAr,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && specialty.isActive) ||
        (statusFilter === "INACTIVE" && !specialty.isActive) ||
        (statusFilter === "AUTO" && specialty.autoInstallOnSignup);

      return matchesQuery && matchesStatus;
    });

    return filtered.sort((a, b) =>
      sortBy === "name"
        ? a.nameAr.localeCompare(b.nameAr, "ar")
        : a.sortOrder - b.sortOrder,
    );
  }, [specialties, search, statusFilter, sortBy]);

  const metricItems = useMemo(() => {
    const active = specialties.filter((specialty) => specialty.isActive);
    const autoInstall = specialties.filter(
      (specialty) => specialty.autoInstallOnSignup,
    );
    const totalCompanies = specialties.reduce(
      (sum, specialty) => sum + specialty.companyCount,
      0,
    );

    return [
      {
        title: "إجمالي النشاطات",
        value: specialties.length.toLocaleString("ar-EG"),
        subtitle: "عدد النشاطات التجارية المتاحة في شاشة التسجيل.",
        icon: Briefcase,
      },
      {
        title: "النشاطات النشطة",
        value: active.length.toLocaleString("ar-EG"),
        subtitle: "الظاهرة للعملاء عند إنشاء حساب جديد.",
        icon: CheckCircle2,
      },
      {
        title: "تثبيت تلقائي عند التسجيل",
        value: autoInstall.length.toLocaleString("ar-EG"),
        subtitle: "نشاطات تثبّت تطبيقاتها تلقائيًا للشركة الجديدة.",
        icon: Zap,
      },
      {
        title: "الشركات المرتبطة",
        value: totalCompanies.toLocaleString("ar-EG"),
        subtitle: "إجمالي الشركات المسجلة تحت هذه النشاطات.",
        icon: Store,
      },
    ];
  }, [specialties]);

  const metricStyles = [
    {
      gradient: "bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800",
      shadow: "shadow-blue-900/20",
      title: "text-blue-100",
    },
    {
      gradient: "bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800",
      shadow: "shadow-purple-900/20",
      title: "text-purple-100",
    },
    {
      gradient:
        "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700",
      shadow: "shadow-emerald-900/20",
      title: "text-emerald-100",
    },
    {
      gradient: "bg-gradient-to-br from-rose-500 via-rose-600 to-red-700",
      shadow: "shadow-rose-900/20",
      title: "text-rose-100",
    },
  ];

  const statusCounts = useMemo(
    () => ({
      ALL: specialties.length,
      ACTIVE: specialties.filter((specialty) => specialty.isActive).length,
      INACTIVE: specialties.filter((specialty) => !specialty.isActive).length,
      AUTO: specialties.filter((specialty) => specialty.autoInstallOnSignup)
        .length,
    }),
    [specialties],
  );

  const handleRemoveSpecialty = async () => {
    if (!specialtyPendingRemoval) return;

    try {
      setRemoving(true);
      const result = await businessSpecialtyService.removeSpecialty(
        specialtyPendingRemoval.id,
      );
      const wasLinked = (specialtyPendingRemoval.companyCount || 0) > 0;

      if (!wasLinked) {
        setSpecialties((previous) =>
          previous.filter(
            (specialty) => specialty.id !== specialtyPendingRemoval.id,
          ),
        );
        toast.success("تم حذف النشاط التجاري");
      } else {
        setSpecialties((previous) =>
          previous.map((specialty) =>
            specialty.id === specialtyPendingRemoval.id && result.specialty
              ? result.specialty
              : specialty,
          ),
        );
        toast.success("تم إيقاف النشاط التجاري لأنه مرتبط بشركات");
      }

      setSpecialtyPendingRemoval(null);
      await loadData();
    } catch (error) {
      console.error("Failed to remove business specialty", error);
      toast.error(getErrorMessage(error, "فشل حذف النشاط التجاري"));
    } finally {
      setRemoving(false);
    }
  };

  const renderAppsPreview = (specialty: BusinessSpecialty, max = 3) => {
    if (specialty.appSlugs.length === 0) {
      return (
        <span className="text-xs text-muted-foreground">بدون تطبيقات</span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {specialty.appSlugs.slice(0, max).map((slug) => {
          const option = appOptionBySlug.get(slug);
          return (
            <span
              key={slug}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[0.7rem] text-foreground"
            >
              <Package className="size-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{option?.name || slug}</span>
            </span>
          );
        })}
        {specialty.appSlugs.length > max && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[0.7rem] font-semibold text-primary">
            +{specialty.appSlugs.length - max}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-md bg-muted" />
          <div className="h-4 w-80 rounded-md bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-40 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (editingSpecialty) {
    return (
      <SpecialtyEditScreen
        specialty={editingSpecialty.item}
        appOptions={appOptions}
        onClose={() => setEditingSpecialty(null)}
        onRefresh={loadData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          النشاطات التجارية والتطبيقات
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          كل نشاط تجاري يظهر في شاشة التسجيل، وتحته التطبيقات التي تُثبَّت
          تلقائيًا لشركات هذا النشاط عند إنشاء الحساب.
        </p>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metricItems.map((item, index) => {
          const styles =
            metricStyles[index % metricStyles.length] ?? metricStyles[0]!;
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]",
                styles.gradient,
                styles.shadow,
              )}
            >
              <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
              <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
                <Icon className="h-5 w-5" />
              </div>
              <p
                className={cn(
                  "relative z-10 text-sm font-medium",
                  styles.title,
                )}
              >
                {item.title}
              </p>
              <p className="relative z-10 mt-0.5 text-2xl font-extrabold">
                {item.value}
              </p>
              <p className="relative z-10 mt-1 text-xs font-medium text-white/80">
                {item.subtitle}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-4">
        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-12 md:col-span-5">
            <div className="space-y-1.5">
              <Label htmlFor="specialties-search">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="specialties-search"
                  className="w-full pr-10"
                  placeholder="ابحث بالاسم أو الرابط أو الوصف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-2">
            <div className="space-y-1.5">
              <Label>الترتيب</Label>
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy((v as SortOption) || "sortOrder")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sortOrder">حسب الترتيب</SelectItem>
                  <SelectItem value="name">حسب الاسم</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadData()}
                disabled={loading}
                className="flex-1 md:flex-none"
              >
                <RefreshCw className={cn("h-4 w-4 ml-1", loading && "animate-spin")} />
                تحديث
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={() => setEditingSpecialty({ item: null })}
                className="flex-1 md:flex-none"
              >
                <Plus className="h-4 w-4 ml-1" />
                إنشاء نشاط
              </Button>
            </div>
          </div>
        </div>
        {filteredSpecialties.length !== specialties.length && (
          <span className="text-xs text-muted-foreground block mt-2">
            عرض {filteredSpecialties.length} من {specialties.length} نشاط
          </span>
        )}
      </div>

      {/* Sidebar Filters + Cards Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Status Sidebar */}
        <div className="col-span-12 md:col-span-2">
          <div
            className="rounded-2xl border bg-card text-card-foreground shadow-sm p-2"
            style={{ minHeight: 200 }}
          >
            <p className="px-3 pt-1.5 pb-2 text-xs font-bold text-muted-foreground">
              الحالة
            </p>
            <div className="flex flex-col gap-0.5">
              {statusFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={cn(
                    "flex items-center gap-2 w-full text-right px-3 py-2 text-sm transition-all rounded-xl",
                    statusFilter === filter.id
                      ? "bg-primary/10 text-primary font-semibold shadow-sm"
                      : "text-muted-foreground hover:bg-accent/60",
                  )}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: filter.color }}
                  />
                  <span className="flex-1 text-right text-sm">
                    {filter.label}
                  </span>
                  <Badge
                    variant={statusFilter === filter.id ? "default" : "secondary"}
                    className={cn(
                      "h-5 text-[0.7rem]",
                      statusFilter === filter.id &&
                        "bg-primary text-primary-foreground",
                    )}
                  >
                    {statusCounts[filter.id]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="col-span-12 md:col-span-10">
          {filteredSpecialties.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card text-card-foreground p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-base font-semibold text-muted-foreground mt-4">
                لا توجد نشاطات تجارية مطابقة
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                أنشئ نشاطًا تجاريًا واربط به التطبيقات ليظهر للعملاء في شاشة
                التسجيل.
              </p>
              <Button
                type="button"
                className="mt-4 rounded-xl"
                onClick={() => setEditingSpecialty({ item: null })}
              >
                <Plus className="h-4 w-4 ml-1" />
                إنشاء أول نشاط
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-4">
              {filteredSpecialties.map((specialty) => {
                const specialtyIndex = Math.max(
                  0,
                  specialties.findIndex((item) => item.id === specialty.id),
                );
                const gradient =
                  specialtyGradients[specialtyIndex % specialtyGradients.length];
                const accent =
                  specialtyAccentColors[specialtyIndex % specialtyAccentColors.length];
                const SpecialtyIcon = getSpecialtyIcon(specialty.icon);
                const appsCount = specialty.appSlugs.length;

                return (
                  <div
                    key={specialty.id}
                    className="col-span-12 sm:col-span-6 xl:col-span-4"
                  >
                    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                      {/* Header */}
                      <div className="relative overflow-hidden border-b border-border/60 p-4 pb-3">
                        <div
                          className="absolute -left-10 -top-12 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                          style={{ backgroundColor: accent }}
                        />
                        <div className="relative flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={cn(
                                "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-md",
                                gradient,
                              )}
                            >
                              <SpecialtyIcon className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold leading-tight">
                                {specialty.nameAr}
                              </h3>
                              <p
                                className="mt-0.5 truncate text-xs text-muted-foreground"
                                dir="ltr"
                              >
                                {specialty.slug}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                {specialty.isActive ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700 dark:text-emerald-400">
                                    فعّال
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-700 dark:text-rose-400">
                                    موقوف
                                  </span>
                                )}
                                {specialty.autoInstallOnSignup && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-700 dark:text-violet-400">
                                    <Zap className="size-2.5" />
                                    تثبيت تلقائي
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <CardContent className="flex flex-grow flex-col gap-3 p-4 pt-3">
                        {/* Description */}
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {specialty.descriptionAr || "لا يوجد وصف"}
                        </p>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-xl bg-muted/50 p-2 text-center">
                            <p className="text-sm font-bold text-primary">
                              {appsCount}
                            </p>
                            <span className="text-[0.65rem] text-muted-foreground">
                              تطبيق
                            </span>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-2 text-center">
                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {specialty.companyCount.toLocaleString("ar-EG")}
                            </p>
                            <span className="text-[0.65rem] text-muted-foreground">
                              شركة
                            </span>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-2 text-center">
                            <p className="text-sm font-bold text-amber-500">
                              {specialty.sortOrder}
                            </p>
                            <span className="text-[0.65rem] text-muted-foreground">
                              الترتيب
                            </span>
                          </div>
                        </div>

                        {/* Apps preview */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-muted-foreground">
                            التطبيقات ({appsCount})
                          </p>
                          {renderAppsPreview(specialty)}
                        </div>

                        {/* Actions */}
                        <div className="mt-auto flex justify-between items-center border-t border-border/60 pt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={() => setDetailSpecialty(specialty)}
                          >
                            <Eye className="h-4 w-4 ml-1" />
                            التفاصيل
                          </Button>
                          <div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`تعديل النشاط ${specialty.nameAr}`}
                                    onClick={() =>
                                      setEditingSpecialty({ item: specialty })
                                    }
                                    className="hover:bg-primary/10 hover:text-primary"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>تعديل</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`حذف النشاط ${specialty.nameAr}`}
                                    onClick={() =>
                                      setSpecialtyPendingRemoval(specialty)
                                    }
                                    className="hover:bg-red-500/10 hover:text-red-500"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>حذف</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog
        open={Boolean(detailSpecialty)}
        onOpenChange={(open) => {
          if (!open) setDetailSpecialty(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>تفاصيل النشاط التجاري</DialogTitle>
            <DialogDescription>
              جميع تفاصيل النشاط والتطبيقات المرتبطة به.
            </DialogDescription>
          </DialogHeader>

          {detailSpecialty && (
            <ScrollArea className="max-h-[70vh] pr-3">
              <div className="space-y-5">
                {/* Hero */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-5 text-white">
                  <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div
                      className={cn(
                        "flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg",
                        specialtyGradients[
                          Math.max(
                            0,
                            specialties.findIndex(
                              (item) => item.id === detailSpecialty.id,
                            ),
                          ) % specialtyGradients.length
                        ],
                      )}
                    >
                      {(() => {
                        const Icon = getSpecialtyIcon(detailSpecialty.icon);
                        return <Icon className="h-7 w-7" />;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold">
                        {detailSpecialty.nameAr}
                      </h3>
                      <p className="mt-0.5 truncate text-sm text-white/70" dir="ltr">
                        {detailSpecialty.slug}
                        {detailSpecialty.nameEn
                          ? ` • ${detailSpecialty.nameEn}`
                          : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {detailSpecialty.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                            فعّال
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
                            موقوف
                          </span>
                        )}
                        {detailSpecialty.autoInstallOnSignup && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                            <Zap className="size-3" />
                            تثبيت تلقائي عند التسجيل
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-6">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الاسم بالعربي
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {detailSpecialty.nameAr}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الاسم بالإنجليزي
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground" dir="ltr">
                        {detailSpecialty.nameEn || "غير متاح"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الرابط (slug)
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground" dir="ltr">
                        {detailSpecialty.slug}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الأيقونة
                      </span>
                      <div className="mt-0.5 flex items-center gap-2">
                        {(() => {
                          const Icon = getSpecialtyIcon(detailSpecialty.icon);
                          return (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" />
                            </span>
                          );
                        })()}
                        <span className="text-sm font-semibold text-foreground" dir="ltr">
                          {detailSpecialty.icon}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        ترتيب العرض
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {detailSpecialty.sortOrder}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الشركات المرتبطة
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {detailSpecialty.companyCount.toLocaleString("ar-EG")}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-6">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        تاريخ الإنشاء
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatDate(detailSpecialty.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-6 md:col-span-6">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        آخر تحديث
                      </span>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">
                        {formatDate(detailSpecialty.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الوصف بالعربي
                      </span>
                      <p className="mt-0.5 text-sm leading-7 text-foreground">
                        {detailSpecialty.descriptionAr || "بدون وصف"}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="rounded-xl border bg-muted/30 p-3">
                      <span className="text-xs text-muted-foreground block">
                        الوصف بالإنجليزي
                      </span>
                      <p className="mt-0.5 text-sm leading-7 text-foreground" dir="ltr">
                        {detailSpecialty.descriptionEn || "بدون وصف"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Linked Apps */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-base">
                      التطبيقات المرتبطة (
                      {detailSpecialty.appSlugs.length})
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      التطبيقات التي تُثبَّت تلقائيًا لشركات هذا النشاط عند
                      إنشاء الحساب.
                    </p>
                  </div>
                  {detailSpecialty.appSlugs.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                      <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                      لا توجد تطبيقات مرتبطة بهذا النشاط.
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {detailSpecialty.appSlugs.map((slug) => {
                        const option = appOptionBySlug.get(slug);
                        return (
                          <div
                            key={slug}
                            className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3"
                          >
                            <span
                              className={cn(
                                "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
                                specialtyGradients[
                                  Math.abs(slug.length) %
                                    specialtyGradients.length
                                ],
                              )}
                            >
                              <Package className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {option?.name || slug}
                              </p>
                              <p
                                className="truncate text-xs text-muted-foreground"
                                dir="ltr"
                              >
                                {option?.nameEn || ""}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span
                                  className="rounded-full px-2 py-0.5 text-[0.65rem] font-semibold text-white"
                                  style={{
                                    backgroundColor:
                                      specialtyAccentColors[
                                        Math.abs(slug.length) %
                                          specialtyAccentColors.length
                                      ],
                                  }}
                                >
                                  {categoryLabel(option?.category || "")}
                                </span>
                                <span
                                  className="truncate rounded-full bg-muted px-2 py-0.5 text-[0.65rem] text-muted-foreground"
                                  dir="ltr"
                                >
                                  {slug}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setDetailSpecialty(null)}
            >
              إغلاق
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => {
                if (detailSpecialty) {
                  const specialty = detailSpecialty;
                  setDetailSpecialty(null);
                  setEditingSpecialty({ item: specialty });
                }
              }}
            >
              <Pencil className="h-4 w-4 ml-1" />
              تعديل النشاط
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={Boolean(specialtyPendingRemoval)}
        onOpenChange={(open) => {
          if (!open && !removing) {
            setSpecialtyPendingRemoval(null);
          }
        }}
      >
        <DialogContent className="max-w-md text-right sm:text-right">
          <DialogHeader className="text-right">
            <DialogTitle>حذف النشاط التجاري؟</DialogTitle>
            <DialogDescription>
              {specialtyPendingRemoval?.companyCount
                ? `النشاط ${specialtyPendingRemoval.nameAr} مرتبط بـ ${specialtyPendingRemoval.companyCount.toLocaleString("ar-EG")} شركة، لذلك سيتم إيقافه بدلًا من حذف السجل بالكامل.`
                : `سيتم حذف النشاط ${specialtyPendingRemoval?.nameAr || ""} نهائيًا لأنه غير مرتبط بأي شركة.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:flex-row-reverse">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              disabled={removing}
              onClick={() => setSpecialtyPendingRemoval(null)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              className="rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
              disabled={removing}
              onClick={() => void handleRemoveSpecialty()}
            >
              {removing ? "جارٍ التنفيذ..." : "تأكيد الحذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BusinessSpecialtiesManagement;
