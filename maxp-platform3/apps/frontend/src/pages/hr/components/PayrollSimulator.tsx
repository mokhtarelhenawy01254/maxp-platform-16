import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Calculator,
  AlertCircle,
  Save,
  Printer,
  Trash2,
  Plus,
  Zap,
  ShieldCheck,
  Calendar,
  Clock,
  Banknote,
  MinusCircle,
  CheckCircle,
  RefreshCw,
  ChevronRight,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ScrollArea } from "../../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { Separator } from "../../../components/ui/separator";
import { toast } from "sonner";
import { numberToArabicWords } from "../../../lib/tafqeet";
import api from "../../../services/api";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  avatar: string;
  baseSalary: number;
  department?: { name: string } | null;
  position?: { title: string } | null;
}

interface SimulationState {
  baseSalary: number;
  attendance: any[];
  leaves: any[];
  manualDeductions: any[];
  allowances: Record<string, number>;
}

const SCENARIOS = [
  {
    id: "normal",
    name: "حالة طبيعية",
    description: "موظف بـ 22 يوم عمل كامل وبدون خصومات",
    icon: CheckCircle,
    apply: (salary: number) => ({
      baseSalary: salary,
      attendance: Array.from({ length: 22 }, (_, i) => ({
        date: new Date(2026, 1, i + 1),
        status: "PRESENT",
        lateMinutes: 0,
        overtimeHours: 0,
      })),
      leaves: [],
      manualDeductions: [],
      allowances: {},
    }),
  },
  {
    id: "absent_late",
    name: "تأخير وغيابات",
    description: "غياب يومين وتأخير متكرر",
    icon: Clock,
    apply: (salary: number) => ({
      baseSalary: salary,
      attendance: [
        ...Array.from({ length: 18 }, (_, i) => ({
          date: new Date(2026, 1, i + 1),
          status: "PRESENT",
          lateMinutes: 0,
          overtimeHours: 0,
        })),
        {
          date: new Date(2026, 1, 19),
          status: "LATE",
          lateMinutes: 60,
          overtimeHours: 0,
        },
        {
          date: new Date(2026, 1, 20),
          status: "LATE",
          lateMinutes: 120,
          overtimeHours: 0,
        },
      ],
      leaves: [],
      manualDeductions: [],
      allowances: {},
    }),
  },
  {
    id: "overtime_bonus",
    name: "إضافي ومكافآت",
    description: "ساعات عمل إضافية مع مكافأة مالية",
    icon: Zap,
    apply: (salary: number) => ({
      baseSalary: salary,
      attendance: Array.from({ length: 22 }, (_, i) => ({
        date: new Date(2026, 1, i + 1),
        status: "PRESENT",
        lateMinutes: 0,
        overtimeHours: i < 5 ? 3 : 0,
      })),
      leaves: [],
      manualDeductions: [
        {
          id: "bonus1",
          amount: 1000,
          reason: "مكافأة أداء",
          date: new Date(),
          type: "BONUS",
        },
      ],
      allowances: { "بدل طبيعة عمل": 500 },
    }),
  },
  {
    id: "unpaid_leave",
    name: "إجازة بدون راتب",
    description: "إجازة سلبية لمدة أسبوع",
    icon: MinusCircle,
    apply: (salary: number) => ({
      baseSalary: salary,
      attendance: Array.from({ length: 15 }, (_, i) => ({
        date: new Date(2026, 1, i + 1),
        status: "PRESENT",
        lateMinutes: 0,
        overtimeHours: 0,
      })),
      leaves: [
        {
          id: "leave1",
          startDate: new Date(2026, 1, 16),
          endDate: new Date(2026, 1, 22),
          type: "UNPAID",
          status: "APPROVED",
        },
      ],
      manualDeductions: [],
      allowances: {},
    }),
  },
  {
    id: "loan_advance",
    name: "خصم سلفة وصيانة",
    description: "خصم سلفة شهرية + غرامة عهدة",
    icon: Banknote,
    apply: (salary: number) => ({
      baseSalary: salary,
      attendance: Array.from({ length: 22 }, (_, i) => ({
        date: new Date(2026, 1, i + 1),
        status: "PRESENT",
        lateMinutes: 0,
        overtimeHours: 0,
      })),
      leaves: [],
      manualDeductions: [
        {
          id: "m1",
          amount: 500,
          reason: "تسديد سلفة",
          date: new Date(),
          type: "ADVANCE",
        },
        {
          id: "m2",
          amount: 200,
          reason: "إهلاك معدات",
          date: new Date(),
          type: "DAMAGE",
        },
      ],
      allowances: {},
    }),
  },
];

