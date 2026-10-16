import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import DeferredResponsiveContainer from '../ui/DeferredResponsiveContainer';

interface BarChartProps {
  data: any[];
  xKey: string;
  bars: {
    key: string;
    name: string;
    color: string;
  }[];
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  layout?: 'horizontal' | 'vertical';
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/70 rounded-lg p-2.5 shadow-xl text-xs font-mono tabular-nums text-foreground space-y-1">
        <p className="font-semibold text-foreground font-sans">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5 font-sans">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-bold text-foreground">{entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  bars,
  height = 300,
  showLegend = true,
  showGrid = true,
  layout = 'horizontal',
}) => {
  return (
    <DeferredResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
      >
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
        )}
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/60" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-mono" }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/60" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-mono tabular-nums" }}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/60" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-mono tabular-nums" }}
            />
            <YAxis
              dataKey={xKey}
              type="category"
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/60" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-mono" }}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: "12px" }}
            formatter={(value) => <span className="text-xs text-foreground font-medium">{value}</span>}
          />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            fill={bar.color}
            name={bar.name}
            radius={layout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]}
          />
        ))}
      </RechartsBarChart>
    </DeferredResponsiveContainer>
  );
};

export default BarChart;
