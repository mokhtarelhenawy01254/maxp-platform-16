import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  stroke = "var(--color-primary)",
  strokeWidth = 1.5,
  fill,
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data || data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    return data
      .map((val, i) => {
        const x = i * stepX;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join("");
  }, [data, width, height]);

  if (!path) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {fill && (
        <path
          d={`${path}L${width},${height}L0,${height}Z`}
          fill={fill}
          opacity={0.12}
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
