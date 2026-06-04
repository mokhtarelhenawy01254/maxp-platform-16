import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Eye,
  Loader2,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";

import { apiClient } from "../../services/apiClient";
import { cn } from "../../lib/utils";
import {
  BusinessPageHero,
  BusinessPageShell,
  BusinessSectionPanel,
} from "../../components/business/BusinessSurface";
import {
  BusinessFilterSheet,
  BusinessMobileSearchPanel,
} from "../../components/business/BusinessFilters";
import { BusinessMetricsStrip } from "../../components/business/BusinessMetrics";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

interface OrderInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string | null;
  issueDate: string;
  paymentStatus: string;
  totalAmount: number | string;
  currency?: string | null;
  order?: {
    orderNumber?: string | null;
  } | null;
}

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalAmount: number;
}

interface InvoiceApiResponse {
  data: OrderInvoice[];
  pagination: {
    total: number;
  };
  stats: InvoiceStats | null;
}

interface InvoiceFilters {
  search: string;
  paymentStatus: string;
  dateFrom: string;
  dateTo: string;
}

type PaymentStatusKey =
  | "PAID"
  | "PENDING"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_PAID";

interface PaymentStatusMeta {
  label: string;
  className: string;
}

const PAYMENT_STATUS_META: Record<PaymentStatusKey, PaymentStatusMeta> = {
  PAID: {
    label: "مدفوعة",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  PENDING: {
    label: "قيد الانتظار",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  CANCELLED: {
    label: "ملغاة",
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  REFUNDED: {
    label: "مستردة",
    className:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  PARTIALLY_PAID: {
    label: "مدفوعة جزئياً",
    className:
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const getPaymentStatusMeta = (status: string): PaymentStatusMeta =>
  PAYMENT_STATUS_META[status as PaymentStatusKey] ?? PAYMENT_STATUS_META.PENDING;

const getVisiblePages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 1) {
    return [1];
  }

  const pages: Array<number | "ellipsis-left" | "ellipsis-right"> = [];

  if (totalPages <= 5) {
    for (let index = 1; index <= totalPages; index += 1) {
      pages.push(index);
    }
    return pages;
  }

  if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, "ellipsis-right", totalPages);
    return pages;
  }

  if (currentPage >= totalPages - 2) {
    pages.push(
      1,
      "ellipsis-left",
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    );
    return pages;
  }

  pages.push(
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  );
  return pages;
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatCurrency = (amount: number, currency = "EGP") =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency,
  }).format(amount);

const toAmount = (value: number | string | undefined | null) => {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getErrorMessage = (error: unknown) => {
  const message =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      : undefined;

  if (typeof message === "string") {
    return message;
  }

  return "تعذر تحميل بيانات فواتير الطلبات حالياً.";
};

const OrderInvoices: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<OrderInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
  const latestRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const currentPage = page + 1;
  const currentFrom = total === 0 ? 0 : page * rowsPerPage + 1;
  const currentTo = Math.min(total, (page + 1) * rowsPerPage);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    void fetchInvoices();
  }, [page, rowsPerPage, paymentStatus]); // eslint-disable-line react-hooks/exhaustive-deps -- search/date filters apply manually

  const fetchInvoices = async (
    pageOverride = page,
    filtersOverride?: Partial<InvoiceFilters>,
  ) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    const nextSearch = filtersOverride?.search ?? search;
    const nextPaymentStatus = filtersOverride?.paymentStatus ?? paymentStatus;
    const nextDateFrom = filtersOverride?.dateFrom ?? dateFrom;
    const nextDateTo = filtersOverride?.dateTo ?? dateTo;

    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        page: pageOverride + 1,
        limit: rowsPerPage,
      };

      if (nextSearch.trim()) params["search"] = nextSearch.trim();
      if (nextPaymentStatus) params["paymentStatus"] = nextPaymentStatus;
      if (nextDateFrom) params["dateFrom"] = nextDateFrom;
      if (nextDateTo) params["dateTo"] = nextDateTo;

      const response = await apiClient.get<InvoiceApiResponse>(
        "/order-invoices",
        {
          params,
        },
      );

      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return;
      }

      setInvoices(response.data.data ?? []);
      setTotal(response.data.pagination?.total ?? 0);
      setStats(response.data.stats ?? null);
    } catch (err: unknown) {
      if (!isMountedRef.current || requestId !== latestRequestIdRef.current) {
        return;
      }

      console.error("Error fetching invoices:", err);
      setError(getErrorMessage(err));
      setInvoices([]);
      setTotal(0);
      setStats(null);
    } finally {
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSearch = () => {
    if (page !== 0) {
      setPage(0);
      return;
    }

    void fetchInvoices(0);
  };

  const handleApplyFilters = () => {
    setIsFiltersSheetOpen(false);
    handleSearch();
  };

  const handleClearFilters = () => {
    const clearedFilters: InvoiceFilters = {
      search: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: "",
    };

    setSearch(clearedFilters.search);
    setPaymentStatus(clearedFilters.paymentStatus);
    setDateFrom(clearedFilters.dateFrom);
    setDateTo(clearedFilters.dateTo);
    setIsFiltersSheetOpen(false);

    if (page !== 0) {
      setPage(0);
      return;
    }

    void fetchInvoices(0, clearedFilters);
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/orders/invoice/${invoiceId}`);
  };

  const handlePrintInvoice = async (invoiceId: string) => {
    try {
      await apiClient.post(`/order-invoices/${invoiceId}/print`);
      window.open(`/orders/invoice/${invoiceId}`, "_blank");
    } catch (err) {
      console.error("Error printing invoice:", err);
      setError("حدث خطأ أثناء محاولة طباعة الفاتورة.");
    }
  };

  const handleRowsPerPageChange = (value: string | null) => {
    const nextRowsPerPage = Number(value ?? rowsPerPage);

    if (!Number.isFinite(nextRowsPerPage) || nextRowsPerPage <= 0) {
      return;
    }

    setRowsPerPage(nextRowsPerPage);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    const nextPage = Math.min(Math.max(newPage, 0), totalPages - 1);
    setPage(nextPage);
  };

  const paginationPages = getVisiblePages(currentPage, totalPages);
  const activeFilterLabels = [
    paymentStatus ? getPaymentStatusMeta(paymentStatus).label : null,
    dateFrom ? `من ${formatDate(dateFrom)}` : null,
    dateTo ? `إلى ${formatDate(dateTo)}` : null,
  ].filter((label): label is string => Boolean(label));
  const activeFiltersCount = activeFilterLabels.length;
  const metricItems = stats
    ? [
        {
          title: "إجمالي الفواتير",
          value: stats.totalInvoices,
          subtitle: "عدد الفواتير التي تم إصدارها داخل النظام.",
          tone: "primary" as const,
          icon: Receipt,
        },
        {
          title: "فواتير مدفوعة",
          value: stats.paidInvoices,
          subtitle: "الفواتير التي تم تسويتها ماليًا بالكامل.",
          tone: "success" as const,
          icon: CheckCircle2,
        },
        {
          title: "فواتير معلقة",
          value: stats.pendingInvoices,
          subtitle: "حالات تحتاج مراجعة أو متابعة في السداد.",
          tone: "warning" as const,
          icon: Clock3,
        },
        {
          title: "إجمالي المبلغ",
          value: formatCurrency(stats.totalAmount),
          subtitle: "القيمة الإجمالية للفواتير ضمن النتائج الحالية.",
          tone: "secondary" as const,
          icon: WalletCards,
        },
      ]
    : [];

  return (
    <TooltipProvider>
      <BusinessPageShell className="space-y-4 md:space-y-6" dir="rtl">
        <BusinessPageHero
          eyebrow="ORDERS · FINANCE"
          title={
            <span className="business-page-title-row">
              <span className="business-page-title-copy">فواتير الطلبات</span>
              <span className="business-page-title-artwork">
                <Receipt className="size-6" />
              </span>
            </span>
          }
          description="مراجعة فواتير الطلبات مع بحث سريع، حالات الدفع، والتنقل بين النتائج بشكل أوضح."
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchInvoices()}
              disabled={loading}
              className="h-11 w-full justify-center border-white/10 bg-white/10 px-4 text-white hover:bg-white/15 hover:text-white sm:w-auto"
            >
              <RefreshCw
                className={cn("size-4", loading ? "animate-spin" : "")}
              />
              تحديث البيانات
            </Button>
          }
        />

        {stats ? <BusinessMetricsStrip items={metricItems} /> : null}

        <BusinessMobileSearchPanel
          searchId="order-invoices-mobile-search"
          searchName="orderInvoicesMobileSearch"
          searchLabel="بحث سريع"
          searchPlaceholder="رقم الفاتورة أو اسم العميل"
          searchValue={search}
          searchAriaLabel="بحث سريع في فواتير الطلبات"
          onSearchChange={setSearch}
          onSearchSubmit={handleSearch}
          onOpenFilters={() => setIsFiltersSheetOpen(true)}
          filterCount={activeFiltersCount}
          summaryIcon={<Receipt className="size-3.5" />}
          summary={
            loading
              ? "جاري التحديث..."
              : total > 0
                ? `${currentFrom}-${currentTo} من ${total}`
                : "لا توجد نتائج"
          }
          activeFilters={activeFilterLabels}
        />

        <BusinessSectionPanel
          className="hidden md:block"
          title="أدوات البحث والتصفية"
          description="ابحث برقم الفاتورة أو العميل، ثم ضيّق النتائج بحالة الدفع أو التاريخ."
          contentClassName="space-y-4"
        >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))_auto]">
              <div className="space-y-2">
                <Label htmlFor="order-invoices-search">البحث</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="order-invoices-search"
                    name="orderInvoicesSearch"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="رقم الفاتورة، اسم العميل، أو الهاتف"
                    className="h-11 pr-10 text-right"
                    aria-label="البحث في فواتير الطلبات"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>حالة الدفع</Label>
                <Select
                  value={paymentStatus || "ALL"}
                  onValueChange={(value) => {
                    setPaymentStatus(!value || value === "ALL" ? "" : value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">كل الحالات</SelectItem>
                    <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                    <SelectItem value="PAID">مدفوعة</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">مدفوعة جزئياً</SelectItem>
                    <SelectItem value="CANCELLED">ملغاة</SelectItem>
                    <SelectItem value="REFUNDED">مستردة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-invoices-date-from">من تاريخ</Label>
                <Input
                  id="order-invoices-date-from"
                  name="orderInvoicesDateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11"
                  aria-label="من تاريخ"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-invoices-date-to">إلى تاريخ</Label>
                <Input
                  id="order-invoices-date-to"
                  name="orderInvoicesDateTo"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11"
                  aria-label="إلى تاريخ"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="h-11 w-full px-5 xl:w-auto"
                >
                  <Search className="size-4" />
                  بحث
                </Button>
              </div>
            </div>

            {error ? (
              <Alert variant="destructive" className="border-rose-500/30">
                <AlertCircle className="size-4" />
                <AlertTitle>تعذر تحميل البيانات</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
        </BusinessSectionPanel>

        <BusinessSectionPanel
          title="سجل الفواتير"
          description={
            total > 0
              ? `عرض ${currentFrom} - ${currentTo} من أصل ${total} فاتورة`
              : "لا توجد نتائج مطابقة حاليًا."
          }
          headerAside={
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Receipt className="size-3.5" />
              {loading ? "جاري التحديث..." : `عدد العناصر في الصفحة: ${rowsPerPage}`}
            </div>
          }
          contentClassName="p-0"
        >
            {loading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm">جارٍ تحميل فواتير الطلبات...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-10">
                <Alert className="max-w-md border-dashed bg-background/70">
                  <AlertCircle className="size-4" />
                  <AlertTitle>لا توجد فواتير</AlertTitle>
                  <AlertDescription>
                    جرّب تغيير معايير البحث أو تحديث البيانات لمعرفة أحدث النتائج.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {invoices.map((invoice) => {
                    const statusMeta = getPaymentStatusMeta(
                      invoice.paymentStatus,
                    );

                    return (
                      <div
                        key={invoice.id}
                        className="rounded-[1.35rem] border border-border/70 bg-background/85 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              رقم الفاتورة
                            </p>
                            <p className="font-semibold text-foreground">
                              {invoice.invoiceNumber}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("rounded-full", statusMeta.className)}
                          >
                            {statusMeta.label}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-2xl bg-muted/30 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">الطلب</span>
                            <span className="font-medium text-foreground">
                              {invoice.order?.orderNumber || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">العميل</span>
                            <div className="text-left">
                              <p className="font-medium text-foreground">
                                {invoice.customerName}
                              </p>
                              {invoice.customerPhone ? (
                                <p className="text-xs text-muted-foreground">
                                  {invoice.customerPhone}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">التاريخ</span>
                            <span className="font-medium text-foreground">
                              {formatDate(invoice.issueDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">المبلغ</span>
                            <span className="font-semibold text-foreground">
                              {formatCurrency(
                                toAmount(invoice.totalAmount),
                                invoice.currency || "EGP",
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleViewInvoice(invoice.id)}
                          >
                            <Eye className="size-4" />
                            عرض
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePrintInvoice(invoice.id)}
                          >
                            <Printer className="size-4" />
                            طباعة
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="text-right font-semibold text-foreground">
                          رقم الفاتورة
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          رقم الطلب
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          العميل
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          تاريخ الإصدار
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          المبلغ
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          حالة الدفع
                        </TableHead>
                        <TableHead className="text-center font-semibold text-foreground">
                          الإجراءات
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const statusMeta = getPaymentStatusMeta(
                          invoice.paymentStatus,
                        );

                        return (
                          <TableRow key={invoice.id}>
                            <TableCell className="text-right">
                              <div className="font-semibold text-foreground">
                                {invoice.invoiceNumber}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium text-foreground">
                              {invoice.order?.orderNumber || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium text-foreground">
                                {invoice.customerName}
                              </div>
                              {invoice.customerPhone ? (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {invoice.customerPhone}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatDate(invoice.issueDate)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-foreground">
                              {formatCurrency(
                                toAmount(invoice.totalAmount),
                                invoice.currency || "EGP",
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full",
                                  statusMeta.className,
                                )}
                              >
                                {statusMeta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="inline-flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      onClick={() =>
                                        handleViewInvoice(invoice.id)
                                      }
                                    >
                                      <Eye className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>عرض الفاتورة</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon-sm"
                                      onClick={() =>
                                        handlePrintInvoice(invoice.id)
                                      }
                                    >
                                      <Printer className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>طباعة الفاتورة</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t border-border/70 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="text-sm text-muted-foreground">
                        عرض {currentFrom} - {currentTo} من أصل {total}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          عدد الصفوف
                        </span>
                        <Select
                          value={rowsPerPage.toString()}
                          onValueChange={handleRowsPerPageChange}
                        >
                          <SelectTrigger className="h-9 w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAGE_SIZE_OPTIONS.map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size} / صفحة
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page === 0}
                        onClick={() => handlePageChange(0)}
                      >
                        <ChevronsRight className="size-4" />
                        الأولى
                      </Button>

                      {paginationPages.map((pageItem) => {
                        if (
                          pageItem === "ellipsis-left" ||
                          pageItem === "ellipsis-right"
                        ) {
                          return (
                            <span
                              key={pageItem}
                              className="px-2 text-sm text-muted-foreground"
                            >
                              ...
                            </span>
                          );
                        }

                        return (
                          <Button
                            key={pageItem}
                            type="button"
                            variant={
                              pageItem === currentPage ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => handlePageChange(pageItem - 1)}
                            className="min-w-9"
                          >
                            {pageItem}
                          </Button>
                        );
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages - 1}
                        onClick={() => handlePageChange(totalPages - 1)}
                      >
                        الأخيرة
                        <ChevronsLeft className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
        </BusinessSectionPanel>

        <BusinessFilterSheet
          open={isFiltersSheetOpen}
          onOpenChange={setIsFiltersSheetOpen}
          title="فلترة النتائج"
          description="اختَر حالة الدفع أو المدة الزمنية ثم طبّق الفلاتر."
          onClear={handleClearFilters}
          onApply={handleApplyFilters}
        >
          <div className="space-y-2">
            <Label htmlFor="order-invoices-sheet-search">البحث</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="order-invoices-sheet-search"
                name="orderInvoicesSheetSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="رقم الفاتورة أو اسم العميل"
                className="h-11 rounded-2xl pr-10 text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>حالة الدفع</Label>
            <Select
              value={paymentStatus || "ALL"}
              onValueChange={(value) => {
                setPaymentStatus(!value || value === "ALL" ? "" : value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-11 rounded-2xl" aria-label="حالة الدفع">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحالات</SelectItem>
                <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                <SelectItem value="PAID">مدفوعة</SelectItem>
                <SelectItem value="PARTIALLY_PAID">مدفوعة جزئياً</SelectItem>
                <SelectItem value="CANCELLED">ملغاة</SelectItem>
                <SelectItem value="REFUNDED">مستردة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="order-invoices-mobile-date-from">من تاريخ</Label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="order-invoices-mobile-date-from"
                  name="orderInvoicesMobileDateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11 rounded-2xl pr-10"
                  aria-label="من تاريخ"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-invoices-mobile-date-to">إلى تاريخ</Label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="order-invoices-mobile-date-to"
                  name="orderInvoicesMobileDateTo"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11 rounded-2xl pr-10"
                  aria-label="إلى تاريخ"
                />
              </div>
            </div>
          </div>
        </BusinessFilterSheet>
      </BusinessPageShell>
    </TooltipProvider>
  );
};

export default OrderInvoices;
