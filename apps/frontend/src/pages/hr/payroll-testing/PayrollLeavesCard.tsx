import React from "react";
import { format } from "date-fns";
import { FileText, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { LeaveRecord } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

interface PayrollLeavesCardProps {
  leaves: LeaveRecord[];
  setLeaves: (leaves: LeaveRecord[]) => void;
}

export const PayrollLeavesCard: React.FC<PayrollLeavesCardProps> = ({
  leaves,
  setLeaves,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          سجلات الإجازات
        </CardTitle>
        <CardDescription>
          إضافة إجازات مدفوعة أو غير مدفوعة للموظف
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaves.length === 0 ? (
            <div className="text-center py-6 text-slate-400 italic">
              لا توجد إجازات مضافة
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map((leave, index) => (
                <div
                  key={leave.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">إجازة {leave.type}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-8 w-8"
                      onClick={() => {
                        setLeaves(leaves.filter((_, i) => i !== index));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">نوع الإجازة</Label>
                      <Select
                        value={leave.type}
                        onValueChange={(value) => {
                          const newLeaves = [...leaves];
                          newLeaves[index].type = value;
                          setLeaves(newLeaves);
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ANNUAL">سنوية</SelectItem>
                          <SelectItem value="SICK">مرضية</SelectItem>
                          <SelectItem value="UNPAID">بدون راتب</SelectItem>
                          <SelectItem value="EMERGENCY">طارئة</SelectItem>
                          <SelectItem value="OTHER">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">مدفوعة</Label>
                      <div className="flex items-center h-10 mt-1">
                        <Switch
                          checked={leave.isPaid}
                          onCheckedChange={(checked) => {
                            const newLeaves = [...leaves];
                            newLeaves[index].isPaid = checked;
                            setLeaves(newLeaves);
                          }}
                        />
                        <span className="mr-2 text-sm">
                          {leave.isPaid ? "نعم" : "لا"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">تاريخ البداية</Label>
                      <DateInput
                        
                        value={format(leave.startDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const newLeaves = [...leaves];
                          newLeaves[index].startDate = new Date(e.target.value);
                          const diffTime = Math.abs(
                            newLeaves[index].endDate.getTime() -
                              newLeaves[index].startDate.getTime(),
                          );
                          const diffDays =
                            Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          newLeaves[index].days = diffDays;
                          setLeaves(newLeaves);
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">تاريخ النهاية</Label>
                      <DateInput
                        
                        value={format(leave.endDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const newLeaves = [...leaves];
                          newLeaves[index].endDate = new Date(e.target.value);
                          const diffTime = Math.abs(
                            newLeaves[index].endDate.getTime() -
                              newLeaves[index].startDate.getTime(),
                          );
                          const diffDays =
                            Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          newLeaves[index].days = diffDays;
                          setLeaves(newLeaves);
                        }}
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">عدد الأيام</Label>
                      <div className="mt-1 font-bold font-mono tabular-nums">
                        {leave.days} يوم
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const today = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(today.getDate() + 1);

              setLeaves([
                ...leaves,
                {
                  id: `leave-${Date.now()}`,
                  type: "ANNUAL",
                  startDate: today,
                  endDate: tomorrow,
                  days: 2,
                  isPaid: true,
                },
              ]);
            }}
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة إجازة جديدة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
