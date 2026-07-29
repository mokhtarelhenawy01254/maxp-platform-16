import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Save, Eye, ShieldAlert, FileText, Calendar, Gavel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import api from "../../services/api";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

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
  employee: {
    firstName: string;
    lastName: string;
  };
}

const EditWarning: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "WRITTEN",
    severity: "moderate",
    incidentDate: "",
    actionTaken: "",
    employeeResponse: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [warningData, setWarningData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchWarning();
    }
  }, [id]);

  const fetchWarning = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/warnings/${id}`);
      const warning = response.data.warning;

      setFormData({
        title: warning.title || "",
        description: warning.description || "",
        type: warning.type || "WRITTEN",
        severity: warning.severity || "moderate",
        incidentDate: warning.incidentDate
          ? new Date(warning.incidentDate).toISOString().split("T")[0]
          : "",
        actionTaken: warning.actionTaken || "",
        employeeResponse: warning.employeeResponse || "",
      });
      setWarningData(warning);
    } catch (error: any) {
      console.error("Error fetching warning:", error);
      toast.error(error.response?.data?.error || "فشل في جلب بيانات الإنذار");
      navigate("/hr/warnings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      tToast.error("hr_EditWarning.msg_1d83");
      return;
    }

    try {
      setSaving(true);
      await api.put(`/hr/warnings/${id}`, formData);
      tToast.success("hr_EditWarning.success_update_3427");
      navigate(`/hr/warnings/${id}`);
    } catch (error: any) {
      console.error("Error updating warning:", error);
      toast.error(error.response?.data?.error || "فشل في تحديث الإنذار");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/hr/warnings/${id}`)}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-3xl font-bold">تعديل الإنذار</h1>
            <p className="text-gray-500 mt-1">تحديث معلومات الإنذار</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              معلومات الإنذار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">العنوان *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="incidentDate">تاريخ الحادث *</Label>
                <Input
                  id="incidentDate"
                  type="date"
                  value={formData.incidentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, incidentDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">نوع الإنذار *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VERBAL">شفوي</SelectItem>
                    <SelectItem value="WRITTEN">كتابي</SelectItem>
                    <SelectItem value="FINAL">نهائي</SelectItem>
                    <SelectItem value="TERMINATION">إنهاء خدمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">الشدة *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">خفيف</SelectItem>
                    <SelectItem value="moderate">متوسط</SelectItem>
                    <SelectItem value="severe">شديد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionTaken">الإجراء المتخذ</Label>
              <Textarea
                id="actionTaken"
                value={formData.actionTaken}
                onChange={(e) =>
                  setFormData({ ...formData, actionTaken: e.target.value })
                }
                rows={4}
                placeholder="وصف الإجراء الذي تم اتخاذه..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeResponse">رد الموظف</Label>
              <Textarea
                id="employeeResponse"
                value={formData.employeeResponse}
                onChange={(e) =>
                  setFormData({ ...formData, employeeResponse: e.target.value })
                }
                rows={4}
                placeholder="رد الموظف على الإنذار..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                معاينة
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/hr/warnings/${id}`)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    حفظ التغييرات
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-950 border-none shadow-2xl rounded-[2rem] p-0 overflow-hidden" dir="rtl">
          {/* Header with Background Pattern */}
          <div className="relative h-32 bg-gradient-to-r from-orange-600 to-amber-700 flex items-center px-8 overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

            <div className="flex items-center gap-5 relative z-10 w-full">
              <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-md shadow-inner ring-1 ring-white/30">
                <ShieldAlert className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <DialogTitle className="text-2xl font-black text-white break-words pr-2 max-w-[450px]">
                  {formData.title || "عنوان الإنذار"}
                </DialogTitle>
                <div className="flex items-center gap-2 text-white/70 text-[10px] font-black uppercase tracking-widest">
                  <span className="bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">تعديل مسودة</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span>{formData.type}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar relative">
            {warningData?.employee && (
              <div className="flex items-center gap-4 p-5 bg-muted/30 rounded-[1.5rem] border border-muted ring-4 ring-muted/20">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black border-2 border-white shadow-sm">
                  {warningData.employee.firstName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white leading-none mb-1">
                    {warningData.employee.firstName} {warningData.employee.lastName}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                    موظف مسجل • تحديث بيانات قائمة
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <FileText className="h-3.5 w-3.5" />
                تفاصيل المخالفة المعدلة
              </h4>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/10 to-transparent rounded-3xl blur opacity-25" />
                <div className="relative bg-white dark:bg-gray-900/50 p-7 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200 text-lg font-medium">
                  {formData.description || "لا يوجد وصف مدخل..."}
                </div>
              </div>
            </div>

            {formData.actionTaken && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Gavel className="h-3.5 w-3.5" />
                  الإجراء الإداري المحدث
                </h4>
                <div className="bg-amber-500/5 dark:bg-amber-500/10 p-6 rounded-[1.5rem] border border-amber-500/10 shadow-sm border-dashed">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words text-md leading-relaxed">
                    {formData.actionTaken}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-dashed border-muted font-bold text-xs text-muted-foreground">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-full">
                <Calendar className="h-3.5 w-3.5 text-orange-500" />
                <span>تاريخ الحادثة: {formData.incidentDate}</span>
              </div>
              <Badge variant="secondary" className="px-4 py-1.5 rounded-full bg-orange-500/10 text-orange-600 border-none">
                {formData.severity}
              </Badge>
            </div>
          </div>

          <div className="p-6 bg-muted/20 border-t border-muted/30 flex justify-end">
            <Button
              onClick={() => setShowPreview(false)}
              className="rounded-xl px-10 h-12 font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 bg-orange-600 hover:bg-orange-700"
            >
              العودة للتعديل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditWarning;
