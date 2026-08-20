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

const transactionStyles: Record<string, string> = {
  CASHBACK: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  REFUND: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CREDIT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  BONUS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  DEBIT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const positiveTypes = new Set(["CASHBACK", "REFUND", "CREDIT", "BONUS"]);

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number, currency = "EGP") =>
  `${value.toFixed(2)} ${currency}`;

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState<CustomerWalletData | null>(null);
  const [transactions, setTransactions] = useState<CustomerWalletTransaction[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
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
        const error = loadError as {
          response?: { data?: { message?: string } };
        };
        console.error("Error loading customer wallet:", loadError);
        setError(
          error?.response?.data?.message || "╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪¡┘ü╪╕╪⌐",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const currency = wallet?.currency || "EGP";

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-gray-600 dark:text-gray-300">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
          <p className="mt-4">╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ┘à╪¡┘ü╪╕╪¬┘â...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-3xl bg-gradient-to-r from-pink-600 to-rose-600 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <WalletIcon size={14} />
              ┘à╪¡┘ü╪╕╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í
            </div>
            <h1 className="mt-4 text-3xl font-black">┘à╪¡┘ü╪╕╪¬┘è ┘ê╪º┘ä┘â╪º╪┤ ╪¿╪º┘â</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/85">
              ╪▒╪╡┘è╪»┘â ╪º┘ä┘à╪¬╪º╪¡╪î ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â ╪º┘ä┘à╪╢╪º┘ü ┘à┘å ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪ñ┘ç┘ä╪⌐╪î ┘ê╪ó╪«╪▒ ╪º┘ä╪¡╪▒┘â╪º╪¬
              ╪╣┘ä┘ë ┘à╪¡┘ü╪╕╪¬┘â.
            </p>
          </div>

          <div className="rounded-3xl bg-white/15 px-6 py-5 text-right backdrop-blur-sm">
            <div className="text-sm text-white/80">╪º┘ä╪▒╪╡┘è╪» ╪º┘ä╪¡╪º┘ä┘è</div>
            <div className="mt-2 text-4xl font-black">
              {formatMoney(toNumber(wallet?.balance), currency)}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-right shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-end gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            ╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â
            <Sparkles size={16} className="text-pink-500" />
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
            {formatMoney(toNumber(wallet?.totalCashback), currency)}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-right shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-end gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            ╪Ñ╪¼┘à╪º┘ä┘è ┘à╪º ┘â╪│╪¿╪¬┘ç
            <Gift size={16} className="text-amber-500" />
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
            {formatMoney(toNumber(wallet?.totalEarned), currency)}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 text-right shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-end gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
            ╪Ñ╪¼┘à╪º┘ä┘è ┘à╪º ╪ú┘å┘ü┘é╪¬┘ç
            <CreditCard size={16} className="text-red-500" />
          </div>
          <div className="mt-3 text-2xl font-black text-gray-900 dark:text-white">
            {formatMoney(toNumber(wallet?.totalSpent), currency)}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            {transactions.length} ╪¡╪▒┘â╪⌐
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              ╪ó╪«╪▒ ╪º┘ä╪¡╪▒┘â╪º╪¬
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              ╪▒╪º╪¼╪╣ ╪╣┘à┘ä┘è╪º╪¬ ╪º┘ä┘â╪º╪┤ ╪¿╪º┘â╪î ╪º┘ä╪º╪│╪¬╪▒╪¼╪º╪╣╪î ┘ê╪º╪│╪¬╪«╪»╪º┘à ╪º┘ä╪▒╪╡┘è╪» ╪»╪º╪«┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
            ┘ä╪º ╪¬┘ê╪¼╪» ╪¡╪▒┘â╪º╪¬ ╪╣┘ä┘ë ╪º┘ä┘à╪¡┘ü╪╕╪⌐ ╪¿╪╣╪».
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {transactions.map((transaction) => {
              const Icon = transactionIcons[transaction.type] || Clock3;
              const style =
                transactionStyles[transaction.type] ||
                "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200";
              const isPositive = positiveTypes.has(transaction.type);

              return (
                <div
                  key={transaction.id}
                  className="rounded-3xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start justify-end gap-3 text-right">
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">
                          {transaction.description || "╪¡╪▒┘â╪⌐ ╪╣┘ä┘ë ╪º┘ä┘à╪¡┘ü╪╕╪⌐"}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {new Intl.DateTimeFormat("ar-EG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(transaction.createdAt))}
                        </div>
                        {transaction.orderId ? (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            ┘à╪▒╪¼╪╣ ╪º┘ä╪╖┘ä╪¿: {transaction.orderId}
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style}`}
                      >
                        <Icon size={18} />
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-xl font-black ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isPositive ? "+" : "-"}
                        {formatMoney(toNumber(transaction.amount), currency)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        ╪º┘ä╪▒╪╡┘è╪» ╪¿╪╣╪» ╪º┘ä╪¡╪▒┘â╪⌐:{" "}
                        {formatMoney(
                          toNumber(transaction.balanceAfter),
                          currency,
                        )}
                      </div>
                    </div>
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
