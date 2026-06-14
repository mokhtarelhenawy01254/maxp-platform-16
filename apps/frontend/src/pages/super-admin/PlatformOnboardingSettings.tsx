import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  BusinessPageHero,
  BusinessPageShell,
  BusinessSectionPanel,
} from "../../components/business/BusinessSurface";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Textarea } from "../../components/ui/textarea";
import {
  platformOnboardingService,
  type BusinessSpecialty,
  type BusinessSpecialtyPayload,
  type MarketplaceAppOption,
} from "../../services/platformOnboardingService";

const emptyForm: BusinessSpecialtyPayload = {
  slug: "",
  nameAr: "",
  nameEn: "",
  descriptionAr: "",
  descriptionEn: "",
  icon: "Briefcase",
  appSlugs: [],
  autoInstallOnSignup: true,
  sortOrder: 0,
  isActive: true,
};

const categoryLabels: Record<string, string> = {
  ECOMMERCE: "التجارة الإلكترونية",
  MARKETING: "التسويق",
  CRM: "إدارة العملاء",
  ANALYTICS: "التحليلات",
  ["A" + "I"]: "الأتمتة",
  PRODUCTIVITY: "الإنتاجية",
  INTEGRATION: "التكاملات",
};

const toFormPayload = (specialty: BusinessSpecialty): BusinessSpecialtyPayload => ({
  slug: specialty.slug,
  nameAr: specialty.nameAr,
  nameEn: specialty.nameEn,
  descriptionAr: specialty.descriptionAr || "",
  descriptionEn: specialty.descriptionEn || "",
  icon: specialty.icon || "Briefcase",
  appSlugs: specialty.appSlugs || [],
  autoInstallOnSignup: specialty.autoInstallOnSignup,
  sortOrder: specialty.sortOrder || 0,
  isActive: specialty.isActive,
});

const PlatformOnboardingSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSpecialty, setSavingSpecialty] = useState(false);
  const [defaultTrialDays, setDefaultTrialDays] = useState(7);
  const [specialties, setSpecialties] = useState<BusinessSpecialty[]>([]);
  const [appOptions, setAppOptions] = useState<MarketplaceAppOption[]>([]);
  const [editingSpecialty, setEditingSpecialty] = useState<BusinessSpecialty | null>(null);
  const [formState, setFormState] = useState<BusinessSpecialtyPayload>(emptyForm);

  const groupedApps = useMemo(() => {
    return appOptions.reduce<Record<string, MarketplaceAppOption[]>>((groups, app) => {
      const category = app.category || "OTHER";
      const group = groups[category] || [];
      group.push(app);
      groups[category] = group;
      return groups;
    }, {});
  }, [appOptions]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settings, specialtyItems, apps] = await Promise.all([
        platformOnboardingService.getSettings(),
        platformOnboardingService.listSpecialties(),
        platformOnboardingService.getMarketplaceAppOptions(),
      ]);
      setDefaultTrialDays(settings.defaultTrialDays);
      setSpecialties(specialtyItems);
      setAppOptions(apps);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "فشل تحميل إعدادات التسجيل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      const settings = await platformOnboardingService.updateSettings({
        defaultTrialDays,
      });
      setDefaultTrialDays(settings.defaultTrialDays);
      toast.success("تم حفظ مدة التجربة");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "فشل حفظ مدة التجربة");
    } finally {
      setSavingSettings(false);
    }
  };

  const startCreate = () => {
    setEditingSpecialty(null);
    setFormState(emptyForm);
  };

  const startEdit = (specialty: BusinessSpecialty) => {
    setEditingSpecialty(specialty);
    setFormState(toFormPayload(specialty));
  };

  const toggleApp = (slug: string) => {
    setFormState((current) => {
      const hasSlug = current.appSlugs.includes(slug);
      return {
        ...current,
        appSlugs: hasSlug
          ? current.appSlugs.filter((item) => item !== slug)
          : [...current.appSlugs, slug],
      };
    });
  };

  const saveSpecialty = async () => {
    try {
      setSavingSpecialty(true);
      if (editingSpecialty) {
        await platformOnboardingService.updateSpecialty(editingSpecialty.id, formState);
        toast.success("تم تحديث التخصص");
      } else {
        await platformOnboardingService.createSpecialty(formState);
        toast.success("تم إنشاء التخصص");
      }
      setEditingSpecialty(null);
      setFormState(emptyForm);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "فشل حفظ التخصص");
    } finally {
      setSavingSpecialty(false);
    }
  };

  const removeSpecialty = async (specialty: BusinessSpecialty) => {
    const confirmed = window.confirm(`تعطيل تخصص "${specialty.nameAr}"؟`);
    if (!confirmed) return;

    try {
      await platformOnboardingService.removeSpecialty(specialty.id);
      toast.success("تم تعطيل التخصص");
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "فشل تعطيل التخصص");
    }
  };

  return (
    <BusinessPageShell>
      <BusinessPageHero
        eyebrow="Platform Onboarding"
        title="إعدادات التسجيل والتخصصات"
        description="تحكم في مدة التجربة الافتراضية، والتخصصات التي يختارها العميل، والتطبيقات التي تظهر أو تُفعل لكل تخصص."
        actions={
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className="ml-2 h-4 w-4" />
            تحديث
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <BusinessSectionPanel
            title="مدة التجربة"
            description="هذه هي المدة الأساسية لكل عميل جديد قبل أي أيام إضافية من البرومو كود."
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="defaultTrialDays">أيام التجربة الافتراضية</Label>
                <Input
                  id="defaultTrialDays"
                  type="number"
                  min={0}
                  max={365}
                  value={defaultTrialDays}
                  onChange={(event) => setDefaultTrialDays(Number(event.target.value) || 0)}
                />
              </div>
              <Button onClick={() => void saveSettings()} disabled={savingSettings}>
                <Save className="ml-2 h-4 w-4" />
                حفظ مدة التجربة
              </Button>
            </div>
          </BusinessSectionPanel>

          <BusinessSectionPanel
            title="التخصصات الحالية"
            description="اختر تخصصا لتعديله أو أنشئ تخصصا جديدا."
            headerAside={
              <Button size="sm" variant="outline" onClick={startCreate}>
                <Plus className="ml-2 h-4 w-4" />
                جديد
              </Button>
            }
          >
            <div className="space-y-3">
              {specialties.map((specialty) => (
                <button
                  key={specialty.id}
                  type="button"
                  onClick={() => startEdit(specialty)}
                  className="w-full rounded-lg border border-slate-200 bg-white p-3 text-right transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{specialty.nameAr}</p>
                      <p className="text-xs text-slate-500">{specialty.nameEn}</p>
                    </div>
                    <Badge variant={specialty.isActive ? "default" : "secondary"}>
                      {specialty.isActive ? "مفعل" : "موقوف"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{specialty.appSlugs.length} تطبيق</span>
                    <span>{specialty.companyCount || 0} شركة</span>
                  </div>
                </button>
              ))}
            </div>
          </BusinessSectionPanel>
        </div>

        <BusinessSectionPanel
          title={editingSpecialty ? `تعديل: ${editingSpecialty.nameAr}` : "تخصص جديد"}
          description="حدد الاسم بالعربي والإنجليزي، ثم اربط التخصص بالتطبيقات المناسبة."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="nameAr">الاسم بالعربي</Label>
              <Input
                id="nameAr"
                value={formState.nameAr}
                onChange={(event) => setFormState((current) => ({ ...current, nameAr: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="nameEn">الاسم بالإنجليزي</Label>
              <Input
                id="nameEn"
                value={formState.nameEn}
                onChange={(event) => setFormState((current) => ({ ...current, nameEn: event.target.value }))}
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="slug">الرابط المختصر</Label>
              <Input
                id="slug"
                value={formState.slug}
                onChange={(event) => setFormState((current) => ({ ...current, slug: event.target.value }))}
                dir="ltr"
                placeholder="ecommerce-retail"
              />
            </div>
            <div>
              <Label htmlFor="sortOrder">الترتيب</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formState.sortOrder}
                onChange={(event) => setFormState((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="descriptionAr">الوصف بالعربي</Label>
              <Textarea
                id="descriptionAr"
                value={formState.descriptionAr}
                onChange={(event) => setFormState((current) => ({ ...current, descriptionAr: event.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="descriptionEn">الوصف بالإنجليزي</Label>
              <Textarea
                id="descriptionEn"
                value={formState.descriptionEn}
                onChange={(event) => setFormState((current) => ({ ...current, descriptionEn: event.target.value }))}
                rows={3}
                dir="ltr"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">مفعل للظهور في التسجيل</span>
              <Switch
                checked={formState.isActive}
                onCheckedChange={(checked) => setFormState((current) => ({ ...current, isActive: checked }))}
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">تثبيت التطبيقات تلقائيا عند التسجيل</span>
              <Switch
                checked={formState.autoInstallOnSignup}
                onCheckedChange={(checked) => setFormState((current) => ({ ...current, autoInstallOnSignup: checked }))}
              />
            </label>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">تطبيقات التخصص</h3>
                <p className="text-xs text-slate-500">المختار هنا هو فقط ما سيظهر للعميل في صفحة التطبيقات.</p>
              </div>
              <Badge variant="outline">{formState.appSlugs.length} محدد</Badge>
            </div>

            <div className="space-y-5">
              {Object.entries(groupedApps).map(([category, apps]) => (
                <div key={category} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-indigo-600" />
                    <h4 className="font-semibold text-slate-800">
                      {categoryLabels[category] || category}
                    </h4>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {apps.map((app) => {
                      const checked = formState.appSlugs.includes(app.slug);
                      return (
                        <label
                          key={app.slug}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-100 p-3 transition hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleApp(app.slug)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          <span>
                            <span className="block text-sm font-medium text-slate-800">{app.name}</span>
                            <span className="block text-xs text-slate-500" dir="ltr">{app.slug}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => void saveSpecialty()} disabled={savingSpecialty}>
              <CheckCircle2 className="ml-2 h-4 w-4" />
              {editingSpecialty ? "حفظ التعديل" : "إنشاء التخصص"}
            </Button>
            {editingSpecialty && (
              <Button
                variant="destructive"
                onClick={() => void removeSpecialty(editingSpecialty)}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                تعطيل التخصص
              </Button>
            )}
          </div>
        </BusinessSectionPanel>
      </div>
    </BusinessPageShell>
  );
};

export default PlatformOnboardingSettings;
