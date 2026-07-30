import React, { useEffect, useState } from "react";
import { Brush, Loader2, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SettingsLoadingState,
  SettingsPageShell,
  SettingsPageHero,
  SettingsStatusAlert,
} from "../settings/components/SettingsPagePrimitives";
import { apiClient } from "../../services/apiClient";

const FONTS = ["Inter", "Poppins", "Montserrat", "Playfair Display", "Roboto", "Cairo", "Noto Sans Arabic", "Tajawal"];

interface BrandData {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  brandVoice: string;
  designRules: string;
  visualGuidelines: string;
}

const defaults: BrandData = {
  brandName: "",
  primaryColor: "#000000",
  secondaryColor: "#ffffff",
  accentColor: "#ff0000",
  headingFont: "Cairo",
  bodyFont: "Tajawal",
  brandVoice: "",
  designRules: "",
  visualGuidelines: "",
};

const BrandIdentitySettings: React.FC = () => {
  const [form, setForm] = useState<BrandData>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const update = <K extends keyof BrandData>(key: K, val: BrandData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get("/settings/brand-identity");
        if (res.success) {
          setForm({ ...defaults, ...res.data });
        }
      } catch (err: any) {
        setMessage({ type: "error", text: err.message || "فشل تحميل الهوية البصرية" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiClient.put("/settings/brand-identity", form);
      if (res.success) {
        setMessage({ type: "success", text: "تم حفظ الهوية البصرية بنجاح" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.response?.data?.message || err.message || "فشل الحفظ" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsLoadingState title="الهوية البصرية" description="جاري التحميل..." />;
  }

  const FieldWrap = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );

  return (
    <SettingsPageShell>
      <SettingsPageHero
        badgeIcon={Palette}
        badgeLabel="Brand"
        title="الهوية البصرية للعلامة التجارية"
        description="حدد ألوانك، خطوطك، وقواعد التصميم — وابنظام هيستخدمها تلقائياً في كل صورة"
      />
      <SettingsStatusAlert message={message} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الأساسيات</CardTitle>
            <CardDescription>اسم العلامة والألوان</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldWrap label="اسم العلامة التجارية">
              <Input
                dir="auto"
                placeholder="اسم متجرك أو علامتك"
                value={form.brandName}
                onChange={(e) => update("brandName", e.target.value)}
              />
            </FieldWrap>
            <div className="grid grid-cols-3 gap-3">
              <FieldWrap label="الأساسي">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </FieldWrap>
              <FieldWrap label="الثانوي">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => update("secondaryColor", e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border"
                  />
                  <Input
                    value={form.secondaryColor}
                    onChange={(e) => update("secondaryColor", e.target.value)}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </FieldWrap>
              <FieldWrap label="إشارة">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border"
                  />
                  <Input
                    value={form.accentColor}
                    onChange={(e) => update("accentColor", e.target.value)}
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </FieldWrap>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="خط العناوين">
                <Select value={form.headingFont} onValueChange={(v) => update("headingFont", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="خط النصوص">
                <Select value={form.bodyFont} onValueChange={(v) => update("bodyFont", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => (<SelectItem key={f} value={f}>{f}</SelectItem>))}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">قواعد العلامة</CardTitle>
            <CardDescription>
              الكلام ده هيتحط كـ System Prompt لكل AI Image Generator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldWrap label="شخصية العلامة (Brand Voice)">
              <Textarea
                dir="auto"
                placeholder="مثلاً: حديثة، جريئة، نستخدم لغة قريبة من العميل، دائماً نركز على الجودة..."
                value={form.brandVoice}
                onChange={(e) => update("brandVoice", e.target.value)}
                rows={3}
              />
            </FieldWrap>
            <FieldWrap label="قواعد التصميم (Design Rules)">
              <Textarea
                dir="auto"
                placeholder="مثلاً: استخدم التباين العالي، النص دايم يكون واضح، المسافات البيضاء مهمة..."
                value={form.designRules}
                onChange={(e) => update("designRules", e.target.value)}
                rows={3}
              />
            </FieldWrap>
            <FieldWrap label="إرشادات بصرية (Visual Guidelines)">
              <Textarea
                dir="auto"
                placeholder="مثلاً: الألوان الأساسية تستخدم في الخلفيات والعناوين، اللون الثانوي للتفاصيل..."
                value={form.visualGuidelines}
                onChange={(e) => update("visualGuidelines", e.target.value)}
                rows={3}
              />
            </FieldWrap>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button size="lg" className="gap-2" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ الهوية البصرية
        </Button>
      </div>
    </SettingsPageShell>
  );
};

export default BrandIdentitySettings;
