import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  fetchTechnicianProductivity,
  type TechnicianProductivity,
} from "../../shared";
import {
  todayISO,
  monthStartISO,
  Skeleton,
  EmptyState,
} from "../types/reportsTypes";
import { TechnicianProductivityFilters } from "./technician-productivity/TechnicianProductivityFilters";
import { TechnicianProductivityKpiCards } from "./technician-productivity/TechnicianProductivityKpiCards";
import { TechnicianProductivityChart } from "./technician-productivity/TechnicianProductivityChart";
import { TechnicianProductivityTable } from "./technician-productivity/TechnicianProductivityTable";

export function TechnicianProductivityView() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<TechnicianProductivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchTechnicianProductivity({ from, to }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totalStages = useMemo(
    () => rows.reduce((s, r) => s + (r.completedStages ?? 0), 0),
    [rows]
  );
  const totalUnits = useMemo(
    () => rows.reduce((s, r) => s + (r.completedUnits ?? 0), 0),
    [rows]
  );
  const totalWages = useMemo(
    () => rows.reduce((s, r) => s + (r.earnedWages ?? 0), 0),
    [rows]
  );
  const totalRemakes = useMemo(
    () => rows.reduce((s, r) => s + (r.remakesCount ?? 0), 0),
    [rows]
  );

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.name || "—",
        stages: r.completedStages ?? 0,
        units: r.completedUnits ?? 0,
        wages: r.earnedWages ?? 0,
      })),
    [rows]
  );

  return (
    <div className="space-y-5">
      <TechnicianProductivityFilters
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        onRefresh={load}
      />

      <TechnicianProductivityKpiCards
        totalStages={totalStages}
        totalUnits={totalUnits}
        totalWages={totalWages}
        totalRemakes={totalRemakes}
      />

      {loading ? (
        <Skeleton />
      ) : rows.length === 0 ? (
        <EmptyState message={t("dentalLab.common.noData")} />
      ) : (
        <div className="space-y-5">
          <TechnicianProductivityChart data={chartData} />
          <TechnicianProductivityTable rows={rows} />
        </div>
      )}
    </div>
  );
}

export default TechnicianProductivityView;
