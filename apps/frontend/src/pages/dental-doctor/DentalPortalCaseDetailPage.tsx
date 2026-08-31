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
        icon: <CheckCircle2 size={18} />,
        className: "text-green-600",
      };
    case "IN_PROGRESS":
    case "SKIPPED":
      return {
        label: t("dentalPortal.caseDetail.stageInProgress"),
        icon: <Loader2 size={18} className="animate-spin" />,
        className: "text-amber-600",
      };
    default:
      return {
        label: t("dentalPortal.caseDetail.stagePending"),
        icon: <Circle size={18} />,
        className: "text-gray-300",
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
      pill: "bg-green-100 text-green-800",
    };
  }
  if (s.includes("partial")) {
    return {
      label: t("dentalPortal.invoices.partialBadge"),
      pill: "bg-amber-100 text-amber-800",
    };
  }
  if (s.includes("unpaid") || s.includes("due") || s.includes("open")) {
    return {
      label: t("dentalPortal.invoices.unpaidBadge"),
      pill: "bg-red-100 text-red-800",
    };
  }
  return { label: status || "—", pill: "bg-gray-100 text-gray-700" };
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
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">
            {invoice.invoiceNumber}
          </p>
          <p className="text-xs text-gray-500">
            {formatDate(invoice.createdAt)}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
        >
          {status.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-500">
            {t("dentalPortal.caseDetail.total")}
          </p>
          <p className="font-semibold text-gray-800">
            {formatCurrency(invoice.total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">
            {t("dentalPortal.caseDetail.paid")}
          </p>
          <p className="font-semibold text-green-700">
            {formatCurrency(invoice.paid)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">
            {t("dentalPortal.caseDetail.remaining")}
          </p>
          <p className="font-semibold text-red-700">
            {formatCurrency(invoice.remaining)}
          </p>
        </div>
      </div>
      {payments.length > 0 ? (
        <div className="mt-3 border-t border-gray-200 pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">
            {t("dentalPortal.caseDetail.payments")}
          </p>
          <ul className="space-y-1.5 text-sm">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 text-gray-700"
              >
                <span>{p.method || "—"}</span>
                <span className="flex items-center gap-3">
                  <span className="font-medium">
                    {formatCurrency(p.amount)}
                  </span>
                  <span className="text-xs text-gray-400">
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

  // حمّل صور/ملفات الحالة كـ blob بالـ token (الـ <img> العادي ميقدرش يبعت Bearer)
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
          /* keep the raw url fallback */
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
      <div className="py-16 text-center text-gray-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <p className="mt-3 text-sm">{t("dentalPortal.caseDetail.loading")}</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-16 text-center">
        <p className="text-red-600">
          {error || t("dentalPortal.caseDetail.notFound")}
        </p>
        <Link
          to="/dental-portal/cases"
          className="mt-4 inline-flex items-center gap-2 font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ArrowRight size={16} />
          {t("dentalPortal.caseDetail.backToCases")}
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
    <div>
      <Link
        to="/dental-portal/cases"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
      >
        <ArrowRight size={16} />
        {t("dentalPortal.caseDetail.backToCases")}
      </Link>

      {pdfError ? (
        <DentalPortalToast
          message={pdfError}
          tone="error"
          autoHideMs={6000}
          onDismiss={() => setPdfError("")}
        />
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{c.caseNumber}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            {t("dentalPortal.caseDetail.workOrder")}
          </button>
          {detail.designReview && (
            <button
              onClick={openViewer}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Boxes size={16} />
              {t("dentalPortal.caseDetail.designReview")}
            </button>
          )}
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${status.pill}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">
          {t("dentalPortal.caseDetail.info")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {infoItems.map((item, i) => (
            <div key={i}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="mt-0.5 font-medium text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
        {c.notes ? (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            <p className="mb-0.5 text-xs text-gray-500">
              {t("dentalPortal.caseDetail.notes")}
            </p>
            {c.notes}
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">
          {t("dentalPortal.caseDetail.stages")}
        </h2>
        {detail.stages.length === 0 ? (
          <p className="text-sm text-gray-400">—</p>
        ) : (
          <ol className="space-y-3">
            {detail.stages.map((stage, i) => {
              const visual = stageVisual(stage.status, t);
              return (
                <li
                  key={stage.id ?? stage.stageKey ?? i}
                  className="flex items-start gap-3"
                >
                  <span className={`mt-0.5 shrink-0 ${visual.className}`}>
                    {visual.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{stage.name}</p>
                    <p className="text-xs text-gray-500">{visual.label}</p>
                  </div>
                  {stage.completedAt ? (
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(stage.completedAt)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">
            {t("dentalPortal.caseDetail.files")}
          </h2>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("dentalPortal.caseDetail.uploading")}
              </>
            ) : (
              <>
                <Upload size={16} />
                {t("dentalPortal.caseDetail.uploadFile")}
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
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {t("dentalPortal.caseDetail.uploadTotal")}
                {" · "}
                {uploadItems.filter((i) => i.status === "done").length}/
                {uploadItems.length}
              </span>
              <span>
                {Math.round(
                  uploadItems.reduce((s, i) => s + i.progress, 0) /
                    uploadItems.length,
                )}
                %
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{
                  width: `${Math.round(
                    uploadItems.reduce((s, i) => s + i.progress, 0) /
                      uploadItems.length,
                  )}%`,
                }}
              />
            </div>
            <ul className="space-y-1.5">
              {uploadItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate text-gray-600" title={item.name}>
                    {item.name}
                  </span>
                  <span className="flex items-center gap-2">
                    {item.status === "done" ? (
                      <CheckCircle2 size={14} className="text-green-500" />
                    ) : item.status === "error" ? (
                      <span className="text-red-500">{item.error}</span>
                    ) : (
                      <>
                        <span className="w-24 overflow-hidden rounded-full bg-gray-100">
                          <span
                            className="block h-1.5 rounded-full bg-indigo-500"
                            style={{ width: `${item.progress}%` }}
                          />
                        </span>
                        <span className="w-9 text-right text-gray-400">
                          {item.progress}%
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {detail.attachments.length === 0 ? (
          <p className="text-sm text-gray-400">
            {t("dentalPortal.caseDetail.noFiles")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {detail.attachments.map((a) => (
              <a
                key={a.id ?? a.storedName}
                href={fileUrls[a.storedName] || a.url}
                target="_blank"
                rel="noreferrer"
                className="group block"
                title={a.fileName}
              >
                {isImageAttachment(a) ? (
                  <img
                    src={fileUrls[a.storedName] || a.url}
                    alt={a.fileName}
                    loading="lazy"
                    className="h-24 w-full rounded-lg border border-gray-200 object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-24 w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
                    <FileText size={28} />
                  </div>
                )}
                <p className="mt-1 truncate text-xs text-gray-500">
                  {a.fileName}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">
          {t("dentalPortal.caseDetail.invoices")}
        </h2>
        {detail.invoices.length === 0 ? (
          <p className="text-sm text-gray-400">
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

      {c.dueDate && new Date(c.dueDate).getTime() > 0 ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <Clock size={14} />
          {t("dentalPortal.caseDetail.dueDate")}: {formatDate(c.dueDate)}
        </p>
      ) : null}

      {viewerOpen && detail.designReview ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95">
          <div className="flex items-center justify-between px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <Boxes size={16} />
              <span className="text-sm font-medium">{c.caseNumber} — {t("dentalPortal.caseDetail.designReview")}</span>
            </div>
            <button onClick={() => setViewerOpen(false)} className="rounded-lg bg-white/10 px-3 py-1 text-sm hover:bg-white/20">
              ✕
            </button>
          </div>
          {approvalMsg ? (
            <div className="mx-4 mt-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">{approvalMsg}</div>
          ) : null}
          {viewerLoading ? (
            <div className="flex flex-1 items-center justify-center bg-white text-gray-500">
              <Loader2 size={24} className="animate-spin" />
              <span className="ms-2 text-sm">{t("dentalPortal.caseDetail.loading")}</span>
            </div>
          ) : (
            <iframe
              src={viewerSrc}
              title={t("dentalPortal.caseDetail.designReview")}
              sandbox="allow-scripts allow-same-origin"
              className="flex-1 border-0 bg-white"
            />
          )}
          <div className="flex items-center justify-center gap-3 px-4 py-3">
            <button
              onClick={() => handleApproval(false)}
              disabled={approvalBusy}
              className="rounded-lg border border-amber-300 bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-500/30 disabled:opacity-50"
            >
              {t("dentalPortal.caseDetail.requestChanges")}
            </button>
            <button
              onClick={() => handleApproval(true)}
              disabled={approvalBusy}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {approvalBusy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} className="inline" />}
              {t("dentalPortal.caseDetail.approve")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DentalPortalCaseDetailPage;