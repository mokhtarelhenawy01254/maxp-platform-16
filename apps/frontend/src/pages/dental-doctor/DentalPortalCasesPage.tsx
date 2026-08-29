import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";

import {
  formatCurrency,
  formatDate,
  getCases,
  priorityVisual,
  statusVisual,
  type DentalPortalCase,
} from "./shared";

const DentalPortalCasesPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const [cases, setCases] = useState<DentalPortalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCases()
      .then((items) => {
        if (!cancelled) setCases(items);
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.cases.error"));
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
        <p className="mt-3 text-sm">{t("dentalPortal.cases.loading")}</p>
      </div>
    );
  }

  if (error) {
    return <div className="py-16 text-center text-red-600">{error}</div>;
  }

  if (cases.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        <ClipboardList size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-gray-700">
          {t("dentalPortal.cases.noCases")}
        </p>
        <p className="mt-1 text-sm">{t("dentalPortal.cases.noCasesHint")}</p>
        <Link
          to="/dental-portal/catalog"
          className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          {t("dentalPortal.cases.goToStore")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dentalPortal.cases.title")}
        </h1>
        <p className="mt-1 text-gray-500">
          {t("dentalPortal.cases.subtitle")}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-right text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="px-4 py-3 font-medium">
                {t("dentalPortal.cases.caseNumber")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("dentalPortal.cases.workType")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("dentalPortal.cases.status")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("dentalPortal.cases.priority")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("dentalPortal.cases.dueDate")}
              </th>
              <th className="px-4 py-3 font-medium">
                {t("dentalPortal.cases.remaining")}
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const status = statusVisual(c.status);
              const priority = priorityVisual(c.priority);
              return (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-semibold text-indigo-700">
                    {c.caseNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    {c.workTypeName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.pill}`}
                    >
                      {priority.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(c.dueDate)}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {formatCurrency(c.remaining)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/dental-portal/cases/${encodeURIComponent(c.id)}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {t("dentalPortal.cases.details")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DentalPortalCasesPage;