import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../services/apiClient";
import * as XLSX from "xlsx";

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCustomer {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: string;
}

const CustomerImportModal: React.FC<CustomerImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [__cb] = useState("v2");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    count: number;
  } | null>(null);

  const parseHeadersAndRows = (headers: string[], rows: any[][]): ParsedCustomer[] => {
    const customers: ParsedCustomer[] = [];

    for (let i = 0; i < rows.length; i++) {
      const values = rows[i];
      if (!values || values.length === 0) continue;
      const customer: any = {};

      headers.forEach((header, index) => {
        const value = String(values[index] ?? "").trim();
        // Map common header names
        if (header.includes("first") || header === "الاسم الأول")
          customer.firstName = value;
        else if (header.includes("last") || header === "الاسم الأخير")
          customer.lastName = value;
        else if (header.includes("name") || header === "الاسم") {
          const parts = value.split(" ");
          customer.firstName = parts[0];
          customer.lastName = parts.slice(1).join(" ");
        } else if (header.includes("email") || header === "البريد")
          customer.email = value;
        else if (
          header.includes("phone") ||
          header.includes("mobile") ||
          header === "الهاتف"
        )
          customer.phone = value;
        else if (header.includes("address") || header === "العنوان")
          customer.address = value;
        else if (header.includes("city") || header === "المدينة")
          customer.city = value;
        else if (header.includes("country") || header === "البلد")
          customer.country = value;
        else if (header.includes("status") || header === "الحالة")
          customer.status = value.toUpperCase();
      });

      if (customer.firstName || customer.phone || customer.email) {
        customers.push(customer);
      }
    }
    return customers;
  };

  const parseCSV = (text: string): ParsedCustomer[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    if (!firstLine) return [];

    const headers = firstLine
      .split(",")
      .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
    
    const rows = lines.slice(1).map(line => 
      line.split(",").map(v => v.trim().replace(/['"]/g, ""))
    );

    return parseHeadersAndRows(headers, rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setResult(null);

    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");

    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (event) => {
        try {
          if (!event.target || !event.target.result) {
            setError(t("customers.import.readError") as string);
            return;
          }
          const data = new Uint8Array(event.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            setError(t("customers.import.noValidData") as string);
            return;
          }
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (!jsonData || jsonData.length < 2) {
            setError(t("customers.import.noValidData") as string);
            return;
          }

          const headers = ((jsonData[0] as any) || []).map((h: any) => String(h || "").trim().toLowerCase());
          const rows = jsonData.slice(1);
          const parsed = parseHeadersAndRows(headers, rows);
          setParsedData(parsed);

          if (parsed.length === 0) {
            setError(t("customers.import.noValidData") as string);
          }
        } catch (err) {
          setError(t("customers.import.readError") as string);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.onload = (event) => {
        try {
          if (!event.target || typeof event.target.result !== "string") {
            setError(t("customers.import.readError") as string);
            return;
          }
          const text = event.target.result;
          const parsed = parseCSV(text);
          setParsedData(parsed);
          if (parsed.length === 0) {
            setError(t("customers.import.noValidData") as string);
          }
        } catch (err) {
          setError(t("customers.import.readError") as string);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handlePasteParse = () => {
    setError("");
    setResult(null);

    if (!pastedText.trim()) {
      setError(t("customers.import.noValidData") as string);
      return;
    }

    try {
      const lines = pastedText.trim().split("\n");
      if (lines.length < 2 || !lines[0]) {
        setError(t("customers.import.noValidData") as string);
        return;
      }

      // Auto-detect delimiter: tab for Excel sheet copies, comma for CSV paste
      const firstLine = lines[0];
      const delimiter = firstLine.includes("\t") ? "\t" : ",";

      const headers = firstLine
        .split(delimiter)
        .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

      const rows = lines.slice(1).map(line =>
        line.split(delimiter).map(v => v.trim().replace(/['"]/g, ""))
      );

      const parsed = parseHeadersAndRows(headers, rows);
      setParsedData(parsed);

      if (parsed.length === 0) {
        setError(t("customers.import.noValidData") as string);
      }
    } catch (err) {
      setError(t("customers.import.readError") as string);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsLoading(true);
    setError("");

    try {
      const response: any = await apiClient.post("/customers/import", {
        customers: parsedData,
      });
      setResult({
        success: true,
        count: response.data?.importedCount || parsedData.length,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || (t("customers.deleteError") as string));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setError("");
    setResult(null);
    setPastedText("");
    setActiveTab("file");
    onClose();
  };

  const downloadTemplate = () => {
    const headers = "\u0627\u0644\u0627\u0633\u0645,\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a,\u0627\u0644\u0647\u0627\u062a\u0641,\u0627\u0644\u0639\u0646\u0648\u0627\u0646,\u0627\u0644\u0645\u062f\u064a\u0646\u0629,\u0627\u0644\u062b\u0627\u0646\u064a\u0629,\u0627\u0644\u062d\u0627\u0644\u0629\n";
    const example = "\u0645\u062d\u0645\u062f \u0623\u062d\u0645\u062f,mohamed@example.com,01012345678,\u0634\u0627\u0631\u0639 \u0627\u0644\u062a\u062d\u0631\u064a\u0631,\u0627\u0644\u0642\u0627\u0647\u0631\u0629,\u0645\u0635\u0631,LEAD\n";
    const blob = new Blob(["\uFEFF" + headers + example], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "maxp_customers_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowUpTrayIcon className="h-5 w-5" />
            {t("customers.import.title")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
          
          {/* Tab Selector */}
          {!result && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("file");
                  setParsedData([]);
                  setError("");
                }}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "file"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("customers.import.tabFile")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("paste");
                  setParsedData([]);
                  setError("");
                }}
                className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "paste"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("customers.import.tabPaste")}
              </button>
            </div>
          )}

          {/* Upload File Area */}
          {activeTab === "file" && !result && (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {file ? file.name : (t("customers.import.clickOrDrag") as string)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("customers.import.requiredColumns") as string}
                </p>
              </div>

              {/* Download Template */}
              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {t("customers.import.downloadTemplate")}
              </button>
            </>
          )}

          {/* Paste Direct Data Area */}
          {activeTab === "paste" && !result && (
            <div className="space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={t("customers.import.pastePlaceholder") as string}
                rows={6}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
              />
              <button
                type="button"
                onClick={handlePasteParse}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                {t("customers.import.parseButton")}
              </button>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && !result && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {t("customers.import.foundCount", { count: parsedData.length })}
              </p>
              <div className="max-h-40 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 dark:text-gray-400">
                      <th className="text-right py-1 px-2">الاسم</th>
                      <th className="text-right py-1 px-2">{t("common.phone")}</th>
                      <th className="text-right py-1 px-2">{t("common.email")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((c, i) => (
                      <tr key={i} className="text-gray-800 dark:text-gray-200">
                        <td className="py-1 px-2">
                          {c.firstName} {c.lastName}
                        </td>
                        <td className="py-1 px-2">{c.phone || "-"}</td>
                        <td className="py-1 px-2">{c.email || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    ... {t("common.and")} {parsedData.length - 5} {t("common.otherItems")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Success Result */}
          {result?.success && (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 mx-auto text-green-500" />
              <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t("customers.import.success", { count: result.count })}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {result ? t("common.close") : t("common.cancel")}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={parsedData.length === 0 || isLoading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("customers.import.importing")}
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-4 w-4 ml-2" />
                  {t("customers.import.importButton", { count: parsedData.length }) as string}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CustomerImportModal;
