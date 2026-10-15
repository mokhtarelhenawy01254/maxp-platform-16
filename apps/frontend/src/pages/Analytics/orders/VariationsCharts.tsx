import React from "react";
import { SwatchBook, Palette } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { Card, CardContent } from "../../../components/ui/card";

export interface VariationDimension {
  name: string;
  sales: number;
  revenue: number;
}

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

interface Props {
  sizes: VariationDimension[];
  colors: VariationDimension[];
}

export const VariationsCharts: React.FC<Props> = ({ sizes, colors }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Sizes Donut */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SwatchBook className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-foreground">
                المقاسات الأكثر طلباً
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {sizes.length} مقاس
            </span>
          </div>

          <div className="h-[240px] w-full">
            {sizes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sizes}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="sales"
                    nameKey="name"
                  >
                    {sizes.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(val: any) => [Number(val).toLocaleString(), "قطعة"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                لا توجد بيانات مقاسات في الفترة
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Colors Donut */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-foreground">
                الألوان الأكثر مبيعاً
              </h3>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {colors.length} لون
            </span>
          </div>

          <div className="h-[240px] w-full">
            {colors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={colors}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="sales"
                    nameKey="name"
                  >
                    {colors.map((_, index) => (
                      <Cell
                        key={`cell-color-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(val: any) => [Number(val).toLocaleString(), "قطعة"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                لا توجد بيانات ألوان في الفترة
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
