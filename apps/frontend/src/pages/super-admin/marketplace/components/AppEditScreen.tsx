import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Save,
  Loader2,
  Info,
  DollarSign,
  Image as ImageIcon,
  ListChecks,
  Route,
  Tags,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  type MarketplaceManagementItem,
  type MarketplaceDialogFormData,
  createDefaultMarketplaceFormData,
  parseStringList,
} from "../types/marketplaceAdminTypes";
import { AppEditPricingSection } from "./AppEditPricingSection";
import { AppEditMediaSection } from "./AppEditMediaSection";

export interface AppEditScreenProps {
  app: MarketplaceManagementItem | null;
  onSave: (
    item: MarketplaceManagementItem | null,
    data: MarketplaceDialogFormData,
  ) => Promise<boolean>;
  onClose: () => void;
}

export const AppEditScreen: React.FC<AppEditScreenProps> = ({
  app,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = useState<MarketplaceDialogFormData>(() =>
    createDefaultMarketplaceFormData("app"),
  );
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);

  const categoryMap = [
    { id: "ECOMMERCE", name: "التجارة الإلكترونية" },
    { id: "HR", name: "الموارد البشرية" },
    { id: "AI", name: "الأتمتة" },
    { id: "COMMUNICATION", name: "التواصل" },
    { id: "CRM", name: "إدارة العملاء" },
    { id: "ANALYTICS", name: "التحليلات" },
    { id: "INTEGRATION", name: "التكاملات" },
    { id: "PRODUCTIVITY", name: "الإنتاجية" },
    { id: "FINANCE", name: "المالية" },
    { id: "MARKETING", name: "التسويق" },
  ];

  useEffect(() => {
    setFormData({
      ...createDefaultMarketplaceFormData("app"),
      ...(app || {}),
      features: parseStringList(app?.features),
      screenshots: parseStringList(app?.screenshots ?? app?.images),
    });
  }, [app]);

  const setFieldValue = useCallback(
    <K extends keyof MarketplaceDialogFormData>(
      name: K,
      value: MarketplaceDialogFormData[K],
    ) => {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    [],
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const target = e.target;
    const { name, value, type: inputType } = target;
    const checked = "checked" in target ? target.checked : undefined;
    const fieldName = name as keyof MarketplaceDialogFormData;
    const nextValue =
      inputType === "checkbox"
        ? checked
        : inputType === "number"
          ? Number(value)
          : value;

    setFieldValue(
      fieldName,
      nextValue as MarketplaceDialogFormData[typeof fieldName],
    );
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error("اسم التطبيق مطلوب");
      return;
    }
    setSaving(true);
    try {
      if (await onSave(app, formData)) {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "general", label: "عام", icon: Info },
    { id: "pricing", label: "التسعير", icon: DollarSign },
    { id: "media", label: "الوسائط", icon: ImageIcon },
    { id: "features", label: "المميزات", icon: ListChecks },
    { id: "routes", label: "المسارات", icon: Route },
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
              {app?.id ? `تعديل التطبيق: ${app.name || ""}` : "إضافة تطبيق جديد"}
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
              <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
            ) : (
              <Save className="h-3.5 w-3.5 ml-1" />
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
                <SectionIcon className="size-4 ml-1" />
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
                <Label>الاسم</Label>
                <Input name="name" value={formData.name ?? ""} onChange={handleChange} />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input
                  name="slug"
                  value={formData.slug ?? ""}
                  onChange={handleChange}
                  placeholder="اتركه فارغاً للتوليد التلقائي"
                />
              </div>
            </div>
            <div className="col-span-12">
              <div className="space-y-1">
                <Label>الوصف</Label>
                <Textarea
                  name="description"
                  rows={2}
                  value={formData.description ?? ""}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-2">
                <Label>الفئة</Label>
                <Select
                  value={formData.category ?? "ECOMMERCE"}
                  onValueChange={(v) => setFieldValue("category", v ?? undefined)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryMap.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-12 md:col-span-4">
              <div className="space-y-1">
                <Label>الأيقونة (Emoji or Icon Name)</Label>
                <Input name="icon" value={formData.icon ?? ""} onChange={handleChange} />
              </div>
            </div>
            <div className="col-span-6 md:col-span-2">
              <div className="space-y-1">
                <Label>أيام التجربة</Label>
                <Input
                  name="trialDays"
                  type="number"
                  className="tabular-nums font-mono"
                  value={formData.trialDays ?? 14}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="flex h-full items-center gap-1 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  name="isAutoInstall"
                  checked={!!formData.isAutoInstall}
                  onChange={handleChange}
                />
                <span className="text-sm">تثبيت تلقائي</span>
              </label>
            </div>
            <div className="col-span-12">
              <div className="flex gap-3 flex-wrap rounded-xl bg-muted/40 p-3">
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-sm">نشط:</span>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={!!formData.isActive}
                    onChange={handleChange}
                  />
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-sm">عام (Public):</span>
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={!!formData.isPublic}
                    onChange={handleChange}
                  />
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-sm">مميز (Featured):</span>
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={!!formData.isFeatured}
                    onChange={handleChange}
                  />
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <span className="text-sm">شائع (Popular):</span>
                  <input
                    type="checkbox"
                    name="isPopular"
                    checked={!!formData.isPopular}
                    onChange={handleChange}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {activeSection === "pricing" && (
          <AppEditPricingSection
            formData={formData}
            onChange={handleChange}
            setFieldValue={setFieldValue}
          />
        )}

        {activeSection === "media" && (
          <AppEditMediaSection
            formData={formData}
            setFieldValue={setFieldValue}
          />
        )}

        {activeSection === "features" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12">
              <div className="space-y-1">
                <Label>الأدوات والمميزات (Tools Included)</Label>
                <Textarea
                  rows={6}
                  value={Array.isArray(formData.features) ? formData.features.join(", ") : ""}
                  onChange={(event) =>
                    setFieldValue("features", parseStringList(event.target.value))
                  }
                  placeholder="افصل بين كل ميزة بفاصلة (،) .. مثال: نظام تقارير، ربط واتساب، دعم فني"
                />
                <p className="text-xs text-muted-foreground">
                  افصل بين الأدوات بفاصلة لكي تظهر كنقاط منفصلة للمستخدم
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === "routes" && (
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label>المسار الرئيسي (Main Route)</Label>
                <Input
                  name="mainRoute"
                  value={formData.mainRoute ?? ""}
                  onChange={handleChange}
                  placeholder="/my-apps/something"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="col-span-12 md:col-span-6">
              <div className="space-y-1">
                <Label>مسار الإدارة (Admin Route)</Label>
                <Input
                  name="adminRoute"
                  value={formData.adminRoute ?? ""}
                  onChange={handleChange}
                  placeholder="/settings/something"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="col-span-12">
              <p className="text-xs text-muted-foreground">
                <Tags className="inline h-3.5 w-3.5 ml-1" />
                المسارات تُستخدم لفتح التطبيق من متجر التطبيقات وصفحات الإدارة.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppEditScreen;
