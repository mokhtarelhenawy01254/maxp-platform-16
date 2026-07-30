import React, { useState, useEffect } from "react";
import { Book, Plus, Calendar, DollarSign, Award, Clock, User, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { toast } from "sonner";

interface Training {
  id: string;
  trainingName: string;
  provider?: string;
  type: string;
  startDate: string;
  endDate?: string;
  status: string;
  cost?: number;
  duration?: number;
  score?: number;
}

const Training: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainings();
  }, [employeeId]);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const url = employeeId
        ? `/hr/trainings/employee/${employeeId}`
        : "/hr/trainings";
      const response = await api.get(url);
      setTrainings(response.data.trainings || []);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      toast.error("فشل في جلب سجلات التدريب");
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: any = {
      PLANNED: {
        label: "مخطط",
        class: "bg-blue-100 text-blue-700 border-blue-200",
      },
      ONGOING: {
        label: "قيد التنفيذ",
        class: "bg-amber-100 text-amber-700 border-amber-200",
      },
      COMPLETED: {
        label: "مكتمل",
        class: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      CANCELLED: {
        label: "ملغي",
        class: "bg-rose-100 text-rose-700 border-rose-200",
      },
    };
    return map[status] || { label: status, class: "bg-gray-100 text-gray-700" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
          <p className="text-purple-600 font-bold animate-pulse">
            جاري تحميل السجلات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hr-theme min-h-screen p-6 md:p-8 space-y-8" dir="rtl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-600">
            التدريب والتطوير
          </h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
            <Award className="h-4 w-4 text-purple-400" />
            إدارة وقياس أثر البرامج التدريبية للموظفين
          </p>
        </div>
        <Button
          onClick={() => navigate("/hr/training/new")}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold px-6 py-6 rounded-2xl shadow-xl shadow-purple-200 transition-all hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-left-4 duration-500"
        >
          <Plus className="h-5 w-5 ml-2" />
          إضافة برنامج تدريب
        </Button>
      </div>

      {trainings.length === 0 ? (
        <Card className="border-none shadow-2xl bg-white/50 backdrop-blur-md p-16 animate-in zoom-in-95 duration-500">
          <CardContent className="flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center text-purple-200">
              <GraduationCap className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-800">
                لا يوجد سجلات حالياً
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                لم يتم توثيق أي برامج تدريبية بعد. ابدأ بإضافة أول برنامج
                لموظفيك الآن.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/hr/training/new")}
              className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 px-8"
            >
              إضافة برنامجك الأول
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {trainings.map((training, index) => {
            const status = getStatusLabel(training.status);
            return (
              <Card
                key={training.id}
                className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden bg-white/70 backdrop-blur-sm cursor-pointer ring-1 ring-purple-100/50"
                onClick={() => navigate(`/hr/training/${training.id}`)}
              >
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border ${status.class}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-black mt-4 leading-tight group-hover:text-purple-700 transition-colors">
                    {training.trainingName}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {training.employee?.firstName}{" "}
                      {training.employee?.lastName}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> تاريخ البدء
                      </p>
                      <p className="text-xs font-bold text-gray-700">
                        {new Date(training.startDate).toLocaleDateString(
                          "ar-EG",
                          { day: "numeric", month: "long", year: "numeric" },
                        )}
                      </p>
                    </div>
                    {training.duration && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3" /> المدة
                        </p>
                        <p className="text-xs font-bold text-gray-700">
                          {training.duration} ساعة
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    {training.cost ? (
                      <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> الاستثمار
                        </p>
                        <p className="text-sm font-black text-purple-600">
                          {training.cost.toLocaleString()}{" "}
                          <span className="text-[10px] font-bold opacity-60">
                            EGP
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div />
                    )}

                    {training.score ? (
                      <div className="flex flex-col items-end">
                        <p className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                          <Award className="h-3 w-3" /> التقييم
                        </p>
                        <p className="text-sm font-black text-amber-500">
                          %{training.score}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Edit Button */}
                  <div className="pt-2">
                    <Button
                      variant="secondary"
                      className="w-full rounded-xl font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border-none shadow-sm transition-all flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/hr/training/${training.id}`);
                      }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      تعديل بيانات التدريب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Training;
