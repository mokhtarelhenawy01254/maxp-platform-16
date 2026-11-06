import React from "react";
import { Card } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const TURNOVER_REASONS = [
  { name: "راتب أفضل", value: 40 },
  { name: "تطور وظيفي", value: 30 },
  { name: "ظروف شخصية", value: 20 },
  { name: "أخرى", value: 10 },
];

const TURNOVER_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#94a3b8"];

export const TurnoverReportTab: React.FC = () => {
  return (
    <TabsContent value="turnover" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 rounded-2xl border border-border/70 bg-card shadow-xs">
          <h3 className="text-lg font-bold mb-4">معدل الدوران الشهري</h3>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground font-mono tabular-nums">
                2.4%
              </p>
              <p className="text-muted-foreground mt-1 text-sm">معدل مقبول عالمياً</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">أسباب الاستقالة</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TURNOVER_REASONS}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={60}
                >
                  {TURNOVER_REASONS.map((_, index) => (
                    <Cell
                      key={`turnover-${index}`}
                      fill={TURNOVER_COLORS[index % TURNOVER_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </TabsContent>
  );
};
