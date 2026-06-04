import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Wallet as WalletIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Zap,
  Gift,
  FileText,
  Sparkles,
  Upload,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../hooks/useAuthSimple";

interface WalletData {
  id: string;
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  totalRefunded: number;
  totalCashback?: number;
  currency: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  paymentMethod?: string;
}

interface BillingSummary {
  period: { start: string; end: string };
  costs: { subscriptions: number; usage: number; total: number };
  wallet: { balance: number; currency: string };
  activeApps: number;
  usageBreakdown: any[];
}

interface WalletNumber {
  id: string;
  name: string;
  number: string;
  icon?: string;
  color?: string;
}


const transactionIcons: Record<string, any> = {
  DEPOSIT: ArrowDownRight,
  DEDUCT: ArrowUpRight,
  REFUND: ArrowDownRight,
  BONUS: Gift,
  ADJUSTMENT: Zap,
  CASHBACK: Sparkles,
};

const transactionColors: Record<string, string> = {
  DEPOSIT: "text-green-600 bg-green-100 dark:bg-green-900/30",
  DEDUCT: "text-red-600 bg-red-100 dark:bg-red-900/30",
  REFUND: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
  BONUS: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30",
  ADJUSTMENT: "text-purple-600 bg-purple-100 dark:bg-purple-900/30",
  CASHBACK: "text-pink-600 bg-pink-100 dark:bg-pink-900/30",
};

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return parseFloat(value.toString()) || 0;
};


