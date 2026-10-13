import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Circle,
  Clock,
  FileDown,
  FileText,
  Loader2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Check,
  X,
} from "lucide-react";

import {
  fetchAttachmentBlobPortal,
  fetchDesignReviewBlob,
  fetchWorkOrderPdfPortal,
  formatCurrency,
  formatDate,
  getCase,
  inferAttachmentKind,
  statusVisual,
  submitDesignApproval,
  uploadCaseFilesPortal,
  type DentalCaseAttachment,
  type DentalCaseDetail,
  type DentalInvoice,
} from "./shared";
import DentalPortalToast from "./DentalPortalToast";

function isImageAttachment(a: DentalCaseAttachment): boolean {
  const name = (a.fileName || "").toLowerCase();
  const kind = (a.kind || "").toLowerCase();
  return (
    /\.(png|jpe?g|gif|webp|bmp|svg|tiff?)$/.test(name) ||
    /image|photo|scan/.test(kind)
  );
}

function stageVisual(
  status: string,
  t: (key: string) => string,
): { label: string; icon: React.ReactNode; className: string } {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "DONE":
    case "COMPLETED":
      return {
        label: t("dentalPortal.caseDetail.stageDone"),
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        className: "text-emerald-600 dark:text-emerald-400",
      };
    case "IN_PROGRESS":
    case "SKIPPED":
      return {
        label: t("dentalPortal.caseDetail.stageInProgress"),
        icon: <Loader2 className="w-4 h-4 animate-spin text-amber-500" />,
        className: "text-amber-500",
      };
    default:
      return {
        label: t("dentalPortal.caseDetail.stagePending"),
        icon: <Circle className="w-4 h-4 text-muted-foreground/40" />,
        className: "text-muted-foreground/60",
      };
  }
}

