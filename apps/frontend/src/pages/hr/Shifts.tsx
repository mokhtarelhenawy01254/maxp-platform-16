import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock, Plus, Users, Edit, Trash2, Search,
  TrendingUp, LayoutGrid, Table as TableIcon,
  Copy, MoreVertical, CheckSquare, X, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import { tToast } from "../../utils/i18n-toast";
import ShiftsSkeleton from '../../components/hr/ShiftsSkeleton';
import ShiftsTableView from '../../components/hr/ShiftsTableView';
import AssignShiftDialog from '../../components/hr/AssignShiftDialog';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';
import { cn } from '../../lib/utils';
import { calculateWorkHours, validateShiftTimes, SHIFT_TEMPLATES } from '../../utils/shiftHelpers';

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  color: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  _count?: {
    shiftAssignments: number;
  };
}

const Shifts: React.FC = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    return (localStorage.getItem('shiftsViewMode') as 'grid' | 'table') || 'grid';
  });

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [shiftToAssign, setShiftToAssign] = useState<{ id: string; name: string } | null>(null);

  // Selection
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [shiftToDelete, setShiftToDelete] = useState<string | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'startTime' | 'employees' | 'custom'>('custom');

  // Form
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 60,
    color: '#3B82F6',
    sortOrder: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchShifts();
  }, []);

  useEffect(() => {
    localStorage.setItem('shiftsViewMode', viewMode);
  }, [viewMode]);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/shifts');
      setShifts(response.data.shifts || []);
    } catch (error: any) {
      console.error('❌ Error fetching shifts:', error);
      toast.error(error.response?.data?.error || 'فشل في جلب المناوبات');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors['name'] = 'يرجى إدخال اسم المناوبة';

    const validation = validateShiftTimes(
      formData.startTime,
      formData.endTime,
      formData.breakDuration
    );

    if (!validation.valid && validation.error) {
      errors['time'] = validation.error;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({ name: '', startTime: '09:00', endTime: '17:00', breakDuration: 60, color: '#3B82F6', sortOrder: 0 });
    setFormErrors({});
    setEditingShift(null);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      await api.post('/hr/shifts', formData);
      tToast.success("hr_Shifts.success_create_c830");
      setDialogOpen(false);
      resetForm();
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل في إنشاء المناوبة');
    }
  };

  const handleUpdate = async () => {
    if (!editingShift || !validateForm()) return;
    try {
      await api.put(`/hr/shifts/${editingShift.id}`, formData);
      tToast.success("hr_Shifts.success_update_bb31");
      setDialogOpen(false);
      resetForm();
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'فشل في تحديث المناوبة');
    }
  };

  const handleToggleStatus = async (shiftId: string, currentStatus: boolean) => {
    try {
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, isActive: !currentStatus } : s));

      await api.put(`/hr/shifts/${shiftId}`, { isActive: !currentStatus });
      toast.success(currentStatus ? 'تم تعطيل المناوبة' : 'تم تفعيل المناوبة');
    } catch (error) {
      setShifts(prev => prev.map(s => s.id === shiftId ? { ...s, isActive: currentStatus } : s));
      tToast.error("hr_Shifts.msg_744f");
    }
  };

  const handleDuplicate = async (shift: Shift) => {
    setFormData({
      name: `${shift.name} (نسخة)`,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration,
      color: shift.color,
      sortOrder: shift.sortOrder
    });
    setEditingShift(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!shiftToDelete) return;
    try {
      if (shiftToDelete === 'bulk') {
        await Promise.all(selectedShifts.map(id => api.delete(`/hr/shifts/${id}`)));
        toast.success(`تم حذف ${selectedShifts.length} مناوبة`);
        setSelectedShifts([]);
      } else {
        await api.delete(`/hr/shifts/${shiftToDelete}`);
        tToast.success("hr_Shifts.success_delete_06fc");
      }
      setDeleteDialogOpen(false);
      setShiftToDelete(null);
      fetchShifts();
    } catch (error) {
      tToast.error("hr_Shifts.failed_delete_901a");
    }
  };


  const filteredAndSortedShifts = useMemo(() => {
    return shifts
      .filter(shift => {
        if (searchTerm && !shift.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        if (statusFilter === 'active' && !shift.isActive) return false;
        if (statusFilter === 'inactive' && shift.isActive) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
        if (sortBy === 'startTime') return a.startTime.localeCompare(b.startTime);
        if (sortBy === 'employees') return (b._count?.shiftAssignments || 0) - (a._count?.shiftAssignments || 0);
        if (sortBy === 'custom') {
          if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
  }, [shifts, searchTerm, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = shifts.length;
    const active = shifts.filter(s => s.isActive).length;
    const totalAssignments = shifts.reduce((sum, s) => sum + (s._count?.shiftAssignments || 0), 0);
    return { total, active, inactive: total - active, totalAssignments };
  }, [shifts]);

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    'n': (e: KeyboardEvent) => {
      resetForm();
      setDialogOpen(true);
    },
    '/': (e: KeyboardEvent) => {
      e.preventDefault();
      searchInputRef.current?.focus();
    },
    'escape': (e: KeyboardEvent) => {
      setDialogOpen(false);
      setDeleteDialogOpen(false);
    }
  });

  return (
    <div className="hr-theme min-h-screen p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <h1 className="text-4xl font-black tracking-tight">المناوبات</h1>
          <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4 text-purple-400" />
            إدارة مناوبات العمل وجداول الموظفين
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <Button
            variant={viewMode === 'grid' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'shadow-sm bg-white dark:bg-gray-700' : ''}
          >
            <LayoutGrid className="h-4 w-4 ml-2" />
            شبكة
          </Button>
          <Button
            variant={viewMode === 'table' ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode('table')}
            className={viewMode === 'table' ? 'shadow-sm bg-white dark:bg-gray-700' : ''}
          >
            <TableIcon className="h-4 w-4 ml-2" />
            جدول
          </Button>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 ml-2" />
          مناوبة جديدة
        </Button>
      </div>

      {/* Stats - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
          <div className="h-1 w-full bg-blue-500 opacity-50" />
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">الإجمالي</p>
              <p className="text-2xl font-black text-gray-800">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-500 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
          <div className="h-1 w-full bg-green-500 opacity-50" />
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">نشطة</p>
              <p className="text-2xl font-black text-green-600">{stats.active}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-2xl text-green-500 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
          <div className="h-1 w-full bg-gray-400 opacity-50" />
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">معطلة</p>
              <p className="text-2xl font-black text-gray-600">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl text-gray-400 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg bg-white/60 backdrop-blur-md overflow-hidden group hover:shadow-xl transition-all">
          <div className="h-1 w-full bg-purple-500 opacity-50" />
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">الموظفين</p>
              <p className="text-2xl font-black text-purple-600">{stats.totalAssignments}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-500 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      {selectedShifts.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-800 dark:text-blue-200">تم تحديد {selectedShifts.length} مناوبة</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
              onClick={() => { setShiftToDelete('bulk'); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف المحدد
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedShifts([])}
            >
              <X className="h-4 w-4 ml-2" />
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={searchInputRef}
            placeholder="ابحث عن مناوبة... (/)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="ترتيب حسب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">الاسم</SelectItem>
            <SelectItem value="startTime">وقت البدء</SelectItem>
            <SelectItem value="employees">عدد الموظفين</SelectItem>
            <SelectItem value="custom">الترتيب المخصص</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <ShiftsSkeleton viewMode={viewMode} />
      ) : filteredAndSortedShifts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد مناوبات'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
              {searchTerm
                ? `لم يتم العثور على أي مناوبات تطابق "${searchTerm}". جرب مصطلحات بحث مختلفة.`
                : 'قم بإنشاء أول مناوبة عمل لتنظيم جدول الموظفين.'}
            </p>
            {searchTerm ? (
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                مسح البحث
              </Button>
            ) : (
              <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 ml-2" />
                إنشاء مناوبة الآن
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'table' ? (
            <ShiftsTableView
              shifts={filteredAndSortedShifts}
              selectedShifts={selectedShifts}
              onToggleSelect={(id) => setSelectedShifts(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
              )}
              onToggleSelectAll={() => setSelectedShifts(
                selectedShifts.length === filteredAndSortedShifts.length ? [] : filteredAndSortedShifts.map(s => s.id)
              )}
              onEdit={(shift) => {
                setEditingShift(shift); setFormData({
                  name: shift.name,
                  startTime: shift.startTime,
                  endTime: shift.endTime,
                  breakDuration: shift.breakDuration,
                  color: shift.color,
                  sortOrder: shift.sortOrder || 0
                }); setDialogOpen(true);
              }}
              onDelete={(id) => { setShiftToDelete(id); setDeleteDialogOpen(true); }}
              onDuplicate={handleDuplicate}
              onToggleStatus={handleToggleStatus}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedShifts.map((shift) => (
                <div
                  key={shift.id}
                  className={cn(
                    "transition-all duration-500 hover:shadow-2xl cursor-pointer group relative rounded-2xl border-none shadow-xl overflow-hidden bg-white/80 dark:bg-gray-900/60 backdrop-blur-xl",
                    selectedShifts.includes(shift.id) ? "ring-2 ring-blue-500" : "ring-1 ring-gray-100 dark:ring-white/5"
                  )}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && !target.closest('.no-click') && !target.closest('input')) {
                      navigate(`/hr/shifts/${shift.id}`);
                    }
                  }}
                >
                  <div
                    className="h-1.5 w-full transition-opacity group-hover:opacity-100 opacity-70"
                    style={{ backgroundColor: shift.color }}
                  />

                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedShifts.includes(shift.id)}
                          onCheckedChange={(checked) => {
                            checked
                              ? setSelectedShifts([...selectedShifts, shift.id])
                              : setSelectedShifts(selectedShifts.filter(id => id !== shift.id));
                          }}
                          className="no-click border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <CardTitle className="text-xl font-black text-gray-800 dark:text-gray-100 leading-tight group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                          {shift.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 no-click" onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={shift.isActive}
                          onCheckedChange={() => handleToggleStatus(shift.id, shift.isActive)}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3" /> الوقت
                        </span>
                        <div className="flex items-center gap-2 font-bold text-xs bg-gray-50 dark:bg-gray-800/80 px-2 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-200">
                          {shift.startTime} - {shift.endTime}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">ساعات العمل</span>
                        <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-none font-black text-xs px-2.5 py-1 rounded-lg">
                          {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration)} ساعة
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">الموظفين</span>
                        <div className="flex items-center gap-1.5 font-black text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-1 rounded-lg border-none">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-xs">{shift._count?.shiftAssignments || 0}</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-50 flex items-center justify-between no-click" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-9 px-4 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 font-bold text-xs"
                          onClick={(e) => { e.stopPropagation(); navigate(`/hr/shifts/${shift.id}`); }}
                        >
                          عرض التفاصيل
                        </Button>

                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-gray-50">
                                <MoreVertical className="h-4 w-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" dir="rtl" className="rounded-xl shadow-xl border-none p-1 bg-white/95 backdrop-blur-md">
                              <DropdownMenuItem
                                className="rounded-lg gap-2 font-medium py-2 px-3"
                                onClick={() => {
                                  setEditingShift(shift);
                                  setFormData({
                                    name: shift.name,
                                    startTime: shift.startTime,
                                    endTime: shift.endTime,
                                    breakDuration: shift.breakDuration,
                                    color: shift.color,
                                    sortOrder: shift.sortOrder || 0
                                  });
                                  setDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 text-blue-500" />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-lg gap-2 font-medium py-2 px-3"
                                onClick={() => handleDuplicate(shift)}
                              >
                                <Copy className="h-4 w-4 text-indigo-500" />
                                نسخ
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-lg gap-2 font-medium py-2 px-3"
                                onClick={() => {
                                  setShiftToAssign({ id: shift.id, name: shift.name });
                                  setAssignDialogOpen(true);
                                }}
                              >
                                <Users className="h-4 w-4 text-purple-500" />
                                تعيين موظفين
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setShiftToDelete(shift.id); setDeleteDialogOpen(true); }}
                                className="rounded-lg gap-2 font-medium text-red-600 focus:text-red-700 focus:bg-red-50 py-2 px-3"
                              >
                                <Trash2 className="h-4 w-4" />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open) resetForm();
        setDialogOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl" dir="rtl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-black text-gray-800 dark:text-gray-100">
              {editingShift ? 'تعديل المناوبة' : 'مناوبة جديدة'}
            </DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">قم بضبط تفاصيل وقت العمل وفترة الراحة وألوان التمييز</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 custom-scrollbar">
            {/* Quick Templates - Only show when creating new shift */}
            {!editingShift && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-1 bg-purple-600 rounded-full" />
                  <Label className="text-sm font-black text-gray-700 dark:text-gray-300">قوالب سريعة</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SHIFT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          name: template.name,
                          startTime: template.startTime,
                          endTime: template.endTime,
                          breakDuration: template.breakDuration,
                          color: template.color,
                          sortOrder: 0
                        });
                      }}
                      className="group flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl hover:shadow-purple-100 dark:hover:shadow-none transition-all duration-300 text-right bg-gray-50/50 dark:bg-white/5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
                      <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl shadow-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 relative z-10">
                        {template.icon}
                      </div>
                      <div className="flex-1 relative z-10">
                        <p className="font-black text-gray-800 dark:text-gray-200 text-sm group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors uppercase tracking-tight">{template.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[9px] font-black border-none bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-1.5 py-0">
                            {template.startTime} - {template.endTime}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-100 dark:border-gray-800" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white/80 dark:bg-gray-900/80 px-4 text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 backdrop-blur-sm rounded-full">أو إدخال بيانات مخصصة</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">اسم المناوبة</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: الدوام الصباحي (A)"
                  className={cn(
                    "rounded-xl border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 focus:ring-purple-500 h-11 font-medium shadow-sm transition-all",
                    formErrors['name'] ? 'border-red-500 ring-1 ring-red-500/20' : ''
                  )}
                />
                {formErrors['name'] && (
                  <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1">
                    <span>⚠</span> {formErrors['name']}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">وقت البدء</Label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="pr-10 rounded-xl border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-purple-500 font-black h-11 dark:text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">وقت الانتهاء</Label>
                  <div className="relative">
                    <Clock className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className={cn(
                        "pr-10 rounded-xl border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-purple-500 font-black h-11 dark:text-white",
                        formErrors['endTime'] ? 'border-red-500' : ''
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">مدة الراحة (دقائق)</Label>
                  <Input
                    type="number"
                    value={formData.breakDuration}
                    onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })}
                    className={cn(
                      "rounded-xl border-gray-200 dark:border-gray-800 dark:bg-gray-800 focus:ring-purple-500 h-11 font-black dark:text-white",
                      formErrors['breakDuration'] ? 'border-red-500' : ''
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">لون التمييز</Label>
                  <div className="flex items-center gap-3 p-1 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-white/5 h-11 group">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-full p-0.5 border-none bg-transparent cursor-pointer rounded-lg overflow-hidden"
                    />
                    <span className="text-xs font-black text-gray-500 dark:text-gray-400 font-mono tracking-tighter uppercase">{formData.color}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">ترتيب العرض (اختياري)</Label>
                <Input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="rounded-xl border-gray-200 dark:border-gray-800 dark:bg-gray-800/50 focus:ring-purple-500 h-11 font-medium shadow-sm transition-all"
                />
                <p className="text-[9px] text-gray-400 mr-1">أرقام أصغر تظهر أولاً</p>
              </div>
            </div>
          </div>

          {/* Enhanced Live Preview */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 overflow-hidden relative group mt-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/70">ساعات العمل الصافية</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">
                    {calculateWorkHours(formData.startTime, formData.endTime, formData.breakDuration)}
                  </span>
                  <span className="text-sm font-bold text-blue-100/90 tracking-tight">ساعة / يوم</span>
                </div>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center p-3 backdrop-blur-md shadow-inner border border-white/20">
                <Clock className="w-full h-full text-white" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none rounded-lg font-black text-[10px] px-2 py-1">
                  {formData.startTime} PM
                </Badge>
                <div className="h-0.5 w-4 bg-white/30 rounded-full" />
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none rounded-lg font-black text-[10px] px-2 py-1">
                  {formData.endTime} AM
                </Badge>
              </div>
              <p className="text-[10px] font-black text-blue-100/50">تلقائي • ذكي</p>
            </div>
          </div>

          {formErrors['time'] && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in zoom-in-95">
              <p className="text-xs text-red-600 font-black flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {formErrors['time']}
              </p>
            </div>
          )}

          <DialogFooter className="p-6 pt-3 bg-gray-50/50 dark:bg-black/20 flex flex-row items-center justify-between border-t border-gray-100 dark:border-gray-800">
            <Button
              variant="ghost"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
              className="font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
            >
              إلغاء التعديلات
            </Button>
            <div className="flex gap-3">
              <Button
                onClick={editingShift ? handleUpdate : handleCreate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 h-12 rounded-2xl shadow-xl shadow-blue-200 dark:shadow-none transition-all hover:scale-105 active:scale-95 border-none"
              >
                {editingShift ? 'حفظ التحديثات' : 'إنشاء المناوبة الآن'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              {shiftToDelete === 'bulk'
                ? `سيتم حذف ${selectedShifts.length} مناوبة. لا يمكن التراجع عن هذا الإجراء.`
                : 'سيتم حذف هذه المناوبة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {shiftToAssign && (
        <AssignShiftDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          shiftId={shiftToAssign.id}
          shiftName={shiftToAssign.name}
          onSuccess={fetchShifts}
        />
      )}
    </div>
  );
};

export default Shifts;
