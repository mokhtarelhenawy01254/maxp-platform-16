import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  Phone,
  Headphones,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function SuperAdminSupportSettings() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getAuthHeaders = () => {
    const token = tokenManager.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(buildApiUrl("super-admin/support-settings"), {
        headers: getAuthHeaders(),
      });
      if (res.data.success) {
        setPhone(res.data.data.phone || "");
      }
    } catch {
      toast.error("فشل في تحميل إعدادات الدعم الفني");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.put(
        buildApiUrl("super-admin/support-settings"),
        { phone },
        { headers: getAuthHeaders() },
      );
      if (res.data.success) {
        toast.success("تم حفظ وتحديث رقم الدعم الفني بنجاح");
      }
    } catch {
      toast.error("تعذر حفظ إعدادات الدعم الفني");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span>جاري استدعاء إعدادات الدعم الفني...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <Headphones className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                إعدادات الدعم الفني
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                قناة المنصة المركزية
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تحديد رقم واتساب المعتمد لتقديم المساعدة المباشرة لجميع تجار المنصة
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-8.5 px-3 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs active:scale-[0.98] transition-transform gap-1.5 self-end sm:self-auto"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          <span>حفظ الإعدادات</span>
        </Button>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">حالة القناة</span>
              <span className={`size-1.5 rounded-full ${phone ? "bg-emerald-500" : "bg-amber-500"}`} />
            </div>
            <div className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {phone ? "مفعلة وتعمل مباشرة" : "بانتظار إدخال الرقم"}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الرقم المسجل</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-lg font-bold tracking-tight text-foreground font-mono tabular-nums">
              {phone ? `+${phone}` : "غير مسجل"}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نطاق التغطية</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              كافة المتاجر ولوحات التحكم
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden p-4 sm:p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            رقم واتساب المعتمد للدعم الفني
          </label>
          <div className="relative max-w-md">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="2010XXXXXXXX"
              className="pr-9 pl-3 h-9 text-xs font-mono text-left"
              dir="ltr"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">
            يرجى إدخال كود الدولة متبوعاً بالرقم بدون علامة + أو أصفار دولية (مثال: 201012345678)
          </p>
        </div>

        {/* Informational Guidance Ribbon */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3.5 flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
          <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground block mb-0.5">آلية عمل رقم الدعم:</span>
            يظهر هذا الرقم كأيقونة دعم واتساب عائمة وتفاعلية في لوحات التحكم للمتاجر، مما يتيح للتجار ومدرائهم فتح محادثة فورية مع فريق دعم المنصة بضغطة زر واحدة.
          </div>
        </div>
      </div>
    </div>
  );
}
