import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Gift,
  Plus,
  RefreshCcw,
  Save,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  SettingsHeroSummaryItem,
  SettingsLoadingState,
  SettingsPageHero,
  SettingsPageShell,
  SettingsSection,
  SettingsStatusAlert,
  SettingsStatusMessage,
} from "./components/SettingsPagePrimitives";
import {
  getApiErrorMessage,
} from "./components/settingsPageUtils";
import { apiClient } from "../../services/apiClient";

type TierType = "cheapest_percentage" | "all_percentage";

interface PromotionTier {
  id: string;
  minQuantity: number;
  type: TierType;
  value: number;
  items: number;
  label: string;
  isActive: boolean;
}

interface StorePromotion {
  isActive: boolean;
  title: string;
  tiers: PromotionTier[];
  startDate: string;
  endDate: string;
}

const DEFAULT_TIERS: PromotionTier[] = [
  { id: "tier-1", minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, label: "اشتري 2 والتانية بنص التمن", isActive: true },
  { id: "tier-2", minQuantity: 3, type: "cheapest_percentage", value: 100, items: 1, label: "اشتري 3 والتالتة هدية", isActive: true },
];

const defaultPromotion = (): StorePromotion => ({
  isActive: false, title: "عروض المتجر", tiers: [], startDate: "", endDate: "",
});

const typeOptions = [
  { value: "cheapest_percentage" as const, label: "خصم على أرخص المنتجات" },
  { value: "all_percentage" as const, label: "خصم على كل المنتجات" },
];

