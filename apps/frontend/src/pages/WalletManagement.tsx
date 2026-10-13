import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { tToast } from "../utils/i18n-toast";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { BusinessMetricsStrip } from "../components/business/BusinessMetrics";
import {
  BusinessPageHero,
  BusinessPageShell,
  BusinessSectionPanel,
} from "../components/business/BusinessSurface";
import { cn } from "../lib/utils";
import { apiClient } from "../services/apiClient";

type WalletTab = "wallets" | "receipts" | "companies";
type NumericLike = number | string | null | undefined;

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
};

type WalletNumberRecord = {
  id: string;
  name: string;
  number: string;
  icon?: string | null;
  color?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type PendingReceiptRecord = {
  id: string;
  submittedAt?: string | null;
  receiptImage?: string | null;
  invoice: {
    invoiceNumber?: string | null;
    totalAmount?: NumericLike;
    company: {
      name?: string | null;
      email?: string | null;
    };
  };
  walletNumber: {
    name?: string | null;
    number?: string | null;
  };
};

type CompanyWalletRecord = {
  companyId: string;
  companyName: string;
  companyEmail: string;
  phone?: string | null;
  walletId?: string | null;
  balance?: NumericLike;
  currency?: string | null;
  totalSpent?: NumericLike;
  totalDeposited?: NumericLike;
};

type WalletFormState = {
  name: string;
  number: string;
  icon: string;
  color: string;
};

type FundsFormState = {
  amount: string;
  bonus: string;
  notes: string;
};

type SectionProps = {
  loading: boolean;
  error: string | null;
};

const TAB_LABELS: Record<WalletTab, string> = {
  wallets: "أرقام المحافظ",
  receipts: "الإيصالات المعلقة",
  companies: "محافظ الشركات",
};

const INITIAL_WALLET_FORM: WalletFormState = {
  name: "",
  number: "",
  icon: "",
  color: "#1d4ed8",
};

const INITIAL_FUNDS_FORM: FundsFormState = {
  amount: "",
  bonus: "",
  notes: "",
};

const getFullImageUrl = (path?: string | null) => {
  if (!path) {
    return "";
  }

  const normalizedPath = path.replace(/\\/g, "/");
  if (normalizedPath.startsWith("uploads/")) {
    const apiUrl = import.meta.env["VITE_API_URL"] || "http://localhost:3007";
    return `${apiUrl.replace("/api/v1", "")}/${normalizedPath}`;
  }

  return normalizedPath;
};

const toNumber = (value: NumericLike) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const formatCurrency = (amount: NumericLike) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(toNumber(amount));

const formatDate = (dateString?: string | null) => {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as {
      response?: { data?: { message?: string; error?: string } };
    }).response;
    const message = response?.data?.message ?? response?.data?.error;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const getCompanyInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CO";

const StatusBadge: React.FC<{
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}> = ({ active, activeLabel = "نشط", inactiveLabel = "غير نشط" }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border/70 bg-muted/60 text-muted-foreground",
      )}
    >
      {active ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {active ? activeLabel : inactiveLabel}
    </span>
  );
};

const SectionEmptyState: React.FC<{
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-border/70 bg-muted/25 px-4 py-8 text-center">
      <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};

const SectionLoadingState: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div className="flex min-h-[16rem] items-center justify-center rounded-[1.5rem] border border-border/60 bg-muted/20">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </div>
    </div>
  );
};

