import React from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { Card, CardContent } from "../../../components/ui/card";
import { TeamMemberStat } from "./TeamPerformanceAnalytics";

interface TeamPerformanceChartsProps {
  sortedMembers: TeamMemberStat[];
}

export const TeamPerformanceCharts: React.FC<TeamPerformanceChartsProps> = ({ sortedMembers }) => {
  const { t } = useTranslation();

  if (!sortedMembers || sortedMembers.length === 0) return null;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          {t("teamPerformance.ordersProcessed", "توزيع الطلبات المنجزة حسب أعضاء الفريق")}
        </h3>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height={320} minHeight={320}>
            <BarChart data={sortedMembers} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="opacity-10"
              />
              <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
              <YAxis
                dataKey="userName"
                type="category"
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={11}
                width={130}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar
                dataKey="ordersConfirmed"
                fill="#10B981"
                name={t("teamPerformance.ordersConfirmed", "طلبات مؤكدة")}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="ordersCreated"
                fill="#3B82F6"
                name={t("teamPerformance.ordersCreated", "طلبات منشأة")}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="ordersAssigned"
                fill="#F59E0B"
                name={t("teamPerformance.ordersAssigned", "طلبات مسندة")}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
