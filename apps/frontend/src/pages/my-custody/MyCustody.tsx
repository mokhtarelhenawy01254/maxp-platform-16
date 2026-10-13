import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../hooks/useDateFormat";
import {
  Monitor,
  ClipboardList,
  Search,
  CheckCircle2,
  AlertTriangle,
  Box,
  Calendar,
  Tag,
  Clock,
  XCircle,
  Plus,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import api from "../../services/api";
import { toast } from "sonner";

const MyCustody: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myCustody, setMyCustody] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [employee, setEmployee] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    assetType: "",
    category: "",
    reason: "",
    urgency: "normal",
    notes: "",
  });

  useEffect(() => {
    fetchMyCustody();
  }, []);

  const fetchMyCustody = async () => {
    try {
      setLoading(true);

      const empResponse = await api.get("/hr/employees/me");
      const empData = empResponse.data.employee;
      setEmployee(empData);

      if (empData?.id) {
        const response = await api.get(`/hr/assets?assignedTo=${empData.id}`);
        setMyCustody(response.data.assets || []);
      }

      const requestsResponse = await api.get("/hr/assets/requests/my");
      if (requestsResponse.data && requestsResponse.data.success) {
        setMyRequests(requestsResponse.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching custody:", error);
      toast.error("فشل في تحميل بيانات العهدة");
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = useMemo(() => {
    return myCustody.filter((asset) => {
      const matchesSearch =
        asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" || asset.category?.name === filterCategory;
      const matchesCondition =
        filterCondition === "all" || asset.condition === filterCondition;

      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [myCustody, searchQuery, filterCategory, filterCondition]);

  const categories = useMemo(() => {
    const cats = new Set(
      myCustody.map((asset) => asset.category?.name).filter(Boolean),
    );
    return Array.from(cats);
  }, [myCustody]);

  const stats = useMemo(() => {
    const total = myCustody.length;
    const newItems = myCustody.filter((a) => a.condition === "NEW").length;
    const goodItems = myCustody.filter((a) => a.condition === "GOOD").length;
    const needsMaintenance = myCustody.filter(
      (a) => a.condition === "NEEDS_REPAIR" || a.condition === "FAIR",
    ).length;

    return { total, newItems, goodItems, needsMaintenance };
  }, [myCustody]);

  const handleSubmitRequest = async () => {
    try {
      if (!requestForm.assetType || !requestForm.reason) {
        toast.error(t("employee.custody.validationError") || "يرجى تعبئة الحقول المطلوبة");
        return;
      }

      const priorityMap: Record<string, string> = {
        low: "NORMAL",
        normal: "NORMAL",
        high: "HIGH",
        urgent: "URGENT",
      };

      const response = await api.post("/hr/assets/requests", {
        assetType: requestForm.assetType,
        category: requestForm.category,
        reason: requestForm.reason,
        priority: priorityMap[requestForm.urgency] || "NORMAL",
        notes: requestForm.notes,
      });

      if (response.data.success) {
        toast.success(t("employee.custody.submitSuccess") || "تم إرسال الطلب بنجاح");
        setShowRequestModal(false);
        setRequestForm({
          assetType: "",
          category: "",
          reason: "",
          urgency: "normal",
          notes: "",
        });
        fetchMyCustody();
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(t("employee.custody.submitError") || "حدث خطأ أثناء إرسال الطلب");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 p-4 md:p-6" dir="rtl">
      {/* Control Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ClipboardList className="size-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {t("employee.custody.title")}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
              Assets & Custody
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {t("employee.custody.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          <Plus className="size-4" />
          {t("employee.custody.newRequest")}
        </button>
      </div>

      {/* Info Notice Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-foreground">
            {t("employee.custody.importantNote")}
          </p>
          <p className="text-muted-foreground leading-relaxed">
            {t("employee.custody.noteText")}
          </p>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card overflow-hidden divide-y md:divide-y-0 divide-x md:divide-x-reverse divide-border shadow-xs">
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("employee.custody.totalCustody")}</span>
            <Box className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
            {stats.total}
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>{t("employee.custody.excellentCondition")}</span>
            <ShieldCheck className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {stats.newItems}
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-primary font-medium">
            <span>{t("employee.custody.goodCondition")}</span>
            <CheckCircle2 className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-primary">
            {stats.goodItems}
          </p>
        </div>

        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-medium">
            <span>{t("employee.custody.needsMaintenance")}</span>
            <AlertTriangle className="size-3.5" />
          </div>
          <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {stats.needsMaintenance}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("employee.custody.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 text-xs md:text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs md:text-sm rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">{t("employee.custody.allCategories")}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="w-full px-3 py-1.5 text-xs md:text-sm rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="all">{t("employee.custody.allConditions")}</option>
              <option value="NEW">{t("employee.custody.new")}</option>
              <option value="GOOD">{t("employee.custody.good")}</option>
              <option value="FAIR">{t("employee.custody.acceptable")}</option>
              <option value="NEEDS_REPAIR">{t("employee.custody.needsMaintenanceLabel")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div>
        {filteredAssets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card">
            <Monitor className="size-10 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">
              {searchQuery || filterCategory !== "all" || filterCondition !== "all"
                ? t("employee.custody.noResults")
                : t("employee.custody.noCustody")}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || filterCategory !== "all" || filterCondition !== "all"
                ? t("employee.custody.changeSearch")
                : t("employee.custody.noCustodyHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t("employee.custody.showing", {
                  count: filteredAssets.length,
                  total: myCustody.length,
                })}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAssets.map((asset: any) => (
                <div
                  key={asset.id}
                  className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/50 transition-colors shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted text-foreground border border-border">
                        <Monitor className="size-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {asset.name}
                        </h4>
                        <span className="font-mono text-xs text-muted-foreground">
                          {asset.code}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {t("employee.custody.delivered")}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs border-t border-border/60 pt-2.5">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Box className="size-3" />
                        {t("employee.custody.category")}
                      </span>
                      <span className="font-medium text-foreground">
                        {asset.category?.name || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Tag className="size-3" />
                        {t("employee.custody.serialNumber")}
                      </span>
                      <span className="font-mono text-[11px] font-medium text-foreground">
                        {asset.serialNumber || "-"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>{t("employee.custody.condition")}</span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                          asset.condition === "NEW"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : asset.condition === "GOOD"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : asset.condition === "FAIR"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800"
                        }`}
                      >
                        {asset.condition === "NEW"
                          ? t("employee.custody.new")
                          : asset.condition === "GOOD"
                            ? t("employee.custody.good")
                            : asset.condition === "FAIR"
                              ? t("employee.custody.acceptable")
                              : t("employee.custody.needsMaintenanceLabel")}
                      </span>
                    </div>

                    {asset.assignedDate && (
                      <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3" />
                          {t("employee.custody.receiveDate")}
                        </span>
                        <span className="font-mono text-primary font-medium">
                          {formatDate(asset.assignedDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Previous Requests Section */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="p-3 md:p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {t("employee.custody.previousRequests")}
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {myRequests.length} طلب
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-xs md:text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  {t("employee.custody.colRequestDate")}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  {t("employee.custody.colType")}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  {t("employee.custody.colStatus")}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  {t("employee.custody.colReason")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    {t("employee.custody.noPreviousRequests")}
                  </td>
                </tr>
              ) : (
                myRequests.map((req: any) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="size-3.5 text-primary" />
                        <span>{req.assetType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="size-3" />
                          {t("employee.custody.pendingStatus")}
                        </span>
                      )}
                      {req.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <CheckCircle2 className="size-3" />
                          {t("employee.custody.approvedStatus")}
                        </span>
                      )}
                      {req.status === "FULFILLED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="size-3" />
                          {t("employee.custody.deliveredStatus")}
                        </span>
                      )}
                      {req.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                          <XCircle className="size-3" />
                          {t("employee.custody.rejectedStatus")}
                        </span>
                      )}
                      {req.status === "CANCELLED" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                          <XCircle className="size-3" />
                          {t("employee.custody.cancelledStatus")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p className="truncate max-w-sm text-foreground" title={req.reason}>
                        {req.reason}
                      </p>
                      {req.rejectionReason && (
                        <p className="text-[11px] text-destructive mt-0.5">
                          {t("employee.custody.rejectionReason", { reason: req.rejectionReason })}
                        </p>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowRequestModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl border border-border bg-card shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            dir="rtl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm md:text-base">
                  {t("employee.custody.requestDialogTitle")}
                </h3>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs md:text-sm">
              <div>
                <label className="block font-medium text-foreground mb-1">
                  {t("employee.custody.requestTypeLabel")} <span className="text-destructive">*</span>
                </label>
                <select
                  value={requestForm.assetType}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      assetType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("employee.custody.requestTypePlaceholder")}</option>
                  <option value="laptop">{t("employee.custody.laptop")}</option>
                  <option value="desktop">{t("employee.custody.desktop")}</option>
                  <option value="phone">{t("employee.custody.mobile")}</option>
                  <option value="tablet">{t("employee.custody.tablet")}</option>
                  <option value="monitor">{t("employee.custody.monitor")}</option>
                  <option value="keyboard">{t("employee.custody.keyboard")}</option>
                  <option value="mouse">{t("employee.custody.mouse")}</option>
                  <option value="headset">{t("employee.custody.headset")}</option>
                  <option value="printer">{t("employee.custody.printer")}</option>
                  <option value="other">{t("employee.custody.otherType")}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  {t("employee.custody.categoryLabel")}
                </label>
                <input
                  type="text"
                  value={requestForm.category}
                  onChange={(e) =>
                    setRequestForm({
                      ...requestForm,
                      category: e.target.value,
                    })
                  }
                  placeholder={t("employee.custody.categoryPlaceholder")}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  {t("employee.custody.reasonLabel")} <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, reason: e.target.value })
                  }
                  placeholder={t("employee.custody.reasonPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  {t("employee.custody.priorityLabel")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "normal", "high"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, urgency: level })}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                        requestForm.urgency === level
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {level === "low"
                        ? t("employee.custody.normalPriority")
                        : level === "normal"
                          ? t("employee.custody.mediumPriority")
                          : t("employee.custody.highPriority")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-foreground mb-1">
                  {t("employee.custody.notesLabel")}
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, notes: e.target.value })
                  }
                  placeholder={t("employee.custody.notesPlaceholder")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2 bg-muted/20">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="px-3.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium hover:bg-muted transition-colors"
              >
                {t("employee.custody.cancelButton")}
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-xs"
              >
                {t("employee.custody.submitButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCustody;