const generateTierId = () => `tier-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const parseTiersJson = (raw: unknown): PromotionTier[] => {
  if (typeof raw === "string") try { return JSON.parse(raw); } catch { return []; }
  if (Array.isArray(raw)) return raw as PromotionTier[];
  return [];
};

export default function StorePromotionSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SettingsStatusMessage | null>(null);
  const [promotion, setPromotion] = useState<StorePromotion>(defaultPromotion);

  const loadPromotion = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/store-promotions");
      if (res.data.success) {
        const d = res.data.data || {};
        setPromotion({
          isActive: d.isActive ?? false,
          title: d.title || "",
          tiers: parseTiersJson(d.tiers),
          startDate: d.startDate ? d.startDate.slice(0, 16) : "",
          endDate: d.endDate ? d.endDate.slice(0, 16) : "",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "فشل تحميل الإعدادات") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPromotion(); }, [loadPromotion]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiClient.post("/store-promotions", {
        isActive: promotion.isActive,
        title: promotion.title,
        tiers: JSON.stringify(promotion.tiers.filter(t => t.isActive)),
        startDate: promotion.startDate || null,
        endDate: promotion.endDate || null,
      });
      setMessage({ type: "success", text: "تم حفظ العرض بنجاح" });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "فشل حفظ الإعدادات") });
    } finally {
      setSaving(false);
    }
  }, [promotion]);

  const handleReset = useCallback(async () => {
    try {
      setSaving(true);
      setMessage(null);
      await apiClient.delete("/store-promotions");
      setPromotion(defaultPromotion());
      setMessage({ type: "success", text: "تم إلغاء العرض" });
    } catch (error) {
      setMessage({ type: "error", text: getApiErrorMessage(error, "فشل إلغاء العرض") });
    } finally {
      setSaving(false);
    }
  }, []);

  const addTier = useCallback(() => {
    setPromotion(p => ({ ...p, tiers: [...p.tiers, { id: generateTierId(), minQuantity: 2, type: "cheapest_percentage", value: 50, items: 1, label: "", isActive: true }] }));
  }, []);

  const removeTier = useCallback((id: string) => {
    setPromotion(p => ({ ...p, tiers: p.tiers.filter(t => t.id !== id) }));
  }, []);

  const updateTier = useCallback((id: string, updates: Partial<PromotionTier>) => {
    setPromotion(p => ({ ...p, tiers: p.tiers.map(t => t.id === id ? { ...t, ...updates } : t) }));
  }, []);

  const fillDefaults = useCallback(() => {
    setPromotion(p => ({ ...p, tiers: DEFAULT_TIERS }));
  }, []);

  const summaryItems = useMemo((): SettingsHeroSummaryItem[] | undefined => {
    const active = promotion.tiers.filter(t => t.isActive);
    if (!promotion.isActive || active.length === 0) return undefined;
    return [
      { label: "الحالة", value: "مفعل" },
      { label: "المستويات", value: String(active.length) },
      { label: "أفضل عرض", value: active[active.length - 1]?.label || "-" },
    ];
  }, [promotion]);

  if (loading) {
    return (
      <SettingsLoadingState
        title="جاري تحميل إعدادات عروض المتجر..."
        description="بنجهزلك إعدادات التخفيضات الشاملة."
      />
    );
  }

  return (
    <SettingsPageShell dir="rtl">
      <SettingsPageHero
        badgeIcon={Gift}
        badgeLabel="ADVANCED"
        title="عروض المتجر الشاملة"
        description="تخفيضات تلقائية على كل منتجات المتجر عند استيفاء شروط الكمية."
        summaryItems={summaryItems}
        action={
          <Button variant="outline" size="sm" onClick={fillDefaults}>
            <Plus className="h-4 w-4 ml-1" /> أمثلة جاهزة
          </Button>
        }
      />

      {message && (
        <SettingsStatusAlert message={message} onDismiss={() => setMessage(null)} />
      )}

      <div className="p-6 space-y-6">
        <SettingsSection
          icon={Gift}
          title="تفعيل العرض"
          description="شغّل أو أوقف العرض على المتجر بالكامل"
          accentClassName="bg-amber-50 text-amber-700 ring-amber-200/70"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>تفعيل عرض المتجر</Label>
              <p className="text-sm text-muted-foreground">
                عند التفعيل، الخصم ينطبق تلقائياً على كل منتجات المتجر
              </p>
            </div>
            <Switch
              checked={promotion.isActive}
              onCheckedChange={checked => setPromotion(p => ({ ...p, isActive: checked }))}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          icon={Tag}
          title="عنوان العرض"
          description="اسم يظهر للعملاء (اختياري)"
          accentClassName="bg-sky-50 text-sky-700 ring-sky-200/70"
        >
          <Input
            value={promotion.title}
            onChange={e => setPromotion(p => ({ ...p, title: e.target.value }))}
            placeholder="مثال: عروض الصيف - خصومات الكمية"
            className="max-w-md"
          />
        </SettingsSection>

        <SettingsSection
          icon={Calendar}
          title="تاريخ العرض"
          description="حدد مدة العرض (اترك فارغاً لعرض دائم)"
          accentClassName="bg-violet-50 text-violet-700 ring-violet-200/70"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>من</Label>
              <Input type="datetime-local" value={promotion.startDate}
                onChange={e => setPromotion(p => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>إلى</Label>
              <Input type="datetime-local" value={promotion.endDate}
                onChange={e => setPromotion(p => ({ ...p, endDate: e.target.value }))} />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          icon={ShoppingCart}
          title="مستويات الخصم (التدريج)"
          description="كل ما زادت الكمية في السلة، كلما كان الخصم أقوى."
          accentClassName="bg-emerald-50 text-emerald-700 ring-emerald-200/70"
        >
          <div className="space-y-4">
            {promotion.tiers.map((tier, index) => (
              <div key={tier.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">المستوى {index + 1}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeTier(tier.id)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>الحد الأدنى للكمية</Label>
                    <Input type="number" min={1} value={tier.minQuantity}
                      onChange={e => updateTier(tier.id, { minQuantity: Math.max(1, parseInt(e.target.value) || 1) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع الخصم</Label>
                    <Select value={tier.type}
                      onValueChange={(val: TierType) => updateTier(tier.id, { type: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>قيمة الخصم (%)</Label>
                    <div className="flex items-center gap-2">
                      <Slider value={[tier.value]} onValueChange={([v]) => updateTier(tier.id, { value: v })} min={1} max={100} step={5} className="flex-1" />
                      <span className="text-sm font-mono w-10 text-left">{tier.value}%</span>
                    </div>
                  </div>
                  {tier.type === "cheapest_percentage" && (
                    <div className="space-y-2">
                      <Label>عدد القطع المخفضة</Label>
                      <Input type="number" min={1} value={tier.items}
                        onChange={e => updateTier(tier.id, { items: Math.max(1, parseInt(e.target.value) || 1) })} />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>نص العرض (يظهر للعميل)</Label>
                  <Input value={tier.label}
                    onChange={e => updateTier(tier.id, { label: e.target.value })}
                    placeholder={tier.type === "cheapest_percentage"
                      ? tier.value >= 100 ? `اشتري ${tier.minQuantity} وخد الأرخص هدية` : `اشتري ${tier.minQuantity} والتاني بنص التمن`
                      : `خصم ${tier.value}% عند شراء ${tier.minQuantity}+`}
                    className="max-w-md" />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addTier} className="w-full">
              <Plus className="h-4 w-4 ml-2" /> إضافة مستوى خصم
            </Button>

            {promotion.tiers.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p className="text-sm">لا توجد مستويات خصم. أضف مستوى أو استخدم "أمثلة جاهزة".</p>
              </div>
            )}
          </div>
        </SettingsSection>

        <Separator />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ العرض"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> إلغاء العرض
          </Button>
        </div>
      </div>
    </SettingsPageShell>
  );
}
