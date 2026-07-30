import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Calendar, User, File, ArrowRight, Edit, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import api from "../../services/api";
import { toast } from "sonner";

interface Warning {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  incidentDate: string;
  actionTaken?: string;
  employeeResponse?: string;
  acknowledgedAt?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position?: { title: string };
    department?: { name: string };
  };
}

const WarningDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [warning, setWarning] = useState<Warning | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchWarning();
    }
  }, [id]);

  const fetchWarning = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/warnings/${id}`);
      setWarning(response.data.warning);
    } catch (error: any) {
      console.error("Error fetching warning:", error);
      toast.error(error.response?.data?.error || "فشل في جلب تفاصيل الإنذار");
      navigate("/hr/warnings");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الإنذار؟")) {
      return;
    }

    try {
      await api.delete(`/hr/warnings/${id}`);
      toast.success("تم حذف الإنذار بنجاح");
      navigate("/hr/warnings");
    } catch (error: any) {
      console.error("Error deleting warning:", error);
      toast.error(error.response?.data?.error || "فشل في حذف الإنذار");
    }
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      VERBAL: "شفوي",
      WRITTEN: "كتابي",
      FINAL: "نهائي",
      TERMINATION: "إنهاء خدمة",
    };
    return typeMap[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    const colorMap: Record<string, string> = {
      minor: "bg-yellow-100 text-yellow-800",
      moderate: "bg-orange-100 text-orange-800",
      severe: "bg-red-100 text-red-800",
    };
    return colorMap[severity] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!warning) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">الإنذار غير موجود</p>
            <Button onClick={() => navigate("/hr/warnings")}>
              العودة للإنذارات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full lg:max-w-6xl 2xl:max-w-7xl mx-auto overflow-hidden" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-5 min-w-0 flex-1">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 flex-shrink-0">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight"
                style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
              >
                {warning.title}
              </h1>
              <div className="flex gap-2">
                <Badge className={`${getSeverityColor(warning.severity)} border-none py-1 px-4 rounded-full text-[10px] font-bold`}>
                  {warning.severity === 'minor' ? 'بسيط' : warning.severity === 'moderate' ? 'متوسط' : 'جسيم'}
                </Badge>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50/50 py-1 px-4 rounded-full text-[10px] font-bold">
                  {getTypeLabel(warning.type)}
                </Badge>
              </div>
            </div>
            <p className="text-gray-500 mt-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              إنذار خاص بالموظف: <span className="font-bold text-gray-700 dark:text-gray-300">{warning.employee.firstName} {warning.employee.lastName}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/hr/warnings/${id}/edit`)}
            className="rounded-xl px-6"
          >
            <Edit className="h-4 w-4 ml-2" />
            تعديل
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="rounded-xl px-6 shadow-lg shadow-red-500/20"
          >
            <Trash2 className="h-4 w-4 ml-2" />
            حذف
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Description Card */}
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">وصف المخالفة</CardTitle>
                  <CardDescription>تفاصيل الواقعة كما تم تسجيلها</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="bg-blue-50/30 dark:bg-blue-900/5 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 overflow-hidden">
                <p
                  className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-lg"
                  style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                >
                  {warning.description}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Taken Card */}
          {warning.actionTaken && (
            <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
              <CardHeader className="bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg shadow-lg shadow-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">الإجراء الإداري المتخذ</CardTitle>
                    <CardDescription>القرار الذي تم اتخاذه بناءً على المخالفة</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="bg-amber-50/50 dark:bg-amber-900/5 p-6 rounded-2xl border border-amber-100/50 dark:border-amber-900/20 overflow-hidden w-full">
                  <p
                    className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-lg font-bold italic"
                    style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                  >
                    {warning.actionTaken}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Response Card */}
          {warning.employeeResponse && (
            <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
              <CardHeader className="bg-purple-50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-900/20 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg shadow-lg shadow-purple-500/20">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold">رد وتوضيح الموظف</CardTitle>
                    <CardDescription>الرد الرسمي المسجل من قبل الموظف</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="bg-purple-50/50 dark:bg-purple-900/5 p-6 rounded-2xl border border-purple-100/50 dark:border-purple-900/20 overflow-hidden">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-lg italic break-all">
                    {warning.employeeResponse}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Attachments Card */}
          {warning.attachments && warning.attachments.length > 0 && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="border-b bg-gray-50/50 dark:bg-gray-800/10">
                <CardTitle className="text-lg">المرفقات والمستندات</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {warning.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm group-hover:bg-blue-50 transition-colors">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[150px]">{attachment}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600">عرض</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 p-5">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-base font-bold">معلومات التاريخ</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">تاريخ الواقعة</p>
                  <p className="text-sm font-bold">
                    {new Date(warning.incidentDate).toLocaleDateString(
                      "ar-EG",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>

              {warning.acknowledgedAt && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">تاريخ الاستلام</p>
                    <p className="text-sm font-bold text-green-600">
                      {new Date(warning.acknowledgedAt).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">تاريخ الإصدار:</span>
                  <span className="font-medium text-gray-600">{new Date(warning.createdAt).toLocaleDateString("ar-EG")}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">آخر تحديث:</span>
                  <span className="font-medium text-gray-600">{new Date(warning.updatedAt).toLocaleDateString("ar-EG")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 p-5">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-base font-bold">ملف الموظف</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/20">
                  {warning.employee.firstName[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {warning.employee.firstName} {warning.employee.lastName}
                  </p>
                  <p className="text-xs text-blue-600 font-bold">#{warning.employee.employeeNumber}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {warning.employee.position && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">المنصب:</span>
                    <span className="font-medium">{warning.employee.position.title}</span>
                  </div>
                )}
                {warning.employee.department && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">القسم:</span>
                    <span className="font-medium">{warning.employee.department.name}</span>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                className="w-full rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border-none"
                onClick={() => navigate(`/hr/employees/${warning.employee.id}`)}
              >
                عرض الملف الكامل
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WarningDetails;
