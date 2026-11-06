import React from "react";
import {
  ArrowDownTrayIcon,
  CameraIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ReceiptData } from "./types";

interface ReceiptDocumentPreviewProps {
  selectedReceipt: ReceiptData | null;
  isPrinting: boolean;
  showUploadSignature: boolean;
  onToggleUploadSignature: () => void;
  onPrint: () => void;
  onGeneratePDF: () => void;
}

export const ReceiptDocumentPreview: React.FC<ReceiptDocumentPreviewProps> = ({
  selectedReceipt,
  isPrinting,
  showUploadSignature,
  onToggleUploadSignature,
  onPrint,
  onGeneratePDF,
}) => {
  if (!selectedReceipt) {
    return (
      <div className="lg:col-span-8">
        <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="h-20 w-20 text-gray-200 mb-4" />
          <h3 className="text-xl font-bold text-gray-400">
            اختر طلباً من القائمة لعرض النموذج
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-8 space-y-6">
      {/* Actions Bar - Hidden on Print */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 print:hidden">
        <div className="flex gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-xs"
          >
            <PrinterIcon className="h-5 w-5" />
            طباعة
          </button>
          <button
            onClick={onGeneratePDF}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all font-medium"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            حفظ كـ PDF
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onToggleUploadSignature}
            className="flex items-center gap-2 px-4 py-2 text-primary font-semibold hover:bg-primary/10 rounded-xl transition-colors"
          >
            <CameraIcon className="h-5 w-5" />
            إدراج توقيع
          </button>
        </div>
      </div>

      {/* Signature Upload Placeholder - Hidden on Print */}
      {showUploadSignature && (
        <div className="p-6 bg-muted/20 border-2 border-dashed border-border/70 rounded-2xl print:hidden">
          <div className="flex flex-col items-center text-center">
            <CloudArrowUpIcon className="h-10 w-10 text-indigo-500 mb-2" />
            <h4 className="font-bold text-indigo-900 dark:text-indigo-100">
              تحميل صورة التوقيع
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              يمكنك رفع صورة توقيع الموظف ليظهر في النموذج تلقائياً
            </p>
            <input type="file" className="hidden" id="sig-upload" />
            <label
              htmlFor="sig-upload"
              className="cursor-pointer px-5 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-xs"
            >
              اختر ملف
            </label>
          </div>
        </div>
      )}

      {/* THE FORM CONTAINER */}
      <div
        className={`bg-white text-gray-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-gray-100 mx-auto max-w-[800px] font-sans relative ${
          isPrinting ? "print:shadow-none print:border-none print:p-0" : ""
        }`}
        id="printable-receipt"
      >
        {/* Form Header */}
        <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              نموذج استلام عهدة
            </h1>
            <p className="text-indigo-600 font-bold">
              إدارة الموارد البشرية - قسم الأصول
            </p>
          </div>
          <div className="text-left" dir="ltr">
            <p className="text-sm font-bold text-gray-400">Reference No.</p>
            <p className="text-xl font-mono tabular-nums font-bold text-gray-900">
              {selectedReceipt.referenceNumber}
            </p>
          </div>
        </div>

        {/* Employee Info Section */}
        <div className="mb-8">
          <h4 className="text-xs font-black text-white bg-gray-900 px-3 py-1.5 inline-block rounded mb-4">
            أولاً: بيانات الموظف المستلم
          </h4>
          <div className="grid grid-cols-2 gap-y-4 gap-x-12">
            <div>
              <h5 className="text-[10px] font-bold text-indigo-600 mb-0.5 uppercase">
                اسم الموظف
              </h5>
              <p className="text-base font-bold border-b border-gray-50 pb-1">
                {selectedReceipt.employeeName}
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-indigo-600 mb-0.5 uppercase">
                المسمى الوظيفي
              </h5>
              <p className="text-base font-bold border-b border-gray-50 pb-1">
                {selectedReceipt.jobTitle}
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-indigo-600 mb-0.5 uppercase">
                الرقم الوظيفي
              </h5>
              <p className="text-base font-bold border-b border-gray-50 pb-1 font-mono tabular-nums">
                {selectedReceipt.employeeId}
              </p>
            </div>
            <div>
              <h5 className="text-[10px] font-bold text-indigo-600 mb-0.5 uppercase">
                الإدارة / القسم
              </h5>
              <p className="text-base font-bold border-b border-gray-50 pb-1">
                {selectedReceipt.department}
              </p>
            </div>
          </div>
        </div>

        {/* Asset Details Section */}
        <div className="mb-8">
          <h4 className="text-xs font-black text-white bg-gray-900 px-3 py-1.5 inline-block rounded mb-4">
            ثانياً: تفاصيل الأصل المستلم (العهدة)
          </h4>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">اسم الجهاز:</span>
                <span className="font-bold">{selectedReceipt.assetName}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">فئة الأصل:</span>
                <span className="font-bold">
                  {selectedReceipt.assetCategory}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">كود الأصول:</span>
                <span className="font-bold font-mono tabular-nums">
                  {selectedReceipt.assetCode}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">الرقم التسلسلي:</span>
                <span className="font-bold font-mono tabular-nums">
                  {selectedReceipt.assetSerial}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200 col-span-2">
                <span className="text-gray-500">حالة الجهاز عند الاستلام:</span>
                <span className="font-bold text-indigo-600">
                  {selectedReceipt.assetCondition}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Date Section */}
        <div className="mb-8 flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
          <span className="text-xs font-bold text-indigo-900">
            تاريخ تسليم العهدة واعتماد النموذج:
          </span>
          <span className="text-sm font-black text-indigo-700 font-mono tabular-nums">
            {format(new Date(selectedReceipt.date), "PPP", {
              locale: ar,
            })}
          </span>
        </div>

        {/* Legal Text */}
        <div className="text-[11px] text-gray-500 leading-relaxed text-justify italic mb-12 border-r-2 border-gray-200 pr-4">
          <p>
            أقر أنا الموضح اسمي أعلاه في (أولاً) بأنني قد استلمت العهدة المبينة
            تفاصيلها في (ثانياً) عهداً شخصياً، وأتعهد بالمحافظة عليها من الكسر
            أو التلف أو الضياع، واستخدامها فقط في أغراض العمل الرسمية، كما أتعهد
            بردها للإدارة المختصة فور طلبها أو عند تركي للعمل لأي سبب كان،
            وأتحمل المسؤولية القانونية والمادية في حال ثبوت الإهمال.
          </p>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-100">
          <div className="text-center">
            <h5 className="font-bold mb-12 text-sm">توقيع الموظف المستلم</h5>
            {selectedReceipt.signatureUrl || showUploadSignature ? (
              <div className="h-16 flex items-center justify-center">
                <img
                  src={
                    selectedReceipt.signatureUrl ||
                    "https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Foreman_Signature.png"
                  }
                  alt="Signature"
                  className="h-full object-contain mix-blend-multiply"
                />
              </div>
            ) : (
              <div className="border-b border-dashed border-gray-400 w-48 mx-auto h-16" />
            )}
          </div>
          <div className="text-center">
            <h5 className="font-bold mb-12 text-sm">
              توقيع مدير الموارد البشرية / المسؤول
            </h5>
            <div className="h-16 flex items-center justify-center">
              <p className="font-serif italic text-xl text-indigo-900 opacity-50">
                Authorized Signature
              </p>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="mt-20 pt-4 border-t-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 uppercase font-mono tabular-nums tracking-widest">
          <span>Generated by MaxP HR System</span>
          <span>Digital Receipt ID: {selectedReceipt.id}</span>
        </div>
      </div>
    </div>
  );
};
