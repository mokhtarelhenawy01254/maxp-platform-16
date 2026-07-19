import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock,
  Users,
  ArrowRight,
  Edit,
  Trash2,
  UserPlus,
  Activity,
  Coffee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { calculateWorkHours, validateShiftTimes } from "../../utils/shiftHelpers";
import api from "../../services/api";
import { toast } from "sonner";
import AssignShiftDialog from "../../components/hr/AssignShiftDialog";

interface ShiftAssignment {
  id: string;
  date: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
    email?: string;
  };
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  color: string;
  isActive: boolean;
  assignments?: ShiftAssignment[];
  _count?: {
    assignments: number;
  };
}

const ShiftDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(
    null,
  );
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    breakDuration: 60,
    color: "#3B82F6",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchShiftDetails();
    }
  }, [id]);

  const fetchShiftDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hr/shifts/${id}`);
      setShift(response.data.shift);
    } catch (error: any) {
      console.error("Error fetching shift details:", error);
      toast.error("فشل في جلب تفاصيل المناوبة");
      navigate("/hr/shifts");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async () => {
    try {
      await api.delete(`/hr/shifts/${id}`);
      toast.success("تم حذف المناوبة بنجاح");
      navigate("/hr/shifts");
    } catch (error) {
      console.error("Error deleting shift:", error);
      toast.error("فشل في حذف المناوبة");
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors["name"] = "يرجى إدخال اسم المناوبة";

    const validation = validateShiftTimes(
      formData.startTime,
      formData.endTime,
      formData.breakDuration,
    );

    if (!validation.valid && validation.error) {
      errors["time"] = validation.error;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateShift = async () => {
    if (!validateForm()) return;
    try {
      await api.put(`/hr/shifts/${id}`, formData);
      toast.success("تم تحديث المناوبة بنجاح");
      setEditDialogOpen(false);
      fetchShiftDetails();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "فشل في تحديث المناوبة";
      toast.error(errorMsg);
    }
  };

  const openEditDialog = () => {
    if (shift) {
      setFormData({
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        color: shift.color,
      });
      setFormErrors({});
      setEditDialogOpen(true);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      await api.delete(`/hr/shifts/assignments/${assignmentToDelete}`);
      toast.success("تم إلغاء تعيين الموظف بنجاح");
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      fetchShiftDetails();
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast.error("فشل في إلغاء التعيين");
    }
  };

  const confirmRemoveAssignment = (assignmentId: string) => {
    setAssignmentToDelete(assignmentId);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="p-6" dir="rtl">
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">المناوبة غير موجودة</p>
            <Button onClick={() => navigate("/hr/shifts")} className="mt-4">
              العودة للمناوبات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentAssignments = shift.assignments || [];
  const totalAssignments =
    shift._count?.assignments || shift.assignments?.length || 0;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/hr/shifts")}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            رجوع
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: shift.color }}
            />
            <div>
              <h1 className="text-3xl font-bold">{shift.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                تفاصيل المناوبة
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
            <UserPlus className="h-4 w-4 ml-2" />
            تعيين موظف
          </Button>
          <Button variant="outline" onClick={openEditDialog}>
            <Edit className="h-4 w-4 ml-2" />
            تعديل
          </Button>
          <Button
            variant="outline"
            onClick={handleDeleteShift}
            className="text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 ml-2" />
            حذف
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  وقت البدء
                </p>
                <p className="text-2xl font-bold mt-1">{shift.startTime}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  وقت الانتهاء
                </p>
                <p className="text-2xl font-bold mt-1">{shift.endTime}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  مدة الراحة
                </p>
                <p className="text-2xl font-bold mt-1">
                  {shift.breakDuration} د
                </p>
              </div>
              <Coffee className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ساعات العمل
                </p>
                <p className="text-2xl font-bold mt-1">
                  {calculateWorkHours(
                    shift.startTime,
                    shift.endTime,
                    shift.breakDuration,
                  )}{" "}
                  س
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Info */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات المناوبة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                الحالة
              </label>
              <div className="mt-2">
                {shift.isActive ? (
                  <Badge className="bg-green-100 text-green-800">نشط</Badge>
                ) : (
                  <Badge variant="outline">غير نشط</Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                إجمالي الموظفين المعينين
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                <span className="text-lg font-semibold">
                  {totalAssignments} موظف
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                اللون
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border-2 border-gray-200"
                  style={{ backgroundColor: shift.color }}
                />
                <span className="text-sm font-mono">{shift.color}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Employees */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>الموظفين المعينين ({totalAssignments})</CardTitle>
            <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
              <UserPlus className="h-4 w-4 ml-2" />
              إضافة موظف
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                لا يوجد موظفين معينين لهذه المناوبة
              </p>
              <Button onClick={() => setAssignDialogOpen(true)}>
                <UserPlus className="h-4 w-4 ml-2" />
                تعيين موظف
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      {assignment.user ? (
                        <>
                          <p className="font-semibold">
                            {assignment.user.firstName}{" "}
                            {assignment.user.lastName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {assignment.user.employeeNumber && (
                              <span>#{assignment.user.employeeNumber}</span>
                            )}
                            {assignment.user.email && (
                              <span>• {assignment.user.email}</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-red-600">
                            موظف محذوف
                          </p>
                          <p className="text-xs text-red-500">
                            تعيين قديم - يرجى الحذف
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-left">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        تاريخ التعيين
                      </p>
                      <p className="text-sm font-medium">
                        {formatDate(assignment.date)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => confirmRemoveAssignment(assignment.id)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Assignment Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء تعيين هذا الموظف من المناوبة. يمكنك إعادة تعيينه
              لاحقاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAssignment}
              className="bg-red-500 hover:bg-red-600"
            >
              إلغاء التعيين
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Shift Dialog */}
      {shift && (
        <AssignShiftDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          shiftId={shift.id}
          shiftName={shift.name}
          onSuccess={fetchShiftDetails}
        />
      )}
      {/* Edit Shift Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المناوبة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المناوبة</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="مثال: صباحي A، مسائي، ليل"
                className={formErrors["name"] ? "border-red-500" : ""}
              />
              {formErrors["name"] && (
                <p className="text-sm text-red-500 mt-1">
                  {formErrors["name"]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>وقت البدء</Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>وقت الانتهاء</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData({ ...formData, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>مدة الراحة (دقائق)</Label>
                <Input
                  type="number"
                  value={formData.breakDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      breakDuration: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="flex-1">
                <Label>لون التمييز</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-12 h-10 p-1"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formData.color}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Preview of Hours */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md text-sm text-blue-800 dark:text-blue-200 flex justify-between items-center">
              <span>ساعات العمل الصافية:</span>
              <span className="font-bold text-lg">
                {calculateWorkHours(
                  formData.startTime,
                  formData.endTime,
                  formData.breakDuration,
                )}{" "}
                ساعة
              </span>
            </div>

            {formErrors["time"] && (
              <p className="text-sm text-red-500">{formErrors["time"]}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdateShift}>تحديث</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShiftDetails;
