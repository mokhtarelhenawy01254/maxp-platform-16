import React from "react";
import {
  Users,
  Calculator,
  AlertCircle,
  Zap,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Employee, SimulationState } from "./types";
import { formatCurrency, SCENARIOS } from "./helpers";
import { PayrollSimulatorDeductionsAndAllowancesTabs } from "./PayrollSimulatorDeductionsAndAllowancesTabs";

interface PayrollSimulatorWorkspaceProps {
  selectedEmployee: Employee | null;
  simulation: SimulationState;
  onSimulationChange: (sim: SimulationState) => void;
  calculating: boolean;
  onRunSimulation: () => void;
  onApplyScenario: (scenarioId: string) => void;
}

export const PayrollSimulatorWorkspace: React.FC<
  PayrollSimulatorWorkspaceProps
> = ({
  selectedEmployee,
  simulation,
  onSimulationChange,
  calculating,
  onRunSimulation,
  onApplyScenario,
}) => {
  if (!selectedEmployee) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200">
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="h-24 w-24 bg-indigo-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4"
        >
          <Users className="h-12 w-12 text-indigo-400" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          ابدأ تجربة الحسابات الآن
        </h3>
        <p className="text-slate-500 text-center max-w-sm">
          قم باختيار موظف من القائمة الجانبية لبدء محاكاة عملية صرف الراتب
          وتجربة كافة السيناريوهات المالية.
        </p>
      </div>
    );
  }

  return (
    <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-xl">
      <CardHeader className="bg-primary text-primary-foreground py-4 px-6 flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-white/15 rounded-xl flex items-center justify-center">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              محاكاة راتب: {selectedEmployee.firstName}
            </h2>
            <p className="text-primary-foreground/80 text-xs opacity-90">
              الراتب الأساسي الحالي:{" "}
              <span className="tabular-nums">
                {formatCurrency(selectedEmployee.baseSalary)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onRunSimulation}
            disabled={calculating}
            className="bg-white text-primary hover:bg-primary/10 font-bold h-10 px-6 rounded-lg"
          >
            {calculating ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Zap className="h-4 w-4 ml-2" />
            )}
            بدء الحساب
          </Button>
        </div>
      </CardHeader>

      <Tabs defaultValue="scenarios" className="flex-1 flex flex-col min-h-0">
        <TabsList className="bg-slate-50 dark:bg-slate-900 p-1 flex justify-start rounded-none h-14 px-6 gap-2">
          <TabsTrigger
            value="scenarios"
            className="data-[state=active]:bg-card dark:data-[state=active]:bg-card h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 font-bold"
          >
            سيناريوهات جاهزة
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="data-[state=active]:bg-card dark:data-[state=active]:bg-card h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 font-bold"
          >
            الحضور والإضافي
          </TabsTrigger>
          <TabsTrigger
            value="deductions"
            className="data-[state=active]:bg-card dark:data-[state=active]:bg-card h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 font-bold"
          >
            الخصومات
          </TabsTrigger>
          <TabsTrigger
            value="allowances"
            className="data-[state=active]:bg-card dark:data-[state=active]:bg-card h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-6 font-bold"
          >
            البدلات
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-8">
              <TabsContent value="scenarios" className="mt-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => onApplyScenario(scenario.id)}
                      className="group text-right p-5 rounded-2xl bg-muted/50 border border-border/70 hover:border-primary/40 hover:bg-card transition-all hover:shadow-sm"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <scenario.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-bold text-foreground mb-1">
                        {scenario.name}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {scenario.description}
                      </p>
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="mt-0 space-y-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-xl flex items-start gap-4 mb-6">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    يمكنك تعديل أيام الحضور، التأخيرات، وساعات العمل الإضافي لكل
                    يوم على حدة لاختبار كيفية تأثر الراتب.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {simulation.attendance.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex gap-4"
                    >
                      <div className="shrink-0 text-center">
                        <div className="text-xs text-slate-500 font-bold uppercase font-mono tabular-nums">
                          {att.date.getDate()} فبراير
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Select
                          value={att.status}
                          onValueChange={(v) => {
                            const newAtt = [...simulation.attendance];
                            newAtt[idx].status = v;
                            onSimulationChange({
                              ...simulation,
                              attendance: newAtt,
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRESENT text-emerald-600">
                              حاضر
                            </SelectItem>
                            <SelectItem value="ABSENT text-rose-600">
                              غائب
                            </SelectItem>
                            <SelectItem value="LATE text-amber-600">
                              متأخر
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-[10px] text-slate-400">
                              تأخير (د)
                            </Label>
                            <Input
                              type="number"
                              value={att.lateMinutes}
                              className="h-7 text-xs font-mono tabular-nums"
                              onChange={(e) => {
                                const newAtt = [...simulation.attendance];
                                newAtt[idx].lateMinutes =
                                  parseInt(e.target.value) || 0;
                                onSimulationChange({
                                  ...simulation,
                                  attendance: newAtt,
                                });
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <Label className="text-[10px] text-slate-400">
                              إضافي (س)
                            </Label>
                            <Input
                              type="number"
                              value={att.overtimeHours}
                              className="h-7 text-xs font-mono tabular-nums"
                              onChange={(e) => {
                                const newAtt = [...simulation.attendance];
                                newAtt[idx].overtimeHours =
                                  parseInt(e.target.value) || 0;
                                onSimulationChange({
                                  ...simulation,
                                  attendance: newAtt,
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <PayrollSimulatorDeductionsAndAllowancesTabs
                simulation={simulation}
                onSimulationChange={onSimulationChange}
              />
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </Card>
  );
};
