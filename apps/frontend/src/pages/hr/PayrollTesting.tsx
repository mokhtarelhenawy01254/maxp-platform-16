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
  Percent,
  FileCheck,
  Settings,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ScrollArea } from "../../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { Separator } from "../../components/ui/separator";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { numberToArabicWords } from "../../lib/tafqeet";
import api from "../../services/api";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

// Types
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
  avatar: string;
  baseSalary: number;
  department?: { name: string; id: string } | null;
  position?: { title: string; id: string } | null;
  email?: string;
  phone?: string;
  joinDate?: string;
  isActive: boolean;
}

interface Deduction {
  id: string;
  type: string;
  name: string;
  amount: number;
  isPercentage: boolean;
  description?: string;
}

interface Allowance {
  id: string;
  name: string;
  amount: number;
  isPercentage: boolean;
}

interface LeaveRecord {
  id: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  isPaid: boolean;
  description?: string;
}

interface AttendanceRecord {
  id: string;
  date: Date;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE" | "HOLIDAY";
  inTime?: string;
  outTime?: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  overtimeHours: number;
  description?: string;
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  config: {
    baseSalary?: number;
    attendance?: Partial<AttendanceRecord>[];
    leaves?: Partial<LeaveRecord>[];
    deductions?: Partial<Deduction>[];
    allowances?: Partial<Allowance>[];
    overtimeRate?: number;
    taxRate?: number;
  };
}

interface DeductionDetail {
  name?: string;
  amount: number;
  reason: string;
  type?: string;
}

interface PayrollResult {
  baseSalary: number;
  earnedBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  grossSalary: number;
  netSalary: number;
  taxAmount: number;
  socialInsurance: number;
  overtimeAmount: number;
  overtimeHours: number;
  attendanceDeduction: number;
  absentDays: number;
  latePenalty: number;
  workingDays: number;
  actualWorkDays: number;
  dailyRate: number;
  standardWorkingDays: number;
  month: number;
  year: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  deductionDetails?: DeductionDetail[];
  attendanceDeductionDetails?: DeductionDetail;
  latePenaltyDetails?: DeductionDetail;
  taxDetails?: DeductionDetail;
  socialInsuranceDetails?: DeductionDetail;
}

