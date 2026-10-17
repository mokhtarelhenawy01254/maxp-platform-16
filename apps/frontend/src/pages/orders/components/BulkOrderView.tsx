import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Edit2,
  Copy,
  Play,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { BulkOrderStatsGrid } from "./bulk/BulkOrderStatsGrid";
import { BulkOrderItemsTable } from "./bulk/BulkOrderItemsTable";

interface BulkOrderViewProps {
  id: string;
  onBack: () => void;
  onEdit: (item: any) => void;
  onDuplicate: (id: string) => void;
  onExport: (id: string, format?: string) => void;
}

interface BulkOrderDetail {
  id: string;
  operationNumber: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  totalOrders: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
  items: any[];
}

const BulkOrderView = ({ id, onBack, onEdit, onDuplicate, onExport }: BulkOrderViewProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [data, setData] = useState<BulkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/api/v1/bulk-orders/${id}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch bulk order detail", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleExecute = async () => {
    setExecuting(true);
    try {
      const res = await apiClient.post(`/api/v1/bulk-orders/${id}/execute`);
      if (res.data?.success) {
        const { successCount, errors: execErrors } = res.data;
        if (execErrors && execErrors.length > 0) {
          toast.warning(
            t("orders.bulkExecutedPartial", { success: successCount, failed: execErrors.length }) ||
              `${successCount} succeeded, ${execErrors.length} failed`
          );
        } else {
          toast.success(t("orders.bulkExecuted") || "Operation executed successfully");
        }
        const refresh = await apiClient.get(`/api/v1/bulk-orders/${id}`);
        if (refresh.data?.success) {
          setData(refresh.data.data);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || t("orders.bulkExecuteFailed") || "Execution failed");
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2.5 text-muted-foreground">
        <Loader2 className="animate-spin text-primary" size={24} />
        <span className="text-xs">{t("orders.loadingOrders") || "جاري التحميل…"}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground">
        {t("orders.bulkNoData")}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="رجوع"
          >
            {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{data.name}</h1>
            <p className="text-xs font-mono tabular-nums text-muted-foreground">{data.operationNumber}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(data)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border/70 bg-card text-foreground hover:bg-muted transition-all active:scale-[0.98]"
          >
            <Edit2 size={13} />
            <span>{t("orders.bulkEdit")}</span>
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(data.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-border/70 bg-card text-foreground hover:bg-muted transition-all active:scale-[0.98]"
          >
            <Copy size={13} />
            <span>{t("orders.bulkDuplicate")}</span>
          </button>
          {data.status !== "COMPLETED" && data.status !== "CANCELLED" && data.status !== "PROCESSING" && (
            <button
              type="button"
              onClick={handleExecute}
              disabled={executing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white transition-all active:scale-[0.98] shadow-xs"
            >
              {executing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              <span>{t("orders.bulkExecute")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onExport(data.id, "excel")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xs"
          >
            <FileSpreadsheet size={13} />
            <span>{t("orders.bulkExportExcel")}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <BulkOrderStatsGrid
        status={data.status}
        totalOrders={data.totalOrders}
        progress={data.progress}
        createdByName={data.createdByName}
        description={data.description}
      />

      {/* Items Table */}
      <BulkOrderItemsTable items={data.items} />

      {/* Metadata Footnote */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground font-mono tabular-nums pt-1">
        <div>
          <span className="font-semibold text-foreground">{t("orders.bulkCreatedAt")}:</span>{" "}
          {new Date(data.createdAt).toLocaleString(isRtl ? "ar-EG" : "en-US")}
        </div>
        <div>
          <span className="font-semibold text-foreground">{t("orders.bulkUpdatedAt")}:</span>{" "}
          {new Date(data.updatedAt).toLocaleString(isRtl ? "ar-EG" : "en-US")}
        </div>
      </div>
    </div>
  );
};

export default BulkOrderView;
