import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  MessageSquare,
  Send,
  Save,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "../../../services/apiClient";
import { WhatsAppSurfaceCard } from "./WhatsAppPageShell";

interface WindowPolicyConfig {
  windowPolicy: "SMART_FALLBACK" | "TEMPLATE_ONLY" | "SMS_DIRECT";
  smsFallbackEnabled: boolean;
  smsProvider: "SMSMISR" | "TWILIO" | "TAQNYAT" | "GENERIC_WEBHOOK";
  smsConfig: {
    senderId: string;
    apiKey: string;
    apiSecret: string;
    accountSid: string;
    authToken: string;
    webhookUrl: string;
    environment: number;
  };
  windowAlertThresholdMinutes: number;
}

const DEFAULT_CONFIG: WindowPolicyConfig = {
  windowPolicy: "SMART_FALLBACK",
  smsFallbackEnabled: false,
  smsProvider: "SMSMISR",
  smsConfig: {
    senderId: "MaxP",
    apiKey: "",
    apiSecret: "",
    accountSid: "",
    authToken: "",
    webhookUrl: "",
    environment: 2,
  },
  windowAlertThresholdMinutes: 60,
};

export const WindowPolicySettingsTab: React.FC = () => {
  const [config, setConfig] = useState<WindowPolicyConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testingSms, setTestingSms] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPolicy = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<{ success: boolean; policy: WindowPolicyConfig }>(
          "/whatsapp/settings/window-policy"
        );
        if (mounted && res.data?.policy) {
          setConfig(res.data.policy);
        }
      } catch (err: any) {
        console.error("Failed to load window policy settings:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchPolicy();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiClient.put<{ success: boolean; policy: WindowPolicyConfig }>(
        "/whatsapp/settings/window-policy",
        config
      );
      if (res.data?.success) {
        toast.success("تم حفظ إعدادات نافذة المراسلة وبوابة SMS بنجاح");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone.trim()) {
      toast.error("يرجى إدخال رقم الهاتف للتجربة");
      return;
    }

    try {
      setTestingSms(true);
      const res = await apiClient.post<{ success: boolean; message: string; result: any }>(
        "/whatsapp/settings/test-sms",
        {
          phone: testPhone,
          config: {
            ...config.smsConfig,
            provider: config.smsProvider,
          },
        }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "تم إرسال رسالة SMS التجريبية بنجاح");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "فشل إرسال رسالة SMS التجريبية");
    } finally {
      setTestingSms(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <RefreshCw className="size-6 animate-spin text-[color:var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. سياسة نافذة الـ 24 ساعة */}
      <WhatsAppSurfaceCard
        title="سياسة نافذة المراسلة (24-Hour Messaging Window)"
        description="تحديد طريقة معالجة وتوجيه الرسائل عند إرسالها داخل وخارج نافذة الـ 24 ساعة المعتمدة من Meta"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-[color:var(--color-foreground)]">
              سلوك المراسلة المعتمد خارج النافذة:
            </Label>
            <Select
              value={config.windowPolicy}
              onValueChange={(val: any) =>
                setConfig((prev) => ({ ...prev, windowPolicy: val }))
              }
            >
              <SelectTrigger className="w-full bg-[color:var(--color-card)] h-11 border-[color:var(--shell-control-border)]">
                <SelectValue placeholder="اختر السياسة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMART_FALLBACK">
                  تلقائي ذكي (نص حر داخل النافذة، قالب معتمد خارجها، تحويل لـ SMS عند التعذر)
                </SelectItem>
                <SelectItem value="TEMPLATE_ONLY">
                  قوالب معتمدة فقط (منع الإرسال بالـ SMS خارج النافذة)
                </SelectItem>
                <SelectItem value="SMS_DIRECT">
                  تحويل فوري إلى SMS دائماً عند انتهاء النافذة
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              {config.windowPolicy === "SMART_FALLBACK" &&
                "الوضع الافتراضي الأكثر موثوقية: يضمن وصول الرسالة للعميل حتى إذا لم يتوفر قالب معتمد للحدث."}
              {config.windowPolicy === "TEMPLATE_ONLY" &&
                "يرسل فقط عبر قوالب Meta الرسمية؛ إذا انتهت النافذة ولم يوجد قالب معتمد سيتوقف الإرسال."}
              {config.windowPolicy === "SMS_DIRECT" &&
                "يتخطى قوالب واتساب ويرسل رسالة SMS عادية فور انغلاق نافذة الـ 24 ساعة."}
            </p>
          </div>

          <div className="rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/30 p-3.5 flex items-start gap-3">
            <Clock className="size-5 shrink-0 text-amber-500 mt-0.5" />
            <div className="text-xs space-y-1 text-[color:var(--color-muted-foreground)]">
              <span className="font-semibold text-[color:var(--color-foreground)] block">
                كيف تعمل النافذة تلقائياً؟
              </span>
              <span>
                عندما يرسل العميل رسالة لرقمك، تبدأ نافذة 24 ساعة يتم خلالها إرسال النص الحر مجاناً بدون قيود. بعد مرور 24 ساعة، تمنع Meta النص الحر ويتم التحويل التلقائي للقوالب أو الـ SMS حسب اختيارك أعلاه.
              </span>
            </div>
          </div>
        </div>
      </WhatsAppSurfaceCard>

      {/* 2. إعدادات بوابة الـ SMS والـ Fallback */}
      <WhatsAppSurfaceCard
        title="بوابة الرسائل القصيرة (SMS Fallback Gateway)"
        description="تفعيل وإعداد بوابة SMS لإرسال الرسائل البديلة عند انغلاق نافذة الواتساب أو فشل التسليم"
      >
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[color:var(--shell-control-border)]/60 pb-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                تفعيل التحويل التلقائي لـ SMS (SMS Fallback)
              </Label>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                إرسال الرسالة كـ SMS في حال تعذر إرسالها عبر واتساب
              </p>
            </div>
            <Switch
              checked={config.smsFallbackEnabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, smsFallbackEnabled: checked }))
              }
            />
          </div>

          {config.smsFallbackEnabled && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">مزود خدمة الـ SMS</Label>
                  <Select
                    value={config.smsProvider}
                    onValueChange={(val: any) =>
                      setConfig((prev) => ({ ...prev, smsProvider: val }))
                    }
                  >
                    <SelectTrigger className="bg-[color:var(--color-card)] border-[color:var(--shell-control-border)]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMSMISR">SMS Misr (مصر)</SelectItem>
                      <SelectItem value="TWILIO">Twilio (دولي)</SelectItem>
                      <SelectItem value="TAQNYAT">Taqnyat (السعودية والخليج)</SelectItem>
                      <SelectItem value="GENERIC_WEBHOOK">Webhook مخصص (HTTP POST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">اسم الراسل المعتمد (Sender ID)</Label>
                  <Input
                    value={config.smsConfig.senderId}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smsConfig: { ...prev.smsConfig, senderId: e.target.value },
                      }))
                    }
                    placeholder="مثال: MaxP أو اسم متجرك"
                    className="bg-[color:var(--color-card)]"
                  />
                </div>
              </div>

              {/* حقول SMSMisr */}
              {config.smsProvider === "SMSMISR" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">اسم المستخدم (Username / API Key)</Label>
                    <Input
                      value={config.smsConfig.apiKey}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          smsConfig: { ...prev.smsConfig, apiKey: e.target.value },
                        }))
                      }
                      placeholder="Username"
                      className="bg-[color:var(--color-card)] font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">كلمة السر (Password / Secret)</Label>
                    <Input
                      type="password"
                      value={config.smsConfig.apiSecret}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          smsConfig: { ...prev.smsConfig, apiSecret: e.target.value },
                        }))
                      }
                      placeholder="••••••••"
                      className="bg-[color:var(--color-card)] font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* حقول Twilio */}
              {config.smsProvider === "TWILIO" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Account SID</Label>
                    <Input
                      value={config.smsConfig.accountSid}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          smsConfig: { ...prev.smsConfig, accountSid: e.target.value },
                        }))
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="bg-[color:var(--color-card)] font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Auth Token</Label>
                    <Input
                      type="password"
                      value={config.smsConfig.authToken}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          smsConfig: { ...prev.smsConfig, authToken: e.target.value },
                        }))
                      }
                      placeholder="••••••••"
                      className="bg-[color:var(--color-card)] font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* حقول Taqnyat */}
              {config.smsProvider === "TAQNYAT" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bearer Token</Label>
                  <Input
                    type="password"
                    value={config.smsConfig.apiKey}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smsConfig: { ...prev.smsConfig, apiKey: e.target.value },
                      }))
                    }
                    placeholder="Taqnyat Bearer Token"
                    className="bg-[color:var(--color-card)] font-mono text-xs"
                  />
                </div>
              )}

              {/* حقول Generic Webhook */}
              {config.smsProvider === "GENERIC_WEBHOOK" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Webhook URL</Label>
                  <Input
                    value={config.smsConfig.webhookUrl}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smsConfig: { ...prev.smsConfig, webhookUrl: e.target.value },
                      }))
                    }
                    placeholder="https://sms-provider.com/api/send"
                    className="bg-[color:var(--color-card)] font-mono text-xs"
                  />
                </div>
              )}

              {/* قسم اختبار الإرسال السريع */}
              <div className="mt-4 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4 space-y-3">
                <Label className="text-xs font-semibold text-[color:var(--color-foreground)] flex items-center gap-1.5">
                  <Smartphone className="size-4 text-[color:var(--color-primary)]" />
                  اختبار بوابة الـ SMS:
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="أدخل رقم هاتف لتجربة الإرسال (مثال: 01012345678)"
                    className="bg-[color:var(--color-card)] text-xs h-10"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestSms}
                    disabled={testingSms || !testPhone.trim()}
                    className="shrink-0 h-10 text-xs px-4"
                  >
                    {testingSms ? (
                      <RefreshCw className="size-3.5 animate-spin ms-1" />
                    ) : (
                      <Send className="size-3.5 ms-1" />
                    )}
                    إرسال تجريبي
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </WhatsAppSurfaceCard>

      {/* زر الحفظ الأساسي */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[color:var(--business-success)] px-6 text-white hover:brightness-90 font-medium"
        >
          {saving ? (
            <RefreshCw className="size-4 animate-spin ms-1.5" />
          ) : (
            <Save className="size-4 ms-1.5" />
          )}
          حفظ إعدادات النافذة والـ SMS
        </Button>
      </div>
    </div>
  );
};

export default WindowPolicySettingsTab;