export default function PayrollSimulator() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [simulation, setSimulation] = useState<SimulationState>({
    baseSalary: 0,
    attendance: [],
    leaves: [],
    manualDeductions: [],
    allowances: {},
  });
  const [results, setResults] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hr/employees?limit=100");
      setEmployees(response.data.employees);
    } catch (error) {
      toast.error("فشل في جلب قائمة الموظفين");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) || e.employeeNumber.includes(search),
    );
  }, [employees, search]);

  const selectEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSimulation({
      baseSalary: emp.baseSalary,
      attendance: Array.from({ length: 22 }, (_, i) => ({
        id: `att-${i}`,
        date: new Date(2026, 1, i + 1),
        status: "PRESENT",
        lateMinutes: 0,
        overtimeHours: 0,
      })),
      leaves: [],
      manualDeductions: [],
      allowances: {},
    });
    setResults(null);
  };

  const runSimulation = async () => {
    if (!selectedEmployee) return;
    try {
      setCalculating(true);
      const response = await api.post(
        `/hr/payroll/calculate/${selectedEmployee.id}`,
        {
          month: 2,
          year: 2026,
          overrides: simulation,
        },
      );
      setResults(response.data.payroll);
      toast.success("تم الانتهاء من محاكاة الحسابات");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "فشل في المحاكاة");
    } finally {
      setCalculating(false);
    }
  };

  const applyScenario = (scenarioId: string) => {
    if (!selectedEmployee) return;
    const scenario = SCENARIOS.find((s) => s.id === scenarioId);
    if (scenario) {
      setSimulation(scenario.apply(selectedEmployee.baseSalary));
      toast.info(`تم تطبيق سيناريو: ${scenario.name}`);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(val);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]" dir="rtl">
      {/* Search & Select Panel */}
      <Card className="w-80 flex flex-col shrink-0 border-none shadow-xl bg-slate-50/50 dark:bg-slate-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            اختيار موظف للتجربة
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="بحث باسم أو رقم الموظف..."
              className="pr-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => selectEmployee(emp)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedEmployee?.id === emp.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-slate-800"}`}
                >
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarImage src={emp.avatar} />
                    <AvatarFallback className="bg-indigo-200 text-indigo-700">
                      {emp.firstName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-right overflow-hidden">
                    <p className="font-bold text-sm truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p
                      className={`text-xs ${selectedEmployee?.id === emp.id ? "text-indigo-100" : "text-slate-500"}`}
                    >
                      #{emp.employeeNumber} •{" "}
                      {emp.department?.name || "بدون قسم"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Workspace Area */}
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {!selectedEmployee ? (
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
        ) : (
          <>
            {/* Simulation Controls */}
            <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-xl">
              <CardHeader className="bg-indigo-600 text-white py-4 px-6 flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      محاكاة راتب: {selectedEmployee.firstName}
                    </h2>
                    <p className="text-indigo-100 text-xs opacity-90">
                      الراتب الأساسي الحالي:{" "}
                      {formatCurrency(selectedEmployee.baseSalary)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={runSimulation}
                    disabled={calculating}
                    className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold h-10 px-6 rounded-lg"
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

              <Tabs
                defaultValue="scenarios"
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="bg-slate-50 dark:bg-slate-900 p-1 flex justify-start rounded-none h-14 px-6 gap-2">
                  <TabsTrigger
                    value="scenarios"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    سيناريوهات جاهزة
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    الحضور والإضافي
                  </TabsTrigger>
                  <TabsTrigger
                    value="deductions"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    الخصومات
                  </TabsTrigger>
                  <TabsTrigger
                    value="allowances"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 px-6 font-bold"
                  >
                    البدلات
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full">
                    <div className="p-8">
                      {/* Scenarios Tab */}
                      <TabsContent value="scenarios" className="mt-0 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {SCENARIOS.map((scenario) => (
                            <button
                              key={scenario.id}
                              onClick={() => applyScenario(scenario.id)}
                              className="group text-right p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:border-indigo-300 hover:bg-white dark:hover:bg-slate-800 transition-all hover:shadow-lg"
                            >
                              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <scenario.icon className="h-5 w-5 text-indigo-600" />
                              </div>
                              <h4 className="font-bold text-slate-900 dark:text-white mb-1">
                                {scenario.name}
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                {scenario.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Attendance Tab */}
                      <TabsContent
                        value="attendance"
                        className="mt-0 space-y-6"
                      >
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-xl flex items-start gap-4 mb-6">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            يمكنك تعديل أيام الحضور، التأخيرات، وساعات العمل
                            الإضافي لكل يوم على حدة لاختبار كيفية تأثر الراتب.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {simulation.attendance.map((att, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex gap-4"
                            >
                              <div className="shrink-0 text-center">
                                <div className="text-xs text-slate-500 font-bold uppercase">
                                  {att.date.getDate()} فبراير
                                </div>
                              </div>
                              <div className="flex-1 space-y-2">
                                <Select
                                  value={att.status}
                                  onValueChange={(v) => {
                                    const newAtt = [...simulation.attendance];
                                    newAtt[idx].status = v;
                                    setSimulation({
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
                                      className="h-7 text-xs"
                                      onChange={(e) => {
                                        const newAtt = [
                                          ...simulation.attendance,
                                        ];
                                        newAtt[idx].lateMinutes =
                                          parseInt(e.target.value) || 0;
                                        setSimulation({
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
                                      className="h-7 text-xs"
                                      onChange={(e) => {
                                        const newAtt = [
                                          ...simulation.attendance,
                                        ];
                                        newAtt[idx].overtimeHours =
                                          parseInt(e.target.value) || 0;
                                        setSimulation({
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

                      {/* Deductions Tab */}
                      <TabsContent
                        value="deductions"
                        className="mt-0 space-y-6"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                            <MinusCircle className="h-5 w-5 text-rose-500" />
                            الخصومات والجزاءات المخصصة
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full h-8"
                            onClick={() => {
                              setSimulation({
                                ...simulation,
                                manualDeductions: [
                                  ...simulation.manualDeductions,
                                  {
                                    id: Math.random().toString(),
                                    amount: 0,
                                    reason: "",
                                    type: "OTHER",
                                    date: new Date(),
                                  },
                                ],
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 ml-1" /> إدخال خصم
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {simulation.manualDeductions.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 italic text-sm">
                              لا توجد خصومات مخصصة مضافة حالياً
                            </div>
                          ) : (
                            simulation.manualDeductions.map((d, i) => (
                              <div
                                key={d.id}
                                className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 items-end border border-slate-100 dark:border-slate-800"
                              >
                                <div className="space-y-1 flex-[2]">
                                  <Label className="text-xs">
                                    السبب / الوصف
                                  </Label>
                                  <Input
                                    placeholder="مثلاً: سلفة مرتب، مخالفة سياسة..."
                                    value={d.reason}
                                    onChange={(e) => {
                                      const newD = [
                                        ...simulation.manualDeductions,
                                      ];
                                      newD[i].reason = e.target.value;
                                      setSimulation({
                                        ...simulation,
                                        manualDeductions: newD,
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <Label className="text-xs">
                                    المبلغ (EGP)
                                  </Label>
                                  <Input
                                    type="number"
                                    value={d.amount}
                                    onChange={(e) => {
                                      const newD = [
                                        ...simulation.manualDeductions,
                                      ];
                                      newD[i].amount =
                                        parseFloat(e.target.value) || 0;
                                      setSimulation({
                                        ...simulation,
                                        manualDeductions: newD,
                                      });
                                    }}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-rose-500 hover:bg-rose-50 rounded-xl"
                                  onClick={() => {
                                    setSimulation({
                                      ...simulation,
                                      manualDeductions:
                                        simulation.manualDeductions.filter(
                                          (item) => item.id !== d.id,
                                        ),
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </TabsContent>

                      {/* Allowances Tab */}
                      <TabsContent
                        value="allowances"
                        className="mt-0 space-y-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                            <Plus className="h-5 w-5 text-emerald-500" />
                            البدلات والمزايا الإضافية
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full h-8"
                            onClick={() => {
                              const name = `بدل جديد ${Object.keys(simulation.allowances).length + 1}`;
                              setSimulation({
                                ...simulation,
                                allowances: {
                                  ...simulation.allowances,
                                  [name]: 0,
                                },
                              });
                            }}
                          >
                            <Plus className="h-4 w-4 ml-1" /> إضافة بدل
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(simulation.allowances).map(
                            ([name, amount], idx) => (
                              <div
                                key={idx}
                                className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 items-end border border-slate-100 dark:border-slate-800"
                              >
                                <div className="space-y-1 flex-[2]">
                                  <Label className="text-xs">اسم البدل</Label>
                                  <Input
                                    value={name}
                                    onChange={(e) => {
                                      const newName = e.target.value;
                                      const { [name]: oldAmount, ...rest } =
                                        simulation.allowances;
                                      setSimulation({
                                        ...simulation,
                                        allowances: {
                                          ...rest,
                                          [newName]: oldAmount,
                                        },
                                      });
                                    }}
                                  />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <Label className="text-xs">المبلغ</Label>
                                  <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                      setSimulation({
                                        ...simulation,
                                        allowances: {
                                          ...simulation.allowances,
                                          [name]:
                                            parseFloat(e.target.value) || 0,
                                        },
                                      });
                                    }}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-rose-500 hover:bg-rose-50"
                                  onClick={() => {
                                    const { [name]: _, ...rest } =
                                      simulation.allowances;
                                    setSimulation({
                                      ...simulation,
                                      allowances: rest,
                                    });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ),
                          )}
                        </div>
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>
            </Card>
          </>
        )}
      </div>

      {/* Result Sidebar */}
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
                  {/* Gross Section */}
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
                        <span className="font-bold">
                          {formatCurrency(results.baseSalary)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          إجمالي البدلات
                        </span>
                        <span className="font-bold text-emerald-600">
                          +{formatCurrency(results.totalAllowances)}
                        </span>
                      </div>
                      {results.overtimeAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            العمل الإضافي ({results.overtimeHours} س)
                          </span>
                          <span className="font-bold text-emerald-600">
                            +{formatCurrency(results.overtimeAmount)}
                          </span>
                        </div>
                      )}
                      {results.bonuses > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            المكافآت
                          </span>
                          <span className="font-bold text-emerald-600">
                            +{formatCurrency(results.bonuses)}
                          </span>
                        </div>
                      )}
                      <Separator className="my-2 bg-slate-100 dark:bg-slate-800" />
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                        <span>إجمالي الدخل</span>
                        <span>{formatCurrency(results.grossSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Section */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <MinusCircle className="h-3 w-3 text-rose-500" /> إجمالي
                      الاستقطاعات
                    </h5>
                    <div className="space-y-2">
                      {results.absentDays > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            خصم الغياب ({results.absentDays} يوم)
                          </span>
                          <span className="font-bold text-rose-600">
                            -{formatCurrency(results.attendanceDeduction)}
                          </span>
                        </div>
                      )}
                      {results.latePenalty > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            خصم التأخير
                          </span>
                          <span className="font-bold text-rose-600">
                            -{formatCurrency(results.latePenalty)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          تأمينات اجتماعية
                        </span>
                        <span className="font-bold text-rose-600">
                          -{formatCurrency(results.socialInsurance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300">
                          ضريبة الدخل
                        </span>
                        <span className="font-bold text-rose-600">
                          -{formatCurrency(results.taxAmount)}
                        </span>
                      </div>
                      {results.totalDeductions >
                        results.attendanceDeduction + results.latePenalty && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-300">
                            خصومات أخرى
                          </span>
                          <span className="font-bold text-rose-600">
                            -
                            {formatCurrency(
                              results.totalDeductions -
                                results.attendanceDeduction -
                                results.latePenalty,
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="bg-indigo-600 rounded-3xl p-6 text-white text-center shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <ShieldCheck className="h-20 w-20" />
                    </div>
                    <p className="text-indigo-100 text-sm font-medium mb-1">
                      صافي المبلغ المستحق
                    </p>
                    <h4 className="text-3xl font-black mb-1">
                      {formatCurrency(results.netSalary)}
                    </h4>
                    <p className="text-[10px] text-white/90 font-bold mb-1">
                      {numberToArabicWords(results.netSalary)}
                    </p>
                    <p className="text-[10px] text-white/60">
                      تم حساب الضرائب والتأمينات حسب القوانين المتبعة
                    </p>
                  </div>

                  {/* Verification Info */}
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-slate-500">
                        أيام العمل المعتبرة:
                      </span>
                      <span className="font-bold">
                        {results.workingDays} يوم
                      </span>
                    </div>
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-slate-500">معدل أجر اليوم:</span>
                      <span className="font-bold">
                        {formatCurrency(
                          results.baseSalary / results.workingDays,
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
                    onClick={() => toast.info("جاري إعداد قالب الطباعة...")}
                  >
                    <Printer className="h-4 w-4" />
                    طباعة تجريبية
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-slate-900 hover:bg-black gap-2 h-11"
                    onClick={() => toast.success("تم حفظ المحاكاة كمسودة")}
                  >
                    <Save className="h-4 w-4" />
                    حفظ كمسودة
                  </Button>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl text-lg font-bold shadow-lg shadow-emerald-200 dark:shadow-none"
                  onClick={() =>
                    toast.warning(
                      "لا يمكن اعتماد بيانات المحاكاة مباشرة، يرجى إنشاء كشف راتب رسمي.",
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
    </div>
  );
}
