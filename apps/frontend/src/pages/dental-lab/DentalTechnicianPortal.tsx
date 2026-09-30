import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { MyCase, MyWage, fetchMyCases, fetchMyWage } from "./shared";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";
import DentalTechHeader from "./technician/DentalTechHeader";
import DentalTechNav, { TechPortalSection } from "./technician/DentalTechNav";
import DentalTechBenchTab from "./technician/DentalTechBenchTab";
import DentalTechKioskTab from "./technician/DentalTechKioskTab";
import DentalTechWageTab from "./technician/DentalTechWageTab";
import DentalTechNotificationsTab from "./technician/DentalTechNotificationsTab";
import DentalTechReportsTab from "./technician/DentalTechReportsTab";

interface Props {
  initialSection?: string;
}

export default function DentalTechnicianPortal({ initialSection }: Props) {
  const { t } = useTranslation();

  const deriveSection = (sec?: string): TechPortalSection => {
    if (sec === "kiosk") return "kiosk";
    if (sec === "my-wage" || sec === "wage") return "wage";
    if (sec === "notifications") return "notifications";
    if (sec === "reports") return "reports";
    return "bench";
  };

  const [section, setSection] = useState<TechPortalSection>(() => deriveSection(initialSection));
  const [cases, setCases] = useState<MyCase[]>([]);
  const [wage, setWage] = useState<MyWage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSection) {
      setSection(deriveSection(initialSection));
    }
  }, [initialSection]);

  // Load Data safely
  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [casesRes, wageRes] = await Promise.all([
        fetchMyCases(),
        fetchMyWage(),
      ]);
      const rawCases =
        casesRes && Array.isArray((casesRes as any).items)
          ? (casesRes as any).items
          : Array.isArray(casesRes)
          ? (casesRes as any)
          : [];
      setCases(rawCases);
      setWage(wageRes || null);
    } catch (err) {
      console.error("Failed to load technician portal data:", err);
      setError(err instanceof Error ? err.message : "تعذر جلب بيانات المحطة");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const safeCases = useMemo(() => (Array.isArray(cases) ? cases : []), [cases]);

  const overdueCasesList = useMemo(() => {
    return safeCases.filter((c) => {
      if (!c.dueDate || c.isDeleted || ["DELIVERED", "CLOSED"].includes(c.status)) return false;
      return new Date(c.dueDate) < new Date();
    });
  }, [safeCases]);

  if (loading && safeCases.length === 0 && !wage) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs">جاري تهيئة محطة عمل الفني...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Dedicated Header & Single-Depth Direct KPIs */}
      <DentalTechHeader
        technicianName={wage?.technician?.name}
        technicianRole={wage?.technician?.role}
        cases={safeCases}
        overdueCases={overdueCasesList}
        wage={wage}
        loading={loading}
        onRefresh={() => load(false)}
        onOpenKiosk={() => setSection("kiosk")}
        onSelectOverdue={() => setSection("bench")}
      />

      {/* 2. Floating / Pill-Style Sub-Navigation */}
      <DentalTechNav
        currentSection={section}
        onSelectSection={setSection}
        activeCasesCount={safeCases.length}
        overdueCasesCount={overdueCasesList.length}
      />

      {/* Error alert if any */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* 3. Isolated Domain Tabs (Each wrapped with its own ErrorBoundary) */}
      <main>
        {section === "bench" && (
          <TabErrorBoundary tabLabel="طاولة العمل والحالات">
            <DentalTechBenchTab
              cases={safeCases}
              onReload={() => load(true)}
            />
          </TabErrorBoundary>
        )}

        {section === "kiosk" && (
          <TabErrorBoundary tabLabel="ماسح الباركود السريع">
            <DentalTechKioskTab
              onSuccessScan={() => load(true)}
              onBackToBench={() => setSection("bench")}
            />
          </TabErrorBoundary>
        )}

        {section === "wage" && (
          <TabErrorBoundary tabLabel="مستحقاتي وسجل الصرف">
            <DentalTechWageTab wage={wage} />
          </TabErrorBoundary>
        )}

        {section === "notifications" && (
          <TabErrorBoundary tabLabel="إشعاراتي وتنبيهات العمل">
            <DentalTechNotificationsTab
              cases={safeCases}
              overdueCases={overdueCasesList}
              wage={wage}
              onSelectCaseOnBench={(caseNumber) => {
                setSection("bench");
              }}
            />
          </TabErrorBoundary>
        )}

        {section === "reports" && (
          <TabErrorBoundary tabLabel="تقرير الإنتاجية والأداء">
            <DentalTechReportsTab
              wage={wage}
              overdueCases={overdueCasesList}
            />
          </TabErrorBoundary>
        )}
      </main>
    </div>
  );
}
