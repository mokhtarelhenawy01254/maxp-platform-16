import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { useCurrency } from "../../../hooks/useCurrency";
import { TopProduct } from "./abandonedCartTypes";

interface AbandonedCartProductsChartProps {
  products: TopProduct[];
}

export const AbandonedCartProductsChart: React.FC<AbandonedCartProductsChartProps> = ({
  products,
}) => {
  const { formatPrice } = useCurrency();
  if (!products || products.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 shadow-none">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        المنتجات الأكثر تركاً في السلات
      </h3>
      <p className="text-xs text-muted-foreground mb-3">
        المنتجات الأكثر تكراراً وقيمة الإيرادات المحتجزة بداخلها
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="lg:col-span-2 h-[260px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={260}>
            <BarChart
              data={products}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
              <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} />
              <YAxis
                dataKey="productName"
                type="category"
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                width={120}
                tickFormatter={(val) => (val.length > 16 ? val.substring(0, 16) + "..." : val)}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  name === "lostRevenue" ? formatPrice(val) : `${val} مرة`,
                  name === "lostRevenue" ? "الإيراد المفقود" : "مرات التخلي",
                ]}
              />
              <Bar dataKey="lostRevenue" radius={[0, 4, 4, 0]}>
                {products.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#EF4444" : index === 1 ? "#F97316" : "#F59E0B"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5 font-mono tabular-nums">
          <span className="font-sans text-[11px] font-semibold text-muted-foreground block mb-1">
            أعلى 5 منتجات مفقودة
          </span>
          {products.slice(0, 5).map((prod, idx) => (
            <div
              key={idx}
              className="p-2 rounded border border-border/60 bg-muted/20 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 font-sans">
                <span className="w-4 text-center font-bold text-muted-foreground text-[11px]">
                  #{idx + 1}
                </span>
                <p className="font-medium text-foreground truncate max-w-[140px]">
                  {prod.productName}
                </p>
              </div>
              <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0">
                {formatPrice(prod.lostRevenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartProductsChart;
