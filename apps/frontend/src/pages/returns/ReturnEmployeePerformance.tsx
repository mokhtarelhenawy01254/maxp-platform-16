import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  RefreshCw,
  CalendarDays,
  BarChart3,
  User,
} from "lucide-react";

interface EmployeeStats {
  id: string;
  name: string;
  totalAssigned: number;
  totalReviewed: number;
  totalActions: number;
  actions: Record<string, number>;
}

const ReturnEmployeePerformance: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const qs = params.toString();
      const res = await apiClient.get(`/returns/employee-performance${qs ? `?${qs}` : ""}`);
      setStats(res.data?.data || res.data || []);
    } catch (err) {
      console.error("Failed to load employee performance:", err);
      toast.error("فشل تحميل أداء الموظفين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedStats = useMemo(
    () => [...stats].sort((a, b) => b.totalActions - a.totalActions),
    [stats]
  );

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({
          assigned: acc.assigned + s.totalAssigned,
          reviewed: acc.reviewed + s.totalReviewed,
          actions: acc.actions + s.totalActions,
        }),
        { assigned: 0, reviewed: 0, actions: 0 }
      ),
    [stats]
  );

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BarChart3 size={24} color="#6366f1" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>
            أداء الموظفين - المرتجعات
          </h1>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 13,
            color: "#374151",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CalendarDays size={16} color="#9ca3af" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: "6px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
        <span style={{ color: "#9ca3af" }}>إلى</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: "6px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 6,
              fontSize: 13,
            }}
          />
        </div>
        <button
          onClick={fetchData}
          style={{
            padding: "6px 14px",
            background: "#6366f1",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          تصفية
        </button>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "إجمالي الموظفين", value: stats.length, color: "#6366f1" },
          { label: "إجمالي المرتجعات المعينة", value: totals.assigned, color: "#f59e0b" },
          { label: "إجمالي المرتجعات المراجعة", value: totals.reviewed, color: "#10b981" },
          { label: "إجمالي الإجراءات", value: totals.actions, color: "#3b82f6" },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "16px 18px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            جاري التحميل...
          </div>
        ) : sortedStats.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            لا توجد بيانات
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#374151" }}>
                  الموظف
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>
                  المرتجعات المعينة
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>
                  المراجعة
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600, color: "#374151" }}>
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map((emp) => (
                <tr
                  key={emp.id}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <User size={16} color="#6366f1" />
                      </div>
                      <span style={{ fontWeight: 500, color: "#111827" }}>
                        {emp.name || "غير محدد"}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", color: "#f59e0b", fontWeight: 600 }}>
                    {emp.totalAssigned}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", color: "#10b981", fontWeight: 600 }}>
                    {emp.totalReviewed}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center", color: "#3b82f6", fontWeight: 600 }}>
                    {emp.totalActions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReturnEmployeePerformance;
