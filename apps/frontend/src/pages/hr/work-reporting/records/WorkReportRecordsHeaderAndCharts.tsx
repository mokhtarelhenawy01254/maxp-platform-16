import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Download,
  Filter,
  Table2,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WorkReportRecordsResponse } from "../types";
import { formatMetricValue } from "../utils";
import { DateInput } from '../../../../components/ui/DateInput';

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
}> = ({ label, value, icon: Icon, tone }) => (
  <div className={`rounded-2xl border p-5 shadow-sm ${tone}`}>
    <div className="mb-2 flex items-center justify-between text-sm opacity-80">
      <span>{label}</span>
      <Icon className="h-4 w-4" />
    </div>
    <div className="text-3xl font-semibold font-mono tabular-nums">{value}</div>
  </div>
);

interface WorkReportRecordsHeaderAndChartsProps {
  payload: WorkReportRecordsResponse;
  startDate: string;
  onStartDateChange: (val: string) => void;
  endDate: string;
  onEndDateChange: (val: string) => void;
  selectedUserId: string;
  onSelectedUserIdChange: (val: string) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  chartData: any[];
  employeeChartData: any[];
  primaryMetric?: any;
  secondaryMetric?: any;
}

export const WorkReportRecordsHeaderAndCharts: React.FC<
  WorkReportRecordsHeaderAndChartsProps
> = ({
  payload,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedUserId,
  onSelectedUserIdChange,
  onRefresh,
  onExportCsv,
  chartData,
  employeeChartData,
  primaryMetric,
  secondaryMetric,
}) => {
  return (
    <>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Link
            to="/hr/reporting/forms"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            العودة لفورمات التقارير
          </Link>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              السجلات والتحليل
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {payload.form.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              راقب السجلات المرسلة، قارن بين الموظفين، وراجع المؤشرات الرئيسية
              للفترة المحددة.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExportCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700"
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </button>
          <Link
            to={`/hr/reporting/forms/${payload.form.id}/preview`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <BarChart3 className="h-4 w-4" />
            معاينة الفورم
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            من تاريخ
          </span>
          <DateInput
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 font-mono tabular-nums"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <CalendarDays className="h-4 w-4" />
            إلى تاريخ
          </span>
          <DateInput
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500 font-mono tabular-nums"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Users className="h-4 w-4" />
            الموظف
          </span>
          <select
            value={selectedUserId}
            onChange={(event) => onSelectedUserIdChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-slate-500"
          >
            <option value="">كل الموظفين</option>
            {payload.analytics.employeeBreakdown.map((row) => (
              <option key={row.userId} value={row.userId}>
                {row.userDisplayName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
          >
            <Filter className="h-4 w-4" />
            تحديث النتائج
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="إجمالي السجلات"
          value={payload.analytics.summary.totalSubmissions}
          icon={Table2}
          tone="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50"
        />
        <StatCard
          label="عدد الموظفين"
          value={payload.analytics.summary.uniqueEmployees}
          icon={Users}
          tone="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
        />
        {payload.analytics.metricCards.slice(0, 2).map((metric) => (
          <StatCard
            key={metric.key}
            label={metric.label}
            value={
              metric.dataType === "PERCENT"
                ? formatMetricValue(metric.average, metric.dataType)
                : formatMetricValue(metric.total, metric.dataType)
            }
            icon={BarChart3}
            tone="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
          />
        ))}
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">اتجاه الأداء عبر الأيام</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              عدد السجلات ومعه المؤشرات الرقمية الأولى في الفورم.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.2)"
                />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  name="عدد السجلات"
                  stroke="#0f172a"
                  strokeWidth={2.4}
                />
                {primaryMetric ? (
                  <Line
                    type="monotone"
                    dataKey={primaryMetric.key}
                    name={primaryMetric.label}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                ) : null}
                {secondaryMetric ? (
                  <Line
                    type="monotone"
                    dataKey={secondaryMetric.key}
                    name={secondaryMetric.label}
                    stroke="#0f766e"
                    strokeWidth={2}
                  />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">مقارنة بين الموظفين</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              يعرض عدد السجلات مع أول مؤشر رقمي في الفورم لكل موظف.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.2)"
                />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="submissions"
                  name="السجلات"
                  fill="#334155"
                  radius={[6, 6, 0, 0]}
                />
                {primaryMetric ? (
                  <Bar
                    dataKey="metric"
                    name={primaryMetric.label}
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </>
  );
};
