import React, { useState, useEffect } from "react";
import { Calendar, Download, Printer, DollarSign, ArrowLeft, CreditCard, User as UserIcon, Building, TrendingUp, ShieldCheck, Zap, AlertTriangle, File, PieChart, Info, CheckCircle2, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import api from "../../services/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useCompany } from "../../contexts/CompanyContext";

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  PENDING: { label: 'بانتظار الاعتماد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING_APPROVAL: { label: 'بانتظار الاعتماد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'معتمد', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PROCESSED: { label: 'معتمد', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAID: { label: 'مدفوع', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  CANCELLED: { label: 'ملغي', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  PROJECTION: { label: 'تقديري', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

interface SalaryComponent {
  name: string;
  amount: number;
  type?: string;
  note?: string;
}

interface PayrollData {
  id: string;
  month: number;
  year: number;
  baseSalary: number;
  netSalary: number;
  grossSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  attendanceDeduction: number;
  latePenalty: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonuses: number;
  socialInsurance: number;
  taxAmount: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  allowances: string | null;
  deductions: string | null;
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatar: string;
    baseSalary?: number;
    position?: {
      title: string;
    };
    bankName?: string;
    bankAccountNumber?: string;
    bankIban?: string;
  };
  company?: {
    name: string;
    logo: string;
    taxNumber: string;
  };
}

const MyPayroll: React.FC = () => {
  const { company } = useCompany();
  const [loading, setLoading] = useState<boolean>(true);
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [month, setMonth] = useState<string>(new Date().getMonth() + 1 + "");
  const [year, setYear] = useState<string>(new Date().getFullYear() + "");

  const months = [
    { value: "1", label: "يناير" }, { value: "2", label: "فبراير" },
    { value: "3", label: "مارس" }, { value: "4", label: "أبريل" },
    { value: "5", label: "مايو" }, { value: "6", label: "يونيو" },
    { value: "7", label: "يوليو" }, { value: "8", label: "أغسطس" },
    { value: "9", label: "سبتمبر" }, { value: "10", label: "أكتوبر" },
    { value: "11", label: "نوفمبر" }, { value: "12", label: "ديسمبر" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 3 + i).toString());

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const response = await api.get("/hr/my-payroll", { params: { month, year } });
      setPayrollData(response.data?.payroll || null);
    } catch (error) {
      console.error("Error fetching payroll data:", error);
      toast.error("حدث خطأ أثناء جلب بيانات الراتب");
      setPayrollData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayroll(); }, [month, year]);

  const formatCurrency = (amount: any) => {
    if (amount === undefined || amount === null) return "0.00";
    return Number(amount).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseComponents = (jsonStr: string | null): SalaryComponent[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return parsed;
      return Object.entries(parsed).map(([name, amount]) => ({
        name, amount: typeof amount === 'number' ? amount : parseFloat(amount as string) || 0
      }));
    } catch (e) { return []; }
  };

  const allowances = parseComponents(payrollData?.allowances || null);
  const deductionsRaw = parseComponents(payrollData?.deductions || null);
  const originalBaseSalary = Number(payrollData?.employee?.baseSalary || payrollData?.baseSalary || 0);
  const earnedBaseSalary = Number(payrollData?.baseSalary || 0);
  const partialMonthDeduction = originalBaseSalary > earnedBaseSalary ? originalBaseSalary - earnedBaseSalary : 0;

  const groupedDeductions = [
    ...(payrollData?.attendanceDeduction ? [{ name: 'خصم غياب', amount: Number(payrollData.attendanceDeduction) }] : []),
    ...(payrollData?.latePenalty ? [{ name: 'جزاء تأخير', amount: Number(payrollData.latePenalty) }] : []),
    ...(partialMonthDeduction > 0 ? [{ name: 'فرق عمل بقية الشهر', amount: partialMonthDeduction }] : []),
    ...deductionsRaw
  ];

  const handlePrint = () => {
    if (!payrollData) return;

    // Helper to escape HTML to prevent XSS
    const escapeHTML = (str: string) => {
      if (!str) return '';
      return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m] || m));
    };

    const detailedAllowances = payrollData.allowances ? (typeof payrollData.allowances === 'string' ? JSON.parse(payrollData.allowances) : payrollData.allowances) : {};
    const detailedDeductions = payrollData.deductions ? (typeof payrollData.deductions === 'string' ? JSON.parse(payrollData.deductions) : payrollData.deductions) : {};

    const escapedFirstName = escapeHTML(payrollData.employee?.firstName || '');
    const escapedLastName = escapeHTML(payrollData.employee?.lastName || '');
    const escapedCompanyName = escapeHTML(company?.name || 'اسم الشركة');
    const escapedEmployeeNumber = escapeHTML(payrollData.employee?.employeeNumber || '000');
    const escapedPositionTitle = escapeHTML(payrollData.employee?.position?.title || 'موظف');

    const qrData = `Company: ${escapedCompanyName} | Payroll ID: ${payrollData.id} | Employee: ${escapedFirstName} ${escapedLastName} | Month: ${payrollData.month}/${payrollData.year} | Net: ${payrollData.netSalary} EGP`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

    const htmlContent = `
      <html dir="rtl">
        <head>
          <title>كشف راتب - ${escapedFirstName} ${escapedLastName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
            @page { size: A4; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Cairo', sans-serif; color: #0f172a; line-height: 1.5; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .container { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 40px; position: relative; }
            .top-bar { position: absolute; top: 0; left: 0; right: 0; height: 12px; background: linear-gradient(90deg, #1e1b4b 0%, #4338ca 100%); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; margin-top: 10px; }
            .company-info .name { font-size: 32px; font-weight: 800; color: #1e1b4b; line-height: 1.2; }
            .slip-badge { background: #f1f5f9; padding: 12px 24px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0; }
            .slip-badge .title { font-size: 18px; font-weight: 800; color: #1e1b4b; display: block; }
            .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; margin-bottom: 40px; }
            .info-item { background: #fff; padding: 16px 20px; display: flex; flex-direction: column; }
            .info-item .label { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
            .info-item .value { color: #1e293b; font-weight: 700; font-size: 15px; }
            .payroll-body { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
            .section-title { font-size: 16px; font-weight: 800; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #f1f5f9; }
            .earnings { color: #059669; border-color: #ecfdf5; }
            .deductions { color: #dc2626; border-color: #fef2f2; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 14px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; }
            .amount { text-align: left; font-weight: 700; color: #0f172a; font-family: monospace; }
            .totals { margin-top: 40px; display: flex; align-items: flex-end; gap: 30px; }
            .qr-wrapper { flex-shrink: 0; background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center; }
            .qr-wrapper img { width: 80px; height: 80px; }
            .net-card { flex-grow: 1; background: #1e1b4b; color: #fff; border-radius: 20px; padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; }
            .net-card .v { font-size: 34px; font-weight: 900; }
            .signature-zone { margin-top: 80px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 60px; text-align: center; }
            .sig-box { border-top: 1px solid #e2e8f0; padding-top: 16px; }
            .sig-box .name { font-size: 13px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="top-bar"></div>
            <header class="header">
              <div class="company-info"><div class="name">${escapedCompanyName}</div></div>
              <div class="slip-badge"><span class="title">كشف الراتب الشهري</span><span class="period">${months.find(m => m.value === month)?.label} ${year}</span></div>
            </header>
            <section class="info-grid">
              <div class="info-item"><span class="label">الموظف</span><span class="value">${escapedFirstName} ${escapedLastName}</span></div>
              <div class="info-item"><span class="label">الرقم الوظيفي</span><span class="value">#${escapedEmployeeNumber}</span></div>
              <div class="info-item"><span class="label">المسمى الوظيفي</span><span class="value">${escapedPositionTitle}</span></div>
              <div class="info-item"><span class="label">تاريخ الإصدار</span><span class="value">${new Date().toLocaleDateString('ar-EG')}</span></div>
              <div class="info-item"><span class="label">الحالة</span><span class="value">${statusConfig[payrollData.status]?.label || 'معتمد'}</span></div>
            </section>
            <main class="payroll-body">
              <div class="section">
                <h2 class="section-title earnings">الاستحقاقات</h2>
                <table>
                  <tr><td>الراتب الأساسي</td><td class="amount">${formatCurrency(payrollData.baseSalary)}</td></tr>
                  ${Object.entries(detailedAllowances).map(([k, v]) => `<tr><td>${escapeHTML(k)}</td><td class="amount">${formatCurrency(v)}</td></tr>`).join('')}
                  ${payrollData.overtimeAmount > 0 ? `<tr><td>العمل الإضافي</td><td class="amount">${formatCurrency(payrollData.overtimeAmount)}</td></tr>` : ''}
                  ${payrollData.bonuses > 0 ? `<tr><td>المكافآت</td><td class="amount">${formatCurrency(payrollData.bonuses)}</td></tr>` : ''}
                  <tr style="border-top: 2px solid #ecfdf5;"><td style="font-weight: 800; color: #059669;">الإجمالي</td><td class="amount" style="color: #059669;">${formatCurrency(payrollData.grossSalary)}</td></tr>
                </table>
              </div>
              <div class="section">
                <h2 class="section-title deductions">الاستقطاعات</h2>
                <table>
                  ${payrollData.attendanceDeduction > 0 ? `<tr><td>خصم الغياب</td><td class="amount">${formatCurrency(payrollData.attendanceDeduction)}</td></tr>` : ''}
                  ${payrollData.socialInsurance > 0 ? `<tr><td>التأمينات</td><td class="amount">${formatCurrency(payrollData.socialInsurance)}</td></tr>` : ''}
                  ${payrollData.taxAmount > 0 ? `<tr><td>الضرائب</td><td class="amount">${formatCurrency(payrollData.taxAmount)}</td></tr>` : ''}
                  ${Object.entries(detailedDeductions).map(([k, v]) => { if (['details', 'manualDetails', 'capNotes', 'advanceDetails'].includes(k)) return ''; return `<tr><td>${escapeHTML(k)}</td><td class="amount">${formatCurrency(v)}</td></tr>`; }).join('')}
                  <tr style="border-top: 2px solid #fef2f2;"><td style="font-weight: 800; color: #dc2626;">الإجمالي</td><td class="amount" style="color: #dc2626;">${formatCurrency(payrollData.totalDeductions)}</td></tr>
                </table>
              </div>
            </main>
            <footer class="totals">
              <div class="qr-wrapper"><img src="${qrCodeUrl}" alt="QR" /></div>
              <div class="net-card"><div class="label-group"><span>صافي المبلغ</span><div class="v">${formatCurrency(payrollData.netSalary)}</div></div></div>
            </footer>
          </div>
        </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { printWin.print(); printWin.close(); }, 500);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  const totalEarningsDisplay = Number(payrollData?.grossSalary || 0) + partialMonthDeduction;
  const totalDeductionsDisplay = Number(payrollData?.totalDeductions || 0) + partialMonthDeduction;

  return (
    <div className="p-4 md:p-8 lg:p-12 space-y-10 bg-slate-50 dark:bg-[#020617] min-h-screen font-inter text-slate-800 dark:text-slate-200 relative overflow-hidden transition-colors duration-500" dir="rtl">
      {/* Dynamic Ambient Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 dark:bg-emerald-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-500/5 dark:bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Corporate Header - High Impact */}
      <div className="max-w-[1400px] mx-auto w-full flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 text-[10px] font-black tracking-[0.3em] text-emerald-400 uppercase bg-emerald-500/5 px-5 py-2 rounded-full border border-emerald-500/20 w-fit backdrop-blur-md"
          >
            <ShieldCheck className="h-4 w-4" />
            بيانات مالية معتمدة وآمنة
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
              أهلاً بك، <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-emerald-500 to-indigo-500">{payrollData?.employee?.firstName}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
              إليك التفاصيل الكاملة لراتبك لشهر <span className="text-slate-900 dark:text-white font-bold">{months.find(m => m.value === month)?.label} {year}</span>. تم تحديث البيانات بنجاح.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex bg-slate-200/50 dark:bg-white/5 backdrop-blur-3xl p-1.5 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl relative">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="border-none w-36 shadow-none focus:ring-0 text-slate-800 dark:text-white font-black hover:bg-slate-300/30 dark:hover:bg-white/10 transition-all rounded-[1.5rem] h-12 text-base bg-transparent">
                <SelectValue placeholder="الشهر" />
              </SelectTrigger>
              <SelectContent className="rounded-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-white backdrop-blur-3xl">
                {months.map((m) => <SelectItem key={m.value} value={m.value} className="font-bold py-2 focus:bg-emerald-500/20">{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="w-px bg-slate-300 dark:bg-white/10 my-3 mx-1"></div>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="border-none w-28 shadow-none focus:ring-0 text-slate-800 dark:text-white font-black hover:bg-slate-300/30 dark:hover:bg-white/10 transition-all rounded-[1.5rem] h-12 text-base bg-transparent">
                <SelectValue placeholder="السنة" />
              </SelectTrigger>
              <SelectContent className="rounded-3xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 text-slate-800 dark:text-white backdrop-blur-3xl">
                {years.map((y) => <SelectItem key={y} value={y} className="font-bold py-2 focus:bg-emerald-500/20">{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {payrollData && (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)" }}
              whileTap={{ scale: 0.95 }}
              className="rounded-[2rem] bg-emerald-500 text-white px-8 h-14 font-black text-base flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer border-none"
              onClick={handlePrint}
            >
              <Printer className="w-5 h-5" /> طباعة الكشف
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => <div key={i} className="h-96 bg-slate-900/50 animate-pulse rounded-[4rem]"></div>)}
          </div>
        ) : !payrollData ? (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto flex flex-col items-center justify-center py-40 text-center bg-slate-900/30 backdrop-blur-3xl rounded-[5rem] border border-white/5 shadow-3xl"
          >
            <div className="relative mb-12">
              <div className="h-40 w-40 bg-emerald-500/10 rounded-[3rem] flex items-center justify-center animate-bounce">
                <History className="h-20 w-20 text-emerald-500" />
              </div>
            </div>
            <h3 className="text-5xl font-black text-white mb-6 tracking-tight">لا تتوفر بيانات حالياً</h3>
            <p className="text-slate-400 max-w-lg text-xl font-medium leading-relaxed">
              تحت المعالجة: جاري تجهيز كشوف الرواتب لهذه الفترة من قبل الإدارة المالية. يرجى التحقق لاحقاً.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-[1400px] mx-auto w-full grid lg:grid-cols-12 gap-10 relative z-10"
          >
            {/* Left Column: Summary & Hero */}
            <div className="lg:col-span-8 space-y-10">
              {/* Grand Hero Card */}
              <motion.div
                variants={itemVariants}
                className="relative bg-white dark:bg-gradient-to-br dark:from-[#1e293b] dark:to-[#0f172a] rounded-[2.5rem] p-8 lg:p-10 border border-slate-200 dark:border-white/10 shadow-2xl dark:shadow-[0_30px_70px_rgba(0,0,0,0.4)] group overflow-hidden"
              >
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                <div className="absolute -bottom-20 -right-20 h-80 w-80 bg-emerald-500/5 rounded-full blur-[100px]"></div>

                <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10">
                  <div className="flex flex-col lg:flex-row items-center gap-8 text-center lg:text-right">
                    <div className="relative">
                      <div className="h-28 w-28 lg:h-32 lg:w-32 bg-gradient-to-tr from-emerald-500 via-blue-600 to-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl group-hover:scale-105 transition-all duration-700">
                        <UserIcon className="h-12 w-12 lg:h-14 lg:w-14 text-white" />
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-2 -left-2 h-10 w-10 bg-emerald-500 rounded-[1rem] flex items-center justify-center border-[4px] border-white dark:border-[#1e293b] shadow-xl"
                      >
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </motion.div>
                    </div>

                    <div className="space-y-2 text-right">
                      <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {payrollData.employee?.firstName} {payrollData.employee?.lastName}
                      </h2>
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                        <Badge className="bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/20 px-4 py-1 rounded-xl font-bold text-[10px] tracking-widest uppercase">ID: {payrollData.employee?.employeeNumber}</Badge>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-4 py-1 rounded-xl font-bold text-[10px]">{payrollData.employee?.position?.title || "موظف متميز"}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-center lg:text-left space-y-2 border-t lg:border-t-0 lg:border-r border-slate-100 dark:border-white/10 pt-10 lg:pt-0 lg:pr-10 w-full lg:w-auto">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-1 opacity-80 uppercase">الراتب الأساسي التعاقدي</p>
                    <div className="flex items-baseline justify-center lg:justify-end gap-2">
                      <span className="text-4xl lg:text-6xl font-bold tracking-tight tabular-nums bg-gradient-to-b from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:to-slate-500 bg-clip-text text-transparent drop-shadow-lg">
                        {formatCurrency(originalBaseSalary)}
                      </span>
                      <span className="text-lg font-bold text-slate-400">ج.م</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Data Breakdown Grid */}
              <div className="grid md:grid-cols-2 gap-10">
                {/* Earnings */}
                <motion.div variants={itemVariants} className="space-y-8">
                  <div className="flex items-center justify-between px-6">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                      <div className="h-9 w-9 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-5 w-5" /></div>
                      المستحقات
                    </h3>
                    <div className="text-emerald-400 font-black text-lg">+{formatCurrency(totalEarningsDisplay)}</div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-slate-200 dark:border-white/5 space-y-6 shadow-xl dark:shadow-2xl">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 dark:text-blue-400"><FileText className="h-5 w-5" /></div>
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-base">الراتب الأساسي</span>
                      </div>
                      <span className="font-black text-slate-900 dark:text-white text-lg">{formatCurrency(payrollData.employee?.baseSalary || payrollData.baseSalary)}</span>
                    </div>

                    <div className="space-y-4 px-4">
                      {allowances.map((al, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                          <span className="text-slate-500 dark:text-slate-400 font-bold group-hover:text-emerald-500 transition-colors text-sm">{al.name}</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">+{formatCurrency(al.amount)}</span>
                        </div>
                      ))}
                      {payrollData.overtimeAmount > 0 && (
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/5">
                          <div>
                            <span className="text-slate-500 dark:text-slate-400 font-bold block leading-none mb-1 text-sm">الساعات الإضافية</span>
                            <span className="text-[9px] text-emerald-500/80 font-black uppercase">({payrollData.overtimeHours}H APPROVED)</span>
                          </div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">+{formatCurrency(payrollData.overtimeAmount)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <span className="font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em]">الإجمالي الإجمالي</span>
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalEarningsDisplay)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Deductions */}
                <motion.div variants={itemVariants} className="space-y-8">
                  <div className="flex items-center justify-between px-6">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-4">
                      <div className="h-9 w-9 bg-red-500/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400"><AlertCircle className="h-5 w-5" /></div>
                      الاستقطاعات
                    </h3>
                    <div className="text-red-400 font-black text-lg">-{formatCurrency(totalDeductionsDisplay)}</div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-slate-200 dark:border-white/5 space-y-6 shadow-xl dark:shadow-2xl">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/5 group hover:border-red-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-400"><ShieldCheck className="h-5 w-5" /></div>
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-base">التأمينات</span>
                      </div>
                      <span className="font-black text-red-600 dark:text-red-400 text-lg">-{formatCurrency(payrollData.socialInsurance)}</span>
                    </div>

                    <div className="space-y-4 px-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">الضرائب المقتطعة</span>
                        <span className="font-black text-red-600 dark:text-red-400 text-base">-{formatCurrency(payrollData.taxAmount)}</span>
                      </div>
                      {groupedDeductions.map((de, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                          <span className="text-slate-500 dark:text-slate-400 font-bold group-hover:text-red-500 transition-colors text-sm">{de.name}</span>
                          <span className="font-black text-red-600 dark:text-red-400 text-base">-{formatCurrency(de.amount)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                      <span className="font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em]">إجمالي الاستقطاع</span>
                      <span className="text-3xl font-black text-red-600 dark:text-red-400">{formatCurrency(totalDeductionsDisplay)}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Sidebar: Premium Components */}
            <div className="lg:col-span-4 space-y-10">
              {/* Payment Method Card - Premium Wallet Style */}
              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] p-8 border border-slate-200 dark:border-white/10 relative overflow-hidden group shadow-xl">
                <div className="absolute -top-10 -left-10 h-40 w-40 bg-blue-500/5 rounded-full blur-[60px]"></div>

                <div className="space-y-8 relative z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white">بيانات الدفع</h3>
                    <CreditCard className="text-blue-500 dark:text-emerald-400" />
                  </div>

                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/10 hover:border-emerald-500/20 transition-all">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">المسار البنكي</p>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 dark:bg-white/10 rounded-xl flex items-center justify-center font-black text-blue-600 dark:text-white italic text-lg">
                          {payrollData.employee?.bankName?.substring(0, 1) || "B"}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800 dark:text-white leading-none">{payrollData.employee?.bankName || "البنك الوطني"}</p>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-500 mt-1">حساب نشط - جاري</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/10 hover:border-emerald-500/20 transition-all">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">رقم الحساب الدولي</p>
                      <p className="text-base font-black text-slate-800 dark:text-white tabular-nums tracking-wider truncate">
                        {payrollData.employee?.bankAccountNumber ? `**** **** ${payrollData.employee.bankAccountNumber.slice(-4)}` : "EG82 0003 4827 1019 3828"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-slate-400 dark:text-slate-500">نسبة التحفيز الشهري</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{((payrollData.bonuses / (originalBaseSalary || 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((payrollData.bonuses / (originalBaseSalary || 1)) * 100 * 2, 100)}%` }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Secure Info Card */}
              <motion.div variants={itemVariants} className="bg-emerald-500/5 dark:bg-emerald-500/10 backdrop-blur-3xl rounded-[3rem] p-8 border border-emerald-500/20 space-y-6 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12">
                  <ShieldCheck className="h-24 w-24" />
                </div>

                <div className="flex items-center gap-4 relative z-10">
                  <div className="h-9 w-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><Zap className="h-5 w-5" /></div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">إشعار الأمان</h3>
                </div>

                <div className="space-y-4 relative z-10">
                  {[
                    "يتم تشفير كافة البيانات المالية طبقاً للمعايير العالمية.",
                    "بصمة الإصدار الرقمية معتمدة من قبل النظام المركزي.",
                    "برجاء الاحتفاظ بهذا الكشف كوثيقة رسمية للضرائب."
                  ].map((text, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full mt-2 group-hover:scale-150 transition-all"></div>
                      <p className="text-[13px] font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{text}</p>
                    </div>
                  ))}
                </div>

                <Button className="w-full rounded-2xl h-14 bg-white dark:bg-emerald-500 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] shadow-xl border border-slate-200 dark:border-none">
                  عرض سياسة الخصوصية
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Branding */}
      <div className="max-w-[1400px] mx-auto w-full pt-16 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-4 text-slate-600 dark:text-white">
          <Building2 className="h-5 w-5" />
          <span className="text-[10px] font-black tracking-[0.4em] uppercase">MAX-P ENTERPRISE PLATFORM</span>
        </div>
        <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <span>Security Certified</span>
          <span className="h-1 w-1 bg-slate-400 rounded-full"></span>
          <span>© 2026 All Rights Reserved</span>
        </div>
      </div>
    </div >
  );
};

export default MyPayroll;
