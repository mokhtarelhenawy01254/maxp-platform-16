import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  CreditCard,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Calendar,
  Filter,
  RotateCw,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { wholesalePortalApi, WholesaleStatement } from './wholesalePortalApi';
import { WholesaleAccessCheck } from './WholesaleAccessCheck';
import { DateInput } from '../../components/ui/DateInput';

export const WholesaleStatementPage: React.FC = () => {
  const [statement, setStatement] = useState<WholesaleStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [periodStart, setPeriodStart] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [periodEnd, setPeriodEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const fetchStatement = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await wholesalePortalApi.getStatement({
        periodStart: periodStart ? new Date(periodStart).toISOString() : undefined,
        periodEnd: periodEnd ? new Date(`${periodEnd}T23:59:59.999Z`).toISOString() : undefined,
      });
      setStatement(data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'تعذر تحميل كشف الحساب';
      const code = err?.response?.data?.code;
      setError(msg);
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  if (errorCode === 'NOT_WHOLESALE_CUSTOMER' || errorCode === 'WHOLESALE_INACTIVE') {
    return <WholesaleAccessCheck error={error} errorCode={errorCode} />;
  }

  const creditLimit = statement ? Number(statement.creditLimit || 0) : 0;
  const currentBalance = statement ? Number(statement.currentBalance || 0) : 0;
  const availableCredit = statement ? Number(statement.availableCredit || 0) : 0;
  const utilizationPercent = creditLimit > 0 ? Math.min(100, Math.round((currentBalance / creditLimit) * 100)) : 0;

  return (
    <div dir="rtl" className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-indigo-600" size={26} />
            رصيدي وكشف الحساب
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            متابعة الرصيد المالي الحالي والحد الائتماني المتاح وسجل الحركات المالية
          </p>
        </div>

        <button
          onClick={fetchStatement}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
        >
          <RotateCw size={16} className={loading ? 'animate-spin' : ''} />
          تحديث الكشف
        </button>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Balance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              الرصيد المستحق (المديونية)
            </span>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-mono">
              {currentBalance.toLocaleString('ar-EG')} <span className="text-sm font-normal text-gray-500">ج.م</span>
            </div>
            <span className="text-xs text-gray-400 mt-1 block">إجمالي المسحوبات غير المسددة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <CreditCard size={24} />
          </div>
        </div>

        {/* Credit Limit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              الحد الائتماني الكلي
            </span>
            <div className="text-2xl font-bold text-indigo-600 mt-2 font-mono">
              {creditLimit.toLocaleString('ar-EG')} <span className="text-sm font-normal text-gray-500">ج.م</span>
            </div>
            <div className="w-36 bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${utilizationPercent > 85 ? 'bg-red-500' : 'bg-indigo-600'}`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 mt-1 block">مستغل بنسبة {utilizationPercent}%</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Available Credit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
              المتاح للطلب فوراً
            </span>
            <div className={`text-2xl font-bold mt-2 font-mono ${availableCredit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {availableCredit.toLocaleString('ar-EG')} <span className="text-sm font-normal text-gray-500">ج.م</span>
            </div>
            <span className="text-xs text-gray-400 mt-1 block">
              {availableCredit > 0 ? 'رصيدك يسمح بطلب شحنات جديدة' : 'تجاوزت الحد — يلزم سداد دفعة'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${availableCredit > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Date Filter & Turnover Metrics */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Filter size={14} className="text-gray-400" />
              فترة الكشف:
            </span>
            <div className="flex items-center gap-2">
              <DateInput
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-800"
              />
              <span className="text-xs text-gray-400">إلى</span>
              <DateInput
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs bg-gray-50 text-gray-800"
              />
            </div>
          </div>

          {statement && (
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1 text-gray-600">
                <span className="text-gray-400">إجمالي الفواتير:</span>
                <span className="font-bold font-mono text-gray-900">
                  {Number(statement.totalInvoiced || 0).toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-gray-600">
                <span className="text-gray-400">إجمالي المسدد:</span>
                <span className="font-bold font-mono text-emerald-600">
                  {Number(statement.totalPaid || 0).toLocaleString('ar-EG')} ج.م
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">حركات الحساب في الفترة المحددة</h3>
          <span className="text-xs text-gray-400 font-mono">
            {statement?.lines?.length || 0} حركة مسجلة
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center text-gray-500">
              <div className="mx-auto h-7 w-7 animate-spin rounded-full border-b-2 border-indigo-600 mb-2" />
              <p className="text-xs">جاري تجهيز كشف الحساب...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">
            <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
            {error}
          </div>
        ) : !statement?.lines || statement.lines.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <FileText className="mx-auto text-gray-300 mb-2" size={36} />
            لا توجد حركات مالية مسجلة في هذه الفترة الزمنية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                <tr>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">نوع الحركة</th>
                  <th className="p-3.5">المرجع</th>
                  <th className="p-3.5">البيان</th>
                  <th className="p-3.5 text-left text-amber-700">مدين (+)</th>
                  <th className="p-3.5 text-left text-emerald-700">دائن (-)</th>
                  <th className="p-3.5 text-left">الرصيد بعد الحركة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statement.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 text-xs text-gray-600 font-mono whitespace-nowrap">
                      {new Date(line.date).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {line.type === 'INVOICE' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <ArrowUpRight size={12} />
                          فاتورة طلب
                        </span>
                      ) : line.type === 'PAYMENT' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <ArrowDownLeft size={12} />
                          سداد دفعة
                        </span>
                      ) : line.type === 'CREDIT_NOTE' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                          <CheckCircle2 size={12} />
                          إشعار دائن
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                          {line.type}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-xs font-mono text-gray-500 whitespace-nowrap">
                      {line.reference ? `#${line.reference}` : '—'}
                    </td>
                    <td className="p-3.5 text-xs text-gray-800">{line.description}</td>
                    <td className="p-3.5 text-left font-mono font-medium text-amber-700 whitespace-nowrap">
                      {line.debit > 0 ? `${line.debit.toLocaleString('ar-EG')} ج.م` : '—'}
                    </td>
                    <td className="p-3.5 text-left font-mono font-medium text-emerald-700 whitespace-nowrap">
                      {line.credit > 0 ? `${line.credit.toLocaleString('ar-EG')} ج.م` : '—'}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-gray-900 whitespace-nowrap">
                      {line.balance.toLocaleString('ar-EG')} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
