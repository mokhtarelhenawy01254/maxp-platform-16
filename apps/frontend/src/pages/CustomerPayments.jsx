import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuthSimple";
import { apiClient } from "../services/apiClient";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { toast } from "sonner";
import { Wallet, CreditCard, ArrowUpRight, ArrowDownLeft, History, RefreshCw, Plus, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

const CustomerPayments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState("");
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");

  const [verifyingId, setVerifyingId] = useState(null);

  // Extract marketplace return context from URL query, router state, or sessionStorage
  const marketplaceContext = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const returnUrl = params.get("returnUrl") || location.state?.returnUrl || sessionStorage.getItem("marketplace_wallet_return_url");
    const requiredAmount = params.get("requiredAmount") || location.state?.requiredAmount || sessionStorage.getItem("marketplace_wallet_required_amount");
    const appName = params.get("appName") || location.state?.appName || sessionStorage.getItem("marketplace_wallet_app_name");
    const action = params.get("action") || location.state?.action;

    if (!returnUrl && !requiredAmount && !appName) {
      return null;
    }
    return {
      returnUrl,
      requiredAmount: requiredAmount ? Number(requiredAmount) : null,
      appName: appName || null,
      action: action || null
    };
  }, [location.search, location.state]);

  // Pre-fill recharge amount and auto-open modal if directed from marketplace
  useEffect(() => {
    if (marketplaceContext) {
      if (marketplaceContext.requiredAmount && !rechargeAmount) {
        setRechargeAmount(String(marketplaceContext.requiredAmount));
      }
      if (marketplaceContext.action === "recharge") {
        setShowRechargeModal(true);
      }
    }
  }, [marketplaceContext]);

  // Handle ESC key to close recharge modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && showRechargeModal) {
        setShowRechargeModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showRechargeModal]);

  useEffect(() => {
    const handleReturnParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = (params.get("paymentStatus") || params.get("status") || "").toUpperCase();
      const orderId = params.get("orderId") || params.get("merchantOrderId") || params.get("order");
      const sessionId = params.get("sessionId");

      if (orderId || sessionId || paymentStatus) {
        window.history.replaceState({}, "", window.location.pathname);

        if (paymentStatus === "FAILED" || paymentStatus === "CANCELLED" || paymentStatus === "REJECTED") {
          toast.error(t("billing.payments.paymentFailed") || "فشلت عملية الدفع، يرجى المحاولة مرة أخرى");
        } else if (orderId || sessionId) {
          const toastId = toast.loading(t("billing.payments.verifyingPayment") || "جاري التحقق من عملية الدفع وتأكيد الرصيد...");
          try {
            const res = await apiClient.post("/wallet/kashier/verify-session", { orderId, sessionId });
            if (res.data?.success && res.data?.verified) {
              toast.success(res.data?.message || t("billing.payments.paymentSuccess") || "تم تأكيد عملية الدفع بنجاح وإيداع الرصيد في محفظتك", { id: toastId });
            } else if (res.data?.status === "FAILED") {
              toast.error(res.data?.message || t("billing.payments.paymentFailed") || "فشلت عملية الدفع لدى بوابة كاشير", { id: toastId });
            } else {
              toast.info(res.data?.message || "عملية الدفع قيد المعالجة، سيتم تحديث الرصيد تلقائياً", { id: toastId });
            }
          } catch {
            toast.dismiss(toastId);
            if (paymentStatus === "SUCCESS" || paymentStatus === "CAPTURED") {
              toast.success(t("billing.payments.paymentSuccess") || "تم استلام الدفع بنجاح");
            }
          }
        } else if (paymentStatus === "SUCCESS" || paymentStatus === "CAPTURED") {
          toast.success(t("billing.payments.paymentSuccess") || "تم تأكيد عملية الدفع بنجاح وإيداع الرصيد في محفظتك");
        }

        const pendingReturnUrl = sessionStorage.getItem("marketplace_wallet_return_url");
        const isSuccessPayment = (paymentStatus === "SUCCESS" || paymentStatus === "CAPTURED");
        if (isSuccessPayment && pendingReturnUrl) {
          const target = pendingReturnUrl.includes("?") ? `${pendingReturnUrl}&recharged=true` : `${pendingReturnUrl}?recharged=true`;
          toast.success("تم إيداع الرصيد بنجاح! جاري إعادتك لتطبيق الماركت بليس لإكمال التفعيل...", {
            duration: 4000,
            action: {
              label: "العودة للتفعيل",
              onClick: () => navigate(target)
            }
          });
          setTimeout(() => navigate(target), 1200);
        }
      }

      await fetchData();
    };

    handleReturnParams();
  }, []);

  const handleVerifyPending = async (tx) => {
    if (!tx?.referenceId) return;
    setVerifyingId(tx.id);
    const toastId = toast.loading("جاري فحص حالة المعاملة لدى كاشير...");
    try {
      const res = await apiClient.post("/wallet/kashier/verify-session", { orderId: tx.referenceId });
      if (res.data?.success && res.data?.verified) {
        toast.success(res.data?.message || "تم تأكيد الدفع وإيداع الرصيد في المحفظة", { id: toastId });
        await fetchData();
      } else {
        toast.info(res.data?.message || "المعاملة لم تكتمل بعد لدى بوابة الدفع", { id: toastId });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "تعذر التحقق من حالة المعاملة", { id: toastId });
    } finally {
      setVerifyingId(null);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletRes, txRes] = await Promise.allSettled([
        apiClient.get("/wallet/balance"),
        apiClient.get("/wallet/transactions?limit=20"),
      ]);
      if (walletRes.status === "fulfilled") setWallet(walletRes.value.data.data);
      if (txRes.status === "fulfilled") {
        const td = txRes.value.data.data;
        setTransactions(Array.isArray(td) ? td : td?.transactions || td?.data || []);
      }
    } catch (err) {
      console.error("خطأ في جلب البيانات:", err);
      setError(t("billing.payments.serverError"));
    } finally { setLoading(false); }
  };

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) { toast.error(t("billing.payments.enterValidAmount")); return; }
    setRecharging(true);
    try {
      const res = await apiClient.post("/wallet/kashier/create-session", { amount });
      if (res.data?.success && res.data?.data?.sessionUrl) {
        window.location.href = res.data.data.sessionUrl;
      } else {
        toast.error(res.data?.message || t("billing.payments.sessionFailed"));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t("billing.payments.gatewayError"));
    } finally {
      setRecharging(false);
    }
  };

  const toNumber = (v) => v === null || v === undefined ? 0 : typeof v === "number" ? v : parseFloat(v.toString()) || 0;
  const formatCurrency = (amount) => new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(amount);
  const formatDate = (d) => new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const transactionStats = useMemo(() => {
    const total = transactions.length;
    const completed = transactions.filter((t) => t.status === "COMPLETED").length;
    const pending = transactions.filter((t) => t.status === "PENDING").length;
    return { total, completed, pending };
  }, [transactions]);

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="w-full space-y-4">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Wallet className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {t("billing.payments.title")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                محفظة الدفع الإلكتروني
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              سجل المعاملات المالية والشحن الفوري عبر بوابات الدفع المعتمدة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRechargeModal(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.98] transition-all shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>{t("billing.payments.recharge")}</span>
          </button>
        </div>
      </div>

      {marketplaceContext && marketplaceContext.returnUrl && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 text-card-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              ⚡
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {marketplaceContext.appName ? `تفعيل تطبيق: ${marketplaceContext.appName}` : "تفعيل تطبيق الماركت بليس"}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {marketplaceContext.requiredAmount
                  ? `المبلغ المطلوب للتفعيل: ${marketplaceContext.requiredAmount} EGP — اشحن المحفظة ثم اضغط زر العودة للتفعيل مباشرة`
                  : "اشحن المحفظة ثم اضغط زر العودة لإكمال التفعيل بنقرة واحدة"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const target = marketplaceContext.returnUrl.includes("?")
                ? `${marketplaceContext.returnUrl}&recharged=true`
                : `${marketplaceContext.returnUrl}?recharged=true`;
              navigate(target);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition shrink-0"
          >
            <span>العودة لإكمال التفعيل</span>
            <span dir="ltr">←</span>
          </button>
        </div>
      )}

      {error && <Alert variant="destructive" className="py-2.5"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">{t("billing.payments.walletBalance")}</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {wallet ? toNumber(wallet.balance).toFixed(2) : "0.00"}{" "}
              <span className="text-xs font-sans text-muted-foreground font-normal">{t("billing.payments.currency")}</span>
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي المعاملات</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {transactionStats.total}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">معاملات مكتملة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {transactionStats.completed}
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">قيد المعالجة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {transactionStats.pending}
            </span>
          </div>
        </div>
      </div>

      {/* Transaction History Table Chassis */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t("billing.payments.transactionHistory")}</h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {transactions.length} سجل
          </span>
        </div>

        <div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              {t("billing.payments.noTransactions")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground">{t("billing.payments.description")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">{t("billing.payments.amount")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground text-end">{t("billing.payments.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/40">
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="max-w-xs truncate text-xs font-medium text-foreground">
                      {tx.description || tx.paymentNumber || "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "font-mono font-bold text-xs tabular-nums",
                      toNumber(tx.amount) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                    )}>
                      {toNumber(tx.amount) >= 0 ? "+" : ""}{toNumber(tx.amount).toFixed(2)} {t("billing.payments.currency")}
                    </TableCell>
                    <TableCell>
                      {tx.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 bg-emerald-500/10">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          مكتملة
                        </span>
                      ) : tx.status === "PENDING" ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-amber-700 dark:text-amber-400 border border-amber-500/20 bg-amber-500/10">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            قيد المعالجة
                          </span>
                          {tx.referenceId && (
                            <button
                              type="button"
                              onClick={() => handleVerifyPending(tx)}
                              disabled={verifyingId === tx.id}
                              className="text-xs text-primary hover:underline font-mono disabled:opacity-50 cursor-pointer"
                            >
                              {verifyingId === tx.id ? "جاري الفحص..." : "تأكيد الدفع"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-rose-700 dark:text-rose-400 border border-rose-500/20 bg-rose-500/10">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          {tx.status || "ملغية"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground tabular-nums text-end">
                      {tx.createdAt ? formatDate(tx.createdAt) : t("billing.payments.notSpecified")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {showRechargeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity overflow-y-auto"
          onClick={() => setShowRechargeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wallet-recharge-modal-title"
        >
          <div
            className="relative w-full max-w-sm my-auto bg-white dark:bg-[#18181b] rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-gray-100 transition-all"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="wallet-recharge-modal-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t("billing.payments.rechargeWallet") || "شحن المحفظة"}
              </h2>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                aria-label="إغلاق"
                className="text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100 text-2xl leading-none font-normal p-1 cursor-pointer transition"
              >
                &times;
              </button>
            </div>

            {wallet && (
              <div className="flex items-center justify-between px-3.5 py-2.5 mb-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  {t("billing.payments.walletBalance") || "الرصيد الحالي"}:
                </span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums text-sm">
                  {toNumber(wallet.balance).toFixed(2)} {t("billing.payments.currency") || "ج.م"}
                </span>
              </div>
            )}

            {marketplaceContext?.requiredAmount && (
              <div className="p-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between">
                <span className="text-muted-foreground">
                  {marketplaceContext.appName ? `مطلوب لتفعيل ${marketplaceContext.appName}:` : "المبلغ المطلوب للتفعيل:"}
                </span>
                <span className="font-bold text-primary tabular-nums text-sm">
                  {marketplaceContext.requiredAmount} {t("billing.payments.currency") || "ج.م"}
                </span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRecharge();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t("billing.payments.amount") || "مبلغ الشحن (جنيه)"}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder={t("billing.payments.amountPlaceholder") || "أدخل المبلغ..."}
                    min="1"
                    step="any"
                    autoFocus
                    className="w-full px-4 pe-12 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#121214] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500 pointer-events-none">
                    {t("billing.payments.currency") || "ج.م"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={recharging || !rechargeAmount || parseFloat(rechargeAmount) <= 0}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer text-sm shadow-sm active:scale-[0.98]"
              >
                {recharging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>{t("billing.payments.recharging") || "جاري التحويل لكاشير..."}</span>
                  </>
                ) : (
                  <span>{t("billing.payments.confirmRecharge") || "تأكيد الشحن"}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPayments;
