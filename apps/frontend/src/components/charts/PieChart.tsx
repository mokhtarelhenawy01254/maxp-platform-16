import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import DeferredResponsiveContainer from '../ui/DeferredResponsiveContainer';

interface PieChartProps {
  data: {
    name: string;
    value: number;
  }[];
  colors: string[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="rounded-xl border border-border/80 bg-card/95 p-3 shadow-xl backdrop-blur-md text-xs font-mono tabular-nums text-foreground space-y-1">
        <div className="flex items-center gap-2 font-sans">
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.payload?.fill || entry.color }}
          />
          <span className="font-medium text-foreground">{entry.name}:</span>
          <span className="font-mono font-bold text-foreground tabular-nums">
            {entry.value?.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const PieChart: React.FC<PieChartProps> = ({
  data,
  colors,
  height = 300,
  showLegend = true,
  showLabels = true,
}) => {
  const renderLabel = (entry: any) => {
    if (!showLabels) return null;
    return `${entry.name}: ${entry.value.toLocaleString()}`;
  };

  return (
    <DeferredResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={showLabels}
          label={renderLabel}
          outerRadius={80}
          stroke="var(--color-card, #ffffff)"
          strokeWidth={2}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 8, fontSize: "12px" }}
            formatter={(value) => <span className="text-xs text-foreground font-medium">{value}</span>}
          />
        )}
      </RechartsPieChart>
    </DeferredResponsiveContainer>
  );
};

export default PieChart;
