import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import {
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface EmployeeStat {
  id: string;
  name: string;
  totalAssigned: number;
  totalReviewed: number;
  totalActions: number;
  actions: Record<string, number>;
}

interface PerformanceData {
  summary: {
    totalReturns: number;
    totalReviewed: number;
    totalUnreviewed: number;
    reviewRate: number | string;
  };
  employees: EmployeeStat[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const ReturnEmployeePerformance: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await apiClient.get("/returns/employee-performance", { params });
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error: unknown) {
      console.error("Error fetching employee performance:", error);
      toast.error("فشل تحميل تقرير أداء الموظفين");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const getActionLabel = (action: string): string => {
    const labels: Record<string, string> = {
      CREATED: "إنشاء",
      REVIEWED: "مراجعة",
      NOTE_ADDED: "إضافة ملاحظة",
      STATUS_CHANGED: "تغيير حالة",
      CONTACT_ATTEMPT: "محاولة اتصال",
      UPDATED: "تحديث",
    };
    return labels[action] || action;
  };

  // Prepare chart data
  const chartData = (data?.employees || []).map((emp) => ({
    name: emp.name || "غير معروف",
    assigned: emp.totalAssigned,
    reviewed: emp.totalReviewed,
    actions: emp.totalActions,
  }));

  const pieData = [
    { name: "تمت المراجعة", value: data?.summary?.totalReviewed || 0 },
    { name: "لم تتم المراجعة", value: data?.summary?.totalUnreviewed || 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تقرير أداء الموظفين - المرتجعات
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            إحصائيات تحديث ومراجعة الطلبات المرتجعة لكل موظف
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchData}
            className="mt-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المرتجعات</p>
              <p className="text-2xl font-bold text-blue-600">
                {data?.summary?.totalReturns || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تمت المراجعة</p>
              <p className="text-2xl font-bold text-green-600">
                {data?.summary?.totalReviewed || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">لم تتم المراجعة</p>
              <p className="text-2xl font-bold text-orange-600">
                {data?.summary?.totalUnreviewed || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نسبة المراجعة</p>
              <p className="text-2xl font-bold text-purple-600">
                {data?.summary?.reviewRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            أداء الموظفين
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip />
                <Bar dataKey="assigned" fill="#3B82F6" name="المسندة" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reviewed" fill="#10B981" name="المراجعة" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actions" fill="#F59E0B" name="الإجراءات" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            حالة المراجعة
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            تفاصيل أداء الموظفين
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الموظف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  الطلبات المسندة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  تمت المراجعة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  إجمالي الإجراءات
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  تفاصيل الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {(data?.employees || []).map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {employee.name || "غير معروف"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {employee.totalAssigned}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-green-600 font-medium">
                      {employee.totalReviewed}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-blue-600 font-medium">
                      {employee.totalActions}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(employee.actions || {}).map(([action, count]) => (
                        <span
                          key={action}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                        >
                          {getActionLabel(action)}: {count}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {(!data?.employees || data.employees.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReturnEmployeePerformance;
