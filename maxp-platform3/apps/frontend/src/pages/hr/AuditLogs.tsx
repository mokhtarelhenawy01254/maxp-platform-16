import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  Edit,
  Search,
  Download,
  Eye,
  Clock,
  Shield,
  Globe,
  User,
  Calendar,
  ArrowRight,
  Loader2,
  Box,
  ListChecks,
  Terminal,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import api from "../../services/api";

interface AuditLog {
  id: string;
  action: "APPROVE" | "REJECT" | "UPDATE" | "CREATE" | "DELETE" | string;
  entityType:
  | "LEAVE"
  | "ADVANCE"
  | "RESIGNATION"
  | "EMPLOYEE"
  | "DEPARTMENT"
  | string;
  entityId: string;
  actorId: string;
  actorName: string;
  details: any;
  ipAddress?: string;
  createdAt: string;
  actor?: {
    avatar?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface AuditStats {
  totalLogs: number;
  actionStats: { action: string; count: number }[];
  entityStats: { entityType: string; count: number }[];
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    entityType: "",
    action: "",
    startDate: "",
    endDate: "",
    search: "",
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditLogs();
    }, 500);
    return () => clearTimeout(timer);
  }, [pagination.page, filters, pagination.limit]);

  // Fetch stats separately
  useEffect(() => {
    fetchStats();
  }, [filters.startDate, filters.endDate]);

  const fetchStats = async () => {
    try {
      const params = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      const response = await api.get("/hr/audit-logs/stats", { params });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching audit stats:", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        entityType: filters.entityType === "all" ? "" : filters.entityType,
        action: filters.action === "all" ? "" : filters.action,
        startDate: filters.startDate,
        endDate: filters.endDate,
        search: filters.search,
      };

      const response = await api.get("/hr/audit-logs", { params });

      if (response.data.success) {
        setLogs(response.data.logs || []);
        setPagination(
          response.data.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        );
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFieldName = (field: string) => {
    const translations: Record<string, string> = {
      amount: "المبلغ",
      totalSalary: "إجمالي الراتب",
      monthlyAmount: "القسط الشهري",
      reason: "السبب",
      status: "الحالة",
      note: "ملاحظات",
      startDate: "تاريخ البدء",
      endDate: "تاريخ الانتهااء",
      type: "النوع",
      name: "الاسم",
      description: "الوصف",
      hours: "عدد الساعات",
      day: "اليوم",
      isPaid: "مدفوع",
    };
    return translations[field] || field;
  };

  const getEntityName = (type: string) => {
    const names: Record<string, string> = {
      EMPLOYEE: "موظف",
      DEPARTMENT: "قسم",
      POSITION: "مسمى وظيفي",
      LEAVE: "إجازة",
      ADVANCE: "سلفة",
      ADVANCE_REQUEST: "طلب سلفة",
      RESIGNATION: "استقالة",
      ATTENDANCE: "حضور وانصراف",
      SHIFT: "مناوبة",
      PERMISSION_REQUEST: "إذن خروج",
      DEDUCTION: "خصم",
      PAYROLL: "مسير رواتب",
      POLICY: "سياسة",
      GOAL: "هدف",
      FEEDBACK: "تقييم",
      SETTINGS: "إعدادات",
      USER: "مستخدم",
    };
    return names[type] || type;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "APPROVE":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "REJECT":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "UPDATE":
        return <Edit className="h-4 w-4 text-blue-500" />;
      case "CREATE":
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      case "DELETE":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "SETTLEMENT":
        return <Shield className="h-4 w-4 text-emerald-500" />;
      case "LOGIN":
        return <User className="h-4 w-4 text-indigo-500" />;
      case "LOGOUT":
        return <User className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      APPROVE:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400",
      REJECT:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400",
      UPDATE:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
      CREATE:
        "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
      DELETE:
        "bg-red-50 text-red-900 border-red-200 dark:bg-red-950/30 dark:text-red-300",
      SETTLEMENT:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
      LOGIN:
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400",
      LOGOUT:
        "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400",
    };

    const labels: Record<string, string> = {
      APPROVE: "موافقة",
      REJECT: "رفض",
      UPDATE: "تحديث",
      CREATE: "إنشاء",
      DELETE: "حذف",
      SETTLEMENT: "تصفية",
      LOGIN: "تسجيل دخول",
      LOGOUT: "تسجيل خروج",
      EXPORT: "تصدير",
      IMPORT: "استيراد",
      ASSIGN: "تعيين",
      ACTIVATE: "تفعيل",
      DEACTIVATE: "تعطيل",
    };

    return (
      <Badge
        variant="outline"
        className={styles[action] || "bg-muted text-muted-foreground"}
      >
        {labels[action] || action}
      </Badge>
    );
  };

  const parseDetails = (details: any) => {
    try {
      return typeof details === "string" ? JSON.parse(details) : details;
    } catch {
      return {};
    }
  };

  const handleExport = () => {
    if (!logs.length) return;

    const headers = [
      "Date",
      "Time",
      "Actor Name",
      "Actor Email",
      "Action",
      "Entity Type",
      "Entity ID",
      "IP Address",
    ];
    const csvContent = [
      headers.join(","),
      ...logs.map((log) =>
        [
          format(new Date(log.createdAt), "yyyy-MM-dd"),
          format(new Date(log.createdAt), "HH:mm:ss"),
          `"${log.actorName}"`,
          `"${log.actor?.email || ""}"`,
          log.action,
          log.entityType,
          log.entityId,
          log.ipAddress || "",
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `audit_logs_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            سجلات التدقيق
          </h1>
          <p className="text-muted-foreground mt-1">
            سجل التغييرات ومراقبة النظام
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExport}
            disabled={logs.length === 0}
          >
            <Download className="h-4 w-4" />
            تصدير CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
                <h3 className="text-2xl font-bold">{stats.totalLogs}</h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عمليات الإنشاء</p>
                <h3 className="text-2xl font-bold">
                  {stats.actionStats.find(s => s.action === 'CREATE')?.count || 0}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full">
                <Edit className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">علمايت التحديث</p>
                <h3 className="text-2xl font-bold">
                  {stats.actionStats.find(s => s.action === 'UPDATE')?.count || 0}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">عمليات الحذف</p>
                <h3 className="text-2xl font-bold">
                  {stats.actionStats.find(s => s.action === 'DELETE')?.count || 0}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في السجلات..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pr-9"
              />
            </div>
            <Select
              value={filters.entityType || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  entityType: value === "all" ? "" : value,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع الكيان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="EMPLOYEE">الموظفين</SelectItem>
                <SelectItem value="DEPARTMENT">الأقسام</SelectItem>
                <SelectItem value="POSITION">الوظائف</SelectItem>
                <SelectItem value="LEAVE">الإجازات</SelectItem>
                <SelectItem value="ADVANCE">السلف</SelectItem>
                <SelectItem value="ADVANCE_REQUEST">طلبات السلف</SelectItem>
                <SelectItem value="RESIGNATION">الاستقالات</SelectItem>
                <SelectItem value="ATTENDANCE">الحضور</SelectItem>
                <SelectItem value="SHIFT">المناوبات</SelectItem>
                <SelectItem value="PERMISSION_REQUEST">الإذونات</SelectItem>
                <SelectItem value="DEDUCTION">الخصومات</SelectItem>
                <SelectItem value="PAYROLL">الرواتب</SelectItem>
                <SelectItem value="POLICY">السياسات</SelectItem>
                <SelectItem value="GOAL">الأهداف</SelectItem>
                <SelectItem value="FEEDBACK">التغذية الراجعة</SelectItem>
                <SelectItem value="SETTINGS">الإعدادات</SelectItem>
                <SelectItem value="USER">المستخدمين</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.action || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, action: value === "all" ? "" : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع العملية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="CREATE">إنشاء</SelectItem>
                <SelectItem value="UPDATE">تحديث</SelectItem>
                <SelectItem value="DELETE">حذف</SelectItem>
                <SelectItem value="APPROVE">موافقة</SelectItem>
                <SelectItem value="REJECT">رفض</SelectItem>
                <SelectItem value="LOGIN">تسجيل دخول</SelectItem>
                <SelectItem value="LOGOUT">تسجيل خروج</SelectItem>
                <SelectItem value="EXPORT">تصدير</SelectItem>
                <SelectItem value="IMPORT">استيراد</SelectItem>
                <SelectItem value="SETTLEMENT">تصفية</SelectItem>
                <SelectItem value="ASSIGN">تعيين</SelectItem>
                <SelectItem value="ACTIVATE">تفعيل</SelectItem>
                <SelectItem value="DEACTIVATE">تعطيل</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              className="w-[160px]"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
            <Input
              type="date"
              className="w-[160px]"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">المستخدم</TableHead>
              <TableHead className="text-right">العملية</TableHead>
              <TableHead className="text-right">الكيان</TableHead>
              <TableHead className="text-right">التاريخ</TableHead>
              <TableHead className="text-left w-[100px]">التفاصيل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>جاري التحميل...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-64 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p>لا توجد سجلات مطابقة للبحث</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="group hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={log.actor?.avatar} />
                        <AvatarFallback>
                          {log.actorName?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {log.actorName}
                        </span>
                        <span className="text-xs text-muted-foreground hidden group-hover:block transition-all">
                          {log.actor?.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      {getActionBadge(log.action)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-primary/80">
                        {getEntityName(log.entityType)}
                      </span>
                      {log.entityType !== "SETTINGS" && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded w-fit mt-1">
                          #{log.entityId?.substring(0, 8)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">
                        {format(new Date(log.createdAt), "dd MMM yyyy", {
                          locale: ar,
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), "HH:mm:ss", {
                          locale: ar,
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">
            صفحة {pagination.page} من {pagination.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({
                  ...pagination,
                  page: Math.max(1, pagination.page - 1),
                })
              }
              disabled={pagination.page <= 1}
            >
              السابق
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({ ...pagination, page: pagination.page + 1 })
              }
              disabled={pagination.page >= pagination.totalPages}
            >
              التالي
            </Button>
          </div>
        </div>
      </Card>

      {/* Details Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              تفاصيل العملية
            </DialogTitle>
            <DialogDescription>
              المعلومات الكاملة عن هذا الإجراء
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="mt-4 space-y-6">
              {/* Actor Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg border">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedLog.actor?.avatar} />
                  <AvatarFallback>
                    {selectedLog.actorName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{selectedLog.actorName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.actor?.email || "System User"}
                  </p>
                </div>
                <div className="mr-auto">
                  {getActionBadge(selectedLog.action)}
                </div>
              </div>

              {/* Meta Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-muted/30 rounded border">
                  <span className="text-xs text-muted-foreground block mb-1">
                    التاريخ
                  </span>
                  <div className="font-medium flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(selectedLog.createdAt), "dd MMMM yyyy", {
                      locale: ar,
                    })}
                  </div>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded border">
                  <span className="text-xs text-muted-foreground block mb-1">
                    الوقت
                  </span>
                  <div className="font-medium flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    {format(new Date(selectedLog.createdAt), "HH:mm:ss a")}
                  </div>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded border">
                  <span className="text-xs text-muted-foreground block mb-1">
                    IP Address
                  </span>
                  <div className="font-medium flex items-center gap-2 font-mono text-sm">
                    <Globe className="h-4 w-4 text-primary" />
                    {selectedLog.ipAddress || "غير متوفر"}
                  </div>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded border">
                  <span className="text-xs text-muted-foreground block mb-1">
                    الكيان
                  </span>
                  <div className="font-medium flex items-center gap-2 text-sm text-primary">
                    <div className="h-4 w-4" />
                    {getEntityName(selectedLog.entityType)}
                    {selectedLog.entityType !== "SETTINGS" && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                        #{selectedLog.entityId?.substring(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Human Readable Details */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  بيانات العملية التفصيلية
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(parseDetails(selectedLog.details)).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center p-2 bg-muted/20 rounded-md border border-transparent hover:border-muted-foreground/10 transition-all"
                      >
                        <span className="text-sm text-muted-foreground">
                          {formatFieldName(key)}
                        </span>
                        <span className="text-sm font-semibold">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    ),
                  )}
                  {Object.keys(parseDetails(selectedLog.details)).length ===
                    0 && (
                      <div className="text-center p-4 text-muted-foreground text-sm italic">
                        لا توجد بيانات إضافية لهذه العملية
                      </div>
                    )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => setSelectedLog(null)} variant="outline">
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
