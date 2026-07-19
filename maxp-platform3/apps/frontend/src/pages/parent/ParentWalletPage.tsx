import React, { useEffect, useState } from "react";
import { Wallet, Plus } from "lucide-react";

const ParentWalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('parentToken');
      const res = await fetch('/api/v1/education/parent-portal/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setWallet(json.data.wallet);
        setTransactions(json.data.transactions);
      }
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleTopup = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    try {
      setSaving(true);
      setMessage("");
      const token = localStorage.getItem('parentToken');
      const res = await fetch('/api/v1/education/parent-portal/wallet/topup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt })
      });
      const json = await res.json();
      if (json.success) {
        setMessage(`تم شحن ${amt} ج.م بنجاح`);
        setAmount("");
        setShowTopup(false);
        fetchWallet();
      } else setMessage(json.message || 'حدث خطأ');
    } catch { setMessage('فشل الاتصال'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;

  const typeLabels: Record<string, string> = { CREDIT: 'إيداع', DEBIT: 'خصم', CASHBACK: 'كاش باك', REFUND: 'استرجاع', REFERRAL_BONUS: 'مكافأة إحالة', REWARD: 'مكافأة', ADMIN_ADJUSTMENT: 'تعديل إداري' };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">المحفظة</h1>
        <button onClick={() => setShowTopup(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          <Plus size={18} /> شحن المحفظة
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('نجاح') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}

      {showTopup && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold mb-4">شحن المحفظة</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">المبلغ (ج.م)</label>
              <input type="number" min="1" className="w-full border rounded-lg px-3 py-2" value={amount} onChange={e => setAmount(e.target.value)} placeholder="أدخل المبلغ" />
            </div>
            <button onClick={handleTopup} disabled={saving || !amount} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {saving ? 'جاري...' : 'شحن'}
            </button>
            <button onClick={() => { setShowTopup(false); setAmount(""); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">إلغاء</button>
          </div>
        </div>
      )}

      {wallet && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-amber-100 rounded-full"><Wallet size={32} className="text-amber-600" /></div>
            <div>
              <p className="text-sm text-gray-500">الرصيد الحالي</p>
              <p className="text-3xl font-bold">{wallet.balance} <span className="text-lg font-normal text-gray-500">ج.م</span></p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t text-sm">
            <div><span className="text-gray-500">إجمالي المشحون:</span> <span className="font-semibold">{wallet.totalEarned} ج.م</span></div>
            <div><span className="text-gray-500">إجمالي المنصرف:</span> <span className="font-semibold">{wallet.totalSpent} ج.م</span></div>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">آخر المعاملات</h2>
      {transactions.length === 0 && <p className="text-gray-500">لا توجد معاملات</p>}
      <div className="space-y-2">
        {transactions.map((t: any) => (
          <div key={t.id} className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{t.description}</p>
              <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('ar-EG')}</p>
            </div>
            <div className="text-left">
              <span className={`font-bold ${t.type === 'CREDIT' || t.type === 'REFUND' || t.type === 'CASHBACK' ? 'text-green-600' : 'text-red-600'}`}>
                {t.type === 'CREDIT' || t.type === 'REFUND' || t.type === 'CASHBACK' ? '+' : '-'}{t.amount} ج.م
              </span>
              <p className="text-xs text-gray-400">{typeLabels[t.type] || t.type}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParentWalletPage;
