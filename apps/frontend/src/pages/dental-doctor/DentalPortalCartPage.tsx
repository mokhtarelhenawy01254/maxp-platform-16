import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  clearCart,
  formatCurrency,
  getCart,
  MATERIAL_OPTIONS,
  placeOrder,
  removeFromCart,
  saveCart,
  SHADE_OPTIONS,
  type CartLine,
  type DentalOrderResult,
} from "./shared";
import DentalPortalToast from "./DentalPortalToast";

interface CartNotice {
  message: string;
  to?: string;
  actionLabel?: string;
}

const DentalPortalCartPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;

  const [lines, setLines] = useState<CartLine[]>(() => getCart());
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<CartNotice | null>(null);
  const [result, setResult] = useState<DentalOrderResult | null>(null);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + (Number(line.price) || 0) * (Math.max(1, Number(line.unitsCount) || 1)),
        0,
      ),
    [lines],
  );
  const estimatedDays = useMemo(
    () =>
      lines.reduce(
        (max, line) => Math.max(max, Number(line.leadTimeDays) || 0),
        0,
      ),
    [lines],
  );

  const updateLine = (index: number, patch: Partial<CartLine>) => {
    const next = lines.map((line, i) =>
      i === index ? { ...line, ...patch } : line,
    );
    setLines(next);
    saveCart(next);
  };

  const handleRemove = (workTypeId: string) => {
    removeFromCart(workTypeId);
    setLines(getCart());
    setNotice({ message: t("dentalPortal.cart.removed") });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError(t("dentalPortal.cart.errorRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await placeOrder({
        items: lines.map((l) => ({
          ...l,
          unitsCount: Math.max(1, Number(l.unitsCount) || 1),
        })),
        patientName: patientName.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setResult(created);
      clearCart();
      setLines([]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("dentalPortal.cart.errorSubmit"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const createdList = result.created ?? [];
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <CheckCircle2 size={64} className="mx-auto mb-4 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.cart.orderSuccess")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("dentalPortal.cart.orderPlaced")}
        </p>

        {createdList.length > 0 ? (
          <ul className="mx-auto mt-6 max-w-sm space-y-2">
            {createdList.map((item, i) => (
              <li
                key={item.id ?? i}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
              >
                <span className="text-gray-600">
                  {item.workTypeName || t("dentalPortal.cart.title")}
                </span>
                {item.id ? (
                  <Link
                    to={`/dental-portal/cases/${encodeURIComponent(item.id)}`}
                    className="font-semibold text-indigo-700 hover:underline"
                  >
                    {item.caseNumber}
                  </Link>
                ) : (
                  <span className="font-semibold text-gray-900">
                    {item.caseNumber}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-6 text-gray-600">
          {t("dentalPortal.newOrder.total")}:{" "}
          <span className="font-bold text-indigo-700">
            {formatCurrency(result.totalAll ?? 0)}
          </span>
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/dental-portal/cases"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {t("dentalPortal.cart.viewMyCases")}
          </Link>
          <Link
            to="/dental-portal/catalog"
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {t("dentalPortal.newOrder.backToStore")}
          </Link>
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <ShoppingCart size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-semibold text-gray-700">
          {t("dentalPortal.cart.empty")}
        </p>
        <p className="mt-1 text-sm">{t("dentalPortal.cart.emptyHint")}</p>
        <Link
          to="/dental-portal/catalog"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          <ShoppingBag size={16} />
          {t("dentalPortal.cases.goToStore")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("dentalPortal.cart.title")}
          </h1>
          <p className="mt-1 text-gray-500">
            {t("dentalPortal.cart.subtitle")}
          </p>
        </div>
        <Link
          to="/dental-portal/catalog"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <ShoppingBag size={16} />
          {t("dentalPortal.newOrder.backToStore")}
        </Link>
      </div>

      {notice ? (
        <DentalPortalToast
          message={notice.message}
          to={notice.to}
          actionLabel={notice.actionLabel}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-2 font-semibold text-gray-900">
              {t("dentalPortal.cart.items")}
            </h2>
            {lines.map((line, index) => (
              <div
                key={`${line.workTypeId}-${index}`}
                className="border-b border-gray-100 py-4 first:pt-2 last:border-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {line.workTypeName}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatCurrency(line.price)} / وحدة
                      {(line.unitsCount && line.unitsCount > 1) ? (
                        <span className="font-semibold text-indigo-700 mx-1">
                          (الإجمالي: {formatCurrency(line.price * line.unitsCount)})
                        </span>
                      ) : null}
                      {line.leadTimeDays
                        ? ` — ${line.leadTimeDays} ${t(
                            "dentalPortal.catalog.days",
                          )}`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(line.workTypeId)}
                    className="flex shrink-0 items-center gap-1 rounded-md p-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                    {t("dentalPortal.cart.remove")}
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      عدد الوحدات
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={line.unitsCount ?? 1}
                      onChange={(e) =>
                        updateLine(index, {
                          unitsCount: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      {t("dentalPortal.cart.teeth")}
                    </label>
                    <input
                      type="text"
                      value={line.teeth ?? ""}
                      onChange={(e) => updateLine(index, { teeth: e.target.value })}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      placeholder={t("dentalPortal.newOrder.teethPlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      {t("dentalPortal.cart.shade")}
                    </label>
                    <select
                      value={line.shade ?? ""}
                      onChange={(e) => updateLine(index, { shade: e.target.value })}
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                      {t("dentalPortal.cart.material")}
                    </label>
                    <select
                      value={line.material ?? ""}
                      onChange={(e) =>
                        updateLine(index, { material: e.target.value })
                      }
                      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
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
            ))}
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-900">
              {t("dentalPortal.cart.patientInfo")}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="dp-cart-patient"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  {t("dentalPortal.cart.patientName")} *
                </label>
                <input
                  id="dp-cart-patient"
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label
                  htmlFor="dp-cart-phone"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  {t("dentalPortal.cart.patientPhone")}
                </label>
                <input
                  id="dp-cart-phone"
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
            </div>
            <div className="mt-4">
              <label
                htmlFor="dp-cart-notes"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                {t("dentalPortal.cart.notes")}
              </label>
              <textarea
                id="dp-cart-notes"
                rows={3}
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
            <div className="space-y-2 text-sm text-gray-600">
              {lines.map((line, index) => (
                <div
                  key={`${line.workTypeId}-${index}`}
                  className="flex items-start justify-between gap-2"
                >
                  <span>{line.workTypeName}</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(line.price)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t pt-2 text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock size={15} />
                  {t("dentalPortal.cart.estimatedTime")}
                </span>
                <span>
                  {estimatedDays} {t("dentalPortal.catalog.days")}
                </span>
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-semibold text-gray-900">
                  {t("dentalPortal.cart.total")}
                </span>
                <span className="text-lg font-bold text-indigo-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || lines.length === 0}
              className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting
                ? t("dentalPortal.cart.submitting")
                : t("dentalPortal.cart.submit")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DentalPortalCartPage;