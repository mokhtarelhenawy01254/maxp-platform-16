import React from "react";
import {
  Calculator,
  RefreshCw,
  Printer,
  Download,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";
import { Switch } from "../../../components/ui/switch";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { numberToArabicWords } from "../../../lib/tafqeet";
import { PayrollResult } from "./types";
import { formatCurrency } from "./payrollCalculations";

interface PayrollResultsPanelProps {
  payrollResult: PayrollResult | null;
  calculating: boolean;
  calculatePayroll: () => Promise<void>;
  saveAsDraft: boolean;
  setSaveAsDraft: (val: boolean) => void;
}

export const PayrollResultsPanel: React.FC<PayrollResultsPanelProps> = ({
  payrollResult,
  calculating,
  calculatePayroll,
  saveAsDraft,
  setSaveAsDraft,
}) => {
  return (
    <Card className="lg:w-80 flex flex-col shrink-0 rounded-2xl border border-border/70 bg-card shadow-xs">
      <CardHeader className="pb-3 border-b border-border/70 bg-muted/20">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
          <Calculator className="h-4 w-4 text-primary" />
          نتائج الحساب
        </CardTitle>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={calculatePayroll}
            disabled={calculating}
          >
            {calculating ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                جاري الحساب...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                حساب الراتب
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100dvh-300px)]">
          {payrollResult ? (
            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500">الراتب الأساسي</div>
                  <div className="font-bold font-mono tabular-nums">
                    {formatCurrency(payrollResult.baseSalary)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500">
                    الراتب المستحق بناءً على الحضور
                  </div>
                  <div className="font-bold font-mono tabular-nums text-indigo-600">
                    {formatCurrency(payrollResult.earnedBaseSalary)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500">إجمالي البدلات</div>
                  <div className="font-bold font-mono tabular-nums text-emerald-600">
                    {formatCurrency(payrollResult.totalAllowances)}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">تفاصيل الخصومات</h4>

                  {payrollResult.attendanceDeductionDetails &&
                    payrollResult.attendanceDeductionDetails.amount > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-rose-700 dark:text-rose-300">
                            خصم الغياب
                          </div>
                          <div className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                            {formatCurrency(payrollResult.attendanceDeduction)}
                          </div>
                        </div>
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                          {payrollResult.attendanceDeductionDetails.reason}
                        </p>
                      </div>
                    )}

                  {payrollResult.latePenaltyDetails &&
                    payrollResult.latePenaltyDetails.amount > 0 && (
                      <div className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-rose-700 dark:text-rose-300">
                            خصم التأخير
                          </div>
                          <div className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                            {formatCurrency(payrollResult.latePenalty)}
                          </div>
                        </div>
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                          {payrollResult.latePenaltyDetails.reason}
                        </p>
                      </div>
                    )}

                  {payrollResult.deductionDetails &&
                    payrollResult.deductionDetails.map((deduction, index) => (
                      <div
                        key={index}
                        className="bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg"
                      >
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-rose-700 dark:text-rose-300">
                            {deduction.name}
                          </div>
                          <div className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                            {formatCurrency(deduction.amount)}
                          </div>
                        </div>
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                          {deduction.reason}
                        </p>
                      </div>
                    ))}

                  {payrollResult.taxDetails && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-amber-700 dark:text-amber-300">
                          الضريبة
                        </div>
                        <div className="font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                          {formatCurrency(payrollResult.taxAmount)}
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        {payrollResult.taxDetails.reason}
                      </p>
                    </div>
                  )}

                  {payrollResult.socialInsuranceDetails && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          التأمينات الاجتماعية
                        </div>
                        <div className="font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                          {formatCurrency(payrollResult.socialInsurance)}
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {payrollResult.socialInsuranceDetails.reason}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <div className="text-sm font-medium text-rose-700 dark:text-rose-300">
                      إجمالي الخصومات
                    </div>
                    <div className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      {formatCurrency(
                        payrollResult.totalDeductions +
                          payrollResult.taxAmount +
                          payrollResult.socialInsurance +
                          payrollResult.attendanceDeduction +
                          payrollResult.latePenalty,
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500">قيمة العمل الإضافي</div>
                  <div className="font-bold font-mono tabular-nums text-emerald-600">
                    {formatCurrency(payrollResult.overtimeAmount)}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500">إجمالي الراتب</div>
                  <div className="font-bold font-mono tabular-nums">
                    {formatCurrency(payrollResult.grossSalary)}
                  </div>
                </div>

                <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-950/30 p-2 rounded-lg">
                  <div className="font-bold text-indigo-700 dark:text-indigo-300">
                    صافي الراتب
                  </div>
                  <div className="font-bold text-lg font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(payrollResult.netSalary)}
                  </div>
                </div>

                <div className="text-xs text-slate-500 text-center pt-2">
                  {numberToArabicWords(payrollResult.netSalary)} جنيه لا غير
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium text-sm">ملخص الحضور</h4>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">أيام العمل القياسية:</span>
                    <span className="font-medium font-mono tabular-nums">
                      {payrollResult.standardWorkingDays}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">معدل اليوم:</span>
                    <span className="font-medium font-mono tabular-nums">
                      {formatCurrency(payrollResult.dailyRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">أيام الحضور:</span>
                    <span className="font-medium font-mono tabular-nums">
                      {payrollResult.actualWorkDays}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">أيام الغياب:</span>
                    <span className="font-medium font-mono tabular-nums">
                      {payrollResult.absentDays}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ساعات إضافية:</span>
                    <span className="font-medium font-mono tabular-nums">
                      {payrollResult.overtimeHours}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSaveAsDraft(!saveAsDraft)}
                  >
                    <div className="flex items-center gap-2">
                      <Switch checked={saveAsDraft} />
                      <span>حفظ كمسودة</span>
                    </div>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      tToast.success("PayrollTesting.msg_98c4");
                    }}
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تصدير PDF
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      tToast.success("PayrollTesting.msg_f478");
                    }}
                  >
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    toast.success(
                      saveAsDraft
                        ? "تم حفظ الراتب كمسودة"
                        : "تم حفظ واعتماد الراتب",
                    );
                  }}
                >
                  <Save className="h-4 w-4 ml-2" />
                  {saveAsDraft ? "حفظ كمسودة" : "حفظ واعتماد"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center">
              <div className="py-8 px-4 flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
                  <Calculator className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  لم يتم حساب الراتب بعد
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  اضغط على زر حساب الراتب لعرض النتائج بناءً على البيانات
                  الحالية
                </p>
                <Button onClick={calculatePayroll} disabled={calculating}>
                  {calculating ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      جاري الحساب...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      حساب الراتب الآن
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
