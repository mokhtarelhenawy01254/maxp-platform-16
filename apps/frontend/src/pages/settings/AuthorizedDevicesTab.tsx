import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Laptop,
  Building2,
  ShieldCheck,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Smartphone,
  Globe,
} from "lucide-react";

interface DeviceUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface UserDevice {
  id: string;
  companyId: string;
  userId: string;
  fingerprint: string;
  deviceName: string;
  deviceType: "OFFICE" | "PERSONAL";
  clientType: "DESKTOP" | "WEB" | "MOBILE";
  osVersion: string | null;
  appVersion: string | null;
  ipAddress: string | null;
  isApproved: boolean;
  lastActiveAt: string;
  createdAt: string;
  user?: DeviceUser;
}

export const AuthorizedDevicesTab: React.FC = () => {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (filterType !== "ALL") params.deviceType = filterType;

      const res = await apiClient.get<UserDevice[]>("/v1/devices", { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDevices(res.data.data);
      } else {
        setDevices([]);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "تعذر تحميل قائمة الأجهزة");
    } finally {
      setLoading(false);
    }
  }, [search, filterType]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleToggleDeviceType = async (device: UserDevice) => {
    const nextType = device.deviceType === "OFFICE" ? "PERSONAL" : "OFFICE";
    setUpdatingId(device.id);

    try {
      const res = await apiClient.patch(`/v1/devices/${device.id}/type`, {
        deviceType: nextType,
      });

      if (res.data?.success) {
        setDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, deviceType: nextType } : d))
        );
        toast.success(
          nextType === "OFFICE"
            ? `تم تحويل الجهاز (${device.deviceName}) إلى جهاز مكتب معتمد`
            : `تم تحويل الجهاز (${device.deviceName}) إلى جهاز شخصي مقيّد`
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تغيير نوع الجهاز");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleApproval = async (device: UserDevice) => {
    const nextApproved = !device.isApproved;
    setUpdatingId(device.id);

    try {
      const res = await apiClient.patch(`/v1/devices/${device.id}/type`, {
        isApproved: nextApproved,
      });

      if (res.data?.success) {
        setDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, isApproved: nextApproved } : d))
        );
        toast.success(nextApproved ? "تم تفعيل الجهاز بنجاح" : "تم حظر الجهاز فورياً");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل تحديث حالة الجهاز");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteDevice = async (device: UserDevice) => {
    if (!window.confirm(`هل أنت متأكد من حذف الجهاز "${device.deviceName}"؟`)) {
      return;
    }

    try {
      await apiClient.delete(`/v1/devices/${device.id}`);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      toast.success("تم حذف الجهاز من السجل بنجاح");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل حذف الجهاز");
    }
  };

  const handleCopyFingerprint = (fp: string, id: string) => {
    navigator.clipboard.writeText(fp);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("تم نسخ بصمة الجهاز");
  };

  const renderClientIcon = (clientType: string) => {
    switch (clientType?.toUpperCase()) {
      case "DESKTOP":
        return <Laptop className="w-4 h-4 text-sky-500" />;
      case "MOBILE":
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      default:
        return <Globe className="w-4 h-4 text-violet-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Policy Summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            إدارة أجهزة الموظفين وتحديد نوعها
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            التمييز بين أجهزة المكتب المعتمدة والأجهزة الشخصية لحماية بيانات الشركة وعزل الشيفتات.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDevices}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Rules Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
          <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <span className="font-semibold text-foreground block text-sm">جهاز مكتب (OFFICE)</span>
            <p className="text-muted-foreground">
              كامل الصلاحيات التشغيلية، رنين إنذار الطلبات الجديدة، طباعة البوليصات الحرارية، وتسجيل الحضور المكتبي التلقائي.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs space-y-1">
            <span className="font-semibold text-foreground block text-sm">جهاز شخصي (PERSONAL)</span>
            <p className="text-muted-foreground">
              صلاحيات مقيّدة، حجب تصدير البيانات (Excel)، كتم أصوات الإنذارات المزعجة، وعزل الحضور المكتبي لتفادي الساعات الخاطئة.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالموظف أو اسم الجهاز أو البصمة…"
            className="pr-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-muted/60 p-1 rounded-md border border-border">
          {[
            { id: "ALL", label: "الكل" },
            { id: "OFFICE", label: "أجهزة المكتب" },
            { id: "PERSONAL", label: "الأجهزة الشخصية" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1 text-xs rounded transition-colors font-medium ${
                filterType === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Devices List Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
        {loading && devices.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            جاري جلب قائمة الأجهزة المسجلة…
          </div>
        ) : devices.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            لم يتم العثور على أجهزة مسجلة مطابقة للبحث.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">الجهاز والنظام</th>
                  <th className="py-3 px-4">الموظف المالك</th>
                  <th className="py-3 px-4">بصمة الجهاز</th>
                  <th className="py-3 px-4 text-center">نوع الجهاز</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4">آخر نشاط</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {devices.map((device) => {
                  const isOffice = device.deviceType === "OFFICE";
                  const isUpdating = updatingId === device.id;

                  return (
                    <tr
                      key={device.id}
                      className={`hover:bg-muted/20 transition-colors ${
                        !device.isApproved ? "opacity-60 bg-red-500/5" : ""
                      }`}
                    >
                      {/* Device Name & OS */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {renderClientIcon(device.clientType)}
                          <div>
                            <span className="font-semibold text-foreground block">
                              {device.deviceName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {device.osVersion || "Windows"}
                              {device.appVersion ? ` · v${device.appVersion}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Employee */}
                      <td className="py-3 px-4">
                        {device.user ? (
                          <div>
                            <span className="font-medium text-foreground block">
                              {device.user.firstName} {device.user.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {device.user.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">غير محدد</span>
                        )}
                      </td>

                      {/* Fingerprint */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="truncate max-w-[110px]" title={device.fingerprint}>
                            {device.fingerprint.slice(0, 14)}…
                          </span>
                          <button
                            onClick={() => handleCopyFingerprint(device.fingerprint, device.id)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded"
                            title="نسخ البصمة"
                          >
                            {copiedId === device.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Device Type Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleDeviceType(device)}
                          disabled={isUpdating}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                            isOffice
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                          }`}
                          title="اضغط للتبديل بين مكتب وشخصي"
                        >
                          {isOffice ? (
                            <>
                              <Building2 className="w-3 h-3" />
                              <span>🏢 مكتب</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              <span>💻 شخصي</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Approval Status */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            checked={device.isApproved}
                            onCheckedChange={() => handleToggleApproval(device)}
                            disabled={isUpdating}
                            aria-label="Toggle device approval"
                          />
                          <span
                            className={`text-[10px] font-medium ${
                              device.isApproved ? "text-emerald-500" : "text-destructive"
                            }`}
                          >
                            {device.isApproved ? "مفعّل" : "محظور"}
                          </span>
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-4 font-mono text-[11px] tabular-nums text-muted-foreground">
                        {device.lastActiveAt
                          ? new Date(device.lastActiveAt).toLocaleString("ar-EG", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>

                      {/* Delete Action */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDevice(device)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="حذف الجهاز"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthorizedDevicesTab;
