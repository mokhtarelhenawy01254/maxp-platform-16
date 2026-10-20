import React, { useRef, useState } from "react";
import { RefreshCw, Upload, Clock, Radio } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

/**
 * مؤشر مصدر أرقام العميل + سحب الإنفاق الحقيقي من ميتا.
 * - يعرض «آخر سحب من ميتا» ومصدر الأرقام الحالي (ميتا / CSV / يدوي)
 *   عشان محدش يخلط بين الأرقام اليدوية وأرقام ميتا الفعلية.
 * - زر السحب يستدعي POST /agency/clients/:id/sync-meta (بيانات حقيقية من Meta API).
 * - زر CSV بديل احتياطي للـCSV (Date, Campaign Name, Amount Spent, Purchases).
 */

export type AgencyDataSource = "META" | "CSV" | "MANUAL";

interface AgencyMetaSyncControlProps {
  clientId: string;
  adAccountId?: string;
  dataSource?: AgencyDataSource | string;
  lastSyncedAt?: string;
  onSynced?: () => void | Promise<void>;
}

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  META: { label: "أرقام ميتا", className: "bg-blue-500/10 text-blue-600 border-blue-300" },
  CSV: { label: "ملف CSV من ميتا", className: "bg-violet-500/10 text-violet-600 border-violet-300" },
  MANUAL: { label: "إدخال يدوي", className: "bg-amber-500/10 text-amber-600 border-amber-300" },
};

function formatSyncTime(value?: string) {
  if (!value) return "لم يتم السحب بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "لم يتم السحب بعد";
  try {
    return date.toLocaleString("ar-EG", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toISOString().slice(0, 16).replace("T", " ");
  }
}

export default function AgencyMetaSyncControl({
  clientId,
  adAccountId,
  dataSource,
  lastSyncedAt,
  onSynced,
}: AgencyMetaSyncControlProps) {
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sourceMeta = SOURCE_LABELS[String(dataSource || "").toUpperCase()] || SOURCE_LABELS.MANUAL;
  const isLinked = Boolean(String(adAccountId || "").trim());

  const handleSync = async () => {
    if (!isLinked) {
      toast.error("العميل مش مربوط بحساب إعلاني. ضيف adAccountId من تعديل العميل الأول.");
      return;
    }
    try {
      setSyncing(true);
      const res = await apiClient.post<any>(`/agency/clients/${clientId}/sync-meta`, {}, { _skipErrorToast: true } as any);
      const summary = res.data?.data?.summary || {};
      if (Number(summary.synced) === 0) {
        toast.info(res.data?.message || "ميتا لم ترجع بيانات لهذه الفترة.");
      } else {
        toast.success(
          `تم سحب ${summary.synced} يوم من ميتا — إنفاق ${Number(summary.spend || 0).toLocaleString()} وأوردرات ${Number(summary.orders || 0).toLocaleString()}`
        );
      }
      if (onSynced) await onSynced();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل سحب البيانات من ميتا");
    } finally {
      setSyncing(false);
    }
  };

  const handleCsvChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post<any>(`/agency/clients/${clientId}/import-csv`, formData, {
        _skipErrorToast: true,
      } as any);
      const rejected = Number(res.data?.data?.rejectedRows || 0);
      if (rejected > 0) {
        toast.warning(res.data?.message || `تم الاستيراد مع رفض ${rejected} صف`);
      } else {
        toast.success(res.data?.message || "تم استيراد ملف ميتا بنجاح");
      }
      if (onSynced) await onSynced();
    } catch (err: any) {
      const data = err.response?.data;
      const rejectedSamples = data?.data?.rejectedSamples || [];
      const firstReason = rejectedSamples[0]?.reason ? ` — ${rejectedSamples[0].reason}` : "";
      toast.error((data?.message || "فشل استيراد ملف CSV") + firstReason);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/50 bg-background/80 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3" />
          آخر سحب من ميتا: {formatSyncTime(lastSyncedAt)}
        </span>
        <Badge variant="outline" className={`text-[9px] font-bold shrink-0 ${sourceMeta.className}`}>
          <Radio className="size-2.5 ml-1" />
          {sourceMeta.label}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 text-[11px] font-bold bg-background hover:bg-primary/10 border-primary/20 text-primary"
          onClick={handleSync}
          disabled={syncing || !isLinked}
          title={isLinked ? "سحب الإنفاق الفعلي من Meta Ads" : "أضف معرف الحساب الإعلاني أولاً"}
        >
          <RefreshCw className={`size-3.5 ml-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "جاري السحب..." : "سحب من ميتا"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="استيراد تقرير ميتا CSV (Date, Campaign Name, Amount Spent, Purchases)"
        >
          <Upload className="size-3.5 ml-1" />
          {uploading ? "..." : "CSV"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleCsvChange}
        />
      </div>

      {!isLinked && (
        <p className="text-[9px] text-amber-600 font-bold leading-relaxed">
          اربط حساب ميتا الإعلاني (act_...) بالعميل عشان السحب يشتغل بدل الإدخال اليدوي.
        </p>
      )}
    </div>
  );
}
