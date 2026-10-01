import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  DollarSign, Plus, Download, Filter, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, Check, CreditCard, FileText,
  Calculator, TrendingUp, Users, Calendar, MoreVertical,
  Sparkles, ShieldCheck, AlertCircle, RefreshCw, Zap,
  ArrowUpCircle, ArrowDownCircle, Wallet, Landmark, CheckCircle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import PayrollSimulator from './components/PayrollSimulator';
import api from '../../services/api';
import { toast } from 'sonner';
import { tToast } from "../../utils/i18n-toast";
import { useCompany } from '../../contexts/CompanyContext';

interface Payroll {
  id: string;
  month: number;
  year: number;
  baseSalary: number;
  fullMonthBaseSalary?: number; // الراتب الشهري الكامل
  totalAllowances: number;
  totalDeductions: number;
  overtimeAmount: number;
  bonuses: number;
  socialInsurance: number;
  taxAmount: number;
  grossSalary: number;
  netSalary: number;
  attendanceDeduction: number;
  absentDays: number;
  latePenalty: number;
  actualWorkDays?: number;
  workingDays?: number;
  status: string;
  paidAt: string | null;
  allowances: string | null; // JSON string
  deductions: string | null; // JSON string
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatar: string;
    department: { name: string } | null;
    position: { title: string } | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankIban?: string | null;
  };
}

