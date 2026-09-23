import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  Megaphone,
  ExternalLink,
  Trash2,
  Edit2,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";

export interface DailyLog {
  id?: string;
  date: string; // YYYY-MM-DD
  month?: string; // YYYY-MM
  adSpend: number;
  salesRevenue: number;
  ordersCount: number;
  unitsSold: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MonthlyLog {
  month: string;
  adSpend: number;
  salesRevenue: number;
  ordersCount: number;
  unitsSold: number;
  isPaid?: boolean;
  paidAt?: string;
  notes?: string;
}

interface AgencyPerformanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: any | null;
  selectedMonth: string;
  currency: string;
  onSuccess: () => void;
}

export const AgencyPerformanceModal: React.FC<AgencyPerformanceModalProps> = ({
  open,
  onOpenChange,
  client,
  selectedMonth,
  currency,
  onSuccess,
}) => {
  const [perfMode, setPerfMode] = useState<"daily" | "monthly">("daily");
  const [saving, setSaving] = useState(false);
  const [showDaysList, setShowDaysList] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [perfForm, setPerfForm] = useState({
    date: todayStr,
    month: selectedMonth || todayStr.slice(0, 7),
    adSpend: 0,
    salesRevenue: 0,
    ordersCount: 0,
    unitsSold: 0,
    isPaid: false,
    notes: ""
  });

  // Load appropriate data whenever modal opens, client changes, or date/month changes
  useEffect(() => {
    if (!open || !client) return;

    if (perfMode === "daily") {
      const activeDate = perfForm.date || todayStr;
      const existingDay = (client.dailyLogs || []).find((d: DailyLog) => d.date === activeDate);
      setPerfForm((prev) => ({
        ...prev,
        date: activeDate,
        month: activeDate.slice(0, 7),
        adSpend: existingDay ? existingDay.adSpend : 0,
        salesRevenue: existingDay ? existingDay.salesRevenue : 0,
        ordersCount: existingDay ? existingDay.ordersCount : 0,
        unitsSold: existingDay ? existingDay.unitsSold : 0,
        notes: existingDay?.notes || ""
      }));
    } else {
      const activeMonth = perfForm.month || selectedMonth || todayStr.slice(0, 7);
      const existingLog = (client.monthlyLogs || []).find((l: MonthlyLog) => l.month === activeMonth);
      setPerfForm((prev) => ({
        ...prev,
        month: activeMonth,
        adSpend: existingLog ? existingLog.adSpend : client.currentSpend || 0,
        salesRevenue: existingLog ? existingLog.salesRevenue : client.monthlySales || 0,
        ordersCount: existingLog ? existingLog.ordersCount : client.monthlyOrders || 0,
        unitsSold: existingLog ? existingLog.unitsSold : client.monthlyUnits || 0,
        isPaid: existingLog ? Boolean(existingLog.isPaid) : false,
        notes: existingLog?.notes || ""
      }));
    }
  }, [open, client, perfMode]);

  const handleDateChange = (newDate: string) => {
    const existingDay = (client?.dailyLogs || []).find((d: DailyLog) => d.date === newDate);
    setPerfForm((prev) => ({
      ...prev,
      date: newDate,
      month: newDate.slice(0, 7),
      adSpend: existingDay ? existingDay.adSpend : 0,
      salesRevenue: existingDay ? existingDay.salesRevenue : 0,
      ordersCount: existingDay ? existingDay.ordersCount : 0,
      unitsSold: existingDay ? existingDay.unitsSold : 0,
      notes: existingDay?.notes || ""
    }));
  };

  const handleMonthChange = (newMonth: string) => {
    const existingLog = (client?.monthlyLogs || []).find((l: MonthlyLog) => l.month === newMonth);
    setPerfForm((prev) => ({
      ...prev,
      month: newMonth,
      adSpend: existingLog ? existingLog.adSpend : 0,
      salesRevenue: existingLog ? existingLog.salesRevenue : 0,
      ordersCount: existingLog ? existingLog.ordersCount : 0,
      unitsSold: existingLog ? existingLog.unitsSold : 0,
      isPaid: existingLog ? Boolean(existingLog.isPaid) : false,
      notes: existingLog?.notes || ""
    }));
  };

  // Days list for the current active month
  const activeMonthDays = useMemo(() => {
    if (!client?.dailyLogs) return [];
    const targetMonth = perfMode === "daily" ? perfForm.date.slice(0, 7) : perfForm.month;
    return (client.dailyLogs as DailyLog[])
      .filter((d) => d.date && d.date.startsWith(targetMonth))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [client?.dailyLogs, perfMode, perfForm.date, perfForm.month]);

  const monthDailyTotals = useMemo(() => {
    return activeMonthDays.reduce(
      (acc, d) => ({
        spend: acc.spend + (Number(d.adSpend) || 0),
        sales: acc.sales + (Number(d.salesRevenue) || 0),
        orders: acc.orders + (Number(d.ordersCount) || 0),
        units: acc.units + (Number(d.unitsSold) || 0),
      }),
      { spend: 0, sales: 0, orders: 0, units: 0 }
    );
  }, [activeMonthDays]);

  const isCurrentDayLogged = useMemo(() => {
    if (perfMode !== "daily" || !client?.dailyLogs) return false;
    return client.dailyLogs.some((d: DailyLog) => d.date === perfForm.date);
  }, [perfMode, client?.dailyLogs, perfForm.date]);

  // Fee calculation preview
  const previewCalculatedFee = useMemo(() => {
    if (!client) return 0;
    const model = client.pricingModel || "RETAINER";
    const spend = Number(perfForm.adSpend) || 0;
    const sales = Number(perfForm.salesRevenue) || 0;
    const orders = Number(perfForm.ordersCount) || 0;
    const units = Number(perfForm.unitsSold) || 0;
    const rate = Number(client.pricingRate) || 0;
    const base = Number(client.baseRetainer) || 0;
    const perOrder = Number(client.feePerOrder) || 0;
    const perItem = Number(client.feePerItem) || 0;

    switch (model) {
      case "PERCENT_SPEND":
        return Math.round(spend * (rate / 100));
      case "PERCENT_SALES":
        return Math.round(sales * (rate / 100));
      case "FIXED_ORDER":
        return Math.round(orders * perOrder);
      case "FIXED_ITEM":
        return Math.round(units * perItem);
      case "HYBRID": {
        let comm = 0;
        if (client.hybridType === "PERCENT_SPEND") comm = Math.round(spend * (rate / 100));
        else if (client.hybridType === "PERCENT_SALES") comm = Math.round(sales * (rate / 100));
        else if (client.hybridType === "FIXED_ORDER") comm = Math.round(orders * perOrder);
        return (perfMode === "daily" ? 0 : base) + comm;
      }
      case "RETAINER":
      default:
        return perfMode === "daily" ? Math.round(base / 30) : base;
    }
  }, [client, perfForm, perfMode]);

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    try {
      const payload = {
        type: perfMode,
        date: perfMode === "daily" ? perfForm.date : undefined,
        month: perfMode === "daily" ? perfForm.date.slice(0, 7) : perfForm.month,
        adSpend: Number(perfForm.adSpend) || 0,
        salesRevenue: Number(perfForm.salesRevenue) || 0,
        ordersCount: Number(perfForm.ordersCount) || 0,
        unitsSold: Number(perfForm.unitsSold) || 0,
        isPaid: perfMode === "monthly" ? perfForm.isPaid : undefined,
        notes: perfForm.notes || ""
      };

      const res = await apiClient.post(`/agency/clients/${client.id}/performance`, payload);
      if (res.data?.success) {
        toast.success(perfMode === "daily" ? "تم تسجيل أداء اليوم وتحديث إجمالي الشهر" : "تم تسجيل أداء الشهر وحساب الفاتورة");
        onSuccess();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تسجيل الأداء");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDaily = async (dateToDelete: string) => {
    if (!client) return;
    if (!window.confirm(`هل أنت متأكد من حذف تسجيل أداء يوم ${dateToDelete}؟`)) return;

    try {
      const res = await apiClient.delete(`/agency/clients/${client.id}/daily-logs/${dateToDelete}`);
      if (res.data?.success) {
        toast.success("تم حذف سجل أداء اليوم وتحديث إجمالي الشهر");
        onSuccess();
        if (perfForm.date === dateToDelete) {
          handleDateChange(dateToDelete);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حذف سجل اليوم");
    }
  };

  const handleFillFromDailyTotals = () => {
    setPerfForm((prev) => ({
      ...prev,
      adSpend: monthDailyTotals.spend,
      salesRevenue: monthDailyTotals.sales,
      ordersCount: monthDailyTotals.orders,
      unitsSold: monthDailyTotals.units
    }));
    toast.info("تم ملء أرقام الشهر بمجموع الأيام المسجلة");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92dvh] flex flex-col p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0">
          <DialogTitle className="font-black text-base sm:text-lg flex items-center justify-between text-foreground">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary shrink-0" />
              <span>تسجيل أداء العميل - {client?.name}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-4 text-xs">
          {/* Daily vs Monthly Segmented Toggle */}
          <div className="grid grid-cols-2 p-1 bg-muted/50 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setPerfMode("daily")}
              className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                perfMode === "daily"
                  ? "bg-background text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="size-3.5 text-primary" />
              <span>تسجيل يومي (اليوم المستهدف)</span>
            </button>
            <button
              type="button"
              onClick={() => setPerfMode("monthly")}
              className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                perfMode === "monthly"
                  ? "bg-background text-foreground shadow-sm border border-border/40"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="size-3.5 text-primary" />
              <span>تسجيل شهري (الشهر المستهدف)</span>
            </button>
          </div>

          {/* Period Selection Field */}
          {perfMode === "daily" ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>اليوم المستهدف (تاريخ اليوم)</span>
                </Label>
                {isCurrentDayLogged ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300 font-bold">
                    <Check className="size-3 ml-0.5" /> مسجل مسبقاً
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-medium">يُجمع تلقائياً مع الشهر</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-10 sm:h-9 text-base sm:text-xs font-bold rounded-xl flex-1"
                  value={perfForm.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleDateChange(todayStr)}
                  className="h-10 sm:h-9 px-2.5 text-[11px] font-bold shrink-0"
                >
                  اليوم
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    handleDateChange(y.toISOString().slice(0, 10));
                  }}
                  className="h-10 sm:h-9 px-2.5 text-[11px] font-bold shrink-0"
                >
                  أمس
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary" />
                  <span>الشهر المستهدف</span>
                </Label>
                {activeMonthDays.length > 0 && (
                  <button
                    type="button"
                    onClick={handleFillFromDailyTotals}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="size-3" />
                    تعبئة بمجموع الأيام ({activeMonthDays.length} يوم)
                  </button>
                )}
              </div>
              <Input
                type="month"
                className="h-10 sm:h-9 text-base sm:text-xs font-bold rounded-xl"
                value={perfForm.month}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </div>
          )}

          {/* Meta Ads Account Quick Link */}
          {client?.adAccountId && (
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <Megaphone className="size-4 shrink-0" />
                <span className="font-bold">حساب إعلانات ميتا:</span>
                <span className="font-mono text-[11px]">{client.adAccountId}</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs font-bold bg-background text-blue-600 hover:bg-blue-500/10 border-blue-200 px-2 w-fit"
                onClick={() => window.open(`/advertising/facebook-ads?adAccountId=${encodeURIComponent(client.adAccountId!)}`, "_blank")}
              >
                <ExternalLink className="size-3 ml-1" />
                عرض الحملات
              </Button>
            </div>
          )}

          {/* Performance Numbers Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">
                {perfMode === "daily" ? "الإنفاق الإعلاني لليوم" : "الإنفاق الإعلاني الفعلي"} ({currency})
              </Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                type="number"
                value={perfForm.adSpend || ""}
                placeholder="0"
                onChange={(e) => setPerfForm({ ...perfForm, adSpend: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">
                {perfMode === "daily" ? "مبيعات اليوم المحققة" : "إجمالي المبيعات المحققة"} ({currency})
              </Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                type="number"
                value={perfForm.salesRevenue || ""}
                placeholder="0"
                onChange={(e) => setPerfForm({ ...perfForm, salesRevenue: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold">
                {perfMode === "daily" ? "أوردرات / طلبات اليوم" : "عدد الأوردرات / الطلبات"}
              </Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                type="number"
                value={perfForm.ordersCount || ""}
                placeholder="0"
                onChange={(e) => setPerfForm({ ...perfForm, ordersCount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">القطع المباعة (Units)</Label>
              <Input
                className="mt-1 h-10 sm:h-9 text-base sm:text-xs rounded-xl"
                type="number"
                value={perfForm.unitsSold || ""}
                placeholder="0"
                onChange={(e) => setPerfForm({ ...perfForm, unitsSold: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Instant Fee Preview */}
          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-300/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 dark:text-emerald-300">
                {perfMode === "daily" ? "أتعاب الوكالة المقدرة لليوم:" : "أتعاب الوكالة المحتسبة آلياً:"}
              </span>
              <span className="font-black text-sm sm:text-base text-emerald-700 dark:text-emerald-400">
                {previewCalculatedFee.toLocaleString()} {currency}
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              بناءً على نموذج ({client?.pricingModel || "RETAINER"})
            </p>
          </div>

          {/* If Monthly Mode: Show Invoice Paid Checkbox */}
          {perfMode === "monthly" && (
            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="isPaidCheck"
                className="size-4 rounded accent-primary cursor-pointer"
                checked={perfForm.isPaid}
                onChange={(e) => setPerfForm({ ...perfForm, isPaid: e.target.checked })}
              />
              <label htmlFor="isPaidCheck" className="text-xs font-bold cursor-pointer">
                تم تحصيل وسداد الفاتورة لهذا الشهر
              </label>
            </div>
          )}

          {/* Month Rollup Summary Card (When in Daily mode or when days exist) */}
          {activeMonthDays.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDaysList(!showDaysList)}
                className="w-full p-2.5 flex items-center justify-between text-right hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-1.5 font-bold text-[11px] text-foreground">
                  <Clock className="size-3.5 text-primary" />
                  <span>سجل أيام الشهر ({activeMonthDays.length} يوم مسجل)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>مجموع الإنفاق: {monthDailyTotals.spend.toLocaleString()} {currency}</span>
                  {showDaysList ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </div>
              </button>

              {showDaysList && (
                <div className="p-2.5 border-t border-border/40 space-y-1.5 max-h-40 overflow-y-auto">
                  {activeMonthDays.map((d) => (
                    <div
                      key={d.date}
                      className={`p-2 rounded-lg text-[11px] flex items-center justify-between border ${
                        d.date === perfForm.date
                          ? "bg-primary/10 border-primary/30"
                          : "bg-background border-border/40"
                      }`}
                    >
                      <div>
                        <span className="font-mono font-bold">{d.date}</span>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>إنفاق: {d.adSpend?.toLocaleString()} {currency}</span>
                          <span>•</span>
                          <span>مبيعات: {d.salesRevenue?.toLocaleString()} {currency}</span>
                          <span>•</span>
                          <span>طلبات: {d.ordersCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDateChange(d.date)}
                          className="h-7 w-7 p-0"
                          title="تعديل هذا اليوم"
                        >
                          <Edit2 className="size-3 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDaily(d.date)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="حذف هذا اليوم"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs font-bold">ملاحظات إضافية (اختياري)</Label>
            <Textarea
              className="mt-1 text-base sm:text-xs rounded-xl"
              placeholder="أي ملاحظات حول إنفاق هذا اليوم أو الشهر..."
              rows={2}
              value={perfForm.notes}
              onChange={(e) => setPerfForm({ ...perfForm, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="p-3.5 sm:p-4 border-t border-border/60 bg-background/95 backdrop-blur-sm shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-start">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="font-bold h-11 sm:h-9 text-xs w-full sm:w-auto"
          >
            {saving ? "جاري الحفظ..." : perfMode === "daily" ? "حفظ أداء اليوم وتحديث الشهر" : "حفظ الأداء وحساب الفاتورة"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 sm:h-9 text-xs w-full sm:w-auto"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
