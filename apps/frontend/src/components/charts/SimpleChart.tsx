import React from "react";

interface SimpleChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  title: string;
  type?: "bar" | "line" | "donut";
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  title,
  type = "bar",
}) => {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  if (type === "donut") {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-none text-foreground">
        <h3 className="text-sm font-bold text-foreground tracking-tight mb-4 pb-3 border-b border-border/60">
          {title}
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative size-44">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                className="text-muted/30"
                strokeWidth="8"
              />
              {data.map((item, index) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                const strokeDasharray = `${percentage * 2.51} ${251 - percentage * 2.51}`;
                const strokeDashoffset = -cumulativePercentage * 2.51;
                cumulativePercentage += percentage;

                return (
                  <circle
                    key={index}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-0.5">
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  {total.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground font-medium">المجموع</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-foreground">
                  {item.label}
                </span>
              </div>
              <div className="text-end font-mono tabular-nums">
                <span className="font-semibold text-foreground">
                  {item.value.toLocaleString()}
                </span>
                <span className="text-[11px] text-muted-foreground ms-1">
                  ({total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "line") {
    const points = data
      .map((item, index) => {
        const x = data.length > 1 ? (index / (data.length - 1)) * 300 : 150;
        const y = 150 - (item.value / maxValue) * 120;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-none text-foreground">
        <h3 className="text-sm font-bold text-foreground tracking-tight mb-4 pb-3 border-b border-border/60">
          {title}
        </h3>
        <div className="relative">
          <svg className="w-full h-36" viewBox="0 0 300 150">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={i}
                x1="0"
                y1={30 + i * 30}
                x2="300"
                y2={30 + i * 30}
                stroke="currentColor"
                className="text-border/30"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            ))}

            {/* Line */}
            <polyline
              points={points}
              fill="none"
              stroke="var(--color-primary, #6366f1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {data.map((item, index) => {
              const x = data.length > 1 ? (index / (data.length - 1)) * 300 : 150;
              const y = 150 - (item.value / maxValue) * 120;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill={item.color || "var(--color-primary, #6366f1)"}
                  stroke="var(--color-card, #ffffff)"
                  strokeWidth="1.5"
                  className="hover:r-5 transition-all duration-150"
                />
              );
            })}
          </svg>
        </div>
        <div className="flex justify-between mt-3 text-[11px] text-muted-foreground font-mono">
          {data.map((item, index) => (
            <span key={index}>{item.label}</span>
          ))}
        </div>
      </div>
    );
  }

  // Default bar chart
  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-none text-foreground">
      <h3 className="text-sm font-bold text-foreground tracking-tight mb-4 pb-3 border-b border-border/60">
        {title}
      </h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">
                {item.label}
              </span>
              <span className="font-semibold text-foreground font-mono tabular-nums">
                {item.value.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleChart;