function invoiceStatusVisual(
  status: string,
  t: (key: string) => string,
): { label: string; pill: string } {
  const s = (status || "").toLowerCase();
  if (s.includes("paid") && !s.includes("unpaid")) {
    return {
      label: t("dentalPortal.invoices.paidBadge"),
      pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (s.includes("partial")) {
    return {
      label: t("dentalPortal.invoices.partialBadge"),
      pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (s.includes("unpaid") || s.includes("due") || s.includes("open")) {
    return {
      label: t("dentalPortal.invoices.unpaidBadge"),
      pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    };
  }
  return { label: status || "—", pill: "bg-muted text-muted-foreground border-border/70" };
}

function InvoiceBlock({
  invoice,
  t,
}: {
  invoice: DentalInvoice;
  t: (key: string) => string;
}) {
  const status = invoiceStatusVisual(invoice.status, t);
  const payments = invoice.payments ?? [];
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div>
          <p className="font-bold text-foreground text-sm font-mono tabular-nums">
            {invoice.invoiceNumber}
          </p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {formatDate(invoice.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${status.pill}`}
        >
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-muted/30 border border-border/60">
          <p className="text-[10px] text-muted-foreground">
            {t("dentalPortal.caseDetail.total")}
          </p>
          <p className="font-bold text-foreground font-mono tabular-nums mt-0.5">
            {formatCurrency(invoice.total)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
            {t("dentalPortal.caseDetail.paid")}
          </p>
          <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
            {formatCurrency(invoice.paid)}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
          <p className="text-[10px] text-rose-600 dark:text-rose-400">
            {t("dentalPortal.caseDetail.remaining")}
          </p>
          <p className="font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums mt-0.5">
            {formatCurrency(invoice.remaining)}
          </p>
        </div>
      </div>
      {payments.length > 0 ? (
        <div className="border-t border-border/60 pt-2.5">
          <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
            {t("dentalPortal.caseDetail.payments")}
          </p>
          <ul className="space-y-1 text-xs">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground bg-muted/20 p-2 rounded-lg"
              >
                <span className="font-medium text-foreground">{p.method || "—"}</span>
                <span className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="font-bold text-foreground">
                    {formatCurrency(p.amount)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(p.paidAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const DentalPortalCaseDetailPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DentalCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadItems, setUploadItems] = useState<
    { id: string; name: string; status: "pending" | "uploading" | "done" | "error"; progress: number; error?: string }[]
  >([]);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState("");
  const [viewerLoading, setViewerLoading] = useState(false);
  const [approvalBusy, setApprovalBusy] = useState(false);
  const [approvalMsg, setApprovalMsg] = useState("");

  const openViewer = async () => {
    if (!detail?.designReview) return;
    setViewerOpen(true);
    setViewerLoading(true);
    setApprovalMsg("");
    try {
      const blob = await fetchDesignReviewBlob(detail.designReview);
      setViewerSrc(URL.createObjectURL(blob));
    } catch (err) {
      setApprovalMsg(err instanceof Error ? err.message : t("dentalPortal.caseDetail.workOrderError"));
    } finally {
      setViewerLoading(false);
    }
  };

  const loadCase = useCallback(async () => {
    if (!id) return;
    try {
      const result = await getCase(id);
      setDetail(result);
      setError("");
    } catch {
      setError(t("dentalPortal.caseDetail.error"));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (!detail || !Array.isArray(detail.attachments) || detail.attachments.length === 0) return;
    let cancelled = false;
    const urls: Record<string, string> = {};
    Promise.all(
      detail.attachments.map(async (a) => {
        if (!a?.storedName) return;
        try {
          const blob = await fetchAttachmentBlobPortal(a.storedName);
          if (!cancelled) {
            urls[a.storedName] = URL.createObjectURL(blob);
            setFileUrls((prev) => ({ ...prev, ...urls }));
          }
        } catch {
          /* fallback */
        }
      }),
    );
    return () => {
      cancelled = true;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [detail]);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      setError(t("dentalPortal.caseDetail.notFound"));
      return;
    }
    getCase(id)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.caseDetail.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0 || !id) return;
    setUploading(true);
    setError("");
    const items = files.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      status: "pending" as const,
      progress: 0,
    }));
    setUploadItems(items);
    const updateItem = (idx: number, patch: Partial<(typeof items)[number]>) => {
      setUploadItems((prev) =>
        prev.map((it, j) => (j === idx ? { ...it, ...patch } : it)),
      );
    };
    const kinds = files.map((f) => inferAttachmentKind(f.name));
    try {
      await uploadCaseFilesPortal(id, files, kinds, (idx, pct) =>
        updateItem(idx, { progress: pct, status: "uploading" }),
      );
      setUploadItems((prev) =>
        prev.map((it) => ({ ...it, status: "done" as const, progress: 100 })),
      );
      await loadCase();
    } catch (err) {
      setUploadItems((prev) =>
        prev.map((it) => ({
          ...it,
          status: "error" as const,
          error:
            err instanceof Error
              ? err.message
              : t("dentalPortal.caseDetail.uploadError"),
        })),
      );
      setError(
        err instanceof Error ? err.message : t("dentalPortal.caseDetail.uploadError"),
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    setDownloading(true);
    setPdfError("");
    try {
      const blob = await fetchWorkOrderPdfPortal(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? err.message
          : t("dentalPortal.caseDetail.workOrderError"),
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    if (!id || approvalBusy) return;
    setApprovalBusy(true);
    setApprovalMsg("");
    try {
      const note = approved
        ? ""
        : window.prompt(t("dentalPortal.caseDetail.changesPrompt") || "اكتب ملاحظات التعديل المطلوبة") || "";
      await submitDesignApproval(id, approved, note || undefined);
      setApprovalMsg(
        approved
          ? t("dentalPortal.caseDetail.approved")
          : t("dentalPortal.caseDetail.changesSent"),
      );
      setViewerOpen(false);
    } catch (err) {
      setApprovalMsg(
        err instanceof Error
          ? err.message
          : t("dentalPortal.caseDetail.approvalError"),
      );
    } finally {
      setApprovalBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs sm:text-sm">{t("dentalPortal.caseDetail.loading")}</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-16 text-center space-y-3 p-8 rounded-xl bg-card border border-border/70 max-w-md mx-auto shadow-xs" dir="rtl">
        <p className="text-sm text-destructive font-medium">
          {error || t("dentalPortal.caseDetail.notFound")}
        </p>
        <Link
          to="/dental-portal/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>{t("dentalPortal.caseDetail.backToCases")}</span>
        </Link>
      </div>
    );
  }

  const c = detail.case;
  const status = statusVisual(c.status);

  const infoItems: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: t("dentalPortal.caseDetail.patientName"),
      value: c.patientName || "—",
    },
    { label: t("dentalPortal.caseDetail.teeth"), value: c.teeth || "—" },
    { label: t("dentalPortal.caseDetail.shade"), value: c.shade || "—" },
    { label: t("dentalPortal.caseDetail.material"), value: c.material || "—" },
    {
      label: t("dentalPortal.caseDetail.dueDate"),
      value: formatDate(c.dueDate),
    },
    {
      label: t("dentalPortal.caseDetail.total"),
      value: formatCurrency(c.total),
    },
    { label: t("dentalPortal.caseDetail.paid"), value: formatCurrency(c.paid) },
    {
      label: t("dentalPortal.caseDetail.remaining"),
      value: formatCurrency(c.remaining),
    },
  ];

  return (
    <div className="w-full space-y-6 text-foreground" dir="rtl">
      <div>
        <Link
          to="/dental-portal/cases"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>{t("dentalPortal.caseDetail.backToCases")}</span>
        </Link>

        {pdfError ? (
          <DentalPortalToast
            message={pdfError}
            tone="error"
            autoHideMs={6000}
            onDismiss={() => setPdfError("")}
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {c.caseNumber}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${status.pill}`}
            >
              {status.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-secondary hover:bg-secondary/80 px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{t("dentalPortal.caseDetail.workOrder")}</span>
            </button>

            {detail.designReview && (
              <button
                onClick={openViewer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-all active:scale-[0.98]"
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>{t("dentalPortal.caseDetail.designReview")}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Case Info Grid */}
      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <h2 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t("dentalPortal.caseDetail.info")}
        </h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {infoItems.map((item, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="mt-0.5 font-bold text-foreground text-xs sm:text-sm font-mono tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {c.notes ? (
          <div className="mt-3.5 rounded-lg bg-muted/30 border border-border/60 p-3 text-xs text-foreground leading-relaxed">
            <p className="mb-1 text-[10px] font-semibold text-muted-foreground">
              {t("dentalPortal.caseDetail.notes")}
            </p>
            {c.notes}
          </div>
        ) : null}
      </section>

      {/* Production Stages Timeline */}
      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <h2 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t("dentalPortal.caseDetail.stages")}
        </h2>
        {detail.stages.length === 0 ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <ol className="space-y-2.5 divide-y divide-border/60">
            {detail.stages.map((stage, i) => {
              const visual = stageVisual(stage.status, t);
              return (
                <li
                  key={stage.id ?? stage.stageKey ?? i}
                  className={`flex items-center justify-between gap-3 ${i > 0 ? "pt-2.5" : ""}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{visual.icon}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-xs sm:text-sm">{stage.name}</p>
                      <p className="text-[10px] text-muted-foreground">{visual.label}</p>
                    </div>
                  </div>
                  {stage.completedAt ? (
                    <span className="shrink-0 text-[11px] text-muted-foreground font-mono tabular-nums">
                      {formatDate(stage.completedAt)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Case Files & Upload */}
      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("dentalPortal.caseDetail.files")}
          </h2>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 disabled:opacity-50 active:scale-[0.98]">
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("dentalPortal.caseDetail.uploading")}</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>{t("dentalPortal.caseDetail.uploadFile")}</span>
              </>
            )}
            <input
              type="file"
              multiple
              className="hidden"
              accept="image/*,.pdf,.stl,.ply,.obj,.dcm,.zip,.json"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>

        {uploadItems.length > 0 && (
          <div className="mb-4 space-y-2 p-3 rounded-lg bg-muted/30 border border-border/60">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>
                {t("dentalPortal.caseDetail.uploadTotal")}
                {" · "}
                {uploadItems.filter((i) => i.status === "done").length}/
                {uploadItems.length}
              </span>
              <span className="tabular-nums">
                {Math.round(
                  uploadItems.reduce((s, i) => s + i.progress, 0) /
                    uploadItems.length,
                )}
                %
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${Math.round(
                    uploadItems.reduce((s, i) => s + i.progress, 0) /
                      uploadItems.length,
                  )}%`,
                }}
              />
            </div>
            <ul className="space-y-1">
              {uploadItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-foreground text-[11px]" title={item.name}>
                    {item.name}
                  </span>
                  <span className="flex items-center gap-2">
                    {item.status === "done" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : item.status === "error" ? (
                      <span className="text-rose-500 text-[10px]">{item.error}</span>
                    ) : (
                      <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                        {item.progress}%
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("dentalPortal.caseDetail.noFiles")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
            {detail.attachments.map((a) => (
              <a
                key={a.id ?? a.storedName}
                href={fileUrls[a.storedName] || a.url}
                target="_blank"
                rel="noreferrer"
                className="group block p-1.5 rounded-lg bg-muted/20 border border-border/60 hover:border-primary/40 transition-colors"
                title={a.fileName}
              >
                {isImageAttachment(a) ? (
                  <img
                    src={fileUrls[a.storedName] || a.url}
                    alt={a.fileName}
                    loading="lazy"
                    className="h-20 w-full rounded-md object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-md bg-muted/40 text-muted-foreground">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <p className="mt-1 truncate text-[10px] text-muted-foreground group-hover:text-foreground">
                  {a.fileName}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Case Invoices */}
      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <h2 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {t("dentalPortal.caseDetail.invoices")}
        </h2>
        {detail.invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("dentalPortal.caseDetail.noInvoices")}
          </p>
        ) : (
          <div className="space-y-3">
            {detail.invoices.map((inv) => (
              <InvoiceBlock key={inv.id} invoice={inv} t={t} />
            ))}
          </div>
        )}
      </section>

      {/* 3D Design Review Modal */}
      {viewerOpen && detail.designReview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-xs">
          <div className="flex items-center justify-between px-4 py-2 text-white border-b border-white/10">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold font-mono">
                {c.caseNumber} — {t("dentalPortal.caseDetail.designReview")}
              </span>
            </div>
            <button
              onClick={() => setViewerOpen(false)}
              className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20 transition"
            >
              ✕
            </button>
          </div>
          {approvalMsg ? (
            <div className="mx-4 mt-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200">
              {approvalMsg}
            </div>
          ) : null}
          {viewerLoading ? (
            <div className="flex flex-1 items-center justify-center text-white/70">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ms-2 text-xs">{t("dentalPortal.caseDetail.loading")}</span>
            </div>
          ) : (
            <iframe
              src={viewerSrc}
              title={t("dentalPortal.caseDetail.designReview")}
              sandbox="allow-scripts allow-same-origin"
              className="flex-1 border-0 bg-background"
            />
          )}
          <div className="flex items-center justify-center gap-2.5 px-4 py-2.5 border-t border-white/10 bg-black/60">
            <button
              onClick={() => handleApproval(false)}
              disabled={approvalBusy}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 transition"
            >
              {t("dentalPortal.caseDetail.requestChanges")}
            </button>
            <button
              onClick={() => handleApproval(true)}
              disabled={approvalBusy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-xs"
            >
              {approvalBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{t("dentalPortal.caseDetail.approve")}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DentalPortalCaseDetailPage;