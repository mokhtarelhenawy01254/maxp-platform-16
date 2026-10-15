import React, { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown } from "lucide-react";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { useCurrency } from "../../../hooks/useCurrency";
import { BreakdownRow, TrendRow } from "./campaignAttributionTypes";

interface CampaignAttributionChartsProps {
  trend: TrendRow[];
  sourceBreakdown: BreakdownRow[];
  platformBreakdown: BreakdownRow[];
}

const ChartTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-border/80 bg-popover/95 p-2.5 text-xs shadow-md backdrop-blur"
    >
      {label && <p className="mb-1 font-semibold text-foreground">{label}</p>}
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          <span>{entry.name}:</span>
          <span className="font-mono font-bold text-foreground tabular-nums">
            {formatter ? formatter(entry.value, entry) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  action,
  className = "",
  collapsible = false,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-lg border border-border/70 bg-card p-4 shadow-none ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-expanded={open}
              aria-label={open ? `إخفاء ${title}` : `إظهار ${title}`}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  open ? "" : "-rotate-90"
                }`}
              />
            </button>
          )}
        </div>
      </div>
      {open && <div>{children}</div>}
    </div>
  );
};

export const CampaignAttributionCharts: React.FC<CampaignAttributionChartsProps> = ({
  trend,
  sourceBreakdown,
  platformBreakdown,
}) => {
  const { formatPrice } = useCurrency();
  const [chartTab, setChartTab] = useState<"trend" | "sources">("trend");
  const [sideTab, setSideTab] = useState<"platforms" | "guide">("platforms");

  const tabButtonClass = (active: boolean) =>
    `rounded px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground shadow-none"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const sourceChartData = sourceBreakdown.slice(0, 8);
  const platformCards = platformBreakdown.slice(0, 6);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <SectionCard
        title="تطور الطلبات والحملات"
        subtitle="مقارنة إجمالي الطلبات بالمرتبطة بحملات خلال الفترة"
        className="xl:col-span-2"
        action={
          <div className="inline-flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              className={tabButtonClass(chartTab === "trend")}
              onClick={() => setChartTab("trend")}
            >
              الاتجاه
            </button>
            <button
              type="button"
              className={tabButtonClass(chartTab === "sources")}
              onClick={() => setChartTab("sources")}
            >
              المصادر
            </button>
          </div>
        }
        collapsible
      >
        {chartTab === "trend" ? (
          <div className="h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="campaignTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
                <XAxis dataKey="date" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="totalOrders"
                  name="إجمالي الطلبات"
                  stroke="#2563EB"
                  fill="url(#campaignTrendFill)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="campaignOrders"
                  name="طلبات مرتبطة بحملة"
                  stroke="#10B981"
                  fillOpacity={0}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#888888" opacity={0.15} />
                <XAxis dataKey="source" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(value: number) => `${Number(value).toLocaleString()} طلب`}
                    />
                  }
                />
                <Bar
                  dataKey="orders"
                  name="الطلبات"
                  fill="#7C3AED"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="المنصات والأدلة"
        action={
          <div className="inline-flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              className={tabButtonClass(sideTab === "platforms")}
              onClick={() => setSideTab("platforms")}
            >
              المنصات
            </button>
            <button
              type="button"
              className={tabButtonClass(sideTab === "guide")}
              onClick={() => setSideTab("guide")}
            >
              كيف تقرأ؟
            </button>
          </div>
        }
        collapsible
      >
        {sideTab === "platforms" ? (
          <div className="space-y-1.5">
            {platformCards.map((row, index) => (
              <div
                key={row.platform || `platform-${index}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-foreground">
                    {row.platform || "-"}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {row.orders.toLocaleString()} طلب
                  </div>
                </div>
                <div className="text-left font-mono tabular-nums">
                  <div className="text-xs font-semibold text-foreground">
                    {row.share.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatPrice(row.revenue)}
                  </div>
                </div>
              </div>
            ))}
            {platformCards.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                لا توجد بيانات منصات في الفترة الحالية.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
            <p>
              إذا كان <span className="font-semibold text-foreground">Campaign ID</span> فارغًا لكن المصدر موجود، فالطلب متتبع لكن الرابط لم يحمل رقم الحملة.
            </p>
            <p>
              ارتفاع <span className="font-semibold text-foreground">غير منسوبة</span> يعني غالبًا طلبات قديمة أو روابط بدون UTM / campaign params.
            </p>
            <p>
              قارن <span className="font-semibold text-foreground">الإيراد</span> بـ{" "}
              <span className="font-semibold text-foreground">نسبة التسليم</span> لتعرف الحملة التي تجلب مبيعات فعلية لا مجرد طلبات.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default CampaignAttributionCharts;