export default function Wallet() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt upload modal
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [walletNumbers, setWalletNumbers] = useState<WalletNumber[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasCompany = !!(user?.companyId && user.companyId !== "null" && user.companyId !== "undefined");

  useEffect(() => {
    if (hasCompany) {
      fetchWalletData();
    } else {
      setLoading(false);
    }
  }, [hasCompany]);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [walletRes, transactionsRes, summaryRes] = await Promise.allSettled([
        apiClient.get("/wallet/balance"),
        apiClient.get("/wallet/transactions?limit=20"),
        apiClient.get("/wallet/billing/summary"),
      ]);

      if (walletRes.status === "fulfilled") {
        setWallet(walletRes.value.data.data);
      }
      if (transactionsRes.status === "fulfilled") {
        const td = transactionsRes.value.data.data;
        setTransactions(Array.isArray(td) ? td : td?.transactions || td?.data || []);
      }
      if (summaryRes.status === "fulfilled") {
        setBillingSummary(summaryRes.value.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching wallet data:", error);
      setError("خطأ في جلب بيانات المحفظة");
    } finally {
      setLoading(false);
    }
  };

  const openRechargeModal = async () => {
    setShowRechargeModal(true);
    if (walletNumbers.length === 0) {
      try {
        setLoadingWallets(true);
        const res = await apiClient.get("/wallet-payment/wallet-numbers");
        if (res.data.success) setWalletNumbers(res.data.data || []);
      } catch {
        toast.error("تعذر تحميل أرقام المحافظ");
      } finally {
        setLoadingWallets(false);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يجب أن يكون الملف صورة");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 5 ميغابايت");
      return;
    }
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => setReceiptPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitReceipt = async () => {
    if (!selectedWalletId) { toast.error("اختر رقم المحفظة"); return; }
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) { toast.error("أدخل مبلغاً صحيحاً"); return; }
    if (!receiptFile) { toast.error("ارفع صورة الإيصال"); return; }

    try {
      setSubmitting(true);

      // Find or create an invoice first (using subscriptionId 'none' as a general deposit purpose)
      const formData = new FormData();
      formData.append("walletNumberId", selectedWalletId);
      formData.append("amount", rechargeAmount);
      formData.append("purpose", "wallet_recharge");
      formData.append("receipt", receiptFile);

      // Submit using the subscription renewal flow — we create a general recharge invoice
      const res = await apiClient.post("/wallet-payment/submit-receipt", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("تم إرسال إيصال الشحن بنجاح! سيتم مراجعته قريباً 📋");
        setShowRechargeModal(false);
        setReceiptFile(null);
        setReceiptPreview(null);
        setRechargeAmount("");
        setSelectedWalletId("");
        fetchWalletData();
      } else {
        toast.error(res.data.message || "حدث خطأ أثناء إرسال الإيصال");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إرسال الإيصال");
    } finally {
      setSubmitting(false);
    }
  };

  const getBonusInfo = (amount: number) => {
    if (amount >= 5000) return { percentage: 30, bonus: amount * 0.3 };
    if (amount >= 1000) return { percentage: 20, bonus: amount * 0.2 };
    if (amount >= 500) return { percentage: 15, bonus: amount * 0.15 };
    if (amount >= 100) return { percentage: 10, bonus: amount * 0.1 };
    return { percentage: 0, bonus: 0 };
  };

  // ─────────────── Guard: no companyId ───────────────
  if (!hasCompany && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 max-w-md text-center">
          <WalletIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">المحفظة غير متاحة</h2>
          <p className="text-gray-500 dark:text-gray-400">
            هذه الصفحة مخصصة للشركات المشتركة. حسابك لا يملك محفظة مرتبطة.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600 dark:text-gray-400 mt-4">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const currentAmount = parseFloat(rechargeAmount) || 0;
  const bonusInfo = getBonusInfo(currentAmount);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
              <WalletIcon size={40} />
              المحفظة والفواتير
            </h1>
            <p className="text-xl text-green-100">إدارة رصيدك ومتابعة مصروفاتك</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={fetchWalletData} className="ml-auto text-sm underline">إعادة المحاولة</button>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-blue-100 mb-2">رصيد المحفظة</p>
              <div className="text-5xl font-bold">
                {toNumber(wallet?.balance).toFixed(2)} {wallet?.currency || "ج.م"}
              </div>
            </div>
            <button
              onClick={openRechargeModal}
              className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 shadow"
            >
              <CreditCard size={20} />
              شحن المحفظة
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "إجمالي الشحن", icon: TrendingDown, value: toNumber(wallet?.totalDeposited).toFixed(2) },
              { label: "إجمالي المصروفات", icon: TrendingUp, value: toNumber(wallet?.totalSpent).toFixed(2) },
              { label: "المسترجع", icon: Gift, value: toNumber(wallet?.totalRefunded).toFixed(2) },
              { label: "مكافآت الكاش باك", icon: Sparkles, value: toNumber(wallet?.totalCashback).toFixed(2), highlight: true },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className={`flex items-center gap-2 mb-2 ${stat.highlight ? "text-pink-200" : "text-blue-100"}`}>
                  <stat.icon size={16} />
                  <span className="text-sm">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.highlight ? "text-pink-200" : ""}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Summary */}
            {billingSummary && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <Calendar size={24} />
                  ملخص هذا الشهر
                </h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "الاشتراكات", value: billingSummary.costs.subscriptions, color: "blue" },
                    { label: "الاستخدام", value: toNumber(billingSummary.costs.usage).toFixed(2), color: "purple" },
                    { label: "الإجمالي", value: toNumber(billingSummary.costs.total).toFixed(2), color: "green", bold: true },
                  ].map((item) => (
                    <div key={item.label} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-lg p-4`}>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{item.label}</div>
                      <div className={`text-2xl font-bold ${item.bold ? `text-${item.color}-600` : "text-gray-900 dark:text-white"}`}>
                        {item.value} ج
                      </div>
                    </div>
                  ))}
                </div>

                {billingSummary.usageBreakdown.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">تفاصيل الاستخدام:</h3>
                    <div className="space-y-2">
                      {billingSummary.usageBreakdown.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{item.feature}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{item._sum?.quantity} عملية</div>
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {toNumber(item._sum?.totalCost).toFixed(2)} ج
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transactions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText size={24} />
                  آخر الحركات
                </h2>
                <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  {transactions.length} حركة
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                  <DollarSign size={40} className="mx-auto mb-3 opacity-40" />
                  <p>لا توجد حركات في المحفظة بعد</p>
                  <p className="text-sm mt-1">قم بشحن المحفظة لتظهر هنا معاملاتك</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => {
                    const Icon = transactionIcons[tx.type] || DollarSign;
                    const colorClass = transactionColors[tx.type] || "text-gray-600 bg-gray-100";
                    const isPositive = ["DEPOSIT", "REFUND", "BONUS", "CASHBACK", "ADJUSTMENT"].includes(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{tx.description}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(tx.createdAt).toLocaleString("ar-EG")}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                            {isPositive ? "+" : "-"}{toNumber(tx.amount).toFixed(2)} ج
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            الرصيد: {toNumber(tx.balanceAfter).toFixed(2)} ج
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">إجراءات سريعة</h3>
              <div className="space-y-3">
                <button onClick={() => navigate("/my-apps")} className="w-full bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Package size={18} /> أدواتي المفعلة
                </button>
                <button onClick={() => navigate("/marketplace")} className="w-full bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Zap size={18} /> تصفح Marketplace
                </button>
                <button className="w-full bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2">
                  <Download size={18} /> تحميل الفواتير
                </button>
              </div>
            </div>

            {/* Bonus Packages */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-400 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Gift size={20} className="text-yellow-600" /> باقات الشحن
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  { range: "100 - 499 ج", bonus: "بونص 10%" },
                  { range: "500 - 999 ج", bonus: "بونص 15%" },
                  { range: "1000 - 4999 ج", bonus: "بونص 20%" },
                  { range: "5000+ ج", bonus: "بونص 30%" },
                ].map((p) => (
                  <div key={p.range} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">{p.range}</span>
                    <span className="font-bold text-yellow-600">{p.bonus}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Wallet Balance indicator */}
            {wallet && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">حالة الرصيد</h3>
                <div className={`text-2xl font-bold mb-1 ${toNumber(wallet.balance) > 0 ? "text-green-600" : "text-red-600"}`}>
                  {toNumber(wallet.balance).toFixed(2)} ج
                </div>
                {toNumber(wallet.balance) <= 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
                    <AlertCircle size={16} /> الرصيد منخفض — قم بالشحن لتجنب توقف الخدمات
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Recharge Receipt Modal ─── */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Upload size={24} /> شحن المحفظة
              </h2>
              <button onClick={() => { setShowRechargeModal(false); setReceiptFile(null); setReceiptPreview(null); }} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Steps explanation */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-2">📋 كيفية الشحن:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>حوّل المبلغ على أحد أرقام المحافظ أدناه</li>
                <li>التقط صورة للإيصال وارفعها هنا</li>
                <li>سيتم مراجعة الطلب وإضافة الرصيد خلال ساعات</li>
              </ol>
            </div>

            {/* Wallet Number Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                اختر رقم المحفظة *
              </label>
              {loadingWallets ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm py-3">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  جاري تحميل أرقام المحافظ...
                </div>
              ) : walletNumbers.length === 0 ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ لا توجد أرقام محافظ مضافة بعد. يرجى التواصل مع الإدارة.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {walletNumbers.map((wn) => (
                    <button
                      key={wn.id}
                      type="button"
                      onClick={() => setSelectedWalletId(wn.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${selectedWalletId === wn.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-600 hover:border-gray-400"}`}
                    >
                      <span className="text-2xl">{wn.icon || "💳"}</span>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{wn.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{wn.number}</div>
                      </div>
                      {selectedWalletId === wn.id && <CheckCircle size={20} className="text-blue-500 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                المبلغ المحوَّل (جنيه مصري) *
              </label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="مثلاً: 500"
                min="1"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {bonusInfo.bonus > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg text-sm">
                  <span className="text-yellow-700 dark:text-yellow-400 font-medium">🎁 ستحصل على بونص {bonusInfo.percentage}% = </span>
                  <span className="font-bold text-yellow-600">{bonusInfo.bonus.toFixed(2)} ج إضافية!</span>
                </div>
              )}
            </div>

            {/* Receipt Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                صورة إيصال التحويل *
              </label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {receiptPreview ? (
                <div className="relative">
                  <img src={receiptPreview} alt="إيصال التحويل" className="w-full h-48 object-cover rounded-lg border-2 border-dashed border-blue-400" />
                  <button
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg leading-none hover:bg-red-600"
                  >×</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  <ImageIcon size={32} />
                  <span className="text-sm">انقر لرفع صورة الإيصال</span>
                  <span className="text-xs text-gray-400">PNG، JPG، JPEG · حد أقصى 5 ميغابايت</span>
                </button>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRechargeModal(false); setReceiptFile(null); setReceiptPreview(null); setRechargeAmount(""); setSelectedWalletId(""); }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-3 rounded-lg font-semibold transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitReceipt}
                disabled={submitting || !selectedWalletId || !rechargeAmount || !receiptFile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري الإرسال...</>
                ) : (
                  <><Upload size={18} /> إرسال الإيصال</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