// Main Component
const PayrollTesting: React.FC = () => {
  // State for employee selection
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // State for payroll configuration
  const [baseSalary, setBaseSalary] = useState(0);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState("employee");

  // State for calculation results
  const [payrollResult, setPayrollResult] = useState<PayrollResult | null>(
    null,
  );
  const [calculating, setCalculating] = useState(false);
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  // State for test scenarios
  const [scenarios] = useState<TestScenario[]>([
    {
      id: "normal",
      name: "حالة طبيعية",
      description: "موظف بـ 22 يوم عمل كامل وبدون خصومات",
      icon: CheckCircle,
      config: {
        attendance: Array.from({ length: 22 }, (_, i) => ({
          date: new Date(2026, 1, i + 1),
          status: "PRESENT",
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeHours: 0,
        })),
      },
    },
    {
      id: "absent_late",
      name: "تأخير وغيابات",
      description: "غياب يومين وتأخير متكرر",
      icon: Clock,
      config: {
        attendance: [
          ...Array.from({ length: 18 }, (_, i) => ({
            date: new Date(2026, 1, i + 1),
            status: "PRESENT",
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeHours: 0,
          })),
          {
            date: new Date(2026, 1, 19),
            status: "LATE",
            lateMinutes: 60,
            earlyLeaveMinutes: 0,
            overtimeHours: 0,
          },
          {
            date: new Date(2026, 1, 20),
            status: "LATE",
            lateMinutes: 120,
            earlyLeaveMinutes: 0,
            overtimeHours: 0,
          },
          {
            date: new Date(2026, 1, 21),
            status: "ABSENT",
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeHours: 0,
          },
          {
            date: new Date(2026, 1, 22),
            status: "ABSENT",
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeHours: 0,
          },
        ],
      },
    },
    {
      id: "overtime_bonus",
      name: "إضافي ومكافآت",
      description: "ساعات عمل إضافية مع مكافأة مالية",
      icon: Zap,
      config: {
        attendance: Array.from({ length: 22 }, (_, i) => ({
          date: new Date(2026, 1, i + 1),
          status: "PRESENT",
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeHours: i < 5 ? 3 : 0,
        })),
        allowances: [
          { name: "بدل طبيعة عمل", amount: 500, isPercentage: false },
        ],
      },
    },
    {
      id: "unpaid_leave",
      name: "إجازة بدون راتب",
      description: "إجازة سلبية لمدة أسبوع",
      icon: MinusCircle,
      config: {
        attendance: Array.from({ length: 15 }, (_, i) => ({
          date: new Date(2026, 1, i + 1),
          status: "PRESENT",
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeHours: 0,
        })),
        leaves: [
          {
            startDate: new Date(2026, 1, 16),
            endDate: new Date(2026, 1, 22),
            type: "UNPAID",
            isPaid: false,
            days: 7,
          },
        ],
      },
    },
    {
      id: "loan_advance",
      name: "خصم سلفة وصيانة",
      description: "خصم سلفة شهرية + غرامة عهدة",
      icon: Banknote,
      config: {
        attendance: Array.from({ length: 22 }, (_, i) => ({
          date: new Date(2026, 1, i + 1),
          status: "PRESENT",
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeHours: 0,
        })),
        deductions: [
          {
            type: "ADVANCE",
            name: "تسديد سلفة",
            amount: 500,
            isPercentage: false,
          },
          {
            type: "DAMAGE",
            name: "إهلاك معدات",
            amount: 200,
            isPercentage: false,
          },
        ],
      },
    },
  ]);

  // Calculate payroll function
  const calculatePayroll = async () => {
    if (!selectedEmployee) return;

    setCalculating(true);

    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate a calculation with a timeout
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Calculate working days - using standard 26 working days per month
      const standardWorkingDays = 26; // عدد أيام العمل القياسية في الشهر
      const workingDays = attendance.length;
      const absentDays = attendance.filter((a) => a.status === "ABSENT").length;
      const actualWorkDays = workingDays - absentDays;

      // حساب الراتب الأساسي بناءً على الحضور الفعلي
      const dailyRate = baseSalary / standardWorkingDays; // معدل اليوم الواحد
      const earnedBaseSalary = actualWorkDays * dailyRate; // الراتب المستحق بناءً على الحضور

      // حساب خصم الغياب وتفاصيله
      const attendanceDeduction = absentDays * dailyRate;
      const attendanceDeductionDetails = {
        amount: attendanceDeduction,
        reason: `خصم غياب ${absentDays} يوم بمعدل ${dailyRate.toFixed(2)} جنيه لليوم`,
        days: absentDays,
      };

      // Calculate overtime
      const hourlyRate = dailyRate / 8; // Assuming 8 hours per day
      const overtimeHours = attendance.reduce(
        (sum, a) => sum + a.overtimeHours,
        0,
      );
      const overtimeRate = 1.5; // Overtime pays 1.5x
      const overtimeAmount = overtimeHours * hourlyRate * overtimeRate;

      // Calculate late penalty with details
      const totalLateMinutes = attendance.reduce(
        (sum, a) => sum + a.lateMinutes,
        0,
      );
      const minuteRate = hourlyRate / 60;
      const latePenaltyRate = 2; // Late minutes cost 2x
      const latePenalty = totalLateMinutes * minuteRate * latePenaltyRate;
      const latePenaltyDetails = {
        amount: latePenalty,
        reason: `خصم تأخير ${totalLateMinutes} دقيقة بمعدل ${(minuteRate * latePenaltyRate).toFixed(2)} جنيه للدقيقة`,
        minutes: totalLateMinutes,
      };

      // Calculate allowances based on earned salary
      const totalAllowances = allowances.reduce((sum, a) => {
        if (a.isPercentage) {
          return sum + (earnedBaseSalary * a.amount) / 100;
        }
        return sum + a.amount;
      }, 0);

      // Calculate deductions with details
      const deductionDetails = deductions.map((d) => {
        const amount = d.isPercentage
          ? (earnedBaseSalary * d.amount) / 100
          : d.amount;
        return {
          name: d.name,
          amount: amount,
          reason: d.isPercentage
            ? `${d.amount}% من الراتب الأساسي`
            : `مبلغ ثابت`,
          type: d.type,
        };
      });

      const totalDeductions = deductionDetails.reduce(
        (sum, d) => sum + d.amount,
        0,
      );

      // Calculate gross salary based on earned salary
      const grossSalary = earnedBaseSalary + totalAllowances + overtimeAmount;

      // Calculate tax (simplified)
      const taxRate = 0.15; // 15% tax rate
      const taxableIncome = grossSalary;
      const taxAmount = taxableIncome * taxRate;
      const taxDetails = {
        amount: taxAmount,
        reason: `ضريبة دخل ${taxRate * 100}% من إجمالي الراتب (${grossSalary.toFixed(2)} جنيه)`,
      };

      // Calculate social insurance (simplified)
      const socialInsuranceRate = 0.09; // 9% social insurance
      const socialInsurance = earnedBaseSalary * socialInsuranceRate;
      const socialInsuranceDetails = {
        amount: socialInsurance,
        reason: `تأمينات اجتماعية ${socialInsuranceRate * 100}% من الراتب الأساسي (${earnedBaseSalary.toFixed(2)} جنيه)`,
      };

      // Calculate net salary
      const netSalary =
        grossSalary -
        totalDeductions -
        taxAmount -
        socialInsurance -
        latePenalty;

      // Set result
      setPayrollResult({
        baseSalary,
        earnedBaseSalary,
        totalAllowances,
        totalDeductions,
        grossSalary,
        netSalary,
        taxAmount,
        socialInsurance,
        overtimeAmount,
        overtimeHours,
        attendanceDeduction,
        absentDays,
        latePenalty,
        workingDays,
        actualWorkDays,
        dailyRate,
        standardWorkingDays,
        month: 2, // February
        year: 2026,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        status: "PROJECTION",
        deductionDetails,
        attendanceDeductionDetails,
        latePenaltyDetails,
        taxDetails,
        socialInsuranceDetails,
      });
    } catch (error) {
      console.error("Error calculating payroll:", error);
      tToast.error("hr_PayrollTesting.failed_account_1ffd");
    } finally {
      setCalculating(false);
    }
  };

  // Load employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter employees when search query changes
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = employees.filter(
        (emp) =>
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query) ||
          emp.employeeNumber?.includes(query) ||
          emp.department?.name?.toLowerCase().includes(query) ||
          emp.position?.title?.toLowerCase().includes(query),
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  // Fetch employees from API
  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await api.get("/hr/employees?limit=100&isActive=true");
      setEmployees(response.data.employees);
      setFilteredEmployees(response.data.employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      tToast.error("hr_PayrollTesting.failed_fetch_8a11");
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Select an employee and initialize payroll data
  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    // تصحيح الراتب الأساسي إذا كان أقل من المتوقع
    const correctedSalary =
      employee.baseSalary < 1000
        ? employee.baseSalary * 10
        : employee.baseSalary;
    setBaseSalary(correctedSalary);

    // Initialize attendance records for the current month
    const currentYear = 2026;
    const currentMonth = 1; // February (0-indexed)
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const initialAttendance: AttendanceRecord[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      // Skip weekends (Friday and Saturday in Arabic countries)
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 5 && dayOfWeek !== 6) {
        // 5 = Friday, 6 = Saturday
        initialAttendance.push({
          id: `att-${day}`,
          date,
          status: "PRESENT",
          inTime: "08:00",
          outTime: "16:00",
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeHours: 0,
        });
      }
    }

    setAttendance(initialAttendance);
    setLeaves([]);
    setDeductions([]);
    setAllowances([]);
    setPayrollResult(null);
    setActiveTab("employee");
  };

  // Format currency for display
  const formatCurrency = (amount: number | undefined | null) => {
    const value = amount ?? 0;
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Calculator className="h-6 w-6 text-indigo-600" />
        وحدة اختبار الرواتب الشاملة
      </h1>
      <p className="text-gray-500 mb-6">
        هذه الوحدة تسمح لمسؤولي الموارد البشرية بإجراء اختبارات شاملة لنظام حساب
        الرواتب باستخدام بيانات الموظفين الفعلية.
      </p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Employee Selection Panel */}
        <Card className="lg:w-80 flex flex-col shrink-0 shadow-lg">
          <CardHeader className="pb-3 bg-indigo-600 text-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              اختيار موظف للاختبار
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="بحث باسم أو رقم الموظف..."
                className="pr-9 bg-white/20 text-white placeholder:text-white/70 border-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(100dvh-300px)]">
              {loadingEmployees ? (
                <div className="p-4 text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-600 rounded-full border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">
                    جاري تحميل الموظفين...
                  </p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    لا يوجد موظفين مطابقين للبحث
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${selectedEmployee?.id === emp.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-white hover:bg-indigo-50"}`}
                    >
                      <Avatar className="h-10 w-10 border-2 border-white/20">
                        <AvatarImage src={emp.avatar} />
                        <AvatarFallback className="bg-indigo-200 text-indigo-700">
                          {emp.firstName?.[0]}
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
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {!selectedEmployee ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 p-8">
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
            <Card className="shadow-lg">
              <CardHeader className="bg-indigo-600 text-white py-4 px-6 flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      اختبار راتب: {selectedEmployee.firstName}{" "}
                      {selectedEmployee.lastName}
                    </h2>
                    <p className="text-indigo-100 text-xs opacity-90">
                      الراتب الأساسي الحالي:{" "}
                      {formatCurrency(selectedEmployee.baseSalary)} •
                      {selectedEmployee.position?.title || "موظف"} •
                      {selectedEmployee.department?.name || "بدون قسم"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold h-10 px-4 rounded-lg"
                    onClick={() => setSelectedEmployee(null)}
                  >
                    تغيير الموظف
                  </Button>
                </div>
              </CardHeader>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
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
                      <TabsContent value="employee" className="mt-0 space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl flex items-start gap-4 mb-6">
                          <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            هنا يمكنك تعديل الراتب الأساسي للموظف وإضافة البدلات
                            المختلفة لاختبار تأثيرها على الراتب النهائي.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Basic Salary Section */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Banknote className="h-5 w-5 text-indigo-600" />
                                الراتب الأساسي
                              </CardTitle>
                              <CardDescription>
                                تعديل الراتب الأساسي للموظف لأغراض الاختبار
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="baseSalary">
                                    الراتب الأساسي
                                  </Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Input
                                      id="baseSalary"
                                      type="number"
                                      value={baseSalary}
                                      onChange={(e) =>
                                        setBaseSalary(Number(e.target.value))
                                      }
                                      className="flex-1"
                                    />
                                    <span className="text-sm text-slate-500">
                                      جنيه
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm text-slate-500">
                                    الراتب الأساسي الفعلي
                                  </Label>
                                  <div className="mt-1 font-bold text-lg">
                                    {formatCurrency(
                                      selectedEmployee?.baseSalary || 0,
                                    )}
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  className="w-full mt-2"
                                  onClick={() =>
                                    setBaseSalary(
                                      selectedEmployee?.baseSalary || 0,
                                    )
                                  }
                                >
                                  <RefreshCw className="h-4 w-4 ml-2" />
                                  استعادة القيمة الأصلية
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Allowances Section */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="h-5 w-5 text-emerald-600" />
                                البدلات والمزايا
                              </CardTitle>
                              <CardDescription>
                                إضافة بدلات مختلفة للموظف
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {allowances.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 italic">
                                    لا توجد بدلات مضافة
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {allowances.map((allowance, index) => (
                                      <div
                                        key={allowance.id}
                                        className="flex items-end gap-2 p-3 bg-slate-50 rounded-lg"
                                      >
                                        <div className="flex-1">
                                          <Label className="text-xs">
                                            اسم البدل
                                          </Label>
                                          <Input
                                            value={allowance.name}
                                            onChange={(e) => {
                                              const newAllowances = [
                                                ...allowances,
                                              ];
                                              newAllowances[index].name =
                                                e.target.value;
                                              setAllowances(newAllowances);
                                            }}
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="w-24">
                                          <Label className="text-xs">
                                            القيمة
                                          </Label>
                                          <Input
                                            type="number"
                                            value={allowance.amount}
                                            onChange={(e) => {
                                              const newAllowances = [
                                                ...allowances,
                                              ];
                                              newAllowances[index].amount =
                                                Number(e.target.value);
                                              setAllowances(newAllowances);
                                            }}
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="w-24">
                                          <Label className="text-xs">
                                            نوع البدل
                                          </Label>
                                          <Select
                                            value={
                                              allowance.isPercentage
                                                ? "percentage"
                                                : "fixed"
                                            }
                                            onValueChange={(value) => {
                                              const newAllowances = [
                                                ...allowances,
                                              ];
                                              newAllowances[
                                                index
                                              ].isPercentage =
                                                value === "percentage";
                                              setAllowances(newAllowances);
                                            }}
                                          >
                                            <SelectTrigger className="mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="fixed">
                                                ثابت
                                              </SelectItem>
                                              <SelectItem value="percentage">
                                                نسبة %
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-rose-500 hover:bg-rose-50"
                                          onClick={() => {
                                            setAllowances(
                                              allowances.filter(
                                                (_, i) => i !== index,
                                              ),
                                            );
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    setAllowances([
                                      ...allowances,
                                      {
                                        id: `allowance-${Date.now()}`,
                                        name: `بدل ${allowances.length + 1}`,
                                        amount: 0,
                                        isPercentage: false,
                                      },
                                    ]);
                                  }}
                                >
                                  <Plus className="h-4 w-4 ml-2" />
                                  إضافة بدل جديد
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="deductions"
                        className="mt-0 space-y-6"
                      >
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-4 rounded-xl flex items-start gap-4 mb-6">
                          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            يمكنك إضافة أنواع مختلفة من الخصومات لاختبار تأثيرها
                            على الراتب النهائي، مثل خصومات التأخير، الغياب،
                            السلف، وغيرها.
                          </p>
                        </div>

                        <div className="space-y-6">
                          {/* Deduction Types */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <MinusCircle className="h-5 w-5 text-rose-600" />
                                الخصومات والجزاءات
                              </CardTitle>
                              <CardDescription>
                                إضافة أنواع مختلفة من الخصومات للاختبار
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {deductions.length === 0 ? (
                                  <div className="text-center py-6 text-slate-400 italic">
                                    لا توجد خصومات مضافة
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {deductions.map((deduction, index) => (
                                      <div
                                        key={deduction.id}
                                        className="flex items-end gap-2 p-3 bg-slate-50 rounded-lg"
                                      >
                                        <div className="w-32">
                                          <Label className="text-xs">
                                            نوع الخصم
                                          </Label>
                                          <Select
                                            value={deduction.type}
                                            onValueChange={(value) => {
                                              const newDeductions = [
                                                ...deductions,
                                              ];
                                              newDeductions[index].type = value;
                                              setDeductions(newDeductions);
                                            }}
                                          >
                                            <SelectTrigger className="mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="LATE">
                                                تأخير
                                              </SelectItem>
                                              <SelectItem value="ABSENCE">
                                                غياب
                                              </SelectItem>
                                              <SelectItem value="ADVANCE">
                                                سلفة
                                              </SelectItem>
                                              <SelectItem value="LOAN">
                                                قرض
                                              </SelectItem>
                                              <SelectItem value="DAMAGE">
                                                إتلاف معدات
                                              </SelectItem>
                                              <SelectItem value="VIOLATION">
                                                مخالفة
                                              </SelectItem>
                                              <SelectItem value="OTHER">
                                                أخرى
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex-1">
                                          <Label className="text-xs">
                                            الوصف
                                          </Label>
                                          <Input
                                            value={deduction.name}
                                            onChange={(e) => {
                                              const newDeductions = [
                                                ...deductions,
                                              ];
                                              newDeductions[index].name =
                                                e.target.value;
                                              setDeductions(newDeductions);
                                            }}
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="w-24">
                                          <Label className="text-xs">
                                            القيمة
                                          </Label>
                                          <Input
                                            type="number"
                                            value={deduction.amount}
                                            onChange={(e) => {
                                              const newDeductions = [
                                                ...deductions,
                                              ];
                                              newDeductions[index].amount =
                                                Number(e.target.value);
                                              setDeductions(newDeductions);
                                            }}
                                            className="mt-1"
                                          />
                                        </div>
                                        <div className="w-24">
                                          <Label className="text-xs">
                                            نوع القيمة
                                          </Label>
                                          <Select
                                            value={
                                              deduction.isPercentage
                                                ? "percentage"
                                                : "fixed"
                                            }
                                            onValueChange={(value) => {
                                              const newDeductions = [
                                                ...deductions,
                                              ];
                                              newDeductions[
                                                index
                                              ].isPercentage =
                                                value === "percentage";
                                              setDeductions(newDeductions);
                                            }}
                                          >
                                            <SelectTrigger className="mt-1">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="fixed">
                                                ثابت
                                              </SelectItem>
                                              <SelectItem value="percentage">
                                                نسبة %
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-rose-500 hover:bg-rose-50"
                                          onClick={() => {
                                            setDeductions(
                                              deductions.filter(
                                                (_, i) => i !== index,
                                              ),
                                            );
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => {
                                    setDeductions([
                                      ...deductions,
                                      {
                                        id: `deduction-${Date.now()}`,
                                        type: "OTHER",
                                        name: `خصم ${deductions.length + 1}`,
                                        amount: 0,
                                        isPercentage: false,
                                      },
                                    ]);
                                  }}
                                >
                                  <Plus className="h-4 w-4 ml-2" />
                                  إضافة خصم جديد
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Common Deduction Templates */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <FileCheck className="h-5 w-5 text-indigo-600" />
                                نماذج خصومات شائعة
                              </CardTitle>
                              <CardDescription>
                                نماذج جاهزة للخصومات الشائعة
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Button
                                  variant="outline"
                                  className="justify-start h-auto py-3 px-4"
                                  onClick={() => {
                                    setDeductions([
                                      ...deductions,
                                      {
                                        id: `deduction-${Date.now()}`,
                                        type: "LATE",
                                        name: "خصم تأخير (ساعة)",
                                        amount: 50,
                                        isPercentage: false,
                                      },
                                    ]);
                                  }}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="font-bold">خصم تأخير</span>
                                    <span className="text-xs text-slate-500">
                                      50 جنيه لكل ساعة تأخير
                                    </span>
                                  </div>
                                </Button>

                                <Button
                                  variant="outline"
                                  className="justify-start h-auto py-3 px-4"
                                  onClick={() => {
                                    setDeductions([
                                      ...deductions,
                                      {
                                        id: `deduction-${Date.now()}`,
                                        type: "ABSENCE",
                                        name: "خصم يوم غياب كامل",
                                        amount: 8,
                                        isPercentage: true,
                                      },
                                    ]);
                                  }}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="font-bold">خصم غياب</span>
                                    <span className="text-xs text-slate-500">
                                      8% من الراتب لكل يوم
                                    </span>
                                  </div>
                                </Button>

                                <Button
                                  variant="outline"
                                  className="justify-start h-auto py-3 px-4"
                                  onClick={() => {
                                    setDeductions([
                                      ...deductions,
                                      {
                                        id: `deduction-${Date.now()}`,
                                        type: "ADVANCE",
                                        name: "سلفة شهرية",
                                        amount: 500,
                                        isPercentage: false,
                                      },
                                    ]);
                                  }}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="font-bold">
                                      سلفة شهرية
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      500 جنيه خصم ثابت
                                    </span>
                                  </div>
                                </Button>

                                <Button
                                  variant="outline"
                                  className="justify-start h-auto py-3 px-4"
                                  onClick={() => {
                                    setDeductions([
                                      ...deductions,
                                      {
                                        id: `deduction-${Date.now()}`,
                                        type: "DAMAGE",
                                        name: "تلف معدات",
                                        amount: 200,
                                        isPercentage: false,
                                      },
                                    ]);
                                  }}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="font-bold">تلف معدات</span>
                                    <span className="text-xs text-slate-500">
                                      200 جنيه تعويض
                                    </span>
                                  </div>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="attendance"
                        className="mt-0 space-y-6"
                      >
                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 p-4 rounded-xl flex items-start gap-4 mb-6">
                          <AlertCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-green-800 dark:text-green-200">
                            يمكنك تعديل سجلات الحضور والإجازات للموظف لاختبار
                            تأثيرها على الراتب النهائي، مثل التأخير، الغياب،
                            الإجازات المدفوعة وغير المدفوعة، وساعات العمل
                            الإضافي.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Attendance Records */}
                          <Card className="lg:col-span-2">
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-600" />
                                سجلات الحضور والانصراف
                              </CardTitle>
                              <CardDescription>
                                تعديل سجلات الحضور للموظف للشهر الحالي
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[100px]">
                                          التاريخ
                                        </TableHead>
                                        <TableHead>الحالة</TableHead>
                                        <TableHead>وقت الحضور</TableHead>
                                        <TableHead>وقت الانصراف</TableHead>
                                        <TableHead>دقائق التأخير</TableHead>
                                        <TableHead>ساعات إضافية</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {attendance.length === 0 ? (
                                        <TableRow>
                                          <TableCell
                                            colSpan={6}
                                            className="text-center py-8 text-slate-400 italic"
                                          >
                                            لا توجد سجلات حضور متاحة
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        attendance.map((record, index) => (
                                          <TableRow key={record.id}>
                                            <TableCell className="font-medium">
                                              {format(
                                                record.date,
                                                "dd/MM/yyyy",
                                                { locale: ar },
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <Select
                                                value={record.status}
                                                onValueChange={(
                                                  value:
                                                    | "PRESENT"
                                                    | "ABSENT"
                                                    | "LATE"
                                                    | "LEAVE"
                                                    | "HOLIDAY",
                                                ) => {
                                                  const newAttendance = [
                                                    ...attendance,
                                                  ];
                                                  newAttendance[index].status =
                                                    value;
                                                  setAttendance(newAttendance);
                                                }}
                                              >
                                                <SelectTrigger className="w-[130px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="PRESENT">
                                                    <span className="flex items-center gap-2">
                                                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                                      حاضر
                                                    </span>
                                                  </SelectItem>
                                                  <SelectItem value="ABSENT">
                                                    <span className="flex items-center gap-2">
                                                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                                      غائب
                                                    </span>
                                                  </SelectItem>
                                                  <SelectItem value="LATE">
                                                    <span className="flex items-center gap-2">
                                                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                                      متأخر
                                                    </span>
                                                  </SelectItem>
                                                  <SelectItem value="LEAVE">
                                                    <span className="flex items-center gap-2">
                                                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                                      إجازة
                                                    </span>
                                                  </SelectItem>
                                                  <SelectItem value="HOLIDAY">
                                                    <span className="flex items-center gap-2">
                                                      <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                                                      عطلة
                                                    </span>
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                type="time"
                                                value={record.inTime || ""}
                                                onChange={(e) => {
                                                  const newAttendance = [
                                                    ...attendance,
                                                  ];
                                                  newAttendance[index].inTime =
                                                    e.target.value;
                                                  setAttendance(newAttendance);
                                                }}
                                                className="w-[120px]"
                                                disabled={
                                                  record.status === "ABSENT" ||
                                                  record.status === "LEAVE" ||
                                                  record.status === "HOLIDAY"
                                                }
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                type="time"
                                                value={record.outTime || ""}
                                                onChange={(e) => {
                                                  const newAttendance = [
                                                    ...attendance,
                                                  ];
                                                  newAttendance[index].outTime =
                                                    e.target.value;
                                                  setAttendance(newAttendance);
                                                }}
                                                className="w-[120px]"
                                                disabled={
                                                  record.status === "ABSENT" ||
                                                  record.status === "LEAVE" ||
                                                  record.status === "HOLIDAY"
                                                }
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                type="number"
                                                value={record.lateMinutes}
                                                onChange={(e) => {
                                                  const newAttendance = [
                                                    ...attendance,
                                                  ];
                                                  newAttendance[
                                                    index
                                                  ].lateMinutes = Number(
                                                    e.target.value,
                                                  );
                                                  setAttendance(newAttendance);
                                                }}
                                                className="w-[80px]"
                                                disabled={
                                                  record.status === "ABSENT" ||
                                                  record.status === "LEAVE" ||
                                                  record.status === "HOLIDAY"
                                                }
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <Input
                                                type="number"
                                                value={record.overtimeHours}
                                                onChange={(e) => {
                                                  const newAttendance = [
                                                    ...attendance,
                                                  ];
                                                  newAttendance[
                                                    index
                                                  ].overtimeHours = Number(
                                                    e.target.value,
                                                  );
                                                  setAttendance(newAttendance);
                                                }}
                                                className="w-[80px]"
                                                disabled={
                                                  record.status === "ABSENT" ||
                                                  record.status === "LEAVE" ||
                                                  record.status === "HOLIDAY"
                                                }
                                              />
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div className="flex justify-between items-center mt-4">
                                  <div className="text-sm text-slate-500">
                                    إجمالي السجلات: {attendance.length}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        // Reset all attendance records to default
                                        if (selectedEmployee) {
                                          handleSelectEmployee(
                                            selectedEmployee,
                                          );
                                        }
                                      }}
                                    >
                                      <RefreshCw className="h-4 w-4 ml-2" />
                                      إعادة ضبط
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Leave Records */}
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
                                        className="p-3 bg-slate-50 rounded-lg space-y-3"
                                      >
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-medium">
                                            إجازة {leave.type}
                                          </h4>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-rose-500 hover:bg-rose-50 h-8 w-8"
                                            onClick={() => {
                                              setLeaves(
                                                leaves.filter(
                                                  (_, i) => i !== index,
                                                ),
                                              );
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <Label className="text-xs">
                                              نوع الإجازة
                                            </Label>
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
                                                <SelectItem value="ANNUAL">
                                                  سنوية
                                                </SelectItem>
                                                <SelectItem value="SICK">
                                                  مرضية
                                                </SelectItem>
                                                <SelectItem value="UNPAID">
                                                  بدون راتب
                                                </SelectItem>
                                                <SelectItem value="EMERGENCY">
                                                  طارئة
                                                </SelectItem>
                                                <SelectItem value="OTHER">
                                                  أخرى
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <Label className="text-xs">
                                              مدفوعة
                                            </Label>
                                            <div className="flex items-center h-10 mt-1">
                                              <Switch
                                                checked={leave.isPaid}
                                                onCheckedChange={(checked) => {
                                                  const newLeaves = [...leaves];
                                                  newLeaves[index].isPaid =
                                                    checked;
                                                  setLeaves(newLeaves);
                                                }}
                                              />
                                              <span className="mr-2">
                                                {leave.isPaid ? "نعم" : "لا"}
                                              </span>
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-xs">
                                              تاريخ البداية
                                            </Label>
                                            <Input
                                              type="date"
                                              value={format(
                                                leave.startDate,
                                                "yyyy-MM-dd",
                                              )}
                                              onChange={(e) => {
                                                const newLeaves = [...leaves];
                                                newLeaves[index].startDate =
                                                  new Date(e.target.value);
                                                // Recalculate days
                                                const diffTime = Math.abs(
                                                  newLeaves[
                                                    index
                                                  ].endDate.getTime() -
                                                    newLeaves[
                                                      index
                                                    ].startDate.getTime(),
                                                );
                                                const diffDays =
                                                  Math.ceil(
                                                    diffTime /
                                                      (1000 * 60 * 60 * 24),
                                                  ) + 1;
                                                newLeaves[index].days =
                                                  diffDays;
                                                setLeaves(newLeaves);
                                              }}
                                              className="mt-1"
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-xs">
                                              تاريخ النهاية
                                            </Label>
                                            <Input
                                              type="date"
                                              value={format(
                                                leave.endDate,
                                                "yyyy-MM-dd",
                                              )}
                                              onChange={(e) => {
                                                const newLeaves = [...leaves];
                                                newLeaves[index].endDate =
                                                  new Date(e.target.value);
                                                // Recalculate days
                                                const diffTime = Math.abs(
                                                  newLeaves[
                                                    index
                                                  ].endDate.getTime() -
                                                    newLeaves[
                                                      index
                                                    ].startDate.getTime(),
                                                );
                                                const diffDays =
                                                  Math.ceil(
                                                    diffTime /
                                                      (1000 * 60 * 60 * 24),
                                                  ) + 1;
                                                newLeaves[index].days =
                                                  diffDays;
                                                setLeaves(newLeaves);
                                              }}
                                              className="mt-1"
                                            />
                                          </div>
                                          <div className="col-span-2">
                                            <Label className="text-xs">
                                              عدد الأيام
                                            </Label>
                                            <div className="mt-1 font-bold">
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

                          {/* Overtime Settings */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5 text-indigo-600" />
                                إعدادات العمل الإضافي
                              </CardTitle>
                              <CardDescription>
                                تعديل معدلات العمل الإضافي والتأخير
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                <div>
                                  <Label htmlFor="overtimeRate">
                                    معدل العمل الإضافي
                                  </Label>
                                  <div className="mt-1">
                                    <div className="flex items-center gap-4">
                                      <Slider
                                        id="overtimeRate"
                                        defaultValue={[1.5]}
                                        max={3}
                                        min={1}
                                        step={0.25}
                                        className="flex-1"
                                      />
                                      <div className="w-12 text-center font-bold">
                                        1.5x
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                      مضاعف سعر الساعة العادية
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label htmlFor="lateDeductionRate">
                                    معدل خصم التأخير
                                  </Label>
                                  <div className="mt-1">
                                    <div className="flex items-center gap-4">
                                      <Slider
                                        id="lateDeductionRate"
                                        defaultValue={[2]}
                                        max={5}
                                        min={0.5}
                                        step={0.5}
                                        className="flex-1"
                                      />
                                      <div className="w-12 text-center font-bold">
                                        2x
                                      </div>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                      مضاعف سعر الدقيقة العادية
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                  <h4 className="font-medium mb-2">
                                    ملخص الحضور
                                  </h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                      <div className="text-xs text-slate-500">
                                        أيام الحضور
                                      </div>
                                      <div className="font-bold text-lg">
                                        {
                                          attendance.filter(
                                            (a) =>
                                              a.status === "PRESENT" ||
                                              a.status === "LATE",
                                          ).length
                                        }{" "}
                                        يوم
                                      </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                      <div className="text-xs text-slate-500">
                                        أيام الغياب
                                      </div>
                                      <div className="font-bold text-lg">
                                        {
                                          attendance.filter(
                                            (a) => a.status === "ABSENT",
                                          ).length
                                        }{" "}
                                        يوم
                                      </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                      <div className="text-xs text-slate-500">
                                        إجمالي دقائق التأخير
                                      </div>
                                      <div className="font-bold text-lg">
                                        {attendance.reduce(
                                          (sum, a) => sum + a.lateMinutes,
                                          0,
                                        )}{" "}
                                        دقيقة
                                      </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-lg">
                                      <div className="text-xs text-slate-500">
                                        إجمالي ساعات الإضافي
                                      </div>
                                      <div className="font-bold text-lg">
                                        {attendance.reduce(
                                          (sum, a) => sum + a.overtimeHours,
                                          0,
                                        )}{" "}
                                        ساعة
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="scenarios" className="mt-0 space-y-6">
                        <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 p-4 rounded-xl flex items-start gap-4 mb-6">
                          <AlertCircle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-purple-800 dark:text-purple-200">
                            اختر من السيناريوهات الجاهزة لاختبار حالات مختلفة من
                            حساب الرواتب بسرعة، مثل التأخير، الغياب، العمل
                            الإضافي، والخصومات المختلفة.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {scenarios.map((scenario) => {
                            const Icon = scenario.icon;
                            return (
                              <Card
                                key={scenario.id}
                                className="overflow-hidden"
                              >
                                <CardHeader className="bg-slate-50 dark:bg-slate-900 p-4 flex flex-row items-center gap-4">
                                  <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                                    <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">
                                      {scenario.name}
                                    </CardTitle>
                                    <CardDescription>
                                      {scenario.description}
                                    </CardDescription>
                                  </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                      {scenario.config.attendance && (
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                          <div className="text-xs text-slate-500">
                                            أيام الحضور
                                          </div>
                                          <div className="font-bold">
                                            {
                                              scenario.config.attendance.filter(
                                                (a) =>
                                                  a.status === "PRESENT" ||
                                                  a.status === "LATE",
                                              ).length
                                            }{" "}
                                            يوم
                                          </div>
                                        </div>
                                      )}

                                      {scenario.config.attendance && (
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                          <div className="text-xs text-slate-500">
                                            أيام الغياب
                                          </div>
                                          <div className="font-bold">
                                            {
                                              scenario.config.attendance.filter(
                                                (a) => a.status === "ABSENT",
                                              ).length
                                            }{" "}
                                            يوم
                                          </div>
                                        </div>
                                      )}

                                      {scenario.config.leaves &&
                                        scenario.config.leaves.length > 0 && (
                                          <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500">
                                              أيام الإجازة
                                            </div>
                                            <div className="font-bold">
                                              {scenario.config.leaves.reduce(
                                                (sum, leave) =>
                                                  sum + leave.days,
                                                0,
                                              )}{" "}
                                              يوم
                                            </div>
                                          </div>
                                        )}

                                      {scenario.config.deductions &&
                                        scenario.config.deductions.length >
                                          0 && (
                                          <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500">
                                              الخصومات
                                            </div>
                                            <div className="font-bold">
                                              {
                                                scenario.config.deductions
                                                  .length
                                              }{" "}
                                              خصم
                                            </div>
                                          </div>
                                        )}

                                      {scenario.config.allowances &&
                                        scenario.config.allowances.length >
                                          0 && (
                                          <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500">
                                              البدلات
                                            </div>
                                            <div className="font-bold">
                                              {
                                                scenario.config.allowances
                                                  .length
                                              }{" "}
                                              بدل
                                            </div>
                                          </div>
                                        )}

                                      {scenario.config.attendance &&
                                        scenario.config.attendance.some(
                                          (a) => a.overtimeHours > 0,
                                        ) && (
                                          <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-slate-500">
                                              ساعات إضافية
                                            </div>
                                            <div className="font-bold">
                                              {scenario.config.attendance.reduce(
                                                (sum, a) =>
                                                  sum + (a.overtimeHours || 0),
                                                0,
                                              )}{" "}
                                              ساعة
                                            </div>
                                          </div>
                                        )}
                                    </div>

                                    <Button
                                      className="w-full mt-2"
                                      onClick={() => {
                                        // Apply scenario configuration
                                        if (
                                          scenario.config.baseSalary &&
                                          selectedEmployee
                                        ) {
                                          setBaseSalary(
                                            scenario.config.baseSalary,
                                          );
                                        }

                                        if (scenario.config.attendance) {
                                          // Create full attendance records from scenario
                                          const currentYear = 2026;
                                          const currentMonth = 1; // February (0-indexed)
                                          const daysInMonth = new Date(
                                            currentYear,
                                            currentMonth + 1,
                                            0,
                                          ).getDate();

                                          const newAttendance: AttendanceRecord[] =
                                            [];
                                          for (
                                            let day = 1;
                                            day <= daysInMonth;
                                            day++
                                          ) {
                                            const date = new Date(
                                              currentYear,
                                              currentMonth,
                                              day,
                                            );
                                            // Skip weekends (Friday and Saturday in Arabic countries)
                                            const dayOfWeek = date.getDay();
                                            if (
                                              dayOfWeek !== 5 &&
                                              dayOfWeek !== 6
                                            ) {
                                              // 5 = Friday, 6 = Saturday
                                              // Find if there's a specific config for this day
                                              const scenarioDay =
                                                scenario.config.attendance.find(
                                                  (a) =>
                                                    a.date &&
                                                    a.date.getDate() === day,
                                                );

                                              if (scenarioDay) {
                                                newAttendance.push({
                                                  id: `att-${day}`,
                                                  date,
                                                  status: scenarioDay.status as
                                                    | "PRESENT"
                                                    | "ABSENT"
                                                    | "LATE"
                                                    | "LEAVE"
                                                    | "HOLIDAY",
                                                  inTime:
                                                    scenarioDay.status ===
                                                      "PRESENT" ||
                                                    scenarioDay.status ===
                                                      "LATE"
                                                      ? "08:00"
                                                      : undefined,
                                                  outTime:
                                                    scenarioDay.status ===
                                                      "PRESENT" ||
                                                    scenarioDay.status ===
                                                      "LATE"
                                                      ? "16:00"
                                                      : undefined,
                                                  lateMinutes:
                                                    scenarioDay.lateMinutes ||
                                                    0,
                                                  earlyLeaveMinutes:
                                                    scenarioDay.earlyLeaveMinutes ||
                                                    0,
                                                  overtimeHours:
                                                    scenarioDay.overtimeHours ||
                                                    0,
                                                });
                                              } else {
                                                // Default to present
                                                newAttendance.push({
                                                  id: `att-${day}`,
                                                  date,
                                                  status: "PRESENT",
                                                  inTime: "08:00",
                                                  outTime: "16:00",
                                                  lateMinutes: 0,
                                                  earlyLeaveMinutes: 0,
                                                  overtimeHours: 0,
                                                });
                                              }
                                            }
                                          }

                                          setAttendance(newAttendance);
                                        }

                                        if (scenario.config.leaves) {
                                          setLeaves(
                                            scenario.config.leaves.map(
                                              (leave, i) => ({
                                                id: `leave-${i}-${Date.now()}`,
                                                type: leave.type || "ANNUAL",
                                                startDate:
                                                  leave.startDate || new Date(),
                                                endDate:
                                                  leave.endDate || new Date(),
                                                days: leave.days || 1,
                                                isPaid:
                                                  leave.isPaid !== undefined
                                                    ? leave.isPaid
                                                    : true,
                                                description: leave.description,
                                              }),
                                            ),
                                          );
                                        } else {
                                          setLeaves([]);
                                        }

                                        if (scenario.config.deductions) {
                                          setDeductions(
                                            scenario.config.deductions.map(
                                              (deduction, i) => ({
                                                id: `deduction-${i}-${Date.now()}`,
                                                type: deduction.type || "OTHER",
                                                name:
                                                  deduction.name ||
                                                  `خصم ${i + 1}`,
                                                amount: deduction.amount || 0,
                                                isPercentage:
                                                  deduction.isPercentage !==
                                                  undefined
                                                    ? deduction.isPercentage
                                                    : false,
                                                description:
                                                  deduction.description,
                                              }),
                                            ),
                                          );
                                        } else {
                                          setDeductions([]);
                                        }

                                        if (scenario.config.allowances) {
                                          setAllowances(
                                            scenario.config.allowances.map(
                                              (allowance, i) => ({
                                                id: `allowance-${i}-${Date.now()}`,
                                                name:
                                                  allowance.name ||
                                                  `بدل ${i + 1}`,
                                                amount: allowance.amount || 0,
                                                isPercentage:
                                                  allowance.isPercentage !==
                                                  undefined
                                                    ? allowance.isPercentage
                                                    : false,
                                              }),
                                            ),
                                          );
                                        } else {
                                          setAllowances([]);
                                        }

                                        // Switch to employee tab to see results
                                        setActiveTab("employee");

                                        // Show success message
                                        toast.success(
                                          `تم تطبيق سيناريو ${scenario.name} بنجاح`,
                                        );
                                      }}
                                    >
                                      <Zap className="h-4 w-4 ml-2" />
                                      تطبيق هذا السيناريو
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        <Card className="mt-6">
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <ShieldCheck className="h-5 w-5 text-indigo-600" />
                              سيناريوهات متقدمة
                            </CardTitle>
                            <CardDescription>
                              سيناريوهات لاختبار حالات خاصة وحدود قصوى
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Button
                                variant="outline"
                                className="justify-start h-auto py-3 px-4"
                                onClick={() => {
                                  // Apply maximum overtime scenario
                                  const newAttendance = [...attendance];
                                  newAttendance.forEach((record) => {
                                    if (record.status === "PRESENT") {
                                      record.overtimeHours = 4; // Maximum overtime hours
                                    }
                                  });
                                  setAttendance(newAttendance);
                                  setActiveTab("attendance");
                                  toast.success(
                                    "تم تطبيق سيناريو العمل الإضافي الأقصى",
                                  );
                                }}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-bold">
                                    الحد الأقصى للعمل الإضافي
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    4 ساعات إضافية لكل يوم عمل
                                  </span>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="justify-start h-auto py-3 px-4"
                                onClick={() => {
                                  // Apply half month absence
                                  const newAttendance = [...attendance];
                                  const halfIndex = Math.floor(
                                    newAttendance.length / 2,
                                  );
                                  newAttendance.forEach((record, index) => {
                                    if (index >= halfIndex) {
                                      record.status = "ABSENT";
                                      record.inTime = undefined;
                                      record.outTime = undefined;
                                      record.lateMinutes = 0;
                                      record.overtimeHours = 0;
                                    }
                                  });
                                  setAttendance(newAttendance);
                                  setActiveTab("attendance");
                                  toast.success(
                                    "تم تطبيق سيناريو الغياب لنصف الشهر",
                                  );
                                }}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-bold">
                                    غياب نصف الشهر
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    غياب كامل للنصف الثاني من الشهر
                                  </span>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="justify-start h-auto py-3 px-4"
                                onClick={() => {
                                  // Apply maximum deductions
                                  setDeductions([
                                    {
                                      id: `deduction-1-${Date.now()}`,
                                      type: "ADVANCE",
                                      name: "سلفة شهرية",
                                      amount: 30,
                                      isPercentage: true,
                                    },
                                    {
                                      id: `deduction-2-${Date.now()}`,
                                      type: "LOAN",
                                      name: "قسط قرض",
                                      amount: 20,
                                      isPercentage: true,
                                    },
                                    {
                                      id: `deduction-3-${Date.now()}`,
                                      type: "DAMAGE",
                                      name: "تلف معدات",
                                      amount: 10,
                                      isPercentage: true,
                                    },
                                  ]);
                                  setActiveTab("deductions");
                                  toast.success(
                                    "تم تطبيق سيناريو الخصومات القصوى",
                                  );
                                }}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-bold">
                                    الحد الأقصى للخصومات
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    60% من الراتب خصومات متنوعة
                                  </span>
                                </div>
                              </Button>

                              <Button
                                variant="outline"
                                className="justify-start h-auto py-3 px-4"
                                onClick={() => {
                                  // Reset to default
                                  if (selectedEmployee) {
                                    handleSelectEmployee(selectedEmployee);
                                    toast.success(
                                      "تم إعادة ضبط جميع البيانات للقيم الافتراضية",
                                    );
                                  }
                                }}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="font-bold">
                                    إعادة ضبط الكل
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    إعادة جميع البيانات للقيم الافتراضية
                                  </span>
                                </div>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </div>
                  </ScrollArea>
                </div>
              </Tabs>
            </Card>
          )}
        </div>

        {/* Results Panel */}
        {selectedEmployee && (
          <Card className="lg:w-80 flex flex-col shrink-0 shadow-lg">
            <CardHeader className="pb-3 bg-indigo-600 text-white">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                نتائج الحساب
              </CardTitle>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
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
                        <div className="text-sm text-slate-500">
                          الراتب الأساسي
                        </div>
                        <div className="font-bold">
                          {formatCurrency(payrollResult.baseSalary)}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-500">
                          الراتب المستحق بناءً على الحضور
                        </div>
                        <div className="font-bold text-indigo-600">
                          {formatCurrency(payrollResult.earnedBaseSalary)}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-500">
                          إجمالي البدلات
                        </div>
                        <div className="font-bold text-emerald-600">
                          {formatCurrency(payrollResult.totalAllowances)}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">تفاصيل الخصومات</h4>

                        {/* خصم الغياب */}
                        {payrollResult.attendanceDeductionDetails &&
                          payrollResult.attendanceDeductionDetails.amount >
                            0 && (
                            <div className="bg-rose-50 p-2 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div className="text-sm text-rose-700">
                                  خصم الغياب
                                </div>
                                <div className="font-bold text-rose-600">
                                  {formatCurrency(
                                    payrollResult.attendanceDeduction,
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-rose-600 mt-1">
                                {
                                  payrollResult.attendanceDeductionDetails
                                    .reason
                                }
                              </p>
                            </div>
                          )}

                        {/* خصم التأخير */}
                        {payrollResult.latePenaltyDetails &&
                          payrollResult.latePenaltyDetails.amount > 0 && (
                            <div className="bg-rose-50 p-2 rounded-lg">
                              <div className="flex justify-between items-center">
                                <div className="text-sm text-rose-700">
                                  خصم التأخير
                                </div>
                                <div className="font-bold text-rose-600">
                                  {formatCurrency(payrollResult.latePenalty)}
                                </div>
                              </div>
                              <p className="text-xs text-rose-600 mt-1">
                                {payrollResult.latePenaltyDetails.reason}
                              </p>
                            </div>
                          )}

                        {/* الخصومات الأخرى */}
                        {payrollResult.deductionDetails &&
                          payrollResult.deductionDetails.map(
                            (deduction, index) => (
                              <div
                                key={index}
                                className="bg-rose-50 p-2 rounded-lg"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="text-sm text-rose-700">
                                    {deduction.name}
                                  </div>
                                  <div className="font-bold text-rose-600">
                                    {formatCurrency(deduction.amount)}
                                  </div>
                                </div>
                                <p className="text-xs text-rose-600 mt-1">
                                  {deduction.reason}
                                </p>
                              </div>
                            ),
                          )}

                        {/* الضريبة */}
                        {payrollResult.taxDetails && (
                          <div className="bg-amber-50 p-2 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-amber-700">
                                الضريبة
                              </div>
                              <div className="font-bold text-amber-600">
                                {formatCurrency(payrollResult.taxAmount)}
                              </div>
                            </div>
                            <p className="text-xs text-amber-600 mt-1">
                              {payrollResult.taxDetails.reason}
                            </p>
                          </div>
                        )}

                        {/* التأمينات الاجتماعية */}
                        {payrollResult.socialInsuranceDetails && (
                          <div className="bg-blue-50 p-2 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div className="text-sm text-blue-700">
                                التأمينات الاجتماعية
                              </div>
                              <div className="font-bold text-blue-600">
                                {formatCurrency(payrollResult.socialInsurance)}
                              </div>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              {payrollResult.socialInsuranceDetails.reason}
                            </p>
                          </div>
                        )}

                        {/* إجمالي الخصومات */}
                        <div className="flex justify-between items-center pt-2">
                          <div className="text-sm font-medium text-rose-700">
                            إجمالي الخصومات
                          </div>
                          <div className="font-bold text-rose-600">
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
                        <div className="text-sm text-slate-500">
                          قيمة العمل الإضافي
                        </div>
                        <div className="font-bold text-emerald-600">
                          {formatCurrency(payrollResult.overtimeAmount)}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-500">
                          إجمالي الراتب
                        </div>
                        <div className="font-bold">
                          {formatCurrency(payrollResult.grossSalary)}
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-indigo-50 p-2 rounded-lg">
                        <div className="font-bold text-indigo-700">
                          صافي الراتب
                        </div>
                        <div className="font-bold text-lg text-indigo-600">
                          {formatCurrency(payrollResult.netSalary)}
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 text-center pt-2">
                        {numberToArabicWords(payrollResult.netSalary)} جنيه لا
                        غير
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">ملخص الحضور</h4>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            أيام العمل القياسية:
                          </span>
                          <span className="font-medium">
                            {payrollResult.standardWorkingDays}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">معدل اليوم:</span>
                          <span className="font-medium">
                            {formatCurrency(payrollResult.dailyRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">أيام الحضور:</span>
                          <span className="font-medium">
                            {payrollResult.actualWorkDays}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">أيام الغياب:</span>
                          <span className="font-medium">
                            {payrollResult.absentDays}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">ساعات إضافية:</span>
                          <span className="font-medium">
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
                            // Generate PDF
                            tToast.success("hr_PayrollTesting.msg_98c4");
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
                            // Print payslip
                            tToast.success("hr_PayrollTesting.msg_f478");
                          }}
                        >
                          <Printer className="h-4 w-4 ml-2" />
                          طباعة
                        </Button>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => {
                          // Save payroll
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
        )}
      </div>
    </div>
  );
};

export default PayrollTesting;