const SectionErrorNotice: React.FC<{ message: string }> = ({ message }) => {
  return (
    <Alert variant="destructive" className="mb-4 text-right">
      <AlertCircle className="size-4" />
      <AlertTitle>تعذر تحميل هذا القسم</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

type WalletNumbersSectionProps = SectionProps & {
  wallets: WalletNumberRecord[];
  onCreateWallet: () => void;
  onEditWallet: (wallet: WalletNumberRecord) => void;
  onToggleWallet: (wallet: WalletNumberRecord, nextValue: boolean) => void;
  onDeleteWallet: (wallet: WalletNumberRecord) => void;
  togglingWalletId: string | null;
};

const WalletNumbersSection: React.FC<WalletNumbersSectionProps> = ({
  wallets,
  loading,
  error,
  onCreateWallet,
  onEditWallet,
  onToggleWallet,
  onDeleteWallet,
  togglingWalletId,
}) => {
  return (
    <BusinessSectionPanel
      title="أرقام المحافظ"
      description="قائمة المحافظ المعتمدة للدفع اليدوي مع إمكانية التفعيل والتعديل بدون الرجوع إلى MUI."
      headerAside={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {wallets.length} محفظة
          </Badge>
          <Button type="button" onClick={onCreateWallet}>
            <Plus className="size-4" />
            إضافة محفظة
          </Button>
        </div>
      }
      contentClassName="space-y-4"
    >
      {error ? <SectionErrorNotice message={error} /> : null}
      {loading ? <SectionLoadingState label="جاري تحميل أرقام المحافظ..." /> : null}

      {!loading && wallets.length === 0 ? (
        <SectionEmptyState
          icon={Wallet}
          title="لا توجد محافظ مضافة بعد"
          description="ابدأ بإضافة أول محفظة دفع، وبعدها ستظهر هنا مع حالة التفعيل وإجراءات الإدارة."
          action={
            <Button type="button" onClick={onCreateWallet}>
              <Plus className="size-4" />
              إضافة أول محفظة
            </Button>
          }
        />
      ) : null}

      {!loading && wallets.length > 0 ? (
        <>
          <div className="grid gap-3 md:hidden">
            {wallets.map((wallet) => {
              const isToggling = togglingWalletId === wallet.id;

              return (
                <Card key={wallet.id} size="sm" className="rounded-[1.5rem]">
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-lg shadow-sm"
                          style={{
                            backgroundColor: `${wallet.color ?? "#1d4ed8"}18`,
                            color: wallet.color ?? "#1d4ed8",
                          }}
                        >
                          {wallet.icon || "💳"}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="text-right">{wallet.name}</CardTitle>
                          <CardDescription className="font-mono text-xs">
                            {wallet.number}
                          </CardDescription>
                        </div>
                      </div>
                      <StatusBadge active={wallet.isActive} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 rounded-2xl bg-muted/30 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">تاريخ الإضافة</span>
                        <span className="text-right font-medium">{formatDate(wallet.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">التفعيل</span>
                        <div className="flex items-center gap-2">
                          {isToggling ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
                          <Switch
                            checked={wallet.isActive}
                            onCheckedChange={(checked) => onToggleWallet(wallet, Boolean(checked))}
                            disabled={isToggling}
                            aria-label={`تبديل حالة ${wallet.name}`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="outline" onClick={() => onEditWallet(wallet)}>
                        <Pencil className="size-4" />
                        تعديل
                      </Button>
                      <Button type="button" variant="destructive" onClick={() => onDeleteWallet(wallet)}>
                        <Trash2 className="size-4" />
                        حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="hidden md:block">
            <div className="overflow-hidden rounded-[1.5rem] border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-right">المحفظة</TableHead>
                    <TableHead className="text-right">الرقم</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">تاريخ الإضافة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wallets.map((wallet) => {
                    const isToggling = togglingWalletId === wallet.id;

                    return (
                      <TableRow key={wallet.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="inline-flex size-10 items-center justify-center rounded-2xl text-lg"
                              style={{
                                backgroundColor: `${wallet.color ?? "#1d4ed8"}18`,
                                color: wallet.color ?? "#1d4ed8",
                              }}
                            >
                              {wallet.icon || "💳"}
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="font-medium text-foreground">{wallet.name}</p>
                              <p className="text-xs text-muted-foreground">
                                آخر تحديث: {formatDate(wallet.updatedAt ?? wallet.createdAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">{wallet.number}</TableCell>
                        <TableCell>
                          <StatusBadge active={wallet.isActive} />
                        </TableCell>
                        <TableCell>{formatDate(wallet.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => onEditWallet(wallet)}
                              aria-label={`تعديل ${wallet.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5">
                              {isToggling ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                              ) : null}
                              <Switch
                                checked={wallet.isActive}
                                onCheckedChange={(checked) => onToggleWallet(wallet, Boolean(checked))}
                                disabled={isToggling}
                                aria-label={`تبديل حالة ${wallet.name}`}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDeleteWallet(wallet)}
                              aria-label={`حذف ${wallet.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : null}
    </BusinessSectionPanel>
  );
};

type PendingReceiptsSectionProps = SectionProps & {
  receipts: PendingReceiptRecord[];
  onOpenReceipt: (receipt: PendingReceiptRecord) => void;
};

const PendingReceiptsSection: React.FC<PendingReceiptsSectionProps> = ({
  receipts,
  loading,
  error,
  onOpenReceipt,
}) => {
  return (
    <BusinessSectionPanel
      title="الإيصالات المعلقة"
      description="مراجعة سريعة للإيصالات المرسلة مع فتح نافذة التفاصيل للموافقة أو الرفض."
      headerAside={
        <Badge
          variant="outline"
          className={cn(
            "rounded-full px-3 py-1",
            receipts.length > 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" : undefined,
          )}
        >
          {receipts.length} إيصال
        </Badge>
      }
      contentClassName="space-y-4"
    >
      {error ? <SectionErrorNotice message={error} /> : null}
      {loading ? <SectionLoadingState label="جاري تحميل الإيصالات المعلقة..." /> : null}

      {!loading && receipts.length === 0 ? (
        <SectionEmptyState
          icon={ReceiptText}
          title="لا توجد إيصالات معلقة"
          description="أي إيصال جديد يحتاج مراجعة سيظهر هنا مباشرة مع بيانات الشركة والفاتورة."
        />
      ) : null}

      {!loading && receipts.length > 0 ? (
        <>
          <div className="grid gap-3 md:hidden">
            {receipts.map((receipt) => (
              <Card key={receipt.id} size="sm" className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <CardTitle className="text-right">
                        {receipt.invoice.company.name || "شركة غير معروفة"}
                      </CardTitle>
                      <CardDescription>{receipt.invoice.company.email || "-"}</CardDescription>
                    </div>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {receipt.invoice.invoiceNumber || "بدون رقم"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 rounded-2xl bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">المبلغ</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(receipt.invoice.totalAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">المحفظة</span>
                      <div className="text-right">
                        <p className="font-medium">{receipt.walletNumber.name || "-"}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {receipt.walletNumber.number || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">تاريخ الإرسال</span>
                      <span>{formatDate(receipt.submittedAt)}</span>
                    </div>
                  </div>

                  <Button type="button" className="w-full" onClick={() => onOpenReceipt(receipt)}>
                    <Eye className="size-4" />
                    مراجعة الإيصال
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <div className="overflow-hidden rounded-[1.5rem] border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-right">الشركة</TableHead>
                    <TableHead className="text-right">الفاتورة</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">المحفظة</TableHead>
                    <TableHead className="text-right">تاريخ الإرسال</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        <div className="space-y-1 text-right">
                          <p className="font-medium text-foreground">
                            {receipt.invoice.company.name || "شركة غير معروفة"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {receipt.invoice.company.email || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{receipt.invoice.invoiceNumber || "-"}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(receipt.invoice.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-right">
                          <p className="font-medium">{receipt.walletNumber.name || "-"}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {receipt.walletNumber.number || "-"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(receipt.submittedAt)}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenReceipt(receipt)}>
                          <Eye className="size-4" />
                          مراجعة
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : null}
    </BusinessSectionPanel>
  );
};

type CompanyWalletsSectionProps = SectionProps & {
  companyWallets: CompanyWalletRecord[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenAddFunds: (wallet: CompanyWalletRecord) => void;
  onClearSearch: () => void;
};

const CompanyWalletsSection: React.FC<CompanyWalletsSectionProps> = ({
  companyWallets,
  loading,
  error,
  searchValue,
  onSearchChange,
  onOpenAddFunds,
  onClearSearch,
}) => {
  const hasSearch = searchValue.trim().length > 0;

  return (
    <BusinessSectionPanel
      title="محافظ الشركات"
      description="رصيد كل شركة مع البحث السريع وإضافة الرصيد من نفس الشاشة."
      headerAside={
        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {companyWallets.length} نتيجة
          </Badge>
          <div className="relative w-72">
            <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="company-wallet-search"
              name="companyWalletSearch"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="بحث عن شركة أو بريد إلكتروني"
              className="h-10 rounded-full pr-10 text-right"
              aria-label="بحث في محافظ الشركات"
            />
          </div>
        </div>
      }
      contentClassName="space-y-4"
    >
      {error ? <SectionErrorNotice message={error} /> : null}

      <div className="md:hidden">
        <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-muted/15 p-4">
          <div className="space-y-2">
            <Label htmlFor="company-wallet-search-mobile">بحث سريع</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="company-wallet-search-mobile"
                name="companyWalletSearchMobile"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="ابحث باسم الشركة أو البريد"
                className="h-11 rounded-2xl pr-10 text-right"
                aria-label="بحث في محافظ الشركات"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{companyWallets.length} نتيجة حالية</span>
            {hasSearch ? (
              <Button type="button" variant="ghost" size="sm" onClick={onClearSearch}>
                مسح البحث
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? <SectionLoadingState label="جاري تحميل محافظ الشركات..." /> : null}

      {!loading && companyWallets.length === 0 ? (
        <SectionEmptyState
          icon={Building2}
          title={hasSearch ? "لا توجد نتائج مطابقة" : "لا توجد محافظ شركات متاحة"}
          description={
            hasSearch
              ? "جرّب تعديل كلمات البحث أو امسحها لعرض كل الشركات مرة أخرى."
              : "سيظهر رصيد كل شركة هنا بمجرد وجود شركات مرتبطة بالنظام."
          }
          action={
            hasSearch ? (
              <Button type="button" variant="outline" onClick={onClearSearch}>
                مسح البحث
              </Button>
            ) : null
          }
        />
      ) : null}

      {!loading && companyWallets.length > 0 ? (
        <>
          <div className="grid gap-3 md:hidden">
            {companyWallets.map((wallet) => (
              <Card key={wallet.companyId} size="sm" className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {getCompanyInitials(wallet.companyName)}
                    </div>
                    <div className="min-w-0 space-y-1 text-right">
                      <CardTitle>{wallet.companyName}</CardTitle>
                      <CardDescription className="truncate">{wallet.companyEmail}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 rounded-2xl bg-muted/30 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">الرصيد الحالي</span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(wallet.balance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">إجمالي الإيداع</span>
                      <span>{formatCurrency(wallet.totalDeposited)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">العملة</span>
                      <span>{wallet.currency || "EGP"}</span>
                    </div>
                  </div>

                  <Button type="button" className="w-full" onClick={() => onOpenAddFunds(wallet)}>
                    <Plus className="size-4" />
                    إضافة رصيد
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden md:block">
            <div className="overflow-hidden rounded-[1.5rem] border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-right">الشركة</TableHead>
                    <TableHead className="text-right">الرصيد الحالي</TableHead>
                    <TableHead className="text-right">إجمالي الإيداع</TableHead>
                    <TableHead className="text-right">العملة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyWallets.map((wallet) => (
                    <TableRow key={wallet.companyId}>
                      <TableCell>
                        <div className="space-y-1 text-right">
                          <p className="font-medium text-foreground">{wallet.companyName}</p>
                          <p className="text-xs text-muted-foreground">{wallet.companyEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(wallet.balance)}
                      </TableCell>
                      <TableCell>{formatCurrency(wallet.totalDeposited)}</TableCell>
                      <TableCell>{wallet.currency || "EGP"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="outline" size="sm" onClick={() => onOpenAddFunds(wallet)}>
                          <Plus className="size-4" />
                          إضافة رصيد
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      ) : null}
    </BusinessSectionPanel>
  );
};

type WalletNumberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWallet: WalletNumberRecord | null;
  formData: WalletFormState;
  onChange: (field: keyof WalletFormState, value: string) => void;
  onSubmit: () => void;
  saving: boolean;
};

const WalletNumberDialog: React.FC<WalletNumberDialogProps> = ({
  open,
  onOpenChange,
  editingWallet,
  formData,
  onChange,
  onSubmit,
  saving,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto text-right sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editingWallet ? "تعديل المحفظة" : "إضافة محفظة جديدة"}
          </DialogTitle>
          <DialogDescription>
            احفظ بيانات المحفظة مرة واحدة لتظهر في كل أماكن الدفع اليدوي داخل لوحة الإدارة.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="wallet-name">اسم المحفظة</Label>
            <Input
              id="wallet-name"
              name="walletName"
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="مثال: فودافون كاش"
              className="h-11 rounded-2xl text-right"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="wallet-number">رقم المحفظة</Label>
            <Input
              id="wallet-number"
              name="walletNumber"
              value={formData.number}
              onChange={(event) => onChange("number", event.target.value)}
              placeholder="0100 000 0000"
              className="h-11 rounded-2xl text-right font-mono"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div className="grid gap-2">
              <Label htmlFor="wallet-icon">رمز المحفظة</Label>
              <Input
                id="wallet-icon"
                name="walletIcon"
                value={formData.icon}
                onChange={(event) => onChange("icon", event.target.value)}
                placeholder="💳"
                className="h-11 rounded-2xl text-right"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="wallet-color">اللون</Label>
              <input
                id="wallet-color"
                name="walletColor"
                type="color"
                value={formData.color}
                onChange={(event) => onChange("color", event.target.value)}
                className="h-11 w-full cursor-pointer rounded-2xl border border-input bg-background p-1"
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
            <p className="mb-3 text-xs font-medium text-muted-foreground">معاينة سريعة</p>
            <div className="flex items-center gap-3">
              <div
                className="inline-flex size-12 items-center justify-center rounded-2xl text-xl"
                style={{
                  backgroundColor: `${formData.color || "#1d4ed8"}18`,
                  color: formData.color || "#1d4ed8",
                }}
              >
                {formData.icon || "💳"}
              </div>
              <div className="space-y-1 text-right">
                <p className="font-semibold text-foreground">
                  {formData.name || "اسم المحفظة"}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {formData.number || "رقم المحفظة"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="button" disabled={saving} onClick={onSubmit}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {saving ? "جاري الحفظ..." : editingWallet ? "حفظ التعديلات" : "إضافة المحفظة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type AddFundsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyWalletRecord | null;
  formData: FundsFormState;
  onChange: (field: keyof FundsFormState, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
};

const AddFundsDialog: React.FC<AddFundsDialogProps> = ({
  open,
  onOpenChange,
  company,
  formData,
  onChange,
  onSubmit,
  submitting,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto text-right sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {company ? `إضافة رصيد - ${company.companyName}` : "إضافة رصيد"}
          </DialogTitle>
          <DialogDescription>
            حدّد قيمة الإضافة والبونص الاختياري، وسيتم تحديث رصيد الشركة مباشرة بعد الحفظ.
          </DialogDescription>
        </DialogHeader>

        {company ? (
          <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground">الشركة</p>
                <p className="font-semibold text-foreground">{company.companyName}</p>
                <p className="text-xs text-muted-foreground">{company.companyEmail}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">الرصيد الحالي</p>
                <p className="font-semibold text-primary">{formatCurrency(company.balance)}</p>
                <p className="text-xs text-muted-foreground">
                  إجمالي الإيداعات: {formatCurrency(company.totalDeposited)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="funds-amount">المبلغ</Label>
            <Input
              id="funds-amount"
              name="fundsAmount"
              type="number"
              min="0"
              value={formData.amount}
              onChange={(event) => onChange("amount", event.target.value)}
              placeholder="0"
              className="h-11 rounded-2xl text-right"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="funds-bonus">بونص إضافي</Label>
            <Input
              id="funds-bonus"
              name="fundsBonus"
              type="number"
              min="0"
              value={formData.bonus}
              onChange={(event) => onChange("bonus", event.target.value)}
              placeholder="0"
              className="h-11 rounded-2xl text-right"
            />
            <p className="text-xs text-muted-foreground">
              مبلغ إضافي يضاف للرصيد كهدية للشركة بشكل اختياري.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="funds-notes">ملاحظات</Label>
            <Textarea
              id="funds-notes"
              name="fundsNotes"
              value={formData.notes}
              onChange={(event) => onChange("notes", event.target.value)}
              placeholder="ملاحظات داخلية عن سبب الإضافة"
              className="min-h-[104px] rounded-2xl text-right"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="button" disabled={submitting || !formData.amount.trim()} onClick={onSubmit}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Landmark className="size-4" />}
            {submitting ? "جاري إضافة الرصيد..." : "تأكيد إضافة الرصيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type ReceiptReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: PendingReceiptRecord | null;
  submitting: boolean;
  onDecision: (decision: "approve" | "reject") => void;
};

const ReceiptReviewDialog: React.FC<ReceiptReviewDialogProps> = ({
  open,
  onOpenChange,
  receipt,
  submitting,
  onDecision,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto text-right sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>مراجعة الإيصال</DialogTitle>
          <DialogDescription>
            راجع بيانات الشركة والفاتورة وصورة الإيصال قبل اعتماد العملية أو رفضها.
          </DialogDescription>
        </DialogHeader>

        {receipt ? (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card size="sm" className="rounded-[1.5rem]">
                <CardHeader>
                  <CardTitle>بيانات الشركة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">الشركة</p>
                    <p className="font-semibold">{receipt.invoice.company.name || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">البريد الإلكتروني</p>
                    <p>{receipt.invoice.company.email || "-"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card size="sm" className="rounded-[1.5rem]">
                <CardHeader>
                  <CardTitle>بيانات الدفع</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">رقم الفاتورة</p>
                    <p className="font-semibold">{receipt.invoice.invoiceNumber || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">المبلغ</p>
                    <p className="font-semibold text-primary">
                      {formatCurrency(receipt.invoice.totalAmount)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">تاريخ الإرسال</p>
                    <p>{formatDate(receipt.submittedAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">المحفظة المستخدمة</p>
                  <p className="font-semibold">{receipt.walletNumber.name || "-"}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {receipt.walletNumber.number || "-"}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground">حالة المراجعة</p>
                  <p className="font-semibold">بانتظار قرار الإدارة</p>
                </div>
              </div>
            </div>

            {receipt.receiptImage ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">صورة الإيصال</p>
                <img
                  src={getFullImageUrl(receipt.receiptImage)}
                  alt="إيصال الدفع"
                  className="max-h-[26rem] w-full rounded-[1.5rem] border border-border/60 object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <Alert className="text-right">
                <AlertCircle className="size-4" />
                <AlertTitle>لا توجد صورة مرفقة</AlertTitle>
                <AlertDescription>
                  هذا الإيصال لا يحتوي على صورة مرفوعة، لذلك راجع البيانات بعناية قبل اتخاذ القرار.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting || !receipt}
            onClick={() => onDecision("reject")}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
            رفض الإيصال
          </Button>
          <Button type="button" disabled={submitting || !receipt} onClick={() => onDecision("approve")}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            اعتماد الإيصال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const WalletManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WalletTab>("wallets");

  const [walletNumbers, setWalletNumbers] = useState<WalletNumberRecord[]>([]);
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceiptRecord[]>([]);
  const [companyWallets, setCompanyWallets] = useState<CompanyWalletRecord[]>([]);

  const [loadingState, setLoadingState] = useState<Record<WalletTab, boolean>>({
    wallets: false,
    receipts: false,
    companies: false,
  });
  const [sectionErrors, setSectionErrors] = useState<Record<WalletTab, string | null>>({
    wallets: null,
    receipts: null,
    companies: null,
  });
  const [companiesLoaded, setCompaniesLoaded] = useState(false);

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false);

  const [editingWallet, setEditingWallet] = useState<WalletNumberRecord | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PendingReceiptRecord | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWalletRecord | null>(null);
  const [walletPendingDelete, setWalletPendingDelete] = useState<WalletNumberRecord | null>(null);

  const [walletForm, setWalletForm] = useState<WalletFormState>(INITIAL_WALLET_FORM);
  const [fundsForm, setFundsForm] = useState<FundsFormState>(INITIAL_FUNDS_FORM);
  const [companySearch, setCompanySearch] = useState("");

  const [savingWallet, setSavingWallet] = useState(false);
  const [addingFunds, setAddingFunds] = useState(false);
  const [reviewingReceipt, setReviewingReceipt] = useState(false);
  const [deletingWallet, setDeletingWallet] = useState(false);
  const [togglingWalletId, setTogglingWalletId] = useState<string | null>(null);

  const setSectionLoading = (tab: WalletTab, value: boolean) => {
    setLoadingState((current) => ({ ...current, [tab]: value }));
  };

  const setSectionError = (tab: WalletTab, value: string | null) => {
    setSectionErrors((current) => ({ ...current, [tab]: value }));
  };

  const fetchWalletNumbers = useCallback(async () => {
    setSectionLoading("wallets", true);
    setSectionError("wallets", null);

    try {
      const response = await apiClient.get<ApiResponse<WalletNumberRecord[]>>(
        "/wallet-payment/admin/wallet-numbers",
      );
      setWalletNumbers(response.data.data ?? []);
    } catch (error: unknown) {
      setSectionError(
        "wallets",
        getApiErrorMessage(error, "تعذر تحميل أرقام المحافظ الحالية."),
      );
    } finally {
      setSectionLoading("wallets", false);
    }
  }, []);

  const fetchPendingReceipts = useCallback(async () => {
    setSectionLoading("receipts", true);
    setSectionError("receipts", null);

    try {
      const response = await apiClient.get<ApiResponse<PendingReceiptRecord[]>>(
        "/wallet-payment/admin/pending-receipts",
      );
      setPendingReceipts(response.data.data ?? []);
    } catch (error: unknown) {
      setSectionError(
        "receipts",
        getApiErrorMessage(error, "تعذر تحميل الإيصالات المعلقة."),
      );
    } finally {
      setSectionLoading("receipts", false);
    }
  }, []);

  const fetchCompanyWallets = useCallback(async () => {
    setSectionLoading("companies", true);
    setSectionError("companies", null);

    try {
      const response = await apiClient.get<ApiResponse<CompanyWalletRecord[]>>(
        "/admin/wallet/companies",
      );
      setCompanyWallets(response.data.data ?? []);
      setCompaniesLoaded(true);
    } catch (error: unknown) {
      setSectionError(
        "companies",
        getApiErrorMessage(error, "تعذر تحميل محافظ الشركات."),
      );
    } finally {
      setSectionLoading("companies", false);
    }
  }, []);

  useEffect(() => {
    void fetchWalletNumbers();
    void fetchPendingReceipts();
  }, [fetchPendingReceipts, fetchWalletNumbers]);

  useEffect(() => {
    if (activeTab === "companies" && !companiesLoaded) {
      void fetchCompanyWallets();
    }
  }, [activeTab, companiesLoaded, fetchCompanyWallets]);

  const filteredCompanyWallets = useMemo(() => {
    const query = companySearch.trim().toLowerCase();
    if (!query) {
      return companyWallets;
    }

    return companyWallets.filter((wallet) => {
      return (
        wallet.companyName.toLowerCase().includes(query) ||
        wallet.companyEmail.toLowerCase().includes(query)
      );
    });
  }, [companySearch, companyWallets]);

  const companyBalanceTotal = useMemo(() => {
    return companyWallets.reduce(
      (sum, wallet) => sum + toNumber(wallet.balance),
      0,
    );
  }, [companyWallets]);

  const metrics = useMemo(() => {
    const activeWalletsCount = walletNumbers.filter((wallet) => wallet.isActive).length;

    return [
      {
        title: "المحافظ المسجلة",
        value: walletNumbers.length,
        subtitle: "كل محافظ الدفع المربوطة بلوحة الإدارة.",
        tone: "primary" as const,
        icon: Wallet,
      },
      {
        title: "المحافظ النشطة",
        value: activeWalletsCount,
        subtitle: "محافظ متاحة حاليًا لاستقبال المدفوعات.",
        tone: "success" as const,
        icon: ShieldCheck,
      },
      {
        title: "الإيصالات المعلقة",
        value: pendingReceipts.length,
        subtitle: "تحتاج قرار اعتماد أو رفض من الإدارة.",
        tone: "warning" as const,
        icon: ReceiptText,
      },
      {
        title: "إجمالي أرصدة الشركات",
        value: companiesLoaded ? formatCurrency(companyBalanceTotal) : "—",
        subtitle: companiesLoaded
          ? "مجموع الأرصدة الحالية لكل الشركات."
          : "سيظهر بعد فتح تبويب محافظ الشركات.",
        tone: "secondary" as const,
        icon: Building2,
      },
    ];
  }, [companiesLoaded, companyWallets, pendingReceipts.length, walletNumbers]);

  const activeTabDescription = useMemo(() => {
    switch (activeTab) {
      case "wallets":
        return "إدارة وسائل الدفع اليدوي وتفعيلها أو تعديلها من شاشة واحدة أوضح على الموبايل.";
      case "receipts":
        return "مراجعة الإيصالات المرسلة بسرعة مع تجربة عرض أنسب للمحمول وسهلة الصيانة.";
      case "companies":
        return "متابعة أرصدة الشركات والبحث عنها وإضافة الرصيد بدون الاعتماد على جداول MUI القديمة.";
      default:
        return "";
    }
  }, [activeTab]);

  const updateWalletForm = (field: keyof WalletFormState, value: string) => {
    setWalletForm((current) => ({ ...current, [field]: value }));
  };

  const updateFundsForm = (field: keyof FundsFormState, value: string) => {
    setFundsForm((current) => ({ ...current, [field]: value }));
  };

  const openCreateWallet = () => {
    setEditingWallet(null);
    setWalletForm(INITIAL_WALLET_FORM);
    setWalletDialogOpen(true);
  };

  const openEditWallet = (wallet: WalletNumberRecord) => {
    setEditingWallet(wallet);
    setWalletForm({
      name: wallet.name ?? "",
      number: wallet.number ?? "",
      icon: wallet.icon ?? "",
      color: wallet.color ?? "#1d4ed8",
    });
    setWalletDialogOpen(true);
  };

  const openReceiptDialog = (receipt: PendingReceiptRecord) => {
    setSelectedReceipt(receipt);
    setReceiptDialogOpen(true);
  };

  const openAddFundsDialog = (wallet: CompanyWalletRecord) => {
    setSelectedCompany(wallet);
    setFundsForm(INITIAL_FUNDS_FORM);
    setAddFundsDialogOpen(true);
  };

  const refreshCurrentTab = async () => {
    switch (activeTab) {
      case "wallets":
        await fetchWalletNumbers();
        return;
      case "receipts":
        await fetchPendingReceipts();
        return;
      case "companies":
        await fetchCompanyWallets();
        return;
      default:
        return;
    }
  };

  const handleSaveWallet = async () => {
    if (!walletForm.name.trim() || !walletForm.number.trim()) {
      tToast.error("WalletManagement.msg_9034");
      return;
    }

    setSavingWallet(true);

    try {
      if (editingWallet) {
        await apiClient.put(
          `/wallet-payment/admin/wallet-numbers/${editingWallet.id}`,
          {
            ...walletForm,
            isActive: editingWallet.isActive,
          },
        );
        tToast.success("WalletManagement.success_update_c3e3");
      } else {
        await apiClient.post("/wallet-payment/admin/wallet-numbers", walletForm);
        tToast.success("WalletManagement.msg_1efc");
      }

      setWalletDialogOpen(false);
      setEditingWallet(null);
      setWalletForm(INITIAL_WALLET_FORM);
      await fetchWalletNumbers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر حفظ بيانات المحفظة."));
    } finally {
      setSavingWallet(false);
    }
  };

  const handleToggleWallet = async (
    wallet: WalletNumberRecord,
    nextValue: boolean,
  ) => {
    setTogglingWalletId(wallet.id);

    try {
      await apiClient.put(`/wallet-payment/admin/wallet-numbers/${wallet.id}`, {
        name: wallet.name,
        number: wallet.number,
        isActive: nextValue,
        icon: wallet.icon ?? "",
        color: wallet.color ?? "#1d4ed8",
      });
      setWalletNumbers((current) =>
        current.map((entry) =>
          entry.id === wallet.id ? { ...entry, isActive: nextValue } : entry,
        ),
      );
      toast.success(nextValue ? "تم تفعيل المحفظة" : "تم إيقاف المحفظة");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر تحديث حالة المحفظة."));
    } finally {
      setTogglingWalletId(null);
    }
  };

  const handleDeleteWallet = async () => {
    if (!walletPendingDelete) {
      return;
    }

    setDeletingWallet(true);

    try {
      await apiClient.delete(
        `/wallet-payment/admin/wallet-numbers/${walletPendingDelete.id}`,
      );
      tToast.success("WalletManagement.success_delete_cda7");
      setWalletPendingDelete(null);
      await fetchWalletNumbers();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر حذف المحفظة."));
    } finally {
      setDeletingWallet(false);
    }
  };

  const handleReviewReceipt = async (decision: "approve" | "reject") => {
    if (!selectedReceipt?.id) {
      return;
    }

    setReviewingReceipt(true);

    try {
      await apiClient.post(
        `/wallet-payment/admin/review-receipt/${selectedReceipt.id}`,
        {
          action: decision,
          notes: "",
        },
      );
      toast.success(
        decision === "approve"
          ? "تم اعتماد الإيصال بنجاح"
          : "تم رفض الإيصال بنجاح",
      );
      setReceiptDialogOpen(false);
      setSelectedReceipt(null);
      await fetchPendingReceipts();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر تحديث حالة الإيصال."));
    } finally {
      setReviewingReceipt(false);
    }
  };

  const handleAddFunds = async () => {
    if (!selectedCompany) {
      return;
    }

    const amount = Number(fundsForm.amount);
    const bonus = fundsForm.bonus ? Number(fundsForm.bonus) : 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      tToast.error("WalletManagement.msg_834a");
      return;
    }

    if (!Number.isFinite(bonus) || bonus < 0) {
      tToast.error("WalletManagement.msg_2a19");
      return;
    }

    setAddingFunds(true);

    try {
      await apiClient.post("/admin/wallet/add-funds", {
        companyId: selectedCompany.companyId,
        amount,
        bonus,
        notes: fundsForm.notes,
      });
      tToast.success("WalletManagement.success_add_ca6f");
      setAddFundsDialogOpen(false);
      setSelectedCompany(null);
      setFundsForm(INITIAL_FUNDS_FORM);
      await fetchCompanyWallets();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر إضافة الرصيد للشركة."));
    } finally {
      setAddingFunds(false);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Landmark className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                إدارة المحافظ والمدفوعات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {walletNumbers.filter(w => w.isActive).length} محفظة نشطة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTabDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshCurrentTab()}
            disabled={loadingState[activeTab]}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            {loadingState[activeTab] ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            <span>تحديث البيانات</span>
          </Button>
        </div>
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">أرقام المحافظ</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {walletNumbers.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
            {walletNumbers.filter(w => w.isActive).length} نشطة
          </p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المحافظ المفعلة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {walletNumbers.filter(w => w.isActive).length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">وسائل دفع جاهزة</p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">الإيصالات المعلقة</span>
            <span className={cn("size-1.5 rounded-full", pendingReceipts.length > 0 ? "bg-amber-500" : "bg-emerald-500")} />
          </div>
          <div className="mt-2">
            <span className={cn(
              "text-xl font-bold font-mono tabular-nums tracking-tight",
              pendingReceipts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
            )}>
              {pendingReceipts.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
            {pendingReceipts.length > 0 ? "تحتاج اعتمادًا" : "مراجعة مكتملة"}
          </p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">أرصدة الشركات</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {companiesLoaded ? formatCurrency(companyBalanceTotal) : "—"}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">إجمالي الرصيد المتاح</p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as WalletTab)}
        className="w-full space-y-4"
      >
        <TabsList className="flex items-center gap-1 border-b border-border/60 pb-1 overflow-x-auto no-scrollbar bg-transparent h-auto p-0 justify-start w-full">
          <TabsTrigger
            value="wallets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground"
          >
            <CreditCard className="size-3.5" />
            <span>أرقام المحافظ</span>
          </TabsTrigger>
          <TabsTrigger
            value="receipts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground"
          >
            <ReceiptText className="size-3.5" />
            <span>الإيصالات المعلقة</span>
            {pendingReceipts.length > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-mono text-white">
                {pendingReceipts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="companies"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer data-[state=active]:bg-muted data-[state=active]:text-foreground data-[state=active]:font-semibold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-border/80 text-muted-foreground hover:text-foreground"
          >
            <Building2 className="size-3.5" />
            <span>محافظ الشركات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="outline-none">
          <WalletNumbersSection
            wallets={walletNumbers}
            loading={loadingState.wallets}
            error={sectionErrors.wallets}
            onCreateWallet={openCreateWallet}
            onEditWallet={openEditWallet}
            onToggleWallet={handleToggleWallet}
            onDeleteWallet={setWalletPendingDelete}
            togglingWalletId={togglingWalletId}
          />
        </TabsContent>

        <TabsContent value="receipts" className="outline-none">
          <PendingReceiptsSection
            receipts={pendingReceipts}
            loading={loadingState.receipts}
            error={sectionErrors.receipts}
            onOpenReceipt={openReceiptDialog}
          />
        </TabsContent>

        <TabsContent value="companies" className="outline-none">
          <CompanyWalletsSection
            companyWallets={filteredCompanyWallets}
            loading={loadingState.companies}
            error={sectionErrors.companies}
            searchValue={companySearch}
            onSearchChange={setCompanySearch}
            onOpenAddFunds={openAddFundsDialog}
            onClearSearch={() => setCompanySearch("")}
          />
        </TabsContent>
      </Tabs>

      <WalletNumberDialog
        open={walletDialogOpen}
        onOpenChange={(open) => {
          setWalletDialogOpen(open);
          if (!open) {
            setEditingWallet(null);
            setWalletForm(INITIAL_WALLET_FORM);
          }
        }}
        editingWallet={editingWallet}
        formData={walletForm}
        onChange={updateWalletForm}
        onSubmit={() => void handleSaveWallet()}
        saving={savingWallet}
      />

      <AddFundsDialog
        open={addFundsDialogOpen}
        onOpenChange={(open) => {
          setAddFundsDialogOpen(open);
          if (!open) {
            setSelectedCompany(null);
            setFundsForm(INITIAL_FUNDS_FORM);
          }
        }}
        company={selectedCompany}
        formData={fundsForm}
        onChange={updateFundsForm}
        onSubmit={() => void handleAddFunds()}
        submitting={addingFunds}
      />

      <ReceiptReviewDialog
        open={receiptDialogOpen}
        onOpenChange={(open) => {
          setReceiptDialogOpen(open);
          if (!open) {
            setSelectedReceipt(null);
          }
        }}
        receipt={selectedReceipt}
        submitting={reviewingReceipt}
        onDecision={(decision) => void handleReviewReceipt(decision)}
      />

      <AlertDialog
        open={Boolean(walletPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setWalletPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>حذف المحفظة</AlertDialogTitle>
            <AlertDialogDescription>
              {walletPendingDelete
                ? `سيتم حذف ${walletPendingDelete.name} نهائيًا من قائمة المحافظ المعتمدة.`
                : "سيتم حذف هذه المحفظة نهائيًا."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingWallet}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingWallet}
              onClick={() => void handleDeleteWallet()}
            >
              {deletingWallet ? <Loader2 className="size-4 animate-spin" /> : null}
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WalletManagement;
