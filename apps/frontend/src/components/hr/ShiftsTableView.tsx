import React from 'react';
import { Edit, Trash2, Clipboard, Users, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { calculateWorkHours } from '../../utils/shiftHelpers';
import { cn } from '../../lib/utils';

interface Shift {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    breakDuration: number;
    color: string;
    isActive: boolean;
    _count?: {
        assignments: number;
    };
}

interface ShiftsTableViewProps {
    shifts: Shift[];
    selectedShifts: string[];
    onToggleSelect: (shiftId: string) => void;
    onToggleSelectAll: () => void;
    onEdit: (shift: Shift) => void;
    onDelete: (shiftId: string) => void;
    onDuplicate: (shift: Shift) => void;
    onToggleStatus: (shiftId: string, currentStatus: boolean) => void;
}

const ShiftsTableView: React.FC<ShiftsTableViewProps> = ({
    shifts,
    selectedShifts,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onDelete,
    onDuplicate,
    onToggleStatus,
}) => {
    const navigate = useNavigate();

    const allSelected = shifts.length > 0 && selectedShifts.length === shifts.length;
    const someSelected = selectedShifts.length > 0 && selectedShifts.length < shifts.length;

    return (
        <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md overflow-hidden rounded-2xl animate-in fade-in duration-500">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full" dir="rtl">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="px-4 py-4 text-right w-12">
                                    <Checkbox
                                        checked={allSelected}
                                        indeterminate={someSelected}
                                        onCheckedChange={onToggleSelectAll}
                                        className="border-gray-300"
                                    />
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    اسم المناوبة
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    وقت البدء
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    وقت الانتهاء
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    الراحة
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    ساعات العمل
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    الموظفين
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    الحالة
                                </th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                            {shifts.map((shift) => (
                                <tr
                                    key={shift.id}
                                    className="group hover:bg-white/40 dark:hover:bg-gray-800/40 transition-all duration-200"
                                >
                                    <td className="px-4 py-4">
                                        <Checkbox
                                            checked={selectedShifts.includes(shift.id)}
                                            onCheckedChange={() => onToggleSelect(shift.id)}
                                            className="border-gray-300"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                                                style={{ backgroundColor: shift.color }}
                                            />
                                            <button
                                                onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                                                className="font-black text-sm text-gray-800 hover:text-purple-600 transition-colors text-right"
                                            >
                                                {shift.name}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-xs text-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                            {shift.startTime}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-xs text-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                            {shift.endTime}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                        {shift.breakDuration} دقيقة
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-black text-[10px] px-2 py-0.5 rounded-md">
                                            {calculateWorkHours(shift.startTime, shift.endTime, shift.breakDuration)} ساعة
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 font-black text-purple-600 bg-purple-50 w-fit px-2 py-0.5 rounded-md border-none text-[10px]">
                                            <Users className="h-3 w-3" />
                                            {shift._count?.assignments || 0}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={shift.isActive}
                                                onCheckedChange={() => onToggleStatus(shift.id, shift.isActive)}
                                                className="scale-90"
                                            />
                                            <span className={cn(
                                                "text-[10px] font-black px-2 py-0.5 rounded-md",
                                                shift.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                                            )}>
                                                {shift.isActive ? 'نشط' : 'معطل'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-lg hover:bg-purple-50 hover:text-purple-600 text-gray-400"
                                                onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                                                title="عرض التفاصيل"
                                            >
                                                <Users className="h-4 w-4" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100">
                                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-none p-1 bg-white/95 backdrop-blur-md">
                                                    <DropdownMenuItem className="rounded-lg gap-2 font-medium py-2 px-3" onClick={() => onEdit(shift)}>
                                                        <Edit className="h-4 w-4 text-blue-500" />
                                                        تعديل
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="rounded-lg gap-2 font-medium py-2 px-3" onClick={() => onDuplicate(shift)}>
                                                        <Copy className="h-4 w-4 text-indigo-500" />
                                                        نسخ
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="rounded-lg gap-2 font-medium py-2 px-3"
                                                        onClick={() => navigate(`/hr/shifts/${shift.id}`)}
                                                    >
                                                        <Users className="h-4 w-4 text-purple-500" />
                                                        تعيين موظفين
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => onDelete(shift.id)}
                                                        className="rounded-lg gap-2 font-medium text-red-600 focus:text-red-700 focus:bg-red-50 py-2 px-3"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        حذف
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};

export default ShiftsTableView;
