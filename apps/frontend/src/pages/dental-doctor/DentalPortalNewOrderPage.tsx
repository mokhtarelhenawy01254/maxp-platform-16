import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  PackageSearch,
  ShoppingBag,
  ShoppingCart,
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
      <div className="mx-auto max-w-lg py-10 text-center">
        <CheckCircle2 size={64} className="mx-auto mb-4 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.newOrder.successTitle")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("dentalPortal.newOrder.successMessage")}{" "}
          <span className="font-bold text-indigo-700">
            {result.caseNumber}
          </span>
        </p>
        <p className="mt-1 text-gray-600">
          {t("dentalPortal.newOrder.total")}:{" "}
          <span className="font-semibold">
            {formatCurrency(result.total)}
          </span>
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to={caseHref}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {t("dentalPortal.newOrder.viewCase")}
          </Link>
          <Link
            to="/dental-portal/catalog"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("dentalPortal.newOrder.newOrderAgain")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.newOrder.title")}
        </h1>
        <p className="mt-1 text-gray-500">
          {t("dentalPortal.newOrder.subtitle")}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
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
        <div className="py-16 text-center text-gray-500">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <label
                htmlFor="dp-worktype"
                className="mb-1.5 block text-sm font-medium text-gray-700"
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
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="dp-patient-name"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    {t("dentalPortal.newOrder.patientName")}
                  </label>
                  <input
                    id="dp-patient-name"
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder={t(
                      "dentalPortal.newOrder.patientNamePlaceholder",
                    )}
                  />
                </div>
                <div>
                  <label
                    htmlFor="dp-patient-phone"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    {t("dentalPortal.newOrder.patientPhone")}
                  </label>
                  <input
                    id="dp-patient-phone"
                    type="tel"
                    dir="ltr"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-right text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    placeholder={t(
                      "dentalPortal.newOrder.patientPhonePlaceholder",
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t("dentalPortal.newOrder.teeth")} (تحديد الأسنان بالخريطة التفاعلية)
                  </label>
                  <OdontogramChart
                    selectedTeeth={selectedTeeth}
                    onChange={(arr) => {
                      setSelectedTeeth(arr);
                      setTeeth(arr.join(", "));
                      if (arr.length > 0) setUnitsCount(arr.length);
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="dp-units-count"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
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
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="dp-shade"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("dentalPortal.newOrder.shade")}
                    </label>
                    <select
                      id="dp-shade"
                      value={shade}
                      onChange={(e) => setShade(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      {t("dentalPortal.newOrder.material")}
                    </label>
                    <select
                      id="dp-material"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
              </div>

              <div className="mt-4">
                <label
                  htmlFor="dp-notes"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  {t("dentalPortal.newOrder.notes")}
                </label>
                <textarea
                  id="dp-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder={t("dentalPortal.newOrder.notesPlaceholder")}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="rounded-xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-900">
                {t("dentalPortal.newOrder.summary")}
              </h2>
              {selectedWorkType ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start justify-between gap-2">
                    <span>{selectedWorkType.name}</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(selectedWorkType.price)}
                    </span>
                  </div>
                  {unitsCount > 1 ? (
                    <div className="flex items-center justify-between text-xs font-medium text-indigo-700">
                      <span>العدد: {unitsCount} وحدة</span>
                      <span>{unitsCount} × {formatCurrency(selectedWorkType.price)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock size={16} />
                    <span>
                      {selectedWorkType.leadTimeDays}{" "}
                      {t("dentalPortal.catalog.days")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="font-semibold">
                      {t("dentalPortal.newOrder.total")}
                    </span>
                    <span className="text-lg font-bold text-indigo-700">
                      {formatCurrency(selectedWorkType.price * unitsCount)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-gray-400">
                  <PackageSearch size={18} />
                  {t("dentalPortal.newOrder.selectWorkType")}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !workTypeId}
                className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting
                  ? t("dentalPortal.newOrder.submitting")
                  : t("dentalPortal.newOrder.submit")}
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!workTypeId}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
              >
                <ShoppingCart size={16} />
                {t("dentalPortal.newOrder.addToCart")}
              </button>
              <Link
                to="/dental-portal/catalog"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ShoppingBag size={16} />
                {t("dentalPortal.newOrder.backToStore")}
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default DentalPortalNewOrderPage;