import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  LinkIcon,
  LinkSlashIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EventRow } from "./types";

interface Occasion {
  id: string;
  name: string;
  message: string;
  templateId?: string | null;
  templateName?: string | null;
  scheduledAt: string;
  status: string;
}

interface LinkTarget {
  templateId: string;
  templateName: string;
  eventCode: string;
  eventName: string;
}

const OCCASION_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  scheduled: "مجدولة",
  sent: "مرسلة",
  cancelled: "ملغاة",
};

const OCCASION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  scheduled: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  sent: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const META_STATUS_BADGE: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DISABLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const formatOccasionDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })} • ${d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}`;
};

/**
 * تبويب «مناسبات العملاء» داخل صفحة الإشعارات — يعرض حالات القوالب (حالات القوالب)
 * ويربط أي قالب مخصص بمناسبة مباشرةً (ربط حي: أي تعديل على القالب ينعكس على المناسبة).
 * الإدارة الكاملة للمناسبات تفضل في صفحة «مناسباتي» المستقلة.
 */
export default function OccasionTemplateLinkTab({ statuses }: { statuses: EventRow[] }) {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [occasionsLoading, setOccasionsLoading] = useState(true);
  const [linkTarget, setLinkTarget] = useState<LinkTarget | null>(null);
  const [selectedOccasionId, setSelectedOccasionId] = useState<string>("__none__");
  const [saving, setSaving] = useState(false);
  const [savingTarget, setSavingTarget] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const loadOccasions = useCallback(async () => {
    setOccasionsLoading(true);
    try {
      const res = await apiClient.get("/customers/whatsapp-notify/occasions");
      setOccasions(res.data?.data || []);
    } catch {
      setOccasions([]);
    } finally {
      setOccasionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOccasions();
  }, [loadOccasions]);

  // القوالب القابلة للربط = القوالب المخصصة (ليها id حقيقي في قاعدة البيانات)
  const linkableRows = useMemo(
    () =>
      statuses.filter(
        (row) => row.template && row.template.id && row.template.id !== "" && row.template.content,
      ),
    [statuses],
  );

  // templateId → المناسبة المرتبطة بيه (لو فيه قالب مرتبط بأكتر من مناسبة يبان أكتر من مرة)
  const occasionByTemplate = useMemo(() => {
    const map = new Map<string, Occasion[]>();
    occasions.forEach((occ) => {
      if (occ.templateId) {
        const arr = map.get(occ.templateId) || [];
        arr.push(occ);
        map.set(occ.templateId, arr);
      }
    });
    return map;
  }, [occasions]);

  const openLinkDialog = (row: EventRow) => {
    const template = row.template!;
    const linked = occasionByTemplate.get(template.id);
    setLinkTarget({
      templateId: template.id,
      templateName: template.name || "قالب",
      eventCode: row.code,
      eventName: row.name,
    });
    setSelectedOccasionId(linked?.[0]?.id ?? "__none__");
  };

  const closeLinkDialog = () => {
    if (saving) return;
    setLinkTarget(null);
    setSelectedOccasionId("__none__");
  };

  const saveLink = async () => {
    if (!linkTarget) return;
    setSaving(true);
    try {
      // ربط القالب بالمناسبة = تحديث templateId للمناسبة المختارة
      if (selectedOccasionId === "__none__") {
        // فك الربط — مش بنعرف المناسبة المرتبطة لأن فيه احتمال أكتر من واحدة؛ نفك من كل واحدة
        const linkedOccs = occasionByTemplate.get(linkTarget.templateId) || [];
        for (const occ of linkedOccs) {
          await apiClient.put(`/customers/whatsapp-notify/occasions/${occ.id}`, { templateId: null });
        }
        toast.success("تم فك ربط القالب من المناسبات");
      } else {
        await apiClient.put(`/customers/whatsapp-notify/occasions/${selectedOccasionId}`, {
          templateId: linkTarget.templateId,
        });
        toast.success("تم ربط القالب بالمناسبة — أي تعديل على القالب ينعكس عليها مباشرةً");
      }
      await loadOccasions();
      setLinkTarget(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل ربط القالب بالمناسبة");
    } finally {
      setSaving(false);
    }
  };

  const unlinkRow = async (row: EventRow) => {
    const template = row.template!;
    const linkedOccs = occasionByTemplate.get(template.id) || [];
    if (linkedOccs.length === 0) return;
    setUnlinkingId(template.id);
    try {
      for (const occ of linkedOccs) {
        await apiClient.put(`/customers/whatsapp-notify/occasions/${occ.id}`, { templateId: null });
      }
      toast.success("تم فك ربط القالب من المناسبات");
      await loadOccasions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل فك ربط القالب");
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <CalendarDaysIcon className="h-5 w-5 text-indigo-500" />
              ربط القوالب بالمناسبات
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              حالات القوالب بالأسفل — اختر أي قالب مخصص واربطه بمناسبة مباشرةً. أي تعديل على نص القالب في هذه
              الصفحة ينعكس تلقائياً على المناسبات المرتبطة.
            </p>
          </div>
          <Link
            to="/customers/occasions-notify"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            إدارة المناسبات الكاملة
          </Link>
        </div>
      </div>

      {/* Rows */}
      {linkableRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <ExclamationTriangleIcon className="mx-auto mb-2 h-8 w-8 text-amber-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            لا توجد قوالب مخصصة قابلة للربط حالياً
          </p>
          <p className="mt-1 text-xs text-slate-500">
            أنشئ قالب رسالة مخصص من تبويب «الرسائل» أولاً، ثم عد هنا لربطه بمناسبة.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {linkableRows.map((row) => {
            const template = row.template!;
            const linked = occasionByTemplate.get(template.id) || [];
            const metaStatus = String(template.metaTemplateStatus || "").toUpperCase();
            return (
              <div
                key={row.code}
                data-testid={`occasion-link-row-${row.code}`}
                className="group rounded-lg border border-slate-200/70 bg-white p-3.5 transition hover:shadow-sm dark:border-white/10 dark:bg-slate-900/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                      style={{ backgroundColor: row.color || "#6B7280" }}
                    >
                      {row.sortOrder}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {row.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400" dir="ltr">{row.code}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs">
                        <span className="truncate text-slate-600 dark:text-slate-300">{template.name}</span>
                        {metaStatus && metaStatus !== "ACTIVE" && (
                          <Badge className={META_STATUS_BADGE[metaStatus] || "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}>
                            {metaStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {linked.length > 0 ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          <CheckCircleIcon className="h-3.5 w-3.5" />
                          مرتبطة بـ {linked.map((o) => o.name).join("، ")}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openLinkDialog(row)}
                          className="h-8 text-xs"
                        >
                          <LinkIcon className="ml-1 h-3.5 w-3.5" />
                          تغيير
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unlinkRow(row)}
                          disabled={unlinkingId === template.id}
                          className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400"
                        >
                          <LinkSlashIcon className="ml-1 h-3.5 w-3.5" />
                          فك الربط
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLinkDialog(row)}
                        className="h-8 border-indigo-200 bg-indigo-50 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                      >
                        <LinkIcon className="ml-1 h-3.5 w-3.5" />
                        ربط بمناسبة
                      </Button>
                    )}
                  </div>
                </div>

                <p className="mt-2 truncate rounded-md bg-slate-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  {template.content}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Link dialog */}
      <Dialog open={!!linkTarget} onOpenChange={(open) => !open && closeLinkDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ربط قالب بمناسبة</DialogTitle>
            <DialogDescription>
              ربط «{linkTarget?.templateName}» ({linkTarget?.eventName}) بمناسبة — ستُرسل المناسبة بنص هذا القالب،
              وأي تعديل على القالب ينعكس عليها مباشرةً.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {occasionsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                جاري تحميل المناسبات...
              </div>
            ) : occasions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
                <p className="text-xs text-slate-500">لا توجد مناسبات بعد — أنشئ مناسبة أولاً.</p>
                <DialogClose asChild>
                  <Link
                    to="/customers/occasions-notify"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    الذهاب إلى «مناسباتي»
                  </Link>
                </DialogClose>
              </div>
            ) : (
              <>
                <label
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                    selectedOccasionId === "__none__"
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="occasion-link"
                    checked={selectedOccasionId === "__none__"}
                    onChange={() => setSelectedOccasionId("__none__")}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-red-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">فك الربط (بدون قالب)</p>
                    <p className="text-[11px] text-slate-500">المناسبة ترجع لرسالتها اليدوية المحفوظة</p>
                  </div>
                </label>
                {occasions.map((occ) => {
                  const isLinkedToAnother = occ.templateId && occ.templateId !== linkTarget?.templateId;
                  return (
                    <label
                      key={occ.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition ${
                        selectedOccasionId === occ.id
                          ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/30"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="occasion-link"
                        checked={selectedOccasionId === occ.id}
                        onChange={() => setSelectedOccasionId(occ.id)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {occ.name}
                          {isLinkedToAnother && (
                            <span className="mr-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                              (مرتبطة بقالب آخر)
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">{formatOccasionDate(occ.scheduledAt)}</p>
                      </div>
                      <Badge className={OCCASION_STATUS_COLORS[occ.status] || "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}>
                        {OCCASION_STATUS_LABELS[occ.status] || occ.status}
                      </Badge>
                    </label>
                  );
                })}
              </>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={saving}>
                إلغاء
              </Button>
            </DialogClose>
            <Button
              onClick={saveLink}
              disabled={saving || occasionsLoading || occasions.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving ? (
                <>
                  <ArrowPathIcon className="ml-1 h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                "حفظ الربط"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
