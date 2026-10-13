import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  Search,
  X,
  ChevronLeft,
  Plus,
  ShoppingBag,
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredCases = useMemo(() => {
    if (!searchQuery.trim()) return cases;
    const q = searchQuery.toLowerCase().trim();
    return cases.filter(
      (c) =>
        c.caseNumber.toLowerCase().includes(q) ||
        (c.workTypeName && c.workTypeName.toLowerCase().includes(q)),
    );
  }, [cases, searchQuery]);

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs sm:text-sm">{t("dentalPortal.cases.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
        {error}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground space-y-3 p-8 rounded-xl bg-card border border-dashed border-border/80 max-w-lg mx-auto shadow-xs" dir="rtl">
        <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <p className="font-bold text-foreground text-base">
          {t("dentalPortal.cases.noCases")}
        </p>
        <p className="text-xs text-muted-foreground">{t("dentalPortal.cases.noCasesHint")}</p>
        <Link
          to="/dental-portal/catalog"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{t("dentalPortal.cases.goToStore")}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 text-foreground" dir="rtl">
      {/* Top Command Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <span>{t("dentalPortal.cases.title")}</span>
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/70 tabular-nums">
              {cases.length} حالات
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("dentalPortal.cases.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/dental-portal/new-order"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>طلب حالة جديدة</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الحالة أو نوع العمل..."
            className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-card border border-border/70 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          <span>المعروض: </span>
          <span className="font-bold text-foreground tabular-nums">{filteredCases.length}</span>
        </div>
      </div>

      {/* Cases Table */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-semibold">
                <th className="px-4 py-3">{t("dentalPortal.cases.caseNumber")}</th>
                <th className="px-4 py-3">{t("dentalPortal.cases.workType")}</th>
                <th className="px-4 py-3">{t("dentalPortal.cases.status")}</th>
                <th className="px-4 py-3">{t("dentalPortal.cases.priority")}</th>
                <th className="px-4 py-3">{t("dentalPortal.cases.dueDate")}</th>
                <th className="px-4 py-3">{t("dentalPortal.cases.remaining")}</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCases.map((c) => {
                const status = statusVisual(c.status);
                const priority = priorityVisual(c.priority);
                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition">
                    <td className="px-4 py-3 font-semibold text-primary font-mono tabular-nums">
                      {c.caseNumber}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {c.workTypeName}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${status.pill}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${priority.pill}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                      {formatDate(c.dueDate)}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground font-mono tabular-nums">
                      {formatCurrency(c.remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        to={`/dental-portal/cases/${encodeURIComponent(c.id)}`}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        <span>{t("dentalPortal.cases.details")}</span>
                        <ChevronLeft className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DentalPortalCasesPage;