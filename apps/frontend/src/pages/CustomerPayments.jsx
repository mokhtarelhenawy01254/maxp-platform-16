import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuthSimple";
import { apiClient } from "../services/apiClient";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { toast } from "sonner";

const CustomerPayments = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchData(); }, []);

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
      setError("خطأ في الاتصال بالخادم");
    } finally { setLoading(false); }
  };

  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState("");

  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);
    if (!amount || amount <= 0) { toast.error("أدخل مبلغاً صحيحاً"); return; }
    setRecharging(true);
    try {
      const res = await apiClient.post("/wallet/kashier/create-session", { amount });
      if (res.data?.success && res.data?.data?.sessionUrl) {
        window.location.href = res.data.data.sessionUrl;
      } else {
        toast.error(res.data?.message || "فشل إنشاء جلسة الدفع");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "خطأ في الاتصال ببوابة الدفع");
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
      <h1 className="text-2xl font-bold mb-4">المدفوعات</h1>

      {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}

      {wallet && (
        <div className="rounded-xl border bg-card text-card-foreground p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">رصيد المحفظة</p>
              <p className="text-2xl font-bold">{toNumber(wallet.balance).toFixed(2)} ج.م</p>
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              شحن
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card text-card-foreground">
        <div className="p-4">
          <h2 className="text-base font-semibold mb-4">سجل الحركات</h2>
          {transactions.length === 0 ? (
            <Alert><AlertDescription>لا توجد حركات حالياً</AlertDescription></Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوصف</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.description || tx.paymentNumber || "-"}</TableCell>
                    <TableCell className="font-bold text-green-600 dark:text-green-400">
                      {toNumber(tx.amount) >= 0 ? "+" : ""}{toNumber(tx.amount).toFixed(2)} ج.م
                    </TableCell>
                    <TableCell>{tx.createdAt ? formatDate(tx.createdAt) : "غير محدد"}</TableCell>
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
              <h2 className="text-lg font-bold">شحن المحفظة</h2>
              <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(""); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder="المبلغ (جنيه)"
              min="1"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 mb-4 focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            <button
              onClick={handleRecharge}
              disabled={recharging || !rechargeAmount}
              className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white px-4 py-3 rounded-xl font-bold transition"
            >
              {recharging ? "جاري الشحن..." : "تأكيد الشحن"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPayments;
