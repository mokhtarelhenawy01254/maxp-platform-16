// @vitest-environment jsdom
/**
 * Shipping Client — Bulk Upload CSV (SHIP-W2C)
 * Client-tailored CSV upload with row preview, template download, and sequential processing
 */

import React, { useState } from 'react';
import { shippingClientApi } from './useShippingClientApi';

interface ParsedRow {
  index: number;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  destinationGovernorate: string;
  destinationCity?: string;
  destinationAddress: string;
  codAmount: number;
  pieces: number;
  weight: number;
  contentDescription?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
  status: 'PENDING' | 'SUCCESS' | 'ERROR';
  trackingNumber?: string;
  errorMessage?: string;
}

export default function ClientBulkUploadPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const downloadTemplate = () => {
    const csvContent =
      '\uFEFF' + // UTF-8 BOM for Arabic excel compatibility
      'اسم المستلم,هاتف المستلم,هاتف بديل,المحافظة,المدينة,العنوان التفصيلي,مبلغ التحصيل,القطع,الوزن,وصف المحتوى,ملاحظات\n' +
      'أحمد محمود,01012345678,,القاهرة,مدينة نصر,شارع عباس العقاد عمارة 5 شقة 2,450,1,1.5,ملابس رجالي,الاتصال قبل الوصول\n' +
      'سارة علي,01198765432,,الجيزة,الدقي,ميدان المساحة,600,2,2.0,أحذية,معاينة مسموحة';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'نموذج_شحنات_العميل.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert('الملف فارغ أو لا يحتوي على صفوف بيانات');
        return;
      }

      // Skip header line
      const dataLines = lines.slice(1);
      const parsed: ParsedRow[] = dataLines.map((line, idx) => {
        // Handle CSV split respecting commas
        const cols = line.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim());

        const recipientName = cols[0] || '';
        const recipientPhone = cols[1] || '';
        const recipientPhone2 = cols[2] || '';
        const destinationGovernorate = cols[3] || 'القاهرة';
        const destinationCity = cols[4] || '';
        const destinationAddress = cols[5] || '';
        const codAmount = Number(cols[6]) || 0;
        const pieces = parseInt(cols[7], 10) || 1;
        const weight = parseFloat(cols[8]) || 1;
        const contentDescription = cols[9] || '';
        const notes = cols[10] || '';

        let isValid = true;
        let validationError = '';

        if (!recipientName) {
          isValid = false;
          validationError = 'اسم المستلم مفقود';
        } else if (!recipientPhone) {
          isValid = false;
          validationError = 'رقم الهاتف مفقود';
        } else if (!destinationAddress) {
          isValid = false;
          validationError = 'العنوان مفقود';
        }

        return {
          index: idx + 1,
          recipientName,
          recipientPhone,
          recipientPhone2: recipientPhone2 || undefined,
          destinationGovernorate,
          destinationCity: destinationCity || undefined,
          destinationAddress,
          codAmount,
          pieces,
          weight,
          contentDescription: contentDescription || undefined,
          notes: notes || undefined,
          isValid,
          validationError,
          status: 'PENDING',
        };
      });

      setRows(parsed);
    };

    reader.readAsText(file);
  };

  const handleStartProcessing = async () => {
    if (rows.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: rows.length });

    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      if (!row.isValid) {
        row.status = 'ERROR';
        row.errorMessage = row.validationError || 'بيانات غير صالحة';
        setRows([...updated]);
        setProgress({ current: i + 1, total: updated.length });
        continue;
      }

      try {
        const res = await shippingClientApi.createShipment({
          recipientName: row.recipientName,
          recipientPhone: row.recipientPhone,
          recipientPhone2: row.recipientPhone2,
          destinationGovernorate: row.destinationGovernorate,
          destinationCity: row.destinationCity,
          destinationAddress: row.destinationAddress,
          codAmount: row.codAmount,
          pieces: row.pieces,
          weight: row.weight,
          contentDescription: row.contentDescription,
          notes: row.notes,
        });

        row.status = 'SUCCESS';
        row.trackingNumber = res.data?.trackingNumber;
      } catch (err: any) {
        row.status = 'ERROR';
        row.errorMessage = err.message || 'فشل الحفظ';
      }

      setRows([...updated]);
      setProgress({ current: i + 1, total: updated.length });
    }

    setIsProcessing(false);
  };

  const validCount = rows.filter((r) => r.isValid).length;
  const successCount = rows.filter((r) => r.status === 'SUCCESS').length;
  const errorCount = rows.filter((r) => r.status === 'ERROR').length;

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-lg font-bold text-gray-900">الرفع المجمّع للشحنات (CSV)</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            استيراد عشرات الطرود دفعة واحدة بملف إكسل/CSV مع المعاينة والتحقق قبل الإرسال
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          تحميل النموذج الجاهز (CSV Template)
        </button>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 text-center space-y-3">
        <div className="text-gray-500 text-xs">
          اختر ملف CSV يحتوي على شحناتك وفق النموذج المعتمد
        </div>
        <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded cursor-pointer transition-colors shadow-sm">
          تحديد ملف CSV
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
        {fileName && <div className="text-xs font-mono text-gray-700 font-medium">الملف المحدد: {fileName}</div>}
      </div>

      {/* Controls & Summary */}
      {rows.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-gray-900">إجمالي الصفوف: {rows.length}</span>
            <span className="text-emerald-600 font-medium">صالح: {validCount}</span>
            {rows.length - validCount > 0 && (
              <span className="text-rose-600 font-medium">بحاجة للتصحيح: {rows.length - validCount}</span>
            )}
            {successCount > 0 && (
              <span className="text-blue-600 font-bold">تم إنشاؤها بنجاح: {successCount}</span>
            )}
            {errorCount > 0 && (
              <span className="text-rose-600 font-bold">فشل الإنشاء: {errorCount}</span>
            )}
          </div>

          <button
            onClick={handleStartProcessing}
            disabled={isProcessing || validCount === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            {isProcessing
              ? `جاري الإرسال (${progress.current}/${progress.total})...`
              : `بدء رفع ${validCount} شحنة صالحة`}
          </button>
        </div>
      )}

      {/* Table Preview */}
      {rows.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">المستلم</th>
                  <th className="px-3 py-2 font-medium">الهاتف</th>
                  <th className="px-3 py-2 font-medium">المحافظة</th>
                  <th className="px-3 py-2 font-medium">العنوان</th>
                  <th className="px-3 py-2 font-medium">COD (ج.م)</th>
                  <th className="px-3 py-2 font-medium">القطع والوزن</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => (
                  <tr
                    key={r.index}
                    className={`transition-colors ${
                      !r.isValid ? 'bg-rose-50/50' : r.status === 'SUCCESS' ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-gray-400">{r.index}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.recipientName || '—'}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{r.recipientPhone || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{r.destinationGovernorate}</td>
                    <td className="px-3 py-2 text-gray-600 truncate max-w-[180px]">{r.destinationAddress || '—'}</td>
                    <td className="px-3 py-2 tabular-nums font-semibold text-gray-900">{r.codAmount}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-500">
                      {r.pieces} ق / {r.weight} كجم
                    </td>
                    <td className="px-3 py-2">
                      {!r.isValid ? (
                        <span className="text-rose-600 font-medium">{r.validationError}</span>
                      ) : (
                        <span className="text-emerald-600 font-medium">جاهز</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === 'SUCCESS' && (
                        <span className="text-blue-600 font-mono font-bold text-[11px]">
                          {r.trackingNumber}
                        </span>
                      )}
                      {r.status === 'ERROR' && (
                        <span className="text-rose-600 text-[11px] font-medium">
                          {r.errorMessage}
                        </span>
                      )}
                      {r.status === 'PENDING' && r.isValid && (
                        <span className="text-gray-400 text-[11px]">في الانتظار</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
