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
      <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono tabular-nums text-foreground space-y-1.5">
        <p className="font-semibold text-foreground font-sans text-xs">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5 font-sans">
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-foreground/90">{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-foreground tabular-nums">
              {entry.value?.toLocaleString()}
            </span>
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
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
        )}
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/50" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-sans" }}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/50" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-mono tabular-nums" }}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/50" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-mono tabular-nums" }}
            />
            <YAxis
              dataKey={xKey}
              type="category"
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border/50" }}
              tick={{ fill: "currentColor", className: "text-muted-foreground text-[11px] font-sans" }}
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
            radius={layout === 'horizontal' ? [6, 6, 0, 0] : [0, 6, 6, 0]}
          />
        ))}
      </RechartsBarChart>
    </DeferredResponsiveContainer>
  );
};

export default BarChart;
