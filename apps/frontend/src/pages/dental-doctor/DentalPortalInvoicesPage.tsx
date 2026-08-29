import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";

import {
  formatCurrency,
  formatDate,
  getInvoices,
  type DentalInvoice,
} from "./shared";

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

const DentalPortalInvoicesPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const [invoices, setInvoices] = useState<DentalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvoices()
      .then((items) => {
        if (!cancelled) setInvoices(items);
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.invoices.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
        <p className="mt-3 text-sm">{t("dentalPortal.invoices.loading")}</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600">{error}</div>;
  }

  if (invoices.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <Receipt size={48} className="mx-auto mb-3 text-gray-300" />
        <p>{t("dentalPortal.invoices.noInvoices")}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.invoices.title")}
        </h1>
        <p className="mt-1 text-gray-500">
          {t("dentalPortal.invoices.subtitle")}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="px-4 py-3 font-medium">
                  {t("dentalPortal.invoices.invoiceNumber")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("dentalPortal.invoices.date")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("dentalPortal.invoices.total")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("dentalPortal.invoices.paid")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("dentalPortal.invoices.remaining")}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t("dentalPortal.invoices.status")}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const status = invoiceStatusVisual(inv.status, t);
                const isExpanded = expandedId === inv.id;
                const payments = inv.payments ?? [];
                return (
                  <React.Fragment key={inv.id}>
                    <tr
                      onClick={() =>
                        setExpandedId(isExpanded ? null : inv.id)
                      }
                      className="cursor-pointer border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-semibold text-indigo-700">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(inv.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-700">
                        {formatCurrency(inv.paid)}
                      </td>
                      <td className="px-4 py-3 font-medium text-red-700">
                        {formatCurrency(inv.remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {payments.length > 0 ? (
                          isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )
                        ) : null}
                      </td>
                    </tr>
                    {isExpanded && payments.length > 0 ? (
                      <tr className="border-b bg-gray-50/60 last:border-0">
                        <td colSpan={7} className="px-4 py-4">
                          <p className="mb-2 text-xs font-medium text-gray-500">
                            {t("dentalPortal.invoices.payments")}
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
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {invoices.some((inv) => (inv.payments?.length ?? 0) > 0) ? (
          <p className="border-t px-4 py-3 text-xs text-gray-400">
            {t("dentalPortal.invoices.clickToExpand")}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default DentalPortalInvoicesPage;