import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Checkbox } from '../../components/ui/checkbox';
import { Search, Users, AlertTriangle, Check } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'sonner';
import { getDateRange } from '../../utils/shiftHelpers';
import { cn } from '../../lib/utils';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  employeeNumber?: string;
  department?: { name: string };
  position?: { title: string };
  userId?: string;
}

interface Assignment {
  id: string;
  date: string;
  user: { id: string; firstName: string; lastName: string };
}

interface AssignShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: string;
  shiftName: string;
  onSuccess?: () => void;
}

const AssignShiftDialog: React.FC<AssignShiftDialogProps> = ({
  open,
  onOpenChange,
  shiftId,
  shiftName,
  onSuccess
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [assignmentDate, setAssignmentDate] = useState<string>(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const [endDate, setEndDate] = useState<string>('');
  const [dateRangeMode, setDateRangeMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const instanceId = useMemo(() => Math.random().toString(36).substring(7), []);

  console.log(`[AssignShiftDialog-${instanceId}] Render - open:`, open, 'employees:', employees.length, 'loading:', loading);

  useEffect(() => {
    if (!open) {
      // Reset on close
      console.log(`[AssignShiftDialog-${instanceId}] 🧹 Resetting state on close`);
      setSelectedEmployeeIds([]);
      setSearchTerm('');
      setDateRangeMode(false);
      setEndDate('');
      // We don't reset employees here anymore to prevent ghosting during re-renders
    } else {
      console.log(`[AssignShiftDialog-${instanceId}] 🔓 Dialog opened`);
    }
  }, [open, instanceId]);

  // Track state changes for debugging
  useEffect(() => {
    console.log(`[AssignShiftDialog-${instanceId}] 📊 STATE UPDATE:`, {
      employees: employees.length,
      existingAssignments: existingAssignments.length,
      loading,
      open
    });
  }, [employees.length, existingAssignments.length, loading, open, instanceId]);

  // Combine all data fetching into a single unified effect to prevent race conditions
  useEffect(() => {
    if (!open || !shiftId) return;

    const loadAllData = async () => {
      try {
        setLoading(true);
        console.log(`[AssignShiftDialog-${instanceId}] 🔄 Loading all data for shift:`, shiftId, 'date:', assignmentDate);

        // Single call to get shift and its current assignments
        const [shiftRes, employeesRes] = await Promise.all([
          api.get(`/hr/shifts/${shiftId}`),
          api.get('/hr/employees?limit=1000&status=ACTIVE')
        ]);

        const rawEmployees: Employee[] = employeesRes.data.employees || [];
        const allAssignments = shiftRes.data.shift?.assignments || [];

        console.log(`[AssignShiftDialog-${instanceId}] 📥 API Data Received:`, {
          employeesCount: rawEmployees.length,
          assignmentsCount: allAssignments.length,
          shiftFound: !!shiftRes.data.shift,
          employees: rawEmployees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }))
        });

        // Filter assignments by date locally for the "existingAssignments" state
        console.log(`[AssignShiftDialog-${instanceId}] 📅 Filtering assignments by date:`, assignmentDate);
        console.log(`[AssignShiftDialog-${instanceId}] 📅 All assignments:`, allAssignments.map((a: Assignment) => ({ id: a.id, date: a.date, userId: a.user?.id })));

        const currentAssignments = allAssignments.filter(
          (a: Assignment) => {
            const assignmentDateStr = a.date.split('T')[0];
            const matches = assignmentDateStr === assignmentDate;
            console.log(`[AssignShiftDialog-${instanceId}] 📅 Comparing: assignment date "${assignmentDateStr}" vs selected "${assignmentDate}" = ${matches}`);
            return matches;
          }
        );

        console.log(`[AssignShiftDialog-${instanceId}] 📅 Filtered assignments for ${assignmentDate}:`, currentAssignments.length);

        // Update states only if we actually got data (prevent accidental wipes)
        if (rawEmployees.length > 0) {
          setEmployees(rawEmployees);
        } else if (employees.length === 0) {
          console.warn(`[AssignShiftDialog-${instanceId}] ⚠️ Received 0 employees from API`);
          setEmployees([]);
        }

        setExistingAssignments(currentAssignments);
      } catch (error) {
        console.error(`[AssignShiftDialog-${instanceId}] ❌ Error in loadAllData:`, error);
        toast.error('فشل في جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [open, shiftId, assignmentDate, instanceId]); // instanceId ensures fresh fetch on mount

  const handleAssign = async () => {
    if (selectedEmployeeIds.length === 0 || !assignmentDate) {
      toast.error('يرجى اختيار موظف واحد على الأقل والتاريخ');
      return;
    }

    if (dateRangeMode && !endDate) {
      toast.error('يرجى تحديد تاريخ الانتهاء');
      return;
    }

    try {
      setSubmitting(true);

      // Prepare dates array
      const dates = dateRangeMode && endDate
        ? getDateRange(assignmentDate, endDate)
        : [assignmentDate];

      // Use bulk assignment API
      const response = await api.post('/hr/shifts/bulk-assign', {
        shiftId,
        employeeIds: selectedEmployeeIds,
        dates
      });

      const { results, message } = response.data;

      // Show detailed results
      if (results.failed.length > 0) {
        // Show warning with details
        const failedDetails = results.failed.slice(0, 3).map((f: any) =>
          `${f.employeeName || 'موظف'}: ${f.error}`
        ).join('\n');

        toast.warning(
          `${message}\n\nالأخطاء:\n${failedDetails}${results.failed.length > 3 ? `\n...و ${results.failed.length - 3} أخطاء أخرى` : ''}`,
          { duration: 5000 }
        );
      } else {
        toast.success(message);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning shift:', error);
      const errorMessage = error.response?.data?.error || 'فشل في تعيين المناوبة';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    console.log(`[AssignShiftDialog-${instanceId}] 🧩 Computing filteredEmployees:`, {
      totalEmployees: employees.length,
      existingAssignments: existingAssignments.length,
      assignmentDate
    });

    if (employees.length === 0) {
      console.log(`[AssignShiftDialog-${instanceId}] 🧩 No employees to filter`);
      return [];
    }

    const filtered = employees.filter(emp => {
      const matchesSearch = `${emp.firstName} ${emp.lastName} ${emp.employeeNumber || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Check if employee is already assigned - with null check for user
      const isAlreadyAssigned = existingAssignments.some(
        a => a.user && (a.user.id === emp.id || (emp.userId && a.user.id === emp.userId)) && a.date.split('T')[0] === assignmentDate
      );

      return matchesSearch && !isAlreadyAssigned;
    });

    console.log(`[AssignShiftDialog-${instanceId}] 🧩 Filtering result: ${filtered.length} / ${employees.length}`);
    return filtered;
  }, [employees, searchTerm, existingAssignments, assignmentDate, instanceId]);

  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl" dir="rtl">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-black text-gray-800">
            تعيين موظفين - {shiftName}
          </DialogTitle>
          <p className="text-sm text-gray-500 font-medium">أضف الموظفين إلى هذه المناوبة لفترة زمنية محددة</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
          {/* Date Selection */}
          <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400">فترة التعيين</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRangeMode(!dateRangeMode)}
                className="text-xs font-bold text-purple-600 hover:bg-purple-50 rounded-lg h-7"
              >
                {dateRangeMode ? 'تبديل لتاريخ واحد' : 'تبديل لنطاق تاريخ'}
              </Button>
            </div>
            <div className={dateRangeMode ? 'grid grid-cols-2 gap-4' : ''}>
              <div className="space-y-1.5">
                {dateRangeMode && <Label className="text-[10px] font-bold text-gray-400 mr-1">تاريخ البدء</Label>}
                <Input
                  type="date"
                  value={assignmentDate}
                  onChange={(e) => {
                    setAssignmentDate(e.target.value);
                    setExistingAssignments([]);
                  }}
                  className="rounded-xl border-gray-200 focus:ring-purple-500 font-medium"
                />
              </div>
              {dateRangeMode && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-gray-400 mr-1">تاريخ الانتهاء</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={assignmentDate}
                    className="rounded-xl border-gray-200 focus:ring-purple-500 font-medium"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Existing Assignments Warning */}
          {existingAssignments.length > 0 && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="pt-0.5">
                  <p className="font-black text-amber-900 text-sm">
                    تنبيه: يوجد {existingAssignments.length} موظفاً معينين بالفعل
                  </p>
                  <p className="text-xs text-amber-700 font-medium mt-0.5">
                    المرتبطون بهذه المناوبة في تاريخ {assignmentDate} تم إخفاؤهم تلقائياً.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Search */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 ml-1">
              اختيار الموظفين {selectedEmployeeIds.length > 0 && (
                <span className="text-purple-600">({selectedEmployeeIds.length} محدد)</span>
              )}
            </Label>
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="ابحث بالاسم أو الرقم الوظيفي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 rounded-xl border-gray-200 focus:ring-purple-500 h-11 shadow-sm"
              />
            </div>
          </div>

          {/* Employee List */}
          <div className="border border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden min-h-[300px]">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
                <p className="text-sm font-bold text-purple-600 animate-pulse">جاري تحميل الموظفين...</p>
              </div>
            ) : filteredEmployees.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployeeIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      onClick={() => toggleEmployeeSelection(emp.id)}
                      className={cn(
                        "flex items-center justify-between p-4 cursor-pointer transition-all hover:bg-gray-50/80",
                        isSelected ? "bg-purple-50/50" : ""
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          className="rounded-md border-gray-300 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                        />
                        <div className="relative">
                          <Avatar className="h-11 w-11 border-2 border-white shadow-sm ring-1 ring-gray-100">
                            <AvatarImage src={emp.avatar} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 font-black text-sm">
                              {emp.firstName[0]}{emp.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full p-0.5 shadow-sm">
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-gray-800">
                              {emp.firstName} {emp.lastName}
                            </p>
                            {emp.employeeNumber && (
                              <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase">
                                #{emp.employeeNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-gray-400 mt-0.5">
                            {emp.department?.name || 'بدون قسم'}
                            {emp.position?.title && ` • ${emp.position.title}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  <Search className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-800">{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا يوجد موظفين متاحين'}</p>
                  <p className="text-xs text-gray-500">حاول البحث بكلمات أخرى أو تغيير التاريخ</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedEmployeeIds.length > 0 && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-purple-200 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-lg">ملخص التعيين</p>
                  <p className="text-purple-100 font-bold text-sm">
                    {selectedEmployeeIds.length} موظف
                    {dateRangeMode && endDate
                      ? ` × ${getDateRange(assignmentDate, endDate).length} أيام عمل`
                      : ' • تعيين ليوم واحد'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 bg-gray-50/50 flex flex-row items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-bold text-gray-500 hover:text-gray-700"
          >
            إلغاء النافذة
          </Button>
          <Button
            onClick={handleAssign}
            disabled={submitting || selectedEmployeeIds.length === 0 || (dateRangeMode && !endDate)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-black px-8 h-12 rounded-2xl shadow-xl shadow-purple-200 transition-all hover:scale-105 active:scale-95"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>جاري الحفظ...</span>
              </div>
            ) : (
              `تأكيد تعيين ${selectedEmployeeIds.length} موظف`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignShiftDialog;
