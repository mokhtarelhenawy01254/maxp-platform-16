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
  labelKey: string;
  className: string;
}

const createPaymentStatusMeta = (t: (key: string) => string): Record<PaymentStatusKey, PaymentStatusMeta> => ({
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
});

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const getPaymentStatusMeta = (status: string, meta: Record<PaymentStatusKey, PaymentStatusMeta>): PaymentStatusMeta =>
  meta[status as PaymentStatusKey] ?? meta.PENDING;

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
  const paymentStatusMeta = createPaymentStatusMeta(t);

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
    paymentStatus ? t(getPaymentStatusMeta(paymentStatus, paymentStatusMeta).labelKey) : null,
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
      <BusinessPageShell className="space-y-4 md:space-y-6" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
        <BusinessPageHero
          eyebrow="ORDERS · FINANCE"
          title={
            <span className="business-page-title-row">
              <span className="business-page-title-copy">{t("orders.orderInvoices_title")}</span>
              <span className="business-page-title-artwork">
                <Receipt className="size-6" />
              </span>
            </span>
          }
          description={t("orders.orderInvoices_description")}
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
              {t("orders.orderInvoices_refresh")}
            </Button>
          }
        />

        {stats ? <BusinessMetricsStrip items={metricItems} /> : null}

        <BusinessMobileSearchPanel
          searchId="order-invoices-mobile-search"
          searchName="orderInvoicesMobileSearch"
          searchLabel={t("orders.orderInvoices_searchLabel")}
          searchPlaceholder={t("orders.orderInvoices_searchPlaceholder")}
          searchValue={search}
          searchAriaLabel={t("orders.orderInvoices_searchAriaLabel")}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearch}
          onOpenFilters={() => setIsFiltersSheetOpen(true)}
          filterCount={activeFiltersCount}
          summaryIcon={<Receipt className="size-3.5" />}
          summary={
            loading
              ? t("orders.orderInvoices_updating")
              : total > 0
                ? t("orders.orderInvoices_fromTotal", { from: currentFrom, to: currentTo, total })
                : t("orders.orderInvoices_noResults")
          }
          activeFilters={activeFilterLabels}
        />

        <BusinessSectionPanel
          className="hidden md:block"
          title={t("orders.orderInvoices_filtersTitle")}
          description={t("orders.orderInvoices_filtersDescription")}
          contentClassName="space-y-4"
        >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))_auto]">
              <div className="space-y-2">
                <Label htmlFor="order-invoices-search">{t("orders.orderInvoices_search")}</Label>
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
                    placeholder={t("orders.orderInvoices_searchInputPlaceholder")}
                    className="h-11 pr-10 text-right"
                    aria-label={t("orders.orderInvoices_searchInputAriaLabel")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("orders.orderInvoices_paymentStatus")}</Label>
                <Select
                  value={paymentStatus || "ALL"}
                  onValueChange={(value) => {
                    setPaymentStatus(!value || value === "ALL" ? "" : value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="h-11">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-invoices-date-from">{t("orders.orderInvoices_fromDate")}</Label>
                <Input
                  id="order-invoices-date-from"
                  name="orderInvoicesDateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11"
                  aria-label={t("orders.orderInvoices_fromDate")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-invoices-date-to">{t("orders.orderInvoices_toDate")}</Label>
                <Input
                  id="order-invoices-date-to"
                  name="orderInvoicesDateTo"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11"
                  aria-label={t("orders.orderInvoices_toDate")}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="h-11 w-full px-5 xl:w-auto"
                >
                  <Search className="size-4" />
                  {t("orders.orderInvoices_search")}
                </Button>
              </div>
            </div>

            {error ? (
              <Alert variant="destructive" className="border-rose-500/30">
                <AlertCircle className="size-4" />
                <AlertTitle>{t("orders.orderInvoices_errorTitle")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
        </BusinessSectionPanel>

        <BusinessSectionPanel
          title={t("orders.orderInvoices_recordsTitle")}
          description={
            total > 0
              ? t("orders.orderInvoices_showing", { from: currentFrom, to: currentTo, total })
              : t("orders.orderInvoices_noMatchingResults")
          }
          headerAside={
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              <Receipt className="size-3.5" />
              {loading ? t("orders.orderInvoices_updating") : t("orders.orderInvoices_itemsPerPage", { count: rowsPerPage })}
            </div>
          }
          contentClassName="p-0"
        >
            {loading ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm">{t("orders.orderInvoices_loading")}</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center px-6 py-10">
                <Alert className="max-w-md border-dashed bg-background/70">
                  <AlertCircle className="size-4" />
                  <AlertTitle>{t("orders.orderInvoices_noInvoices")}</AlertTitle>
                  <AlertDescription>
                    {t("orders.orderInvoices_noInvoicesDesc")}
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {invoices.map((invoice) => {
                    const statusMeta = getPaymentStatusMeta(
                      invoice.paymentStatus, paymentStatusMeta,
                    );

                    return (
                      <div
                        key={invoice.id}
                        className="rounded-[1.35rem] border border-border/70 bg-background/85 p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                              {t("orders.orderInvoices_invoiceNumber")}
                            </p>
                            <p className="font-semibold text-foreground">
                              {invoice.invoiceNumber}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("rounded-full", statusMeta.className)}
                          >
                            {t(statusMeta.labelKey)}
                          </Badge>
                        </div>

                        <div className="mt-4 grid gap-3 rounded-2xl bg-muted/30 p-3 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">{t("orders.orderInvoices_orderNumber")}</span>
                            <span className="font-medium text-foreground">
                              {invoice.order?.orderNumber || "—"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">{t("orders.orderInvoices_customer")}</span>
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
                            <span className="text-muted-foreground">{t("orders.orderInvoices_issueDate")}</span>
                            <span className="font-medium text-foreground">
                              {formatDate(invoice.issueDate)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">{t("orders.orderInvoices_amount")}</span>
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
                            {t("orders.orderInvoices_view")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handlePrintInvoice(invoice.id)}
                          >
                            <Printer className="size-4" />
                            {t("orders.orderInvoices_print")}
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
                          {t("orders.orderInvoices_invoiceNumber")}
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          {t("orders.orderInvoices_orderNumber")}
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          {t("orders.orderInvoices_customer")}
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          {t("orders.orderInvoices_issueDate")}
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          {t("orders.orderInvoices_amount")}
                        </TableHead>
                        <TableHead className="text-right font-semibold text-foreground">
                          {t("orders.orderInvoices_paymentStatus")}
                        </TableHead>
                        <TableHead className="text-center font-semibold text-foreground">
                          {t("orders.orderInvoices_actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => {
                        const statusMeta = getPaymentStatusMeta(
                          invoice.paymentStatus, paymentStatusMeta,
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
                                {t(statusMeta.labelKey)}
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
                                  <TooltipContent>{t("orders.orderInvoices_viewInvoice")}</TooltipContent>
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

                <div className="border-t border-border/70 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <p className="text-sm text-muted-foreground">
                        {t("orders.orderInvoices_showing", { from: currentFrom, to: currentTo, total })}
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t("orders.orderInvoices_rowsLabel")}
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
                                {t("orders.orderInvoices_perPage", { size })}
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
                        {t("orders.orderInvoices_first")}
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
                        {t("orders.orderInvoices_last")}
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
          title={t("orders.orderInvoices_filterTitle")}
          description={t("orders.orderInvoices_filterDescription")}
          onClear={handleClearFilters}
          onApply={handleApplyFilters}
        >
          <div className="space-y-2">
            <Label htmlFor="order-invoices-sheet-search">{t("orders.orderInvoices_search")}</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="order-invoices-sheet-search"
                name="orderInvoicesSheetSearch"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("orders.orderInvoices_searchPlaceholder")}
                className="h-11 rounded-2xl pr-10 text-right"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("orders.orderInvoices_paymentStatus")}</Label>
            <Select
              value={paymentStatus || "ALL"}
              onValueChange={(value) => {
                setPaymentStatus(!value || value === "ALL" ? "" : value);
                setPage(0);
              }}
            >
              <SelectTrigger className="h-11 rounded-2xl" aria-label={t("orders.orderInvoices_paymentStatus")}>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="order-invoices-mobile-date-from">{t("orders.orderInvoices_fromDate")}</Label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="order-invoices-mobile-date-from"
                  name="orderInvoicesMobileDateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-11 rounded-2xl pr-10"
                  aria-label={t("orders.orderInvoices_fromDate")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-invoices-mobile-date-to">{t("orders.orderInvoices_toDate")}</Label>
              <div className="relative">
                <CalendarRange className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="order-invoices-mobile-date-to"
                  name="orderInvoicesMobileDateTo"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-11 rounded-2xl pr-10"
                  aria-label={t("orders.orderInvoices_toDate")}
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
