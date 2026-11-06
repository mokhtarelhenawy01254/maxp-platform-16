import React from "react";
import {
  Calculator,
  Save,
  Printer,
  Plus,
  ShieldCheck,
  MinusCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Separator } from "../../../../components/ui/separator";
import { toast } from "sonner";
import { tToast } from "../../../../utils/i18n-toast";
import { numberToArabicWords } from "../../../../lib/tafqeet";
import { formatCurrency } from "./helpers";

interface PayrollSimulatorResultsPanelProps {
  results: any;
}

export const PayrollSimulatorResultsPanel: React.FC<
  PayrollSimulatorResultsPanelProps
> = ({ results }) => {
  return (
    <Card className="w-96 flex flex-col shrink-0 border-none shadow-2xl bg-white dark:bg-slate-900">
      <CardHeader className="border-b dark:border-slate-800">
        <CardTitle className="text-lg flex items-center justify-between">
          نتائج الحساب المباشرة
          <Badge
            variant="outline"
            className="text-[10px] font-bold tracking-widest uppercase"
          >
            Live Breakdown
          </Badge>
        </CardTitle>
        <CardDescription>
          هذه البيانات تقديرية بناءً على المدخلات الحالية
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
        {!results ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Calculator className="h-16 w-16 mb-4 opacity-10" />
            <p className="text-sm italic">
              اضغط على "بدء الحساب" لرؤية تفاصيل الراتب والخصومات والضرائب
              المطبقة.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Plus className="h-3 w-3 text-emerald-500" /> إجمالي
                    الاستحقاقات
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        الراتب الأساسي
                      </span>
                      <span className="font-bold font-mono tabular-nums">
                        {formatCurrency(results.baseSalary)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        إجمالي البدلات
                      </span>
                      <span className="font-bold text-emerald-600 font-mono tabular-nums">
                        +{formatCurrency(results.totalAllowances)}
                      </span>
                    </div>
                    {results.overtimeAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          العمل الإضافي (
                          <span className="font-mono tabular-nums">
                            {results.overtimeHours}
                          </span>{" "}
                          س)
                        </span>
                        <span className="font-bold text-emerald-600 font-mono tabular-nums">
                          +{formatCurrency(results.overtimeAmount)}
                        </span>
                      </div>
                    )}
                    {results.bonuses > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          المكافآت
                        </span>
                        <span className="font-bold text-emerald-600 font-mono tabular-nums">
                          +{formatCurrency(results.bonuses)}
                        </span>
                      </div>
                    )}
                    <Separator className="my-2 bg-slate-100 dark:bg-slate-800" />
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>إجمالي الدخل</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(results.grossSalary)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <MinusCircle className="h-3 w-3 text-rose-500" /> إجمالي
                    الاستقطاعات
                  </h5>
                  <div className="space-y-2">
                    {results.absentDays > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          خصم الغياب (
                          <span className="font-mono tabular-nums">
                            {results.absentDays}
                          </span>{" "}
                          يوم)
                        </span>
                        <span className="font-bold text-rose-600 font-mono tabular-nums">
                          -{formatCurrency(results.attendanceDeduction)}
                        </span>
                      </div>
                    )}
                    {results.latePenalty > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          خصم التأخير
                        </span>
                        <span className="font-bold text-rose-600 font-mono tabular-nums">
                          -{formatCurrency(results.latePenalty)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        تأمينات اجتماعية
                      </span>
                      <span className="font-bold text-rose-600 font-mono tabular-nums">
                        -{formatCurrency(results.socialInsurance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        ضريبة الدخل
                      </span>
                      <span className="font-bold text-rose-600 font-mono tabular-nums">
                        -{formatCurrency(results.taxAmount)}
                      </span>
                    </div>
                    {results.totalDeductions >
                      results.attendanceDeduction + results.latePenalty && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          خصومات أخرى
                        </span>
                        <span className="font-bold text-rose-600 font-mono tabular-nums">
                          -
                          {formatCurrency(
                            results.totalDeductions -
                              results.attendanceDeduction -
                              results.latePenalty
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-primary text-primary-foreground rounded-2xl p-6 text-center shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <ShieldCheck className="h-16 w-16" />
                  </div>
                  <p className="text-primary-foreground/80 text-sm font-medium mb-1">
                    صافي المبلغ المستحق
                  </p>
                  <h4 className="text-3xl font-bold mb-1 tabular-nums">
                    {formatCurrency(results.netSalary)}
                  </h4>
                  <p className="text-[10px] text-white/90 font-bold mb-1">
                    {numberToArabicWords(results.netSalary)}
                  </p>
                  <p className="text-[10px] text-white/60">
                    تم حساب الضرائب والتأمينات حسب القوانين المتبعة
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500">
                      أيام العمل المعتبرة:
                    </span>
                    <span className="font-bold font-mono tabular-nums">
                      {results.workingDays} يوم
                    </span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500">معدل أجر اليوم:</span>
                    <span className="font-bold font-mono tabular-nums">
                      {formatCurrency(
                        results.baseSalary / results.workingDays
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-6 border-t dark:border-slate-800 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl gap-2 h-11 border-slate-200"
                  onClick={() => tToast.info("PayrollSimulator.msg_4b00")}
                >
                  <Printer className="h-4 w-4" />
                  طباعة تجريبية
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-black gap-2 h-11"
                  onClick={() =>
                    tToast.success("PayrollSimulator.success_save_47f4")
                  }
                >
                  <Save className="h-4 w-4" />
                  حفظ كمسودة
                </Button>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl text-lg font-bold shadow-lg shadow-emerald-200 dark:shadow-none"
                onClick={() =>
                  toast.warning(
                    "لا يمكن اعتماد بيانات المحاكاة مباشرة، يرجى إنشاء كشف راتب رسمي."
                  )
                }
              >
                <ShieldCheck className="h-5 w-5 ml-2" />
                اعتماد كراتب رسمي
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
