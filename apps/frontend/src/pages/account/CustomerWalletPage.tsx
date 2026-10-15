import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock3,
  CreditCard,
  Gift,
  Sparkles,
  Wallet as WalletIcon,
  RotateCw,
  TrendingUp,
  Receipt
} from "lucide-react";

import { apiClient } from "../../services/apiClient";

type CustomerWalletData = {
  id: string;
  balance: number;
  totalEarned?: number;
  totalSpent?: number;
  totalCashback?: number;
  currency?: string;
};

type CustomerWalletTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  description: string;
  createdAt: string;
  orderId?: string | null;
};

const transactionIcons: Record<string, typeof ArrowDownCircle> = {
  CASHBACK: Sparkles,
  REFUND: ArrowDownCircle,
  CREDIT: ArrowDownCircle,
  BONUS: Gift,
  DEBIT: ArrowUpCircle,
};

const positiveTypes = new Set(["CASHBACK", "REFUND", "CREDIT", "BONUS"]);

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = "EGP") =>
  `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState<CustomerWalletData | null>(null);
  const [transactions, setTransactions] = useState<CustomerWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [walletRes, transactionsRes] = await Promise.all([
        apiClient.get("/wallet/my-wallet"),
        apiClient.get("/wallet/my-transactions?limit=20"),
      ]);

      const nextWallet = walletRes?.data?.data || null;
      const nextTransactions = transactionsRes?.data?.data?.transactions || [];

      setWallet(nextWallet);
      setTransactions(Array.isArray(nextTransactions) ? nextTransactions : []);
    } catch (loadError) {
      const err = loadError as {
        response?: { data?: { message?: string } };
      };
      console.error("Error loading customer wallet:", loadError);
      setError(err?.response?.data?.message || "تعذر تحميل بيانات المحفظة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const currency = wallet?.currency || "EGP";

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RotateCw className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-mono">جاري تحميل بيانات المحفظة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir="rtl">
      {/* 1. Header Banner & Current Balance Chassis */}
      <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2 text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <WalletIcon className="h-3.5 w-3.5" />
              <span>محفظة الرصيد والكاش باك</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              رصيدي ومكافآت الولاء
            </h1>
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
              سجل فوري للرصيد المتاح، عوائد الكاش باك المضافة من الطلبات المؤهلة، وتفاصيل العمليات المالية.
            </p>
          </div>

          <div className="flex flex-col items-start rounded-lg border border-border/60 bg-muted/30 p-5 text-right sm:items-end">
            <span className="text-xs font-medium text-muted-foreground">الرصيد المتاح للاستخدام</span>
            <div className="mt-1 flex items-baseline gap-1.5 font-mono text-3xl font-bold tracking-tight text-foreground">
              <span className="tabular-nums">{toNumber(wallet?.balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-sm font-normal text-muted-foreground">{currency}</span>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* 2. KPI Telemetry Ribbon */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي الكاش باك المكتسب</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-pink-500/20 bg-pink-500/10 text-pink-500">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">
            {formatMoney(toNumber(wallet?.totalCashback), currency)}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>إجمالي الأرباح والمكافآت</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <Gift className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">
            {formatMoney(toNumber(wallet?.totalEarned), currency)}
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الرصيد المستخدم في الشراء</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-500">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">
            {formatMoney(toNumber(wallet?.totalSpent), currency)}
          </div>
        </div>
      </div>

      {/* 3. Transactions Ledger Chassis */}
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">سجل الحركات المالية</h2>
          </div>
          <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
            {transactions.length} عملية
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            لا توجد حركات مسجلة على المحفظة حتى الآن.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map((tx) => {
              const Icon = transactionIcons[tx.type] || Clock3;
              const isPositive = positiveTypes.has(tx.type);

              return (
                <div
                  key={tx.id}
                  className="flex flex-col gap-3 p-4 transition-colors hover:bg-muted/10 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        isPositive
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-500"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 text-right">
                      <div className="text-xs font-semibold text-foreground">
                        {tx.description || "حركة على المحفظة"}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">
                          {new Intl.DateTimeFormat("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(tx.createdAt))}
                        </span>
                        {tx.orderId ? (
                          <>
                            <span>•</span>
                            <span>الطلب: <span className="font-mono font-medium">{tx.orderId}</span></span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div
                      className={`font-mono text-sm font-bold tabular-nums ${
                        isPositive ? "text-emerald-500" : "text-rose-500"
                      }`}
                      dir="ltr"
                    >
                      {isPositive ? "+" : "-"}
                      {formatMoney(toNumber(tx.amount), currency)}
                    </div>
                    {tx.balanceAfter !== undefined && (
                      <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        الرصيد بعد: {formatMoney(toNumber(tx.balanceAfter), currency)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
