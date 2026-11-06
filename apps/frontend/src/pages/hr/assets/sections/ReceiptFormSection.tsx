import React from "react";
import {
  DocumentTextIcon,
  PlusCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  RECEIPT_PRINT_STYLES,
  useReceiptFormController,
  ReceiptsSidebarList,
  ReceiptDocumentPreview,
  GenerateReceiptModal,
} from "./receipt-form";

const ReceiptFormSection: React.FC = () => {
  const {
    selectedReceipt,
    setSelectedReceipt,
    isPrinting,
    showUploadSignature,
    setShowUploadSignature,
    showGenerateModal,
    setShowGenerateModal,
    selectedEmployee,
    setSelectedEmployee,
    selectedAsset,
    setSelectedAsset,
    employees,
    assets,
    loadingData,
    receipts,
    handlePrint,
    handleGeneratePDF,
    handleGenerateReceipt,
  } = useReceiptFormController();

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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-xs"
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
        <ReceiptsSidebarList
          receipts={receipts}
          selectedReceiptId={selectedReceipt?.id}
          onSelectReceipt={setSelectedReceipt}
        />

        <ReceiptDocumentPreview
          selectedReceipt={selectedReceipt}
          isPrinting={isPrinting}
          showUploadSignature={showUploadSignature}
          onToggleUploadSignature={() =>
            setShowUploadSignature(!showUploadSignature)
          }
          onPrint={handlePrint}
          onGeneratePDF={handleGeneratePDF}
        />
      </div>

      <GenerateReceiptModal
        open={showGenerateModal}
        loadingData={loadingData}
        employees={employees}
        assets={assets}
        selectedEmployee={selectedEmployee}
        selectedAsset={selectedAsset}
        onSelectEmployee={setSelectedEmployee}
        onSelectAsset={setSelectedAsset}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateReceipt}
      />

      <style dangerouslySetInnerHTML={{ __html: RECEIPT_PRINT_STYLES }} />
    </div>
  );
};

export default ReceiptFormSection;
