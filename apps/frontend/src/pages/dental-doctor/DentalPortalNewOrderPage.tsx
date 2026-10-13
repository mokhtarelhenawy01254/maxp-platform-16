import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  PackageSearch,
  ShoppingBag,
  ShoppingCart,
  Send,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

import {
  addToCart,
  formatCurrency,
  getCatalog,
  MATERIAL_OPTIONS,
  placeOrder,
  SHADE_OPTIONS,
  type DentalOrderResult,
  type DentalWorkType,
} from "./shared";
import DentalPortalToast from "./DentalPortalToast";
import OdontogramChart from "../dental-lab/OdontogramChart";

interface CartNotice {
  message: string;
  to?: string;
  actionLabel?: string;
}

const DentalPortalNewOrderPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const [searchParams] = useSearchParams();

  const [workTypes, setWorkTypes] = useState<DentalWorkType[]>([]);
  const [workTypeId, setWorkTypeId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [teeth, setTeeth] = useState("");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [unitsCount, setUnitsCount] = useState<number>(1);
  const [shade, setShade] = useState("");
  const [material, setMaterial] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DentalOrderResult | null>(null);
  const [notice, setNotice] = useState<CartNotice | null>(null);

  useEffect(() => {
    let cancelled = false;
    const paramId = searchParams.get("workTypeId");
    getCatalog()
      .then((items) => {
        if (cancelled) return;
        setWorkTypes(items);
        if (paramId && items.some((w) => w.id === paramId)) {
          setWorkTypeId(paramId);
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.newOrder.errorSubmit"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, t]);

  const selectedWorkType = useMemo(
    () => workTypes.find((w) => w.id === workTypeId),
    [workTypes, workTypeId],
  );

  const handleAddToCart = () => {
    if (!selectedWorkType) return;
    addToCart({
      workTypeId: selectedWorkType.id,
      workTypeName: selectedWorkType.name,
      price: selectedWorkType.price,
      unitsCount: Math.max(1, Number(unitsCount) || 1),
      leadTimeDays: selectedWorkType.leadTimeDays,
      teeth: teeth.trim() || undefined,
      shade: shade || undefined,
      material: material || undefined,
    });
    setNotice({
      message: t("dentalPortal.cart.added"),
      to: "/dental-portal/cart",
      actionLabel: t("dentalPortal.cart.toCart"),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workTypeId) {
      setError(t("dentalPortal.newOrder.errorRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await placeOrder({
        workTypeId,
        unitsCount: Math.max(1, Number(unitsCount) || 1),
        teeth: teeth.trim() || undefined,
        shade: shade || undefined,
        material: material || undefined,
        patientName: patientName.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setResult(created);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("dentalPortal.newOrder.errorSubmit"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const caseHref = result.id
      ? `/dental-portal/cases/${encodeURIComponent(result.id)}`
      : "/dental-portal/cases";
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center shadow-xs">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={32} />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 font-mono text-xs text-muted-foreground">
            <span>طلب مسجل ومؤكد</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            {t("dentalPortal.newOrder.successTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("dentalPortal.newOrder.successMessage")}{" "}
            <span className="font-mono font-semibold text-primary">
              {result.caseNumber}
            </span>
          </p>
          <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("dentalPortal.newOrder.total")}</span>
              <span className="font-mono text-lg font-bold tabular-nums text-foreground">
                {formatCurrency(result.total)}
              </span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              to={caseHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.98]"
            >
              <span>{t("dentalPortal.newOrder.viewCase")}</span>
              <ArrowRight size={15} className="rtl:rotate-180" />
            </Link>
            <Link
              to="/dental-portal/catalog"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
            >
              <PackageSearch size={15} />
              <span>{t("dentalPortal.newOrder.newOrderAgain")}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>بوابة الأطباء</span>
            <span>/</span>
            <span className="text-foreground">طلب عمل جديد</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {t("dentalPortal.newOrder.title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("dentalPortal.newOrder.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/dental-portal/catalog"
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <ShoppingBag size={14} />
            <span>تصفح الكتالوج</span>
          </Link>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-400"
        >
          <Info size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {notice ? (
        <DentalPortalToast
          message={notice.message}
          to={notice.to}
          actionLabel={notice.actionLabel}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-border/70 bg-card">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>جاري تحميل قائمة التركيبات والخدمات...</span>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          {/* Main Form Inputs */}
          <div className="space-y-5 lg:col-span-2">
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">بيانات الحالة والتركيبة</h2>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">حقول إلزامية (*)</span>
              </div>

              {/* Work Type Selection */}
              <div>
                <label
                  htmlFor="dp-worktype"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {t("dentalPortal.newOrder.workType")} *
                </label>
                <select
                  id="dp-worktype"
                  value={workTypeId}
                  onChange={(e) => {
                    setWorkTypeId(e.target.value);
                    if (error) setError("");
                  }}
                  className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">
                    {t("dentalPortal.newOrder.selectWorkType")}
                  </option>
                  {workTypes.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} — {formatCurrency(w.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Info */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dp-patient-name"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    {t("dentalPortal.newOrder.patientName")}
                  </label>
                  <input
                    id="dp-patient-name"
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder={t("dentalPortal.newOrder.patientNamePlaceholder")}
                  />
                </div>
                <div>
                  <label
                    htmlFor="dp-patient-phone"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    {t("dentalPortal.newOrder.patientPhone")}
                  </label>
                  <input
                    id="dp-patient-phone"
                    type="tel"
                    dir="ltr"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-right font-mono text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder={t("dentalPortal.newOrder.patientPhonePlaceholder")}
                  />
                </div>
              </div>

              {/* Interactive Odontogram */}
              <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    {t("dentalPortal.newOrder.teeth")} (مخطط الأسنان التفاعلي)
                  </label>
                  {selectedTeeth.length > 0 && (
                    <span className="font-mono text-xs text-primary font-semibold">
                      {selectedTeeth.length} سن محدد
                    </span>
                  )}
                </div>
                <OdontogramChart
                  selectedTeeth={selectedTeeth}
                  onChange={(arr) => {
                    setSelectedTeeth(arr);
                    setTeeth(arr.join(", "));
                    if (arr.length > 0) setUnitsCount(arr.length);
                  }}
                />
              </div>

              {/* Technical Specifications */}
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="dp-units-count"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    عدد الوحدات (Units) *
                  </label>
                  <input
                    id="dp-units-count"
                    type="number"
                    min={1}
                    value={unitsCount}
                    onChange={(e) =>
                      setUnitsCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 font-mono text-sm tabular-nums text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="dp-shade"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    {t("dentalPortal.newOrder.shade")}
                  </label>
                  <select
                    id="dp-shade"
                    value={shade}
                    onChange={(e) => setShade(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">
                      {t("dentalPortal.newOrder.selectShade")}
                    </option>
                    {SHADE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="dp-material"
                    className="mb-1.5 block text-xs font-medium text-muted-foreground"
                  >
                    {t("dentalPortal.newOrder.material")}
                  </label>
                  <select
                    id="dp-material"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">
                      {t("dentalPortal.newOrder.selectMaterial")}
                    </option>
                    {MATERIAL_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor Clinical Notes */}
              <div className="mt-4">
                <label
                  htmlFor="dp-notes"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {t("dentalPortal.newOrder.notes")}
                </label>
                <textarea
                  id="dp-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder={t("dentalPortal.newOrder.notesPlaceholder")}
                />
              </div>
            </div>
          </div>

          {/* Side Summary & Action Panel */}
          <div>
            <div className="sticky top-6 rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {t("dentalPortal.newOrder.summary")}
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground">ملخص التكلفة</span>
              </div>

              {selectedWorkType ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{selectedWorkType.name}</span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                        {formatCurrency(selectedWorkType.price)}
                      </span>
                    </div>

                    {unitsCount > 1 ? (
                      <div className="flex items-center justify-between font-mono text-xs text-primary">
                        <span>العدد: {unitsCount} وحدة</span>
                        <span className="tabular-nums">
                          {unitsCount} × {formatCurrency(selectedWorkType.price)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={13} />
                      <span>
                        مدة التنفيذ: {selectedWorkType.leadTimeDays}{" "}
                        {t("dentalPortal.catalog.days")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("dentalPortal.newOrder.total")}
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums text-primary">
                      {formatCurrency(selectedWorkType.price * unitsCount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                  <PackageSearch size={22} className="mx-auto mb-2 opacity-50" />
                  <p>{t("dentalPortal.newOrder.selectWorkType")}</p>
                </div>
              )}

              <div className="mt-5 space-y-2">
                <button
                  type="submit"
                  disabled={submitting || !workTypeId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>
                    {submitting
                      ? t("dentalPortal.newOrder.submitting")
                      : t("dentalPortal.newOrder.submit")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!workTypeId}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/15 active:scale-[0.98] disabled:opacity-50"
                >
                  <ShoppingCart size={15} />
                  <span>{t("dentalPortal.newOrder.addToCart")}</span>
                </button>

                <Link
                  to="/dental-portal/catalog"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border/70 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
                >
                  <ShoppingBag size={15} />
                  <span>{t("dentalPortal.newOrder.backToStore")}</span>
                </Link>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default DentalPortalNewOrderPage;