interface PayrollSummary {
  month: number;
  year: number;
  totalEmployees: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalOvertime: number;
  totalBonuses: number;
  totalGross: number;
  totalNet: number;
  byStatus: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  PENDING: { label: 'بانتظار الاعتماد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PENDING_APPROVAL: { label: 'بانتظار الاعتماد', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'معتمد', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }, // Keep for legacy
  PROCESSED: { label: 'معتمد', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PAID: { label: 'مدفوع', color: 'bg-indigo-50 text-violet-700 border-violet-200' },
  CANCELLED: { label: 'ملغي', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  PROJECTION: { label: 'تقديري', color: 'bg-violet-50 text-violet-700 border-violet-200' },
};

const months = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const formatCurrency = (amount: number | undefined | null) => {
  const value = amount ?? 0;
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const Payroll: React.FC = () => {
  const location = useLocation();
  const isMyPayroll = location.pathname.includes('/my-payroll');
  const { company } = useCompany();

  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState('all');

  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'cash' | 'e_wallet'>('bank_transfer');
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [view, setView] = useState<'list' | 'simulator'>('list');
  const [autoStatus, setAutoStatus] = useState<any>(null);
  const [autoCalculating, setAutoCalculating] = useState(false);

  // Edit form data
  const [editFormData, setEditFormData] = useState({
    baseSalary: 0,
    totalAllowances: 0,
    totalDeductions: 0,
    overtimeAmount: 0,
    bonuses: 0,
    socialInsurance: 0,
    taxAmount: 0,
  });

  const [editingAllowances, setEditingAllowances] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [editingDeductions, setEditingDeductions] = useState<{ id: string; name: string; amount: number }[]>([]);

  const fetchPayrolls = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const endpoint = isMyPayroll ? '/hr/payroll/my-history' : '/hr/payroll';
      const response = await api.get(`${endpoint}?${params}`);

      let fetchedPayrolls = response.data.payrolls;

      // If My Payroll and Current Month, verify if we need to show projection
      if (isMyPayroll) {
        const now = new Date();
        const isCurrentMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();

        // If current month and no payroll exists (or even if it does, logic can vary, best to show projection if no valid payroll)
        const hasCurrentPayroll = fetchedPayrolls.some((p: any) => p.month === selectedMonth && p.year === selectedYear);

        if (isCurrentMonth && !hasCurrentPayroll) {
          try {
            const projResponse = await api.get('/hr/payroll/my-projection');

            if (projResponse.data.success && projResponse.data.projection) {
              fetchedPayrolls = [projResponse.data.projection, ...fetchedPayrolls];
            }
          } catch (err) {
            console.error('❌ [Payroll] Failed to fetch projection:', err);
          }
        }
      }

      setPayrolls(fetchedPayrolls);
      const total = response.data.pagination.total + (fetchedPayrolls.length > response.data.payrolls.length ? 1 : 0);
      setPagination(prev => ({
        ...prev,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }));
    } catch (error) {
      console.error('❌ [Payroll] Error fetching payrolls:', error);
      tToast.error("payroll.error_error_79b4");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedMonth, selectedYear, statusFilter, isMyPayroll]);

  const fetchSummary = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/hr/payroll/summary?${params}`);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }, [selectedMonth, selectedYear, statusFilter]);

  const fetchAutoStatus = React.useCallback(async () => {
    try {
      const response = await api.get(`/hr/payroll/auto-status?month=${selectedMonth}&year=${selectedYear}`);
      if (response.data.success) {
        setAutoStatus(response.data);
      }
    } catch (err) {
      console.warn('Failed to fetch payroll auto status:', err);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPayrolls();
    if (!isMyPayroll) {
      fetchSummary();
      fetchAutoStatus();
    }
  }, [fetchPayrolls, fetchSummary, fetchAutoStatus, isMyPayroll]);

  const handleAutoCalculatePayroll = async () => {
    try {
      setAutoCalculating(true);
      const response = await api.post('/hr/payroll/auto-calculate', {
        month: selectedMonth,
        year: selectedYear,
        forceRegenerate: true
      });

      if (response.data.success) {
        const res = response.data;
        toast.success(`تمت أتمتة وحساب كشوف الرواتب والخصومات لـ ${res.processed} موظف بنجاح`, {
          description: `خصومات الغياب: ${formatCurrency(res.totalAbsenceDeductions)} | خصومات التأخير: ${formatCurrency(res.totalLateDeductions)} | عجز الساعات: ${formatCurrency(res.totalDeficitDeductions)}`
        });
        fetchPayrolls();
        fetchSummary();
        fetchAutoStatus();
      }
    } catch (error: any) {
      console.error('Error auto-calculating payroll:', error);
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء أتمتة حساب الرواتب والخصومات');
    } finally {
      setAutoCalculating(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      const response = await api.post('/hr/payroll/generate', {
        month: selectedMonth,
        year: selectedYear,
        forceRegenerate
      });

      const result = response.data.result;

      // Show success message
      if (result.success.length > 0) {
        toast.success(`تم توليد ${result.success.length} كشف راتب جديد`);
      }

      // Show regenerated message
      if (result.regenerated && result.regenerated.length > 0) {
        toast.success(`تم إعادة توليد ${result.regenerated.length} كشف راتب`);
      }

      // Show skipped message
      if (result.skipped && result.skipped.length > 0) {
        toast.info(`تم تخطي ${result.skipped.length} موظف (لديهم كشوف رواتب مسبقاً)`);
      }

      // Show failed message
      if (result.failed.length > 0) {
        toast.warning(`فشل توليد ${result.failed.length} كشف`);
      }

      setShowGenerateDialog(false);
      setForceRegenerate(false);
      fetchPayrolls();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (payrollId: string) => {
    try {
      await api.post(`/hr/payroll/${payrollId}/approve`);
      tToast.success("payroll.msg_52b3");
      fetchPayrolls();
      if (!isMyPayroll) {
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handlePay = (payrollId: string) => {
    const p = payrolls.find(p => p.id === payrollId);
    if (p) setSelectedPayroll(p);
    else setSelectedPayroll(null);
    setPaymentMethod('bank_transfer');
    setShowPaymentDialog(true);
  };

  const handleBulkPay = () => {
    if (selectedIds.length === 0) {
      tToast.error("payroll.msg_4ddf");
      return;
    }
    setSelectedPayroll(null);
    setPaymentMethod('bank_transfer');
    setShowPaymentDialog(true);
  };

  const confirmPayment = async () => {
    try {
      setPaying(true);
      if (selectedPayroll) {
        await api.post(`/hr/payroll/${selectedPayroll.id}/pay`, {
          method: paymentMethod
        });
        tToast.success("payroll.msg_d787");
      } else {
        await api.post('/hr/payroll/bulk-pay', {
          payrollIds: selectedIds,
          paymentData: { method: paymentMethod }
        });
        toast.success(`تم صرف ${selectedIds.length} راتب بنجاح`);
        setSelectedIds([]);
      }
      setShowPaymentDialog(false);
      fetchPayrolls();
      if (!isMyPayroll) {
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء الصرف');
    } finally {
      setPaying(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      tToast.error("payroll.msg_4ddf");
      return;
    }

    try {
      const response = await api.post('/hr/payroll/bulk-approve', {
        payrollIds: selectedIds
      });
      toast.success(`تم اعتماد ${response.data.result.updated} كشف راتب`);
      setSelectedIds([]);
      fetchPayrolls();
      if (!isMyPayroll) {
        fetchSummary();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ');
    }
  };


  const toggleSelectAll = () => {
    if (selectedIds.length === payrolls.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payrolls.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleEdit = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setEditFormData({
      baseSalary: payroll.fullMonthBaseSalary || payroll.baseSalary,
      totalAllowances: payroll.totalAllowances,
      totalDeductions: payroll.totalDeductions,
      overtimeAmount: payroll.overtimeAmount,
      bonuses: payroll.bonuses,
      socialInsurance: payroll.socialInsurance,
      taxAmount: payroll.taxAmount,
    });

    // Parse detailed allowances and deductions
    try {
      const parsedAllowances = payroll.allowances ? JSON.parse(payroll.allowances) : {};
      setEditingAllowances(
        Object.entries(parsedAllowances)
          .filter(([_, amount]) => typeof amount === 'number')
          .map(([name, amount]) => ({
            id: Math.random().toString(36).substr(2, 9),
            name,
            amount: Number(amount)
          }))
      );
    } catch {
      setEditingAllowances([]);
    }

    const metaKeys = ['details', 'manualDetails', 'capNotes', 'advanceDetails'];
    try {
      const parsedDeductions = payroll.deductions ? JSON.parse(payroll.deductions) : {};
      setEditingDeductions(
        Object.entries(parsedDeductions)
          .filter(([name, amount]) => !metaKeys.includes(name) && typeof amount === 'number')
          .map(([name, amount]) => ({
            id: Math.random().toString(36).substr(2, 9),
            name,
            amount: Number(amount)
          }))
      );
    } catch {
      setEditingDeductions([]);
    }

    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayroll) return;
    try {
      setSaving(true);

      // Calculate totals and serialize details
      // Calculate totals and serialize details
      const totalAllowances = editingAllowances.reduce((sum, item) => sum + (item.amount || 0), 0);
      const totalDeductions = editingDeductions.reduce((sum, item) => sum + (item.amount || 0), 0);

      const allowancesObj = editingAllowances.reduce((acc, item) => {
        if (item.name.trim()) acc[item.name.trim()] = item.amount;
        return acc;
      }, {} as Record<string, number>);

      const deductionsObj = editingDeductions.reduce((acc, item) => {
        if (item.name.trim()) acc[item.name.trim()] = item.amount;
        return acc;
      }, {} as Record<string, number>);

      const payload = {
        ...editFormData,
        totalAllowances,
        totalDeductions,
        allowances: allowancesObj,
        deductions: deductionsObj
      };

      await api.put(`/hr/payroll/${selectedPayroll.id}`, payload);
      tToast.success("payroll.success_update_ffdd");
      setShowEditDialog(false);
      fetchPayrolls();
      fetchSummary();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'حدث خطأ أثناء التحديث');
    } finally {
      setSaving(false);
    }
  };
  const handlePrint = (payroll: Payroll) => {
    // Calculate Other Deductions correctly
    const otherDeductions = payroll.totalDeductions -
      (payroll.attendanceDeduction || 0) -
      (payroll.latePenalty || 0) -
      (payroll.socialInsurance || 0) -
      (payroll.taxAmount || 0);

    const detailedAllowances = payroll.allowances ? (typeof payroll.allowances === 'string' ? JSON.parse(payroll.allowances) : payroll.allowances) : {};
    const detailedDeductions = payroll.deductions ? (typeof payroll.deductions === 'string' ? JSON.parse(payroll.deductions) : payroll.deductions) : {};

    const hasDetailedDeductions = Object.keys(detailedDeductions).length > 0;

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

    const escapedFirstName = escapeHTML(payroll.employee?.firstName || '');
    const escapedLastName = escapeHTML(payroll.employee?.lastName || '');
    const escapedCompanyName = escapeHTML(company?.name || 'اسم الشركة');
    const escapedEmployeeNumber = escapeHTML(payroll.employee?.employeeNumber || '000');
    const escapedDepartmentName = escapeHTML(payroll.employee?.department?.name || 'غير محدد');
    const escapedPositionTitle = escapeHTML(payroll.employee?.position?.title || 'موظف');

    // QR Code for authenticity verification
    const qrData = `Company: ${escapedCompanyName} | Payroll ID: ${payroll.id} | Employee: ${escapedFirstName} ${escapedLastName} | Month: ${payroll.month}/${payroll.year} | Net: ${payroll.netSalary} EGP`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

    const printContent = `
      <html dir="rtl">
        <head>
          <title>كشف راتب - ${escapedFirstName} ${escapedLastName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
            
            @page { 
              size: A4; 
              margin: 0; 
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Cairo', sans-serif; 
              color: #0f172a; 
              line-height: 1.5;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .container { 
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto; 
              background: #fff;
              padding: 40px;
              position: relative;
            }

            /* Premium Accent Bar */
            .top-bar {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 12px;
              background: linear-gradient(90deg, #1e1b4b 0%, #4338ca 100%);
            }

            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              margin-bottom: 40px;
              margin-top: 10px;
            }

            .company-info .name { 
              font-size: 32px; 
              font-weight: 800; 
              color: #1e1b4b; 
              line-height: 1.2;
              letter-spacing: -0.5px;
            }
            
            .company-info .sub { 
              font-size: 14px; 
              color: #64748b; 
              font-weight: 500;
              margin-top: 4px;
            }

            .slip-badge {
              background: #f1f5f9;
              padding: 12px 24px;
              border-radius: 12px;
              text-align: center;
              border: 1px solid #e2e8f0;
            }
            .slip-badge .title {
              font-size: 18px;
              font-weight: 800;
              color: #1e1b4b;
              display: block;
            }
            .slip-badge .period {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
              margin-top: 2px;
            }

            .info-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 1px; 
              background: #e2e8f0;
              border: 1px solid #e2e8f0;
              border-radius: 16px; 
              overflow: hidden;
              margin-bottom: 40px; 
            }
            .info-item { 
              background: #fff;
              padding: 16px 20px; 
              display: flex;
              flex-direction: column;
            }
            .info-item .label { 
              color: #94a3b8; 
              font-size: 11px; 
              font-weight: 700; 
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-item .value { 
              color: #1e293b; 
              font-weight: 700; 
              font-size: 15px; 
            }

            .payroll-body {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }

            .section-title {
              font-size: 16px;
              font-weight: 800;
              margin-bottom: 16px;
              padding-bottom: 12px;
              border-bottom: 2px solid #f1f5f9;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .section-title.earnings { color: #059669; border-color: #ecfdf5; }
            .section-title.deductions { color: #dc2626; border-color: #fef2f2; }

            table { width: 100%; border-collapse: collapse; }
            td { 
              padding: 14px 0; 
              border-bottom: 1px solid #f8fafc; 
              font-size: 14px; 
              color: #334155;
            }
            .amount { 
              text-align: left; 
              font-weight: 700; 
              color: #0f172a;
              font-family: monospace;
              font-size: 15px;
            }

            .deduction-detail { margin-top: 4px; }
            .badge-mini {
              font-size: 9px;
              padding: 1px 4px;
              border-radius: 4px;
              font-weight: 800;
              margin-right: 6px;
            }
            .badge-manual { background: #fee2e2; color: #b91c1c; }
            .badge-auto { background: #e0f2fe; color: #0369a1; }
            .reason-text {
              font-size: 11px;
              color: #94a3b8;
              font-style: italic;
              display: block;
              margin-top: 2px;
            }

            .totals {
              margin-top: 40px;
              display: flex;
              align-items: flex-end;
              gap: 30px;
            }

            .qr-wrapper {
              flex-shrink: 0;
              background: #f8fafc;
              padding: 12px;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            .qr-wrapper img { width: 80px; height: 80px; mix-blend-mode: multiply; }
            .qr-wrapper span { font-size: 9px; color: #64748b; font-weight: 600; margin-top: 8px; display: block; }

            .net-card {
              flex-grow: 1;
              background: #1e1b4b;
              color: #fff;
              border-radius: 20px;
              padding: 30px 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 10px 25px -5px rgba(30, 27, 75, 0.2);
            }
            .net-card .label-group .l { font-size: 14px; opacity: 0.7; font-weight: 600; }
            .net-card .label-group .v { font-size: 34px; font-weight: 900; line-height: 1; margin-top: 4px; }
            .net-card .details-summary { text-align: left; }
            .net-card .details-summary div { font-size: 12px; opacity: 0.6; margin-bottom: 2px; }

            .signature-zone {
              margin-top: 80px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 60px;
              text-align: center;
            }
            .sig-box {
              border-top: 1px solid #e2e8f0;
              padding-top: 16px;
            }
            .sig-box .name { font-size: 13px; font-weight: 700; color: #1e293b; }
            .sig-box .role { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 2px; }

            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-35deg);
              font-size: 120px;
              font-weight: 900;
              color: rgba(30, 27, 75, 0.02);
              white-space: nowrap;
              z-index: -1;
              pointer-events: none;
            }

            @media print {
              body { background: #fff; }
              .container { width: 100%; border: none; padding: 40px; }
              .net-card { background: #1e1b4b !important; color: #fff !important; }
              .top-bar { background: #1e1b4b !important; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="top-bar"></div>
            <div class="watermark">سري للغاية</div>
            
            <header class="header">
              <div class="company-info">
                <div class="name">${escapedCompanyName}</div>
                <div class="sub">إدارة الموارد البشرية والرواتب</div>
              </div>
              <div class="slip-badge">
                <span class="title">كشف الراتب الشهري</span>
                <span class="period">${months[(payroll.month || selectedMonth) - 1]} ${payroll.year || selectedYear}</span>
              </div>
            </header>
            
            <section class="info-grid">
              <div class="info-item">
                <span class="label">الموظف</span>
                <span class="value">${escapedFirstName} ${escapedLastName}</span>
              </div>
              <div class="info-item">
                <span class="label">الرقم الوظيفي</span>
                <span class="value">#${escapedEmployeeNumber}</span>
              </div>
              <div class="info-item">
                <span class="label">القسم</span>
                <span class="value">${escapedDepartmentName}</span>
              </div>
              <div class="info-item">
                <span class="label">المسمى الوظيفي</span>
                <span class="value">${escapedPositionTitle}</span>
              </div>
              <div class="info-item">
                <span class="label">تاريخ الإصدار</span>
                <span class="value">${new Date().toLocaleDateString('ar-EG')}</span>
              </div>
              <div class="info-item" style="background: #f8fafc;">
                <span class="label">الحالة</span>
                <span class="value" style="color: #4338ca;">${statusConfig[payroll.status]?.label || 'مسودة'}</span>
              </div>
            </section>

            <main class="payroll-body">
              <!-- Earnings -->
              <div class="section">
                <h2 class="section-title earnings">الاستحقاقات</h2>
                <table>
                  <tr>
                    <td>الراتب الأساسي</td>
                    <td class="amount">${formatCurrency(payroll.baseSalary)}</td>
                  </tr>
                  ${Object.entries(detailedAllowances).map(([key, value]) => `
                  <tr>
                    <td>${escapeHTML(key)}</td>
                    <td class="amount">${formatCurrency(Number(value))}</td>
                  </tr>
                  `).join('')}
                  ${payroll.overtimeAmount > 0 ? `
                  <tr>
                    <td>العمل الإضافي</td>
                    <td class="amount">${formatCurrency(payroll.overtimeAmount)}</td>
                  </tr>
                  ` : ''}
                  ${payroll.bonuses > 0 ? `
                  <tr>
                    <td>المكافآت</td>
                    <td class="amount">${formatCurrency(payroll.bonuses)}</td>
                  </tr>
                  ` : ''}
                  <tr style="border-top: 2px solid #ecfdf5;">
                    <td style="font-weight: 800; color: #059669;">إجمالي الدخل</td>
                    <td class="amount" style="color: #059669;">${formatCurrency(payroll.grossSalary)}</td>
                  </tr>
                </table>
              </div>

              <!-- Deductions -->
              <div class="section">
                <h2 class="section-title deductions">الاستقطاعات</h2>
                <table>
                  ${payroll.attendanceDeduction > 0 ? `
                  <tr>
                    <td>خصم الغياب (${payroll.absentDays} يوم)</td>
                    <td class="amount">${formatCurrency(payroll.attendanceDeduction)}</td>
                  </tr>
                  ` : ''}
                  ${payroll.socialInsurance > 0 ? `
                  <tr>
                    <td>التأمينات الاجتماعية</td>
                    <td class="amount">${formatCurrency(payroll.socialInsurance)}</td>
                  </tr>
                  ` : ''}
                  ${payroll.taxAmount > 0 ? `
                  <tr>
                    <td>ضريبة الدخل</td>
                    <td class="amount">${formatCurrency(payroll.taxAmount)}</td>
                  </tr>
                  ` : ''}
                  ${Object.entries(detailedDeductions).map(([key, value]) => {
      if (['details', 'manualDetails', 'capNotes', 'advanceDetails'].includes(key)) return '';
      const allDetails = String(detailedDeductions.details || "");
      const specific = allDetails.split(' | ').filter(d => d.includes(key));
      const isManual = key.includes('يدوي') || (detailedDeductions.manualDetails && key.includes('يدوي')) || specific.some(s => s.includes('يدوي'));
      const subNote = specific.join(', ');

      return `
                    <tr>
                      <td>
                        <div class="deduction-detail">
                          <span>${escapeHTML(key)}</span>
                          <span class="badge-mini ${isManual ? 'badge-manual' : 'badge-auto'}">${isManual ? 'يدوي' : 'تلقائي'}</span>
                          ${subNote ? `<span class="reason-text">${escapeHTML(subNote)}</span>` : ''}
                        </div>
                      </td>
                      <td class="amount">${formatCurrency(Number(value))}</td>
                    </tr>
                    `;
    }).join('')}
                  <tr style="border-top: 2px solid #fef2f2;">
                    <td style="font-weight: 800; color: #dc2626;">إجمالي الخصم</td>
                    <td class="amount" style="color: #dc2626;">${formatCurrency(payroll.totalDeductions)}</td>
                  </tr>
                </table>
              </div>
            </main>

            <footer class="totals">
              <div class="qr-wrapper">
                <img src="${qrCodeUrl}" alt="QR" />
                <span>تحقق من الصحة</span>
              </div>
              <div class="net-card">
                <div class="label-group">
                  <span class="l">صافي المبلغ المستحق للدفع</span>
                  <div class="v">${formatCurrency(payroll.netSalary)}</div>
                </div>
                <div class="details-summary">
                  <div>(+) إجمالي الدخل: ${formatCurrency(payroll.grossSalary)}</div>
                  <div>(-) إجمالي الخصم: ${formatCurrency(payroll.totalDeductions)}</div>
                </div>
              </div>
            </footer>

            <div class="signature-zone">
              <div class="sig-box">
                <div class="name">${escapedFirstName} ${escapedLastName}</div>
                <div class="role">توقيع المستلم</div>
              </div>
              <div class="sig-box">
                <div class="name">قسم الحسابات</div>
                <div class="role">المراجعة والاعتماد</div>
              </div>
              <div class="sig-box">
                <div class="name">${escapedCompanyName}</div>
                <div class="role">ختم الشركة والمدير</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      tToast.error("payroll.msg_87c4");
    }
  };

  const handleExportBankFile = () => {
    if (payrolls.length === 0) {
      tToast.error("payroll.msg_06d8");
      return;
    }

    // CSV Header (Standard format suitable for bank uploads)
    const headers = [
      'Employee Number',
      'Employee Name',
      'Bank Name',
      'IBAN / Account Number',
      'Amount',
      'Currency',
      'Payment Reference'
    ];

    // Helper to sanitize CSV data (prevent CSV Injection)
    const sanitizeCSV = (val: string | number) => {
      const str = String(val);
      if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
        return `'${str}`;
      }
      return str;
    };

    // CSV Rows
    const rows = payrolls.map(p => {
      const name = `${p.employee?.firstName || ''} ${p.employee?.lastName || ''}`;
      const bank = p.employee?.bankName || '';
      // Prefer IBAN, fallback to Account Number
      const account = p.employee?.bankIban || p.employee?.bankAccountNumber || '';
      // Clean account number (remove spaces)
      const cleanAccount = account.replace(/\s/g, '');

      return [
        sanitizeCSV(p.employee?.employeeNumber || ''),
        `"${sanitizeCSV(name)}"`,
        `"${sanitizeCSV(bank)}"`,
        `"${sanitizeCSV(cleanAccount)}"`, // Quote to prevent scientific notation in Excel
        sanitizeCSV(p.netSalary.toFixed(2)),
        'EGP',
        `"${sanitizeCSV(`SALARY ${selectedMonth}/${selectedYear}`)}"`
      ];
    });

    // Construct CSV content with BOM for Excel Arabic support
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bank_transfer_payroll_${selectedMonth}_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isMyPayroll ? 'رواتبي' : 'إدارة الرواتب'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" onClick={handleExportBankFile}>
            <Download className="h-4 w-4 ml-2" />
            ملف الصرف
          </Button>
          {!isMyPayroll && (
            <>
              <Button
                variant={view === 'simulator' ? "default" : "outline"}
                onClick={() => setView(view === 'list' ? 'simulator' : 'list')}
                className={view === 'simulator' ? "bg-indigo-600 hover:bg-indigo-700" : ""}
              >
                {view === 'list' ? (
                  <>
                    <Zap className="h-4 w-4 ml-2" />
                    محاكي الرواتب
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 ml-2" />
                    عرض الكشوف
                  </>
                )}
              </Button>
              <Button onClick={() => setShowGenerateDialog(true)} variant="outline">
                <Calculator className="h-4 w-4 ml-2" />
                إعداد الرواتب
              </Button>
              <Button
                onClick={handleAutoCalculatePayroll}
                disabled={autoCalculating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {autoCalculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 ml-1.5 animate-spin" />
                    جاري الحساب والخصم الآلي...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 ml-1.5" />
                    أتمتة وحساب الرواتب والخصومات
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Automation Telemetry & Status Bar */}
      {!isMyPayroll && autoStatus && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 text-xs shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>نظام الأتمتة:</span>
              <span className="font-bold text-white">{autoStatus.autoDeductionEnabled ? 'مفعّل تلقائياً' : 'معطل'}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>يوم الصرف الشهري:</span>
              <span className="font-semibold text-white">يوم {autoStatus.payrollDay}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>معامل الغياب:</span>
              <span className="font-semibold text-white">{autoStatus.absencePenaltyRate}x</span>
              <span className="text-slate-400">({autoStatus.workingHoursPerDay}س/يوم)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-950/60 border-emerald-500/30 text-emerald-300 text-[11px] tabular-nums">
              {autoStatus.stats?.attendanceCount || 0} سجل حضور مسجل
            </Badge>
            <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 text-[11px] tabular-nums">
              {autoStatus.stats?.draftCount || 0} مسودة جاهزة
            </Badge>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {view === 'simulator' ? (
        <PayrollSimulator />
      ) : (
        <>
          {/* Summary Cards */}
          {!isMyPayroll && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm">عدد الموظفين</p>
                      <h3 className="text-3xl font-bold mt-1">{summary?.totalEmployees || 0}</h3>
                    </div>
                    <Users className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">إجمالي الرواتب</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {formatCurrency(summary?.totalGross || 0)}
                      </h3>
                    </div>
                    <DollarSign className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-indigo-100 text-sm">صافي الرواتب</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {formatCurrency(summary?.totalNet || 0)}
                      </h3>
                    </div>
                    <CreditCard className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-fuchsia-500 to-pink-400 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-fuchsia-100 text-sm">الخصومات</p>
                      <h3 className="text-2xl font-bold mt-1">
                        {formatCurrency(summary?.totalDeductions || 0)}
                      </h3>
                    </div>
                    <TrendingUp className="h-10 w-10 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {['DRAFT', 'PENDING', 'PROCESSED', 'PAID'].map((key) => (
                      <SelectItem key={key} value={key}>{statusConfig[key].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedIds.length > 0 && !isMyPayroll && (
                  <div className="flex gap-2 mr-auto">
                    <Button onClick={handleBulkApprove} variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                      <Check className="h-4 w-4 ml-2" />
                      اعتماد المحدد ({selectedIds.length})
                    </Button>
                    <Button onClick={handleBulkPay}>
                      <CreditCard className="h-4 w-4 ml-2" />
                      صرف المحدد ({selectedIds.length})
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payroll Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : payrolls.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 m-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-20 w-20 rounded-3xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center mb-6"
                  >
                    <Calculator className="h-10 w-10 text-indigo-500 opacity-80" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">لا توجد بيانات رواتب مُحققة</h3>
                  <p className="text-slate-500 max-w-sm text-center mb-8 px-4">
                    لم يتم توليد أي كشوف رواتب لهذه الفترة حتى الآن. يمكنك بدء الدورة المالية الحالية بضغطة زر واحدة.
                  </p>
                  {!isMyPayroll && (
                    <Button
                      onClick={() => setShowGenerateDialog(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 h-11 px-8 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                    >
                      <Sparkles className="h-4 w-4 ml-2" />
                      بدء إعداد الرواتب الآن
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!isMyPayroll && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.length === payrolls.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      {!isMyPayroll && <TableHead className="text-right">الموظف</TableHead>}
                      {isMyPayroll && <TableHead className="text-right">الفترة</TableHead>}
                      <TableHead className="text-right">الراتب الأساسي</TableHead>
                      <TableHead className="text-right">البدلات</TableHead>
                      <TableHead className="text-right">الخصومات</TableHead>
                      <TableHead className="text-right">صافي الراتب</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrolls.map((payroll) => {
                      return (
                        <TableRow key={payroll.id}>
                          {!isMyPayroll && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(payroll.id)}
                                onCheckedChange={() => toggleSelect(payroll.id)}
                              />
                            </TableCell>
                          )}
                          {!isMyPayroll && (
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={payroll.employee?.avatar} />
                                  <AvatarFallback>
                                    {payroll.employee?.firstName?.[0]}{payroll.employee?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {payroll.employee?.firstName} {payroll.employee?.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {payroll.employee?.position?.title}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          {isMyPayroll && (
                            <TableCell>
                              {months[(payroll.month || selectedMonth) - 1]} {payroll.year || selectedYear}
                            </TableCell>
                          )}
                          <TableCell>{formatCurrency(payroll.fullMonthBaseSalary || payroll.baseSalary)}</TableCell>
                          <TableCell className="text-green-600">
                            <span className="font-semibold block tabular-nums">
                              +{formatCurrency(payroll.totalAllowances)}
                            </span>
                            {payroll.overtimeAmount && Number(payroll.overtimeAmount) > 0 ? (
                              <div className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold tabular-nums mt-0.5" title={`ساعات إضافية: ${payroll.overtimeHours || 0}س`}>
                                إضافي: +{formatCurrency(payroll.overtimeAmount)} ({Number(payroll.overtimeHours).toFixed(1)}س)
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-red-600">
                            <span className="font-semibold block tabular-nums">
                              -{formatCurrency(
                                Number(payroll.totalDeductions) +
                                (Number(payroll.fullMonthBaseSalary || 0) > Number(payroll.baseSalary)
                                  ? Number(payroll.fullMonthBaseSalary) - Number(payroll.baseSalary)
                                  : 0)
                              )}
                            </span>
                            {(() => {
                              try {
                                const d = typeof payroll.deductions === 'string'
                                  ? JSON.parse(payroll.deductions || '{}')
                                  : (payroll.deductions || {});
                                const items: string[] = [];
                                if (d['غياب'] || payroll.absentDays > 0) {
                                  items.push(`غياب: ${payroll.absentDays ? `${payroll.absentDays}ي` : ''}${d['غياب'] ? ` (${formatCurrency(Number(d['غياب']))})` : ''}`);
                                }
                                if (d['تأخيرات'] || (payroll.latePenalty && payroll.latePenalty > 0)) {
                                  items.push(`تأخير: ${formatCurrency(Number(d['تأخيرات'] || payroll.latePenalty))}`);
                                }
                                if (d['عجز ساعات العمل']) {
                                  items.push(`عجز: ${formatCurrency(Number(d['عجز ساعات العمل']))}`);
                                }
                                if (items.length > 0) {
                                  return (
                                    <div className="text-[10px] text-red-500 font-medium tabular-nums mt-0.5 truncate max-w-[190px]" title={items.join(' • ')}>
                                      {items.join(' • ')}
                                    </div>
                                  );
                                }
                              } catch {
                                // ignore parse error
                              }
                              return null;
                            })()}
                          </TableCell>
                          <TableCell className={`font-bold ${payroll.netSalary < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'} ltr:text-left rtl:text-right`}>
                            <span dir="ltr">{formatCurrency(payroll.netSalary)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig[payroll.status]?.color} border px-2.5 py-0.5 rounded-full font-medium shadow-sm transition-all`}>
                              {statusConfig[payroll.status]?.label || payroll.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedPayroll(payroll);
                                  setShowDetailsDialog(true);
                                }}>
                                  <Eye className="h-4 w-4 ml-2" />
                                  عرض التفاصيل
                                </DropdownMenuItem>
                                {!isMyPayroll && payroll.status !== 'PAID' && (
                                  <DropdownMenuItem onClick={() => handleApprove(payroll.id)}>
                                    <Check className="h-4 w-4 ml-2" />
                                    اعتماد
                                  </DropdownMenuItem>
                                )}
                                {!isMyPayroll && (
                                  <DropdownMenuItem onClick={() => handleEdit(payroll)}>
                                    <Edit className="h-4 w-4 ml-2" />
                                    تعديل
                                  </DropdownMenuItem>
                                )}
                                {!isMyPayroll && (payroll.status === 'PROCESSED' || payroll.status === 'APPROVED') && (
                                  <DropdownMenuItem onClick={() => handlePay(payroll.id)}>
                                    <CreditCard className="h-4 w-4 ml-2" />
                                    صرف
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handlePrint(payroll)}>
                                  <FileText className="h-4 w-4 ml-2" />
                                  طباعة
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">
                  عرض {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} من {pagination.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Generate Payroll Dialog */}
          {!isMyPayroll && (
            <Dialog open={showGenerateDialog} onOpenChange={(open) => {
              setShowGenerateDialog(open);
              if (!open) setForceRegenerate(false);
            }}>
              <DialogContent className="sm:max-w-xl overflow-hidden p-0 rounded-2xl border-none shadow-2xl">
                {/* Header with Background Pattern */}
                <div className="relative bg-indigo-600 p-8 text-white">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Calculator className="h-32 w-32 rotate-12" />
                  </div>
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold">إعداد مسودة الرواتب</DialogTitle>
                    <p className="text-indigo-100 mt-1 opacity-90">دورة {months[selectedMonth - 1]} {selectedYear}</p>
                  </div>
                </div>

                <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
                  {/* Process Summary Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <Users className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">الموظفين النشطين</p>
                        <p className="font-bold text-slate-900 dark:text-white">{summary?.totalEmployees || '--'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <Calendar className="h-5 w-5 text-indigo-500" />
                      <div>
                        <p className="text-xs text-slate-500 font-medium">أيام العمل</p>
                        <p className="font-bold text-slate-900 dark:text-white">حسب التقويم</p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      مصادر البيانات التي سيتم تحليلها
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'سجلات الحضور اليومي', icon: Check },
                        { label: 'طلبات الإجازات المعتمدة', icon: Check },
                        { label: 'العطلات الرسمية', icon: Check },
                        { label: 'الزيادات والمكافآت', icon: Check },
                        { label: 'التأمينات والضرائب', icon: Check },
                        { label: 'بدلات الموظفين', icon: Check },
                      ].map((item, i) => (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          key={i}
                          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
                        >
                          <item.icon className="h-3.5 w-3.5 text-emerald-500" />
                          {item.label}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Force Regenerate Tooltip-like Warning */}
                  <motion.div
                    animate={forceRegenerate ? { scale: [1, 1.02, 1], borderColor: '#f97316' } : {}}
                    className={`p-4 rounded-xl border-dashed transition-all ${forceRegenerate ? 'bg-orange-50/50 border-2 border-orange-500' : 'bg-slate-50/50 border border-slate-200 dark:border-slate-800'}`}
                  >
                    <div className="flex gap-3">
                      <Checkbox
                        id="forceRegenerate"
                        checked={forceRegenerate}
                        onCheckedChange={(checked) => setForceRegenerate(checked === true)}
                        className="mt-1 h-5 w-5 border-slate-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      />
                      <div className="flex-1">
                        <Label htmlFor="forceRegenerate" className="flex items-center gap-2 text-slate-900 dark:text-white font-bold cursor-pointer mb-1 text-sm">
                          <RefreshCw className={`h-3.5 w-3.5 ${forceRegenerate ? 'animate-spin-slow text-orange-600' : 'text-slate-400'}`} />
                          إعادة احتساب الرواتب (Overwrite)
                        </Label>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          عند تحديد هذا الخيار، سيتم استبدال جميع مسودات الرواتب الحالية لهذا الشهر بالبيانات الجديدة.
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowGenerateDialog(false)}
                      className="flex-1 h-12 rounded-xl text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                    >
                      إلغاء العملية
                    </Button>
                    <Button
                      onClick={handleGeneratePayroll}
                      disabled={generating}
                      className={`flex-[2] h-12 rounded-xl shadow-lg transition-all active:scale-95 ${generating ? 'bg-slate-200' : forceRegenerate ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200 dark:shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'}`}
                    >
                      <AnimatePresence mode="wait">
                        {generating ? (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>جاري المعالجة...</span>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <Zap className="h-4 w-4" />
                            <span>{forceRegenerate ? 'بدء إعادة الاحتساب' : 'بدء عملية الإعداد'}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  </div>
                </div>

                {/* Subtle Footer Info */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-center items-center gap-2 text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                  <ShieldCheck className="h-3 w-3" />
                  Secure Enterprise Calculation Engine v2.0
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Payroll Details Dialog */}
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تفاصيل كشف الراتب</DialogTitle>
              </DialogHeader>

              {selectedPayroll && (
                <div className="space-y-6 py-4 max-h-[75vh] overflow-y-auto pr-2 px-1">
                  {/* Employee Info */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedPayroll.employee?.avatar} />
                      <AvatarFallback>
                        {selectedPayroll.employee?.firstName?.[0]}{selectedPayroll.employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}
                      </h3>
                      <p className="text-gray-500">{selectedPayroll.employee?.position?.title}</p>
                      <p className="text-sm text-gray-400">{selectedPayroll.employee?.employeeNumber}</p>
                    </div>
                    <Badge className={`mr-auto ${statusConfig[selectedPayroll.status]?.color}`}>
                      {statusConfig[selectedPayroll.status]?.label}
                    </Badge>
                  </div>

                  {/* Attendance & Working Hours Telemetry Card */}
                  {(() => {
                    const deductionsObj = typeof selectedPayroll.deductions === 'string'
                      ? JSON.parse(selectedPayroll.deductions || '{}')
                      : (selectedPayroll.deductions || {});
                    
                    const absenceAmount = deductionsObj['غياب'] ?? 0;
                    const lateAmount = deductionsObj['تأخيرات'] ?? (selectedPayroll.latePenalty || 0);
                    const deficitAmount = deductionsObj['عجز ساعات العمل'] ?? 0;
                    const totalAttDeduct = Number(absenceAmount) + Number(lateAmount) + Number(deficitAmount) || (selectedPayroll.attendanceDeduction || 0);

                    const absenceLogs = deductionsObj.absenceDetails ? String(deductionsObj.absenceDetails).split(' | ') : [];
                    const lateLogs = deductionsObj.lateDetails ? String(deductionsObj.lateDetails).split(' | ') : [];
                    const deficitLogs = deductionsObj.deficitDetails ? String(deductionsObj.deficitDetails).split(' | ') : [];

                    return (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                              سجل الحضور وساعات العمل والخصومات الآلية
                            </span>
                          </div>
                          {totalAttDeduct > 0 ? (
                            <Badge variant="outline" className="bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-700 dark:text-rose-400 text-xs font-semibold tabular-nums">
                              إجمالي خصم الحضور: -{formatCurrency(totalAttDeduct)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                              لا توجد استقطاعات حضور
                            </Badge>
                          )}
                        </div>

                        {/* 4 Telemetry Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-xs">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">أيام العمل الفعلية</span>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-base font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                                {selectedPayroll.actualWorkDays ?? (selectedPayroll.workingDays ? selectedPayroll.workingDays - (selectedPayroll.absentDays || 0) : '-')}
                              </span>
                              {selectedPayroll.workingDays && (
                                <span className="text-[10px] text-slate-400">/ {selectedPayroll.workingDays} يوم</span>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-xs">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">أيام الغياب</span>
                            <div className="flex items-baseline gap-1.5 mt-1">
                              <span className={`text-base font-bold tabular-nums ${selectedPayroll.absentDays > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                {selectedPayroll.absentDays || 0}
                              </span>
                              {Number(absenceAmount) > 0 && (
                                <span className="text-[10px] text-rose-500 tabular-nums font-medium">(-{formatCurrency(Number(absenceAmount))})</span>
                              )}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-xs">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">غرامات التأخير</span>
                            <div className="mt-1">
                              <span className={`text-base font-bold tabular-nums ${Number(lateAmount) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                {Number(lateAmount) > 0 ? `-${formatCurrency(Number(lateAmount))}` : '0.00'}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 shadow-xs">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">عجز الساعات / مبكر</span>
                            <div className="mt-1">
                              <span className={`text-base font-bold tabular-nums ${Number(deficitAmount) > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                {Number(deficitAmount) > 0 ? `-${formatCurrency(Number(deficitAmount))}` : '0.00'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Detailed Calculation Logs if available */}
                        {(absenceLogs.length > 0 || lateLogs.length > 0 || deficitLogs.length > 0 || deductionsObj.capNotes) && (
                          <div className="mt-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5 text-[11px]">
                            {absenceLogs.length > 0 && (
                              <div className="flex items-start gap-1.5 text-rose-700 dark:text-rose-400">
                                <span className="font-semibold whitespace-nowrap">سجل الغياب:</span>
                                <span className="text-slate-600 dark:text-slate-300 leading-relaxed tabular-nums">{absenceLogs.join(' • ')}</span>
                              </div>
                            )}
                            {lateLogs.length > 0 && (
                              <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                                <span className="font-semibold whitespace-nowrap">سجل التأخيرات:</span>
                                <span className="text-slate-600 dark:text-slate-300 leading-relaxed tabular-nums">{lateLogs.join(' • ')}</span>
                              </div>
                            )}
                            {deficitLogs.length > 0 && (
                              <div className="flex items-start gap-1.5 text-indigo-700 dark:text-indigo-400">
                                <span className="font-semibold whitespace-nowrap">عجز الساعات:</span>
                                <span className="text-slate-600 dark:text-slate-300 leading-relaxed tabular-nums">{deficitLogs.join(' • ')}</span>
                              </div>
                            )}
                            {deductionsObj.capNotes && (
                              <div className="flex items-start gap-1.5 text-slate-500 dark:text-slate-400 italic">
                                <span className="font-semibold whitespace-nowrap">سقف الخصم القانوني:</span>
                                <span>{deductionsObj.capNotes}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Salary Breakdown */}
                  <div className="grid grid-cols-2 gap-8">
                    {/* Allowances/Earnings */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-green-700 flex items-center gap-2 border-b pb-2">
                        <ArrowUpCircle className="h-4 w-4" />
                        الاستحقاقات (Earnings)
                      </h4>
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="text-gray-600 text-sm">الراتب الأساسي (تعاقدي)</span>
                          <span className="font-bold text-sm">{formatCurrency(selectedPayroll.fullMonthBaseSalary || selectedPayroll.baseSalary)}</span>
                        </div>

                        {/* Detailed Allowances from JSON */}
                        {(() => {
                          const allowances = typeof selectedPayroll.allowances === 'string'
                            ? JSON.parse(selectedPayroll.allowances || '{}')
                            : (selectedPayroll.allowances || {});
                          return Object.entries(allowances).map(([name, amount], i) => (
                            <div key={i} className="flex justify-between items-center bg-green-50/30 dark:bg-green-900/10 px-2 py-1 rounded">
                              <span className="text-gray-500 text-xs">{name}</span>
                              <span className="text-xs text-green-700 font-medium">+{formatCurrency(Number(amount))}</span>
                            </div>
                          ));
                        })()}

                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">
                            العمل الإضافي {selectedPayroll.overtimeHours ? `(${Number(selectedPayroll.overtimeHours).toFixed(1)} س @ ${selectedPayroll.overtimeRate || 1}x)` : ''}
                          </span>
                          <span className="font-medium text-sm text-green-700">+{formatCurrency(selectedPayroll.overtimeAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">المكافآت</span>
                          <span className="font-medium text-sm text-green-700">+{formatCurrency(selectedPayroll.bonuses)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-red-700 flex items-center gap-2 border-b pb-2">
                        <ArrowDownCircle className="h-4 w-4" />
                        الاستقطاعات (Deductions)
                      </h4>
                      <div className="space-y-2.5">
                        {/* 1. Pro-rata Deduction (If partial month) */}
                        {selectedPayroll.fullMonthBaseSalary && Number(selectedPayroll.fullMonthBaseSalary) > Number(selectedPayroll.baseSalary) && (
                          <div className="flex justify-between items-start bg-red-50/50 dark:bg-red-900/10 px-2 py-1 rounded border-red-100 border">
                            <div className="space-y-0.5">
                              <span className="text-red-800 text-xs font-bold block">فروقات عمل/تناسب</span>
                              <span className="text-[10px] text-red-600 block">نقص {(selectedPayroll.workingDays || 30) - (selectedPayroll.actualWorkDays || 0)} يوم من الدورة</span>
                            </div>
                            <span className="font-bold text-xs text-red-700">-{formatCurrency(Number(selectedPayroll.fullMonthBaseSalary) - Number(selectedPayroll.baseSalary))}</span>
                          </div>
                        )}

                        {/* 2. Breakdown from JSON */}
                        {(() => {
                          const deductions = typeof selectedPayroll.deductions === 'string'
                            ? JSON.parse(selectedPayroll.deductions || '{}')
                            : (selectedPayroll.deductions || {});

                          // Filter out metadata and handled keys
                          const metadataKeys = ['details', 'manualDetails', 'capNotes', 'advanceDetails', 'absenceDetails', 'lateDetails', 'deficitDetails'];
                          return Object.entries(deductions)
                            .filter(([key]) => !metadataKeys.includes(key))
                            .map(([name, amount], i) => {
                              // If it's a known metadata key, skip
                              if (metadataKeys.includes(name)) return null;

                              // Process whole details string to find parts matching this name
                              const allDetails = String(deductions.details || "");
                              const specificDetails = allDetails.split(' | ').filter(d => d.includes(name));

                              // Check if manual
                              const isManual = name.includes('يدوي') ||
                                (deductions.manualDetails && name.includes('يدوي')) ||
                                specificDetails.some(d => d.includes('يدوي'));

                              // If it's advances ("سلف"), we might have better details in advanceDetails
                              let subNote = "";
                              if (name === 'سلف' && deductions.advanceDetails) {
                                subNote = "سداد أقساط سلف قائمة";
                              } else if (name === 'خصم يدوي' && deductions.manualDetails) {
                                subNote = deductions.manualDetails;
                              } else if (name === 'غياب' && deductions.absenceDetails) {
                                subNote = deductions.absenceDetails;
                              } else if (name === 'تأخيرات' && deductions.lateDetails) {
                                subNote = deductions.lateDetails;
                              } else if (name === 'عجز ساعات العمل' && deductions.deficitDetails) {
                                subNote = deductions.deficitDetails;
                              } else if (name === 'غياب وتأخير' && (selectedPayroll.absentDays > 0 || selectedPayroll.latePenalty > 0)) {
                                const notes = [];
                                if (selectedPayroll.absentDays > 0) notes.push(`${selectedPayroll.absentDays} أيام غياب`);
                                if (selectedPayroll.latePenalty > 0) notes.push(`تأخيرات`);
                                subNote = notes.join(' و ');
                              } else if (specificDetails.length > 0) {
                                subNote = specificDetails.join(' | ');
                              }

                              return (
                                <div key={i} className="space-y-1 bg-red-50/30 dark:bg-red-900/10 p-2 rounded-lg border border-red-100/30">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-1.5 text-wrap max-w-[70%]">
                                      <span className="text-gray-700 text-xs font-bold">{name}</span>
                                      <span className={`text-[8px] px-1 rounded-sm uppercase font-black whitespace-nowrap ${isManual ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                                        {isManual ? 'يدوي' : 'تلقائي'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-red-700 font-bold whitespace-nowrap">-{formatCurrency(Number(amount))}</span>
                                  </div>
                                  {subNote && (
                                    <p className="text-[10px] text-gray-400 italic pr-2 border-r-2 border-red-200 mr-1 leading-relaxed">
                                      {subNote}
                                    </p>
                                  )}
                                </div>
                              );
                            });
                        })()}

                        {/* 3. Insurance & Taxes */}
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-gray-600 text-sm">التأمينات الاجتماعية</span>
                          <span className="font-medium text-sm text-red-700">-{formatCurrency(selectedPayroll.socialInsurance)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm">الضرائب</span>
                          <span className="font-medium text-sm text-red-700">-{formatCurrency(selectedPayroll.taxAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="mt-8 pt-6 border-t-2 border-dashed space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">إجمالي الاستحقاقات (الراتب الحقيقي)</span>
                      <span className="text-lg font-bold text-slate-700">
                        {formatCurrency(
                          Number(selectedPayroll.fullMonthBaseSalary || selectedPayroll.baseSalary) +
                          Number(selectedPayroll.totalAllowances || 0) +
                          Number(selectedPayroll.overtimeAmount || 0) +
                          Number(selectedPayroll.bonuses || 0)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">إجمالي الاستقطاعات</span>
                      <span className="text-red-600 font-bold">
                        -{formatCurrency(
                          (Number(selectedPayroll.fullMonthBaseSalary || selectedPayroll.baseSalary) - Number(selectedPayroll.baseSalary)) +
                          Number(selectedPayroll.totalDeductions || 0) +
                          Number(selectedPayroll.socialInsurance || 0) +
                          Number(selectedPayroll.taxAmount || 0)
                        )}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-600 text-white flex justify-between items-center shadow-lg shadow-indigo-100 dark:shadow-none mt-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <DollarSign className="h-6 w-6" />
                        </div>
                        <span className="text-lg font-bold">صافي الراتب المستلم</span>
                      </div>
                      <span className="text-2xl font-black ltr:tracking-wider rtl:tracking-normal" dir="ltr">
                        {formatCurrency(selectedPayroll.netSalary)}
                      </span>
                    </div>
                  </div>

                  {selectedPayroll.paidAt && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800">
                        ✓ تم الصرف بتاريخ {new Date(selectedPayroll.paidAt).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  إغلاق
                </Button>
                <Button variant="outline" onClick={() => selectedPayroll && handlePrint(selectedPayroll)}>
                  <FileText className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Payroll Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>تعديل كشف الراتب</DialogTitle>
              </DialogHeader>

              {selectedPayroll && (
                <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2 px-1">
                  {/* Employee Info */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedPayroll.employee?.avatar} />
                      <AvatarFallback>
                        {selectedPayroll.employee?.firstName?.[0]}{selectedPayroll.employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">
                        {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{selectedPayroll.employee?.position?.title}</p>
                    </div>
                  </div>

                  {/* Edit Form */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>الراتب الأساسي (المُستحق)</Label>
                      <Input
                        type="number"
                        value={editFormData.baseSalary === 0 ? "" : editFormData.baseSalary}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                          setEditFormData(prev => ({ ...prev, baseSalary: val }));
                        }}
                      />
                      {selectedPayroll.fullMonthBaseSalary && (
                        <p className="text-[10px] text-gray-500 italic">
                          الراتب الشهري الكامل في العقد: {formatCurrency(selectedPayroll.fullMonthBaseSalary)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-4 border p-4 rounded-lg bg-green-50/50">
                      <div className="flex justify-between items-center">
                        <Label className="text-green-700">تفاصيل البدلات</Label>
                        <span className="font-bold text-green-700">{formatCurrency(editingAllowances.reduce((sum, item) => sum + (item.amount || 0), 0))}</span>
                      </div>
                      <div className="space-y-2">
                        {editingAllowances.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              value={item.name}
                              onChange={(e) => {
                                setEditingAllowances(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, name: e.target.value } : i
                                ));
                              }}
                              placeholder="البيان"
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={(e) => {
                                setEditingAllowances(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, amount: parseFloat(e.target.value) || 0 } : i
                                ));
                              }}
                              className="w-24"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingAllowances(prev => prev.filter(i => i.id !== item.id));
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAllowances([
                              ...editingAllowances,
                              { id: Math.random().toString(36).substr(2, 9), name: '', amount: 0 }
                            ]);
                          }}
                          className="w-full border-dashed"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة بند بدل
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 border p-4 rounded-lg bg-red-50/50">
                      <div className="flex justify-between items-center">
                        <Label className="text-red-700">تفاصيل الخصومات</Label>
                        <span className="font-bold text-red-700">{formatCurrency(editingDeductions.reduce((sum, item) => sum + (item.amount || 0), 0))}</span>
                      </div>
                      <div className="space-y-2">
                        {editingDeductions.map((item) => (
                          <div key={item.id} className="flex gap-2 items-center">
                            <Input
                              value={item.name}
                              onChange={(e) => {
                                setEditingDeductions(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, name: e.target.value } : i
                                ));
                              }}
                              placeholder="البيان"
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={(e) => {
                                setEditingDeductions(prev => prev.map(i =>
                                  i.id === item.id ? { ...i, amount: parseFloat(e.target.value) || 0 } : i
                                ));
                              }}
                              className="w-24"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingDeductions(prev => prev.filter(i => i.id !== item.id));
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingDeductions([
                              ...editingDeductions,
                              { id: Math.random().toString(36).substr(2, 9), name: '', amount: 0 }
                            ]);
                          }}
                          className="w-full border-dashed"
                        >
                          <Plus className="h-4 w-4 ml-2" />
                          إضافة بند خصم
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>العمل الإضافي</Label>
                      <Input
                        type="number"
                        value={editFormData.overtimeAmount}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, overtimeAmount: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المكافآت</Label>
                      <Input
                        type="number"
                        value={editFormData.bonuses}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, bonuses: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>التأمينات</Label>
                      <Input
                        type="number"
                        value={editFormData.socialInsurance}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, socialInsurance: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>الضرائب</Label>
                      <Input
                        type="number"
                        value={editFormData.taxAmount}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>

                  {/* Calculated Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">صافي الراتب المتوقع</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(
                          editFormData.baseSalary +
                          editingAllowances.reduce((sum, item) => sum + (item.amount || 0), 0) +
                          editFormData.overtimeAmount +
                          editFormData.bonuses -
                          editingDeductions.reduce((sum, item) => sum + (item.amount || 0), 0) -
                          editFormData.socialInsurance -
                          editFormData.taxAmount
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ التغييرات'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Payment Details Dialog */}
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogContent className="sm:max-w-md overflow-hidden p-0 rounded-3xl border-none shadow-2xl">
              <div className="relative bg-white dark:bg-slate-900">
                {/* Header */}
                <div className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-xl font-bold dark:text-white">بيانات الدفع</DialogTitle>
                  </div>
                </div>

                <div className="p-6 pt-4 space-y-6">
                  {/* Payment Methods Tabs */}
                  <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {[
                      { id: 'bank_transfer', label: 'تحويل بنكي', icon: Landmark },
                      { id: 'cash', label: 'نقدي / كاش', icon: Wallet },
                      { id: 'e_wallet', label: 'محفظة', icon: Zap }
                    ].map(method => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${paymentMethod === method.id
                          ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                          }`}
                      >
                        <method.icon className="h-4 w-4" />
                        {method.label}
                      </button>
                    ))}
                  </div>

                  {/* Payment Method Details */}
                  {paymentMethod === 'bank_transfer' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {/* Bank Details Card (designed to match user image) */}
                      <div className="border border-slate-200 hover:border-blue-200 transition-colors dark:border-slate-800 flex justify-between items-center rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-sm">
                        <div className="space-y-1 text-right">
                          <p className="text-slate-400 text-xs font-semibold mb-2">المسار البنكي</p>
                          <p className="text-slate-900 dark:text-white font-bold text-lg">البنك الوطني</p>
                          <p className="text-slate-500 text-sm">حساب نشط - جاري</p>
                        </div>
                        <div className="h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex justify-center items-center shadow-sm">
                          <span className="text-blue-600 dark:text-blue-400 font-bold tracking-tight text-4xl italic">B</span>
                        </div>
                      </div>

                      {/* IBAN Card */}
                      <div className="border border-slate-200 hover:border-blue-200 transition-colors dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-900 shadow-sm text-right">
                        <p className="text-slate-400 text-xs font-semibold mb-3">رقم الحساب الدولي</p>
                        <p className="text-slate-900 dark:text-white font-bold tracking-widest text-lg md:text-xl text-center font-mono" dir="ltr">
                          ...0003 4827 1019 3828
                        </p>
                      </div>

                      {/* Add random stats to closely match user's image */}
                      <div className="pt-2">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-emerald-500 font-bold text-sm">0.0%</span>
                          <span className="text-sm font-bold text-slate-400">تنمية التحفيز الشهري</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[0%]"></div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {paymentMethod === 'cash' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col items-center justify-center text-center space-y-4"
                    >
                      <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center">
                        <Wallet className="h-10 w-10" />
                      </div>
                      <div>
                        <p className="font-bold text-xl dark:text-white">الدفع النقدي مباشرة</p>
                        <p className="text-slate-500 mt-2">سيتم تسليم الراتب يداً بيد للموظف أو تحويله للخزنة الرئيسية.</p>
                      </div>
                    </motion.div>
                  )}

                  {paymentMethod === 'e_wallet' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col items-center justify-center text-center space-y-4"
                    >
                      <div className="h-20 w-20 bg-violet-100 dark:bg-violet-500/20 text-violet-600 rounded-full flex items-center justify-center">
                        <Zap className="h-10 w-10" />
                      </div>
                      <div>
                        <p className="font-bold text-xl dark:text-white">تحويل المحفظة الإلكترونية</p>
                        <p className="text-slate-500 mt-2">يتم التحويل الفوري لرقم المحفظة المسجل بملف الموظف بالشركة.</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-row-reverse justify-start gap-4">
                  <Button
                    onClick={confirmPayment}
                    disabled={paying}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-md shadow-blue-500/20"
                  >
                    {paying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                        جاري التنفيذ...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="ml-2 h-5 w-5" />
                        تأكيد الصرف
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400">
                    إلغاء التغييرات
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default React.memo(Payroll);
