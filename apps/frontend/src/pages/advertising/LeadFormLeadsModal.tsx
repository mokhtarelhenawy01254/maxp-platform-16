/**
 * مودال عرض بيانات العملاء المحتملين لنموذج — مكوّن خاص بصفحة LeadFormsManagement
 */

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, Users, X, Import } from "lucide-react";
import {
  facebookAdsService,
  type LeadFormSummary,
} from "../../services/facebookAdsService";

interface Lead {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
}

interface LeadFormLeadsModalProps {
  form: LeadFormSummary;
  onClose: () => void;
}

export const LeadFormLeadsModal: React.FC<LeadFormLeadsModalProps> = ({
  form,
  onClose,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportToCRM = async () => {
    setIsImporting(true);
    try {
      const res = (await facebookAdsService.importFormLeadsToCRM(
        form.id,
      )) as {
        success?: boolean;
        data?: { imported?: number; linkedToExisting?: number };
        message?: string;
      };
      toast.success(res?.message || "تم استيراد العملاء المحتملين للـ CRM");
      // Refresh leads list in place
      try {
        const fresh = (await facebookAdsService.getLeads(form.id)) as Lead[];
        setLeads(fresh);
      } catch {
        // keep current list if refresh fails
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "فشل استيراد العملاء المحتملين للـ CRM",
      );
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = (await facebookAdsService.getLeads(form.id)) as Lead[];
        if (!cancelled) setLeads(data);
      } catch (error) {
        console.error("Error loading leads:", error);
        if (!cancelled) {
          setLeads([]);
          toast.error("فشل في تحميل بيانات العملاء المحتملين");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [form.id]);

  const exportLeadsToCSV = () => {
    if (leads.length === 0) return;

    const headers = leads[0]?.field_data?.map((f) => f.name) || [];
    const rows = leads.map(
      (lead) =>
        lead.field_data?.map((f) => f.values?.join(", ") || "").join(",") || "",
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_${form.name || "export"}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير البيانات");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              بيانات العملاء المحتملين
            </h2>
            <p className="text-gray-500">{form.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportToCRM}
              disabled={isImporting}
              className="flex items-center gap-2 px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.97]"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Import className="w-4 h-4" />
              )}
              استيراد للـ CRM
            </button>
            <button
              onClick={exportLeadsToCSV}
              disabled={leads.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              تصدير CSV
            </button>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد بيانات بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      التاريخ
                    </th>
                    {leads[0]?.field_data?.map((field, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-right text-sm font-medium text-gray-700"
                      >
                        {field.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">
                        {new Date(lead.created_time).toLocaleDateString("ar-EG")}
                      </td>
                      {lead.field_data?.map((field, i) => (
                        <td key={i} className="px-4 py-3 text-sm text-gray-900">
                          {field.values?.join(", ") || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadFormLeadsModal;
