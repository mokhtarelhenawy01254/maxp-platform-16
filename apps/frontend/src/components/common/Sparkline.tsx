import React, { useMemo } from "react";

export interface SparklineProps {
  /** Time-series values, oldest to newest. Must contain at least 2 points to render. */
  data: number[];
  /** Width of the SVG viewport. Default 80. */
  width?: number;
  /** Height of the SVG viewport. Default 24. */
  height?: number;
  /** Color tone for the line and fill. Maps to the design token names. */
  tone?: "primary" | "success" | "warning" | "destructive" | "info" | "muted";
  /** Show a soft gradient fill under the line. Default true. */
  filled?: boolean;
  /** Stroke width. Default 1.5. */
  strokeWidth?: number;
  /** Optional accessible label for the chart. */
  ariaLabel?: string;
}

const toneToStroke: Record<NonNullable<SparklineProps["tone"]>, string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
  info: "var(--color-info)",
  muted: "var(--color-muted-foreground)",
};

const toneToFill: Record<NonNullable<SparklineProps["tone"]>, string> = {
  primary: "var(--color-primary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  destructive: "var(--color-destructive)",
  info: "var(--color-info)",
  muted: "var(--color-muted-foreground)",
};

/**
 * Lightweight sparkline. No external chart library, no JS animation — just an
 * inline SVG. The gradient under the line uses the same color as the stroke
 * but at low opacity, via a server-side-safe opacity attribute (the parent
 * can override via CSS if it needs theming).
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 24,
  tone = "primary",
  filled = true,
  strokeWidth = 1.5,
  ariaLabel,
}) => {
  const path = useMemo(() => {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const stepX = width / (data.length - 1);

    const points = data.map((value, idx) => {
      const x = idx * stepX;
      const normalized = (value - min) / range;
      const y = height - normalized * (height - 2) - 1;
      return [x, y] as const;
    });

    const linePath = points
      .map(([x, y], idx) => (idx === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : `L ${x.toFixed(2)} ${y.toFixed(2)}`))
      .join(" ");

    const lastPoint = points[points.length - 1];
    const areaPath = `${linePath} L ${lastPoint[0].toFixed(2)} ${height} L 0 ${height} Z`;

    return { linePath, areaPath };
  }, [data, width, height]);

  if (!path) return null;

  const stroke = toneToStroke[tone];
  const fill = toneToFill[tone];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : "presentation"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className="overflow-visible"
    >
      {filled && (
        <path
          d={path.areaPath}
          fill={fill}
          fillOpacity={0.12}
          stroke="none"
        />
      )}
      <path
        d={path.linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Sparkline;
