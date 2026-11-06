import React from "react";
import { Users, Calculator, MinusCircle, Calendar, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  usePayrollTestingController,
  PayrollTestingHeader,
  PayrollEmployeeSidebar,
  PayrollEmployeeTab,
  PayrollAdjustmentsTab,
  PayrollAttendanceTab,
  PayrollScenariosTab,
  PayrollResultsPanel,
  formatCurrency,
} from "./payroll-testing";

const PayrollTesting: React.FC = () => {
  const ctrl = usePayrollTestingController();

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <PayrollTestingHeader />

      <div className="flex flex-col lg:flex-row gap-6">
        <PayrollEmployeeSidebar
          searchQuery={ctrl.searchQuery}
          setSearchQuery={ctrl.setSearchQuery}
          loadingEmployees={ctrl.loadingEmployees}
          filteredEmployees={ctrl.filteredEmployees}
          selectedEmployee={ctrl.selectedEmployee}
          handleSelectEmployee={ctrl.handleSelectEmployee}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {!ctrl.selectedEmployee ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 p-8 min-h-[400px]">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="h-24 w-24 bg-indigo-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4"
              >
                <Users className="h-12 w-12 text-indigo-400" />
              </motion.div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                ابدأ اختبار الرواتب الآن
              </h3>
              <p className="text-slate-500 text-center max-w-md">
                قم باختيار موظف من القائمة الجانبية لبدء اختبار نظام الرواتب
                وتجربة كافة السيناريوهات المالية المختلفة.
              </p>
            </div>
          ) : (
            <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardHeader className="rounded-t-2xl border-b border-border/70 bg-muted/30 text-card-foreground py-4 px-6 flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      اختبار راتب: {ctrl.selectedEmployee.firstName}{" "}
                      {ctrl.selectedEmployee.lastName}
                    </h2>
                    <p className="text-muted-foreground text-xs font-mono tabular-nums">
                      الراتب الأساسي الحالي:{" "}
                      {formatCurrency(ctrl.selectedEmployee.baseSalary)} •{" "}
                      {ctrl.selectedEmployee.position?.title || "موظف"} •{" "}
                      {ctrl.selectedEmployee.department?.name || "بدون قسم"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold h-10 px-4 rounded-lg"
                    onClick={() => ctrl.setSelectedEmployee(null)}
                  >
                    تغيير الموظف
                  </Button>
                </div>
              </CardHeader>

              <Tabs
                value={ctrl.activeTab}
                onValueChange={ctrl.setActiveTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="bg-slate-50 dark:bg-slate-900 p-1 flex justify-start rounded-none h-14 px-6 gap-2">
                  <TabsTrigger
                    value="employee"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    <Users className="h-4 w-4 ml-2" />
                    بيانات الموظف
                  </TabsTrigger>
                  <TabsTrigger
                    value="deductions"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    <MinusCircle className="h-4 w-4 ml-2" />
                    الخصومات
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    <Calendar className="h-4 w-4 ml-2" />
                    الحضور والإجازات
                  </TabsTrigger>
                  <TabsTrigger
                    value="scenarios"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    <Settings className="h-4 w-4 ml-2" />
                    سيناريوهات جاهزة
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(100dvh-300px)]">
                    <div className="p-6">
                      <TabsContent value="employee">
                        <PayrollEmployeeTab
                          selectedEmployee={ctrl.selectedEmployee}
                          baseSalary={ctrl.baseSalary}
                          setBaseSalary={ctrl.setBaseSalary}
                          allowances={ctrl.allowances}
                          setAllowances={ctrl.setAllowances}
                        />
                      </TabsContent>

                      <TabsContent value="deductions">
                        <PayrollAdjustmentsTab
                          deductions={ctrl.deductions}
                          setDeductions={ctrl.setDeductions}
                        />
                      </TabsContent>

                      <TabsContent value="attendance">
                        <PayrollAttendanceTab
                          attendance={ctrl.attendance}
                          setAttendance={ctrl.setAttendance}
                          leaves={ctrl.leaves}
                          setLeaves={ctrl.setLeaves}
                          selectedEmployee={ctrl.selectedEmployee}
                          handleSelectEmployee={ctrl.handleSelectEmployee}
                        />
                      </TabsContent>

                      <TabsContent value="scenarios">
                        <PayrollScenariosTab
                          scenarios={ctrl.scenarios}
                          applyScenario={ctrl.applyScenario}
                          applyAdvancedScenario={ctrl.applyAdvancedScenario}
                        />
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        {ctrl.selectedEmployee && (
          <PayrollResultsPanel
            payrollResult={ctrl.payrollResult}
            calculating={ctrl.calculating}
            calculatePayroll={ctrl.calculatePayroll}
            saveAsDraft={ctrl.saveAsDraft}
            setSaveAsDraft={ctrl.setSaveAsDraft}
          />
        )}
      </div>
    </div>
  );
};

export default PayrollTesting;
