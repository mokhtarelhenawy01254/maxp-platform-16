import { useTranslation } from "react-i18next";
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

import i18n from "../../i18n";
import { apiClient } from "../../services/apiClient";
import { cn } from "../../lib/utils";
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
  labelKey: string;
  className: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const PAYMENT_STATUS_META: Record<PaymentStatusKey, PaymentStatusMeta> = {
  PAID: {
    labelKey: "orders.orderInvoices_statusPaid",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  PENDING: {
    labelKey: "orders.orderInvoices_statusPending",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  CANCELLED: {
    labelKey: "orders.orderInvoices_statusCancelled",
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  REFUNDED: {
    labelKey: "orders.orderInvoices_statusRefunded",
    className:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  PARTIALLY_PAID: {
    labelKey: "orders.orderInvoices_statusPartiallyPaid",
    className:
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
};

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

const getErrorMessage = (error: unknown, t: (key: string) => string) => {
  const message =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message
      : undefined;

  if (typeof message === "string") {
    return message;
  }

  return i18n.t("orders.orderInvoices_errorMessage");
};

const OrderInvoices: React.FC = () => {
  const { t, i18n } = useTranslation();
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
  }, [page, rowsPerPage, paymentStatus]);

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
      setError(getErrorMessage(err, t));
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
      setError(t("orders.orderInvoices_printErrorMessage"));
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
    paymentStatus ? t(getPaymentStatusMeta(paymentStatus).labelKey) : null,
    dateFrom ? t("orders.orderInvoices_filterFromDate", { date: formatDate(dateFrom) }) : null,
    dateTo ? t("orders.orderInvoices_filterToDate", { date: formatDate(dateTo) }) : null,
  ].filter((label): label is string => Boolean(label));
  const activeFiltersCount = activeFilterLabels.length;
  const metricItems = stats
    ? [
        {
          title: t("orders.orderInvoices_totalInvoices"),
          value: stats.totalInvoices,
          subtitle: t("orders.orderInvoices_totalInvoicesSub"),
          tone: "primary" as const,
          icon: Receipt,
        },
        {
          title: t("orders.orderInvoices_paidInvoices"),
          value: stats.paidInvoices,
          subtitle: t("orders.orderInvoices_paidInvoicesSub"),
          tone: "success" as const,
          icon: CheckCircle2,
        },
        {
          title: t("orders.orderInvoices_pendingInvoices"),
          value: stats.pendingInvoices,
          subtitle: t("orders.orderInvoices_pendingInvoicesSub"),
          tone: "warning" as const,
          icon: Clock3,
        },
        {
          title: t("orders.orderInvoices_totalAmount"),
          value: formatCurrency(stats.totalAmount),
          subtitle: t("orders.orderInvoices_totalAmountSub"),
          tone: "secondary" as const,
          icon: WalletCards,
        },
      ]
    : [];

  return (
    <TooltipProvider>
      <div className="space-y-4 p-4 md:p-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        {/* Unified Control Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-foreground">
              <Receipt className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {t("orders.orderInvoices_title")}
                </h1>
                <Badge variant="outline" className="h-5 px-1.5 font-mono text-xs tabular-nums text-muted-foreground border-border/60">
                  {total}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("orders.orderInvoices_description")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void fetchInvoices()}
              disabled={loading}
              className="h-9 gap-1.5 text-xs active:scale-[0.98] transition-transform"
            >
              <RefreshCw className={cn("size-3.5", loading ? "animate-spin" : "")} />
              <span>{t("orders.orderInvoices_refresh")}</span>
            </Button>
          </div>
        </div>

        {/* Single-Surface Telemetry Strip */}
        {stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 dark:border-border/60 bg-card/60 backdrop-blur-xs divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/60 overflow-hidden shadow-2xs">
            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("orders.orderInvoices_totalInvoices")}</span>
                <Receipt className="size-3.5 text-primary" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {stats.totalInvoices}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("orders.orderInvoices_totalInvoicesSub")}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {t("orders.orderInvoices_paidInvoices")}
                </span>
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {stats.paidInvoices}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("orders.orderInvoices_paidInvoicesSub")}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {t("orders.orderInvoices_pendingInvoices")}
                </span>
                <Clock3 className="size-3.5 text-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground">
                {stats.pendingInvoices}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("orders.orderInvoices_pendingInvoicesSub")}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("orders.orderInvoices_totalAmount")}</span>
                <WalletCards className="size-3.5 text-blue-500" />
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground truncate">
                {formatCurrency(stats.totalAmount)}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {t("orders.orderInvoices_totalAmountSub")}
              </p>
            </div>
          </div>
        ) : null}

        {/* Main Chassis: Integrated Filter Toolbar + Data Table + Pagination */}
        <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card/40 backdrop-blur-xs overflow-hidden shadow-2xs">
          {/* Integrated Filter Ribbon */}
          <div className="border-b border-border/70 p-3 sm:p-3.5 bg-muted/20">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              {/* Search & Status Filter */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
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
                    placeholder={t("orders.orderInvoices_searchInputPlaceholder")}
                    className="h-8.5 text-xs pr-8 text-right bg-background/80"
                  />
                </div>

                <Select
                  value={paymentStatus || "ALL"}
                  onValueChange={(value) => {
                    setPaymentStatus(!value || value === "ALL" ? "" : value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-8.5 w-36 text-xs bg-background/80">
                    <SelectValue placeholder={t("orders.orderInvoices_allStatuses")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("orders.orderInvoices_allStatuses")}</SelectItem>
                    <SelectItem value="PENDING">{t("orders.orderInvoices_statusPending")}</SelectItem>
                    <SelectItem value="PAID">{t("orders.orderInvoices_statusPaid")}</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">{t("orders.orderInvoices_statusPartiallyPaid")}</SelectItem>
                    <SelectItem value="CANCELLED">{t("orders.orderInvoices_statusCancelled")}</SelectItem>
                    <SelectItem value="REFUNDED">{t("orders.orderInvoices_statusRefunded")}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8.5 w-32 text-xs bg-background/80"
                    title={t("orders.orderInvoices_fromDate")}
                  />
                  <span>-</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8.5 w-32 text-xs bg-background/80"
                    title={t("orders.orderInvoices_toDate")}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSearch}
                  className="h-8.5 px-3 text-xs active:scale-[0.98]"
                >
                  <Search className="size-3 ml-1" />
                  {t("orders.orderInvoices_search")}
                </Button>

                {(search || paymentStatus || dateFrom || dateTo) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    إعادة ضبط
                  </Button>
                )}
              </div>

              {/* Counter / Page size */}
              <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {total > 0
                    ? t("orders.orderInvoices_showing", { from: currentFrom, to: currentTo, total })
                    : t("orders.orderInvoices_noMatchingResults")}
                </span>

                <Select
                  value={rowsPerPage.toString()}
                  onValueChange={handleRowsPerPageChange}
                >
                  <SelectTrigger className="h-8 w-24 text-xs bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {t("orders.orderInvoices_perPage", { size })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error ? (
            <div className="p-3">
              <Alert variant="destructive" className="border-rose-500/30">
                <AlertCircle className="size-4" />
                <AlertTitle>{t("orders.orderInvoices_errorTitle")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {/* Table Content */}
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">{t("orders.orderInvoices_loading")}</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <Receipt className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">{t("orders.orderInvoices_noInvoices")}</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                {t("orders.orderInvoices_noInvoicesDesc")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/70 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_invoiceNumber")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_orderNumber")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_customer")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_issueDate")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_amount")}
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_paymentStatus")}
                    </TableHead>
                    <TableHead className="text-center text-xs font-semibold text-muted-foreground">
                      {t("orders.orderInvoices_actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {invoices.map((invoice) => {
                    const statusMeta = getPaymentStatusMeta(invoice.paymentStatus);

                    return (
                      <TableRow key={invoice.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-right py-2.5">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {invoice.invoiceNumber}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {invoice.order?.orderNumber || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <div className="font-medium text-xs text-foreground">
                            {invoice.customerName}
                          </div>
                          {invoice.customerPhone ? (
                            <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                              {invoice.customerPhone}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right py-2.5 text-xs text-muted-foreground font-mono">
                          {formatDate(invoice.issueDate)}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                            {formatCurrency(
                              toAmount(invoice.totalAmount),
                              invoice.currency || "EGP",
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                              statusMeta.className,
                            )}
                          >
                            <span className={cn("size-1.5 rounded-full", 
                              invoice.paymentStatus === "PAID" ? "bg-emerald-500" :
                              invoice.paymentStatus === "PENDING" ? "bg-amber-500" :
                              invoice.paymentStatus === "CANCELLED" ? "bg-rose-500" :
                              invoice.paymentStatus === "REFUNDED" ? "bg-sky-500" : "bg-orange-500"
                            )} />
                            {t(statusMeta.labelKey)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="inline-flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleViewInvoice(invoice.id)}
                                  className="size-7 hover:bg-muted active:scale-[0.98]"
                                >
                                  <Eye className="size-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("orders.orderInvoices_viewInvoice")}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handlePrintInvoice(invoice.id)}
                                  className="size-7 hover:bg-muted active:scale-[0.98]"
                                >
                                  <Printer className="size-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("orders.orderInvoices_printInvoice")}</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Unified Pagination Bar */}
          {totalPages > 1 && (
            <div className="border-t border-border/70 p-3 bg-muted/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                {t("orders.orderInvoices_showing", { from: currentFrom, to: currentTo, total })}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => handlePageChange(0)}
                  className="h-7 text-xs px-2"
                >
                  <ChevronsRight className="size-3.5" />
                </Button>

                {paginationPages.map((pageItem) => {
                  if (pageItem === "ellipsis-left" || pageItem === "ellipsis-right") {
                    return (
                      <span key={pageItem} className="px-1 text-xs text-muted-foreground">
                        …
                      </span>
                    );
                  }

                  return (
                    <Button
                      key={pageItem}
                      type="button"
                      variant={pageItem === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageItem - 1)}
                      className="h-7 min-w-7 px-2 text-xs font-mono tabular-nums"
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
                  className="h-7 text-xs px-2"
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default OrderInvoices;
