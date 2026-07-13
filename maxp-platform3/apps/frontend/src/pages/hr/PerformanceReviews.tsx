import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Plus,
  Star,
  Calendar,
  User,
  TrendingUp,
  Edit,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";

interface PerformanceReview {
  id: string;
  reviewPeriod: string;
  overallRating: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  employee?: {
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
  } | null;
  reviewer?: {
    firstName?: string;
    lastName?: string;
  } | null;
}

const PerformanceReviews: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    fetchReviews();
    fetchEmployees();
  }, [employeeId]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await api.get("/hr/employees?limit=10");
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [employeeId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const url = employeeId
        ? `/hr/performance-reviews/employee/${employeeId}`
        : "/hr/performance-reviews";
      const response = await api.get(url);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("فشل في جلب التقييمات");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;

    try {
      await api.delete(`/hr/performance-reviews/${id}`);
      toast.success("تم حذف التقييم بنجاح");
      setReviews(reviews.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("فشل في حذف التقييم");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
      }
    > = {
      DRAFT: { label: "مسودة", variant: "outline" },
      SUBMITTED: { label: "مقدم", variant: "secondary" },
      ACKNOWLEDGED: { label: "معترف به", variant: "default" },
      COMPLETED: { label: "مكتمل", variant: "default" },
    };
    const statusInfo = statusMap[status] || {
      label: status,
      variant: "outline",
    };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-green-500";
    if (rating >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  const getEmployeeName = (review: PerformanceReview) => {
    const firstName = review.employee?.firstName?.trim();
    const lastName = review.employee?.lastName?.trim();
    if (firstName || lastName) {
      const full = [firstName, lastName].filter(Boolean).join(" ");
      if (full && full !== "مستخدم غير معروف") return full;
    }
    return "مستخدم غير معروف";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-10" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
            تقييمات الأداء
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">تحليل وتطوير الكفاءات البشرية في المؤسسة</p>
        </div>
        <Button
          onClick={() => navigate("/hr/performance-reviews/new")}
          className="h-14 px-8 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary"
        >
          <Plus className="h-6 w-6 ml-2" />
          إنشاء تقييم شامل
        </Button>
      </div>

      {/* Modern Quick Access Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <h2 className="text-xl font-bold">التقييم السريع</h2>
          </div>
          <span className="text-xs font-bold text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">اختر موظفاً لبدء تقييم فوري</span>
        </div>

        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {loadingEmployees ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="min-w-[160px] h-44 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-[2rem]" />)}
            </div>
          ) : employees.length > 0 ? (
            employees.filter(e => e.hasEmployeeRecord).map((emp) => (
              <div
                key={emp.id}
                className="min-w-[170px] group relative bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:border-primary/30 transition-all duration-300 cursor-pointer flex flex-col items-center text-center space-y-4 overflow-hidden"
                onClick={() => navigate(`/hr/performance-reviews/new?employeeId=${emp.id}`)}
              >
                {/* Decoration */}
                <div className="absolute -top-6 -right-6 w-20 h-20 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500" />

                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-2xl font-black ring-4 ring-primary/5 group-hover:rotate-6 transition-transform">
                  {emp.avatar ? (
                    <img src={emp.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    emp.firstName?.[0]
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-bold text-sm tracking-tight">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-muted-foreground font-bold opacity-60">
                    {emp.position?.title || 'موظف'}
                  </p>
                </div>

                <div className="w-full pt-1">
                  <div className="bg-primary/10 text-primary text-[10px] font-bold py-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-105">
                    تقييم الآن
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="w-full py-12 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-muted-foreground">لا يوجد موظفين متاحين حالياً</p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews History List */}
      <div className="pt-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-1.5 bg-primary rounded-full shadow-lg shadow-primary/30" />
          <h2 className="text-2xl font-black tracking-tight">سجل التقييمات السابقة</h2>
        </div>

        {reviews.length === 0 ? (
          <Card className="border-none shadow-xl bg-gray-50/50 dark:bg-gray-800/20 rounded-[3rem]">
            <CardContent className="p-20 text-center space-y-6">
              <div className="w-24 h-24 bg-white dark:bg-gray-800 shadow-inner rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-12 w-12 text-gray-300" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">السجل فارغ</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">لم يتم تسجيل أي عمليات تقييم حتى الآن. يمكنك البدء بتقييم أول موظف الآن.</p>
              </div>
              <Button
                onClick={() => navigate("/hr/performance-reviews/new")}
                variant="outline"
                className="rounded-2xl border-primary/30 text-primary hover:bg-primary/5 h-12 px-8"
              >
                إنشاء أول تقييم
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ring-1 ring-gray-100/50">
            <div className="overflow-x-auto">
              <table className="w-full text-right" dir="rtl">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest">الموظف</th>
                    <th className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest">فترة التقييم</th>
                    <th className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest text-center">التقييم العام</th>
                    <th className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest">الحالة</th>
                    <th className="px-8 py-6 text-xs font-black text-gray-500 uppercase tracking-widest text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {reviews.map((review) => (
                    <tr
                      key={review.id}
                      className="hover:bg-primary/[0.02] transition-colors cursor-pointer group"
                      onClick={() => navigate(`/hr/performance-reviews/${review.id}`)}
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg ring-4 ring-primary/5 group-hover:rotate-6 transition-transform">
                              {review.employee?.firstName?.[0] || 'U'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white group-hover:text-primary transition-colors text-base">
                              {getEmployeeName(review)}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                              رقم الموظف: #{review.employee?.employeeNumber || '---'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                            <Calendar className="h-3 w-3" />
                            {review.reviewPeriod}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            {new Date(review.periodStart).toLocaleDateString("ar-EG")} - {new Date(review.periodEnd).toLocaleDateString("ar-EG")}
                          </p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-2">
                            <Star className={`h-5 w-5 fill-current ${getRatingColor(Number(review.overallRating))}`} />
                            <span className={`text-2xl font-black ${getRatingColor(Number(review.overallRating))}`}>
                              {Number(review.overallRating).toFixed(1)}
                            </span>
                          </div>
                          <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getRatingColor(Number(review.overallRating)).replace('text', 'bg')}`}
                              style={{ width: `${(Number(review.overallRating) / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {getStatusBadge(review.status)}
                      </td>
                      <td className="px-8 py-6 text-left">
                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white shadow-sm transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hr/performance-reviews/${review.id}/edit`);
                            }}
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white shadow-sm transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(review.id);
                            }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceReviews;
