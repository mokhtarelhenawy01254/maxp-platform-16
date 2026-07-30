import React, { useState, useEffect } from "react";
import { Clock, Save, X, ChevronLeft, ChevronRight, Edit2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import api from "../../services/api";
import { toast } from "sonner";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number | null;
  overtimeHours: number | null;
  lateMinutes: number | null;
  notes: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string;
    employeeNumber: string;
    department: { name: string } | null;
  };
}

interface EditingRecord {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  notes: string;
  lateHours: number;
  lateMins: number;
  earlyHours: number;
  earlyMins: number;
}

const statusOptions = [
  { value: "PRESENT", label: "حاضر", color: "bg-green-100 text-green-800" },
  { value: "LATE", label: "متأخر", color: "bg-yellow-100 text-yellow-800" },
  { value: "ABSENT", label: "غائب", color: "bg-red-100 text-red-800" },
  { value: "HALF_DAY", label: "نصف يوم", color: "bg-blue-100 text-blue-800" },
  { value: "ON_LEAVE", label: "إجازة", color: "bg-purple-100 text-purple-800" },
  { value: "REMOTE", label: "عن بُعد", color: "bg-indigo-100 text-indigo-800" },
];

const ManualAttendanceEdit: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [editingRecords, setEditingRecords] = useState<
    Map<string, EditingRecord>
  >(new Map());
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [useDateRange, setUseDateRange] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [employees, setEmployees] = useState<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    }>
  >([]);
  const [allEmployeesWithAttendance, setAllEmployeesWithAttendance] = useState<
    AttendanceRecord[]
  >([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (showAllEmployees) {
      fetchAllEmployeesWithAttendance();
    } else {
      fetchAttendance();
    }
  }, [
    selectedDate,
    endDate,
    useDateRange,
    statusFilter,
    employeeId,
    showAllEmployees,
  ]);

  useEffect(() => {
    if (pagination.page > 1) {
      fetchAttendance();
    }
  }, [pagination.page]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/hr/employees?limit=1000&status=ACTIVE");
      console.log("📋 Employees API Response:", response.data);
      const employeesList = response.data.employees || [];
      console.log("📋 Employees List:", employeesList.length, "employees");
      setEmployees(employeesList);
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      toast.error("حدث خطأ أثناء جلب قائمة الموظفين");
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        startDate: selectedDate || "",
        endDate: (useDateRange ? endDate : selectedDate) || "",
      } as Record<string, string>);

      if (statusFilter && statusFilter !== "ALL")
        params.append("status", statusFilter);
      if (employeeId) params.append("employeeId", employeeId);

      const response = await api.get(`/hr/attendance?${params}`);
      setRecords(response.data.records);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      }));
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("حدث خطأ أثناء جلب سجل الحضور");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployeesWithAttendance = async () => {
    try {
      setLoading(true);
      const employeesResponse = await api.get(
        "/hr/employees?limit=1000&status=ACTIVE",
      );
      const employeesList = employeesResponse.data.employees || [];

      const targetDate = selectedDate;
      console.log("📅 Target date for search:", targetDate);

      // استخدام التاريخ المحدد مباشرة بدون إضافة أيام إضافية
      const searchStartDate = targetDate;
      const searchEndDate = targetDate;

      console.log("📅 Search date:", searchStartDate);

      const attendanceResponse = await api.get(
        `/hr/attendance?startDate=${searchStartDate}&endDate=${searchEndDate}&limit=1000`,
      );
      const attendanceRecords = attendanceResponse.data.records || [];

      console.log("📋 Fetched attendance records:", attendanceRecords.length);
      console.log("📋 Employees list:", employeesList.length);

      if (attendanceRecords.length > 0) {
        console.log("📋 Sample record date:", attendanceRecords[0].date);
      }

      const attendanceMap = new Map(
        attendanceRecords.map((r: AttendanceRecord) => [r.employee.id, r]),
      );

      const combinedRecords = employeesList.map((emp: any) => {
        const existingRecord = attendanceMap.get(emp.id);
        if (existingRecord) {
          console.log(`✅ Found existing record for employee ${emp.id}`);
          return existingRecord;
        }
        console.log(`➕ Creating placeholder for employee ${emp.id}`);
        return {
          id: `temp-${emp.id}`,
          date: targetDate,
          checkIn: null,
          checkOut: null,
          status: "ABSENT",
          workHours: null,
          overtimeHours: null,
          lateMinutes: null,
          notes: null,
          employee: {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            avatar: emp.avatar,
            employeeNumber: emp.employeeNumber,
            department: emp.department,
          },
          isNew: true,
        };
      });

      console.log("📋 Combined records:", combinedRecords.length);
      setAllEmployeesWithAttendance(combinedRecords);
      setPagination((prev) => ({
        ...prev,
        total: combinedRecords.length,
        totalPages: Math.ceil(combinedRecords.length / prev.limit),
      }));
    } catch (error) {
      console.error("Error fetching all employees:", error);
      toast.error("حدث خطأ أثناء جلب الموظفين");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (record: AttendanceRecord) => {
    let checkInTime = "09:00";
    let checkOutTime = "";

    if (record.checkIn) {
      try {
        const date = new Date(record.checkIn);
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        checkInTime = `${hours}:${minutes}`;
      } catch (error) {
        console.error("Error parsing checkIn time:", error);
      }
    }

    if (record.checkOut) {
      try {
        const date = new Date(record.checkOut);
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        checkOutTime = `${hours}:${minutes}`;
      } catch (error) {
        console.error("Error parsing checkOut time:", error);
      }
    }

    setEditingRecords((prev) =>
      new Map(prev).set(record.id, {
        id: record.id,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status: record.status,
        notes: record.notes || "",
        lateHours: Math.floor((record.lateMinutes || 0) / 60),
        lateMins: (record.lateMinutes || 0) % 60,
        earlyHours: Math.floor((record.earlyLeaveMinutes || 0) / 60),
        earlyMins: (record.earlyLeaveMinutes || 0) % 60,
      }),
    );
  };

  const cancelEditing = (recordId: string) => {
    setEditingRecords((prev) => {
      const newMap = new Map(prev);
      newMap.delete(recordId);
      return newMap;
    });
  };

  const calculateWorkHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    try {
      const checkInTime = new Date(`2000-01-01T${checkIn}:00`);
      const checkOutTime = new Date(`2000-01-01T${checkOut}:00`);
      if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
        return 0;
      }
      const diffMs = checkOutTime.getTime() - checkInTime.getTime();
      return Math.max(0, diffMs / (1000 * 60 * 60));
    } catch (error) {
      console.error("Error calculating work hours:", error);
      return 0;
    }
  };

  const validateTimes = (checkIn: string, checkOut: string): boolean => {
    if (!checkIn) {
      toast.error("يجب إدخال وقت الحضور");
      return false;
    }

    try {
      const checkInTime = new Date(`2000-01-01T${checkIn}:00`);
      if (isNaN(checkInTime.getTime())) {
        toast.error("تنسيق وقت الحضور غير صحيح");
        return false;
      }

      if (checkOut) {
        const checkOutTime = new Date(`2000-01-01T${checkOut}:00`);

        if (isNaN(checkOutTime.getTime())) {
          toast.error("تنسيق وقت الانصراف غير صحيح");
          return false;
        }

        if (checkOutTime <= checkInTime) {
          toast.error("وقت الانصراف يجب أن يكون بعد وقت الحضور");
          return false;
        }

        const workHours = calculateWorkHours(checkIn, checkOut);
        if (workHours > 24) {
          toast.error("ساعات العمل غير منطقية (أكثر من 24 ساعة)");
          return false;
        }
      }

      return true;
    } catch (error) {
      toast.error("خطأ في التحقق من الأوقات");
      return false;
    }
  };

  const saveRecord = async (recordId: string) => {
    const editingData = editingRecords.get(recordId);
    if (!editingData) return;

    if (saving === recordId) return;

    if (!validateTimes(editingData.checkIn, editingData.checkOut)) {
      return;
    }

    try {
      setSaving(recordId);
      const allRecords = showAllEmployees
        ? allEmployeesWithAttendance
        : records;
      const record = allRecords.find((r) => r.id === recordId);
      if (!record) {
        toast.error("السجل غير موجود");
        return;
      }

      const dateOnly = new Date(record.date).toISOString().split("T")[0];
      const checkInDateTime = `${dateOnly}T${editingData.checkIn}:00`;
      const checkOutDateTime = `${dateOnly}T${editingData.checkOut}:00`;

      const workHours = calculateWorkHours(
        editingData.checkIn,
        editingData.checkOut,
      );

      if ((record as any).isNew) {
        // للسجلات الجديدة، نستخدم API الذي يتعامل مع upsert
        try {
          await api.post("/hr/attendance/manual", {
            employeeId: record.employee.id,
            date: dateOnly,
            checkIn: editingData.checkIn,
            checkOut: editingData.checkOut,
            status: editingData.status,
            notes: editingData.notes || null,
            lateMinutes: editingData.lateHours * 60 + editingData.lateMins,
            earlyLeaveMinutes:
              editingData.earlyHours * 60 + editingData.earlyMins,
          });
          toast.success("تم حفظ سجل الحضور بنجاح");
        } catch (error: any) {
          // إذا فشل الإنشاء بسبب وجود السجل، نحاول التحديث
          if (
            error.response?.status === 400 ||
            error.response?.data?.error?.includes("موجود")
          ) {
            console.log("⚠️ Record exists, trying to update instead...");
            // نحاول جلب السجل الموجود وتحديثه
            const existingRecords = await api.get(
              `/hr/attendance?startDate=${dateOnly}&endDate=${dateOnly}&employeeId=${record.employee.id}`,
            );
            if (
              existingRecords.data.records &&
              existingRecords.data.records.length > 0
            ) {
              const existingRecordId = existingRecords.data.records[0].id;
              await api.put(`/hr/attendance/${existingRecordId}`, {
                date: dateOnly,
                checkIn: editingData.checkIn,
                checkOut: editingData.checkOut,
                status: editingData.status,
                notes: editingData.notes || null,
                workHours: workHours,
                lateMinutes: editingData.lateHours * 60 + editingData.lateMins,
                earlyLeaveMinutes:
                  editingData.earlyHours * 60 + editingData.earlyMins,
              });
              toast.success("تم تحديث سجل الحضور بنجاح");
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      } else {
        await api.put(`/hr/attendance/${recordId}`, {
          date: dateOnly,
          checkIn: editingData.checkIn,
          checkOut: editingData.checkOut,
          status: editingData.status,
          notes: editingData.notes || null,
          workHours: workHours,
          lateMinutes: editingData.lateHours * 60 + editingData.lateMins,
          earlyLeaveMinutes:
            editingData.earlyHours * 60 + editingData.earlyMins,
        });
        toast.success("تم حفظ التعديلات بنجاح");
      }

      cancelEditing(recordId);
      if (showAllEmployees) {
        await fetchAllEmployeesWithAttendance();
      } else {
        await fetchAttendance();
      }
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "حدث خطأ أثناء حفظ التعديلات";
      toast.error(errorMessage);
    } finally {
      setSaving(null);
    }
  };

  const updateEditingField = (
    recordId: string,
    field: keyof EditingRecord,
    value: string | number,
  ) => {
    setEditingRecords((prev) => {
      const newMap = new Map(prev);
      const record = newMap.get(recordId);
      if (record) {
        newMap.set(recordId, { ...record, [field]: value });
      }
      return newMap;
    });
  };

  const setCurrentTimeForCheckIn = (recordId: string) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;
    updateEditingField(recordId, "checkIn", currentTime);
    toast.success(`تم تعيين وقت الحضور: ${currentTime}`);
  };

  const setCurrentTimeForCheckOut = (recordId: string) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const currentTime = `${hours}:${minutes}`;
    updateEditingField(recordId, "checkOut", currentTime);
    toast.success(`تم تعيين وقت الانصراف: ${currentTime}`);
  };

  const isEditing = (recordId: string): boolean => {
    return editingRecords.has(recordId);
  };

  const getStatusColor = (status: string): string => {
    return (
      statusOptions.find((s) => s.value === status)?.color ||
      "bg-gray-100 text-gray-800"
    );
  };

  const getStatusLabel = (status: string): string => {
    return statusOptions.find((s) => s.value === status)?.label || status;
  };

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen"
      dir="rtl"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            تعديل الحضور اليدوي
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            تعديل سجلات الحضور والانصراف للموظفين
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <AlertCircle className="h-4 w-4" />
          <span>التعديلات تُحفظ فوراً عند الضغط على حفظ</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <input
                type="checkbox"
                id="showAllEmployees"
                checked={showAllEmployees}
                onChange={(e) => setShowAllEmployees(e.target.checked)}
                className="rounded border-gray-300 w-4 h-4"
              />
              <label
                htmlFor="showAllEmployees"
                className="text-sm font-medium cursor-pointer select-none"
              >
                عرض جميع الموظفين (حتى بدون سجلات حضور)
              </label>
              {showAllEmployees && (
                <span className="text-xs text-blue-600 dark:text-blue-400 mr-auto">
                  يمكنك إنشاء سجلات حضور جديدة للموظفين
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">التاريخ:</span>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[160px]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useRange"
                    checked={useDateRange}
                    onChange={(e) => setUseDateRange(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label
                    htmlFor="useRange"
                    className="text-sm select-none cursor-pointer"
                  >
                    فترة زمنية
                  </label>
                </div>

                {useDateRange && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                    <span className="text-sm font-medium">إلى:</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-[160px]"
                      min={selectedDate}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">الكل</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={employeeId || "all"}
                  onValueChange={(value) =>
                    setEmployeeId(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue
                      placeholder={
                        employees.length > 0 ? "اختر موظف" : "لا يوجد موظفين"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      الكل ({employees.length} موظف)
                    </SelectItem>
                    {employees.length > 0 ? (
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}{" "}
                          {emp.employeeNumber ? `(${emp.employeeNumber})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-employees" disabled>
                        لا يوجد موظفين نشطين
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDate(new Date().toISOString().split("T")[0]);
                    setEndDate(new Date().toISOString().split("T")[0]);
                    setUseDateRange(false);
                    setStatusFilter("");
                    setEmployeeId("");
                  }}
                  className="px-3"
                  title="إعادة تعيين الفلاتر"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>سجلات الحضور</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (showAllEmployees ? allEmployeesWithAttendance : records)
            .length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p>لا توجد سجلات حضور</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الموظف</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الحضور</TableHead>
                    <TableHead className="text-right">الانصراف</TableHead>
                    <TableHead className="text-right">ساعات العمل</TableHead>
                    <TableHead className="text-right">تأخير/مبكر (د)</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllEmployees
                    ? allEmployeesWithAttendance
                    : records
                  ).map((record) => {
                    const editing = isEditing(record.id);
                    const editData = editingRecords.get(record.id);

                    return (
                      <TableRow
                        key={record.id}
                        className={
                          editing
                            ? "bg-blue-50 dark:bg-blue-900/10"
                            : (record as any).isNew
                              ? "bg-yellow-50 dark:bg-yellow-900/10"
                              : ""
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={record.employee?.avatar} />
                              <AvatarFallback>
                                {record.employee?.firstName?.[0]}
                                {record.employee?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {record.employee?.firstName}{" "}
                                {record.employee?.lastName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.employee?.employeeNumber}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(record.date).toLocaleDateString("ar-EG")}
                          </span>
                        </TableCell>
                        <TableCell>
                          {editing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={editData?.checkIn || ""}
                                onChange={(e) =>
                                  updateEditingField(
                                    record.id,
                                    "checkIn",
                                    e.target.value,
                                  )
                                }
                                className="w-[120px]"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setCurrentTimeForCheckIn(record.id)
                                }
                                className="px-2 py-1 h-8"
                                title="تسجيل الوقت الحالي"
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-green-600 font-medium text-sm">
                              {record.checkIn
                                ? new Date(record.checkIn).toLocaleTimeString(
                                  "ar-EG",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={editData?.checkOut || ""}
                                onChange={(e) =>
                                  updateEditingField(
                                    record.id,
                                    "checkOut",
                                    e.target.value,
                                  )
                                }
                                className="w-[120px]"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setCurrentTimeForCheckOut(record.id)
                                }
                                className="px-2 py-1 h-8"
                                title="تسجيل الوقت الحالي"
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-blue-600 font-medium text-sm">
                              {record.checkOut
                                ? new Date(record.checkOut).toLocaleTimeString(
                                  "ar-EG",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editing && editData ? (
                            <span className="text-sm font-medium">
                              {editData.checkIn && editData.checkOut
                                ? `${calculateWorkHours(editData.checkIn, editData.checkOut).toFixed(1)} ساعة`
                                : "-"}
                            </span>
                          ) : (
                            <span className="text-sm">
                              {record.workHours
                                ? `${Number(record.workHours).toFixed(1)} ساعة`
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editing && editData ? (
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              <div className="flex flex-col gap-1 border-b pb-1">
                                <span className="text-[10px] text-gray-500 font-bold">التأخير:</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={editData.lateHours}
                                    onChange={(e) => updateEditingField(record.id, "lateHours", parseInt(e.target.value) || 0)}
                                    className="w-12 h-7 text-xs px-1 text-center"
                                  />
                                  <span className="text-[10px]">س</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={editData.lateMins}
                                    onChange={(e) => updateEditingField(record.id, "lateMins", parseInt(e.target.value) || 0)}
                                    className="w-12 h-7 text-xs px-1 text-center"
                                  />
                                  <span className="text-[10px]">د</span>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-gray-500 font-bold">مبكر:</span>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={editData.earlyHours}
                                    onChange={(e) => updateEditingField(record.id, "earlyHours", parseInt(e.target.value) || 0)}
                                    className="w-12 h-7 text-xs px-1 text-center"
                                  />
                                  <span className="text-[10px]">س</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={editData.earlyMins}
                                    onChange={(e) => updateEditingField(record.id, "earlyMins", parseInt(e.target.value) || 0)}
                                    className="w-12 h-7 text-xs px-1 text-center"
                                  />
                                  <span className="text-[10px]">د</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs space-y-1">
                              {Number(record.lateMinutes || 0) > 0 && (
                                <div className="flex items-center gap-1 text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 italic">
                                  <span>تأخير:</span>
                                  <span className="font-bold">
                                    {Math.floor(record.lateMinutes! / 60) > 0 && `${Math.floor(record.lateMinutes! / 60)}س `}
                                    {record.lateMinutes! % 60}د
                                  </span>
                                </div>
                              )}
                              {Number(record.earlyLeaveMinutes || 0) > 0 && (
                                <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 italic">
                                  <span>مبكر:</span>
                                  <span className="font-bold">
                                    {Math.floor(record.earlyLeaveMinutes! / 60) > 0 && `${Math.floor(record.earlyLeaveMinutes! / 60)}س `}
                                    {record.earlyLeaveMinutes! % 60}د
                                  </span>
                                </div>
                              )}
                              {!record.lateMinutes && !record.earlyLeaveMinutes && <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editing ? (
                            <Select
                              value={editData?.status || ""}
                              onValueChange={(value) =>
                                updateEditingField(record.id, "status", value)
                              }
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem
                                    key={status.value}
                                    value={status.value}
                                  >
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={getStatusColor(record.status)}>
                              {getStatusLabel(record.status)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editing ? (
                            <Input
                              value={editData?.notes || ""}
                              onChange={(e) =>
                                updateEditingField(
                                  record.id,
                                  "notes",
                                  e.target.value,
                                )
                              }
                              placeholder="ملاحظات..."
                              className="w-[150px]"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">
                              {record.notes || "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {editing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => saveRecord(record.id)}
                                  disabled={saving === record.id}
                                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                  {saving === record.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white ml-1" />
                                  ) : (
                                    <Save className="h-3 w-3 ml-1" />
                                  )}
                                  {saving === record.id
                                    ? "جاري الحفظ..."
                                    : "حفظ"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelEditing(record.id)}
                                  disabled={saving === record.id}
                                >
                                  <X className="h-3 w-3 ml-1" />
                                  إلغاء
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(record)}
                              >
                                <Edit2 className="h-3 w-3 ml-1" />
                                تعديل
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-gray-500">
              عرض {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              من {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ManualAttendanceEdit;
