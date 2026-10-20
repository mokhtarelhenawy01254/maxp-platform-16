import React from "react";
import {
  BarChart as ReBarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartText } from "../../types/reportsTypes";

export interface ChartDataItem {
  name: string;
  stages: number;
  units: number;
  wages: number;
}

export interface TechnicianProductivityChartProps {
  data: ChartDataItem[];
}

export const TechnicianProductivityChart: React.FC<TechnicianProductivityChartProps> = ({
  data,
}) => {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        مقارنة إنتاجية مراحل ووحدات فريق العمل
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <ReBarChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: -18 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            opacity={0.08}
          />
          <XAxis
            dataKey="name"
            tick={chartText}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={chartText}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v, name) => [
              String(v),
              name === "stages"
                ? "المراحل"
                : name === "units"
                ? "الوحدات"
                : "الأجر (ج.م)",
            ]}
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
          />
          <Bar
            dataKey="stages"
            name="المراحل"
            fill="#3b82f6"
            radius={[6, 6, 0, 0]}
            barSize={20}
          />
          <Bar
            dataKey="units"
            name="الوحدات"
            fill="#a855f7"
            radius={[6, 6, 0, 0]}
            barSize={20}
          />
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TechnicianProductivityChart;
