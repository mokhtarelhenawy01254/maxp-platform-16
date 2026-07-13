import React, { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  ComputerDesktopIcon,
  CameraIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  PlusCircleIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { companyAwareApi } from "../../../../services/companyAwareApi";

interface ReceiptData {
  id: string;
  referenceNumber: string;
  date: string;
  employeeName: string;
  employeeId: string;
  jobTitle: string;
  department: string;
  assetName: string;
  assetCategory: string;
  assetCode: string;
  assetSerial: string;
  assetCondition: string;
  managerName: string;
  signatureUrl?: string;
  status: "pending" | "signed" | "archived";
}

const ReceiptFormSection: React.FC = () => {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(
    null,
  );
  const [isPrinting, setIsPrinting] = useState(false);
  const [showUploadSignature, setShowUploadSignature] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptData[]>([
    {
      id: "REC-001",
      referenceNumber: "AST-2024-001",
      date: new Date().toISOString(),
      employeeName: "أحمد محمد علي",
      employeeId: "EMP-1552",
      jobTitle: "مطور واجهات (Frontend Developer)",
      department: "تطوير البرمجيات",
      assetName: 'MacBook Pro M3 14"',
      assetCategory: "أجهزة حاسوب محمول",
      assetCode: "LP-8842",
      assetSerial: "SN-998822JH1",
      assetCondition: "جديد (Brand New)",
      managerName: "م. خالد ابراهيم",
      status: "pending",
    },
    {
      id: "REC-002",
      referenceNumber: "AST-2024-005",
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      employeeName: "سارة محمود حسن",
      employeeId: "EMP-2210",
      jobTitle: "أخصائي موارد بشرية (HR Specialist)",
      department: "الموارد البشرية",
      assetName: "iPhone 15 Pro Max",
      assetCategory: "هواتف ذكية",
      assetCode: "MB-1022",
      assetSerial: "SN-IPH15-XXL",
      assetCondition: "ممتازة",
      managerName: "م. خالد ابراهيم",
      signatureUrl:
        "https://upload.wikimedia.org/wikipedia/commons/3/3a/Jon_Foreman_Signature.png",
      status: "signed",
    },
  ]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleGeneratePDF = () => {
    alert("جاري توليد ملف PDF وحفظه في سجلات الموظف...");
  };

  useEffect(() => {
    fetchEmployees();
    fetchAssets();
  }, []);

  const fetchEmployees = async () => {
    setLoadingData(true);
    try {
      const response = await companyAwareApi.get("/hr/employees");
      console.log("📋 Employees API Response:", response.data);
      if (response.data.success) {
        const employeesList =
          response.data.employees || response.data.data || [];
        console.log(
          "✅ Employees loaded:",
          employeesList.length,
          employeesList,
        );
        setEmployees(employeesList);
      }
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await companyAwareApi.get("/hr/assets");
      console.log("🏢 Assets API Response:", response.data);
      if (response.data.success) {
        const assetsList = response.data.data || [];
        console.log("✅ Assets loaded:", assetsList.length, assetsList);
        setAssets(assetsList);
      }
    } catch (error) {
      console.error("❌ Error fetching assets:", error);
    }
  };

  const handleGenerateReceipt = () => {
    console.log("🔄 Generate Receipt Called");
    console.log("Selected Employee ID:", selectedEmployee);
    console.log("Selected Asset ID:", selectedAsset);
    console.log("Available Employees:", employees);
    console.log("Available Assets:", assets);

    if (!selectedEmployee || !selectedAsset) {
      alert("الرجاء اختيار الموظف والأصل");
      return;
    }

    const employee = employees.find((e) => e.id === selectedEmployee);
    const asset = assets.find((a) => a.id === selectedAsset);

    console.log("Found Employee:", employee);
    console.log("Found Asset:", asset);

    if (!employee) {
      alert("لم يتم العثور على الموظف المختار");
      return;
    }

    if (!asset) {
      alert("لم يتم العثور على الأصل المختار");
      return;
    }

    const newReceipt: ReceiptData = {
      id: `REC-${Math.floor(Math.random() * 1000)}`,
      referenceNumber: `AST-2024-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`,
      date: new Date().toISOString(),
      employeeName:
        `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
        employee.name ||
        "غير محدد",
      employeeId: employee.employeeId || employee.id || "غير محدد",
      jobTitle: employee.position || employee.jobTitle || "غير محدد",
      department:
        employee.department?.name || employee.department || "غير محدد",
      assetName: asset.name || "غير محدد",
      assetCategory: asset.category?.name || asset.assetCategory || "غير محدد",
      assetCode: asset.code || "غير محدد",
      assetSerial:
        asset.serialNumber ||
        `SN-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
      assetCondition:
        asset.condition === "NEW"
          ? "جديد (Brand New)"
          : asset.condition === "GOOD"
            ? "جيد"
            : asset.condition === "FAIR"
              ? "مقبول"
              : "جديد",
      managerName: "م. خالد ابراهيم",
      status: "pending",
    };

    console.log("✅ Generated Receipt:", newReceipt);

    // Add to receipts list
    setReceipts((prev) => [newReceipt, ...prev]);
    setSelectedReceipt(newReceipt);
    setShowGenerateModal(false);
    setSelectedEmployee("");
    setSelectedAsset("");
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DocumentTextIcon className="h-7 w-7 text-indigo-600" />
            نماذج التسليم والاستلام الرسمية
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            توليد وطباعة أصول الاستلام الرسمية (العهدة) برقم مرجعي وتفاصيل كاملة
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <PlusCircleIcon className="h-5 w-5" />
            توليد نموذج جديد
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all font-medium">
            <ArrowPathIcon className="h-5 w-5" />
            تحديث القائمة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* List Side - Hidden on Print */}
        <div className="lg:col-span-4 space-y-4 print:hidden">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            الطلبات الجاهزة للتوقيع
          </h3>
          {receipts.map((receipt) => (
            <button
              key={receipt.id}
              onClick={() => setSelectedReceipt(receipt)}
              className={`w-full text-right p-4 rounded-2xl border transition-all ${selectedReceipt?.id === receipt.id
                ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800 ring-2 ring-indigo-500/20"
                : "bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-indigo-300"
                }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${receipt.status === "signed"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                    }`}
                >
                  {receipt.status === "signed" ? "مـوقع" : "بانتظار التوقيع"}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {receipt.referenceNumber}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white">
                {receipt.employeeName}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                <ComputerDesktopIcon className="h-4 w-4" />
                <span>{receipt.assetName}</span>
              </div>
            </button>
          ))}

          <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <CheckBadgeIcon className="h-5 w-5" />
              لماذا نستخدم هذا النموذج؟
            </h4>
            <p className="text-xs opacity-90 leading-relaxed">
              هذا النموذج يعتبر وثيقة قانونية تثبت استلام الموظف للعهدة الموضحة،
              ويستخدم كمستند رسمي عند الجرد أو عند إخلاء الطرف.
            </p>
          </div>
        </div>

        {/* Content/Form Preview Side */}
        <div className="lg:col-span-8">
          {!selectedReceipt ? (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <DocumentTextIcon className="h-20 w-20 text-gray-200 mb-4" />
              <h3 className="text-xl font-bold text-gray-400">
                اختر طلباً من القائمة لعرض النموذج
              </h3>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Actions Bar - Hidden on Print */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 print:hidden">
                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none"
                  >
                    <PrinterIcon className="h-5 w-5" />
                    طباعة
                  </button>
                  <button
                    onClick={handleGeneratePDF}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all font-medium"
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    حفظ كـ PDF
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowUploadSignature(!showUploadSignature)}
                    className="flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                  >
                    <CameraIcon className="h-5 w-5" />
                    إدراج توقيع
                  </button>
                </div>
              </div>

              {/* Signature Upload Placeholder - Hidden on Print */}
              {showUploadSignature && (
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl animate-slide-down print:hidden">
                  <div className="flex flex-col items-center text-center">
                    <CloudArrowUpIcon className="h-10 w-10 text-indigo-500 mb-2" />
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-100">
                      تحميل صورة التوقيع
                    </h4>
                    <p className="text-sm text-indigo-600/70 mb-4 italic">
                      يمكنك رفع صورة توقيع الموظف ليظهر في النموذج تلقائياً
                    </p>
                    <input type="file" className="hidden" id="sig-upload" />
                    <label
                      htmlFor="sig-upload"
                      className="cursor-pointer px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold"
                    >
                      اختر ملف
                    </label>
                  </div>
                </div>
              )}

              {/* THE FORM CONTAINER */}
              <div
                className={`bg-white text-gray-900 p-8 sm:p-12 shadow-2xl rounded-sm border border-gray-100 mx-auto max-w-[800px] font-sans relative ${isPrinting ? "print:shadow-none print:border-none print:p-0" : ""}`}
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
                    <p className="text-sm font-bold text-gray-400">
                      Reference No.
                    </p>
                    <p className="text-xl font-mono font-bold text-gray-900">
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
                      <p className="text-base font-bold border-b border-gray-50 pb-1">
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
                        <span className="font-bold">
                          {selectedReceipt.assetName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">فئة الأصل:</span>
                        <span className="font-bold">
                          {selectedReceipt.assetCategory}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">كود الأصول:</span>
                        <span className="font-bold font-mono">
                          {selectedReceipt.assetCode}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">الرقم التسلسلي:</span>
                        <span className="font-bold font-mono">
                          {selectedReceipt.assetSerial}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200 col-span-2">
                        <span className="text-gray-500">
                          حالة الجهاز عند الاستلام:
                        </span>
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
                  <span className="text-sm font-black text-indigo-700">
                    {format(new Date(selectedReceipt.date), "PPP", {
                      locale: ar,
                    })}
                  </span>
                </div>

                {/* Legal Text */}
                <div className="text-[11px] text-gray-500 leading-relaxed text-justify italic mb-12 border-r-2 border-gray-200 pr-4">
                  <p>
                    أقر أنا الموضح اسمي أعلاه في (أولاً) بأنني قد استلمت العهدة
                    المبينة تفاصيلها في (ثانياً) عهداً شخصياً، وأتعهد بالمحافظة
                    عليها من الكسر أو التلف أو الضياع، واستخدامها فقط في أغراض
                    العمل الرسمية، كما أتعهد بردها للإدارة المختصة فور طلبها أو
                    عند تركي للعمل لأي سبب كان، وأتحمل المسؤولية القانونية
                    والمادية في حال ثبوت الإهمال.
                  </p>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-gray-100">
                  <div className="text-center">
                    <h5 className="font-bold mb-12 text-sm">
                      توقيع الموظف المستلم
                    </h5>
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
                      <div className="border-b border-dashed border-gray-400 w-48 mx-auto h-16"></div>
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
                <div className="mt-20 pt-4 border-t-2 border-gray-100 flex justify-between items-center text-[10px] text-gray-400 uppercase font-mono tracking-widest">
                  <span>Generated by MaxP HR System</span>
                  <span>Digital Receipt ID: {selectedReceipt.id}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    توليد نموذج استلام عهدة
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    اختر الموظف والأصل لإنشاء نموذج رسمي
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  <UserGroupIcon className="h-5 w-5 inline-block ml-2 text-indigo-600" />
                  اختر الموظف
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={loadingData}
                >
                  <option value="">
                    {loadingData ? "جاري التحميل..." : "-- اختر موظف --"}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName || ""} {emp.lastName || ""} -{" "}
                      {typeof emp.position === "object"
                        ? emp.position?.title
                        : emp.position || emp.jobTitle || ""}{" "}
                      ({emp.employeeId || emp.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  <ComputerDesktopIcon className="h-5 w-5 inline-block ml-2 text-indigo-600" />
                  اختر الأصل (العهدة)
                </label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  disabled={loadingData}
                >
                  <option value="">
                    {loadingData ? "جاري التحميل..." : "-- اختر أصل --"}
                  </option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} - {asset.category?.name || "غير مصنف"} (
                      {asset.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Preview Info */}
              {selectedEmployee && selectedAsset && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-2">
                    معاينة النموذج
                  </h4>
                  <div className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
                    <p>
                      <strong>الموظف:</strong>{" "}
                      {(() => {
                        const emp = employees.find(
                          (e) => e.id === selectedEmployee,
                        );
                        return emp
                          ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
                          : "غير محدد";
                      })()}
                    </p>
                    <p>
                      <strong>الأصل:</strong>{" "}
                      {assets.find((a) => a.id === selectedAsset)?.name ||
                        "غير محدد"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleGenerateReceipt}
                disabled={!selectedEmployee || !selectedAsset}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircleIcon className="h-5 w-5 inline-block ml-2" />
                توليد النموذج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @media print {
                    body * { visibility: hidden; background: white !important; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        padding: 0; 
                        margin: 0;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    @page {
                        margin: 1cm;
                        size: A4;
                    }
                }
            `,
        }}
      />
    </div>
  );
};

export default ReceiptFormSection;
