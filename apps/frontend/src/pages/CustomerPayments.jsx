import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuthSimple";
import { apiClient } from "../services/apiClient";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { toast } from "sonner";

const CustomerPayments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState("");

  const [verifyingId, setVerifyingId] = useState(null);

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

  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");

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

  if (loading) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3 min-h-screen bg-background transition-colors duration-200">
      <h1 className="text-2xl font-bold mb-4">{t("billing.payments.title")}</h1>

      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

      {wallet && (
        <div className="rounded-xl border bg-card text-card-foreground p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("billing.payments.walletBalance")}</p>
              <p className="text-2xl font-bold">{toNumber(wallet.balance).toFixed(2)} {t("billing.payments.currency")}</p>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              {t("billing.payments.recharge")}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card text-card-foreground">
        <div className="p-4">
          <h2 className="text-base font-semibold mb-4">{t("billing.payments.transactionHistory")}</h2>
          {transactions.length === 0 ? (
            <Alert><AlertDescription>{t("billing.payments.noTransactions")}</AlertDescription></Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("billing.payments.description")}</TableHead>
                  <TableHead>{t("billing.payments.amount")}</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>{t("billing.payments.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="max-w-xs truncate">{tx.description || tx.paymentNumber || "-"}</TableCell>
                    <TableCell className={`font-bold tabular-nums ${toNumber(tx.amount) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {toNumber(tx.amount) >= 0 ? "+" : ""}{toNumber(tx.amount).toFixed(2)} {t("billing.payments.currency")}
                    </TableCell>
                    <TableCell>
                      {tx.status === "COMPLETED" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          مكتملة
                        </span>
                      ) : tx.status === "PENDING" ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            قيد المعالجة
                          </span>
                          {tx.referenceId && (
                            <button
                              type="button"
                              onClick={() => handleVerifyPending(tx)}
                              disabled={verifyingId === tx.id}
                              className="text-xs text-primary hover:underline font-medium disabled:opacity-50"
                            >
                              {verifyingId === tx.id ? "جاري الفحص..." : "تأكيد الدفع"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                          {tx.status || "ملغية"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tx.createdAt ? formatDate(tx.createdAt) : t("billing.payments.notSpecified")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t("billing.payments.rechargeWallet")}</h2>
              <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(""); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder={t("billing.payments.amountPlaceholder")}
              min="1"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-4 focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <button
              onClick={handleRecharge}
              disabled={recharging || !rechargeAmount}
              className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white px-4 py-3 rounded-xl font-bold transition"
            >
              {recharging ? t("billing.payments.recharging") : t("billing.payments.confirmRecharge")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPayments;
