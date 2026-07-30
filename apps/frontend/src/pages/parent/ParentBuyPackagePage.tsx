import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Check, AlertTriangle } from 'lucide-react';

const ParentBuyPackagePage: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('parentToken');
        const [subRes, childRes, walRes] = await Promise.all([
          fetch('/api/v1/education/parent-portal/subjects', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/education/parent-portal/children', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/education/parent-portal/wallet', { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const [subJson, childJson, walJson] = await Promise.all([subRes.json(), childRes.json(), walRes.json()]);
        if (subJson.success) setSubjects(subJson.data);
        if (childJson.success) setChildren(childJson.data);
        if (walJson.success) setWallet(walJson.data.wallet);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const currentSubject = subjects.find(s => s.id === selectedSubject);
  const selectedPkg = currentSubject?.packages?.find((p: any) => p.id === selectedPackage);
  const canPurchase = selectedStudent && selectedPackage && wallet && wallet.balance >= (selectedPkg?.price || 0);

  const handlePurchase = async () => {
    if (!canPurchase) return;
    try {
      setPurchasing(true);
      setMessage(null);
      const token = localStorage.getItem('parentToken');
      const res = await fetch('/api/v1/education/parent-portal/purchase-package', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent, packageId: selectedPackage })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `تم شراء "${selectedPkg?.name}" للطالب بنجاح!` });
        setTimeout(() => navigate('/parent/enrollments'), 1500);
      } else {
        setMessage({ type: 'error', text: json.message || 'حدث خطأ في الشراء' });
      }
    } catch { setMessage({ type: 'error', text: 'فشل الاتصال' }); }
    finally { setPurchasing(false); }
  };

  if (loading) return <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">شراء باقة</h1>

      {wallet && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <span className="text-amber-800 font-medium">رصيد المحفظة</span>
          <span className="text-xl font-bold text-amber-900">{wallet.balance} ج.م</span>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">اختر الطالب</label>
          <select className="w-full border rounded-lg px-3 py-2.5" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
            <option value="">-- اختر الطالب --</option>
            {children.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">اختر المادة</label>
          <select className="w-full border rounded-lg px-3 py-2.5" value={selectedSubject} onChange={e => { setSelectedSubject(e.target.value); setSelectedPackage(""); }}>
            <option value="">-- اختر المادة --</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {currentSubject && (
          <div>
            <label className="block text-sm font-medium mb-2">اختر الباقة</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentSubject.packages?.map((pkg: any) => (
                <div key={pkg.id}
                  className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedPackage === pkg.id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedPackage(pkg.id)}>
                  <p className="font-semibold">{pkg.name}</p>
                  <p className="text-sm text-gray-500">{pkg.hoursCount} ساعة</p>
                  <p className="text-lg font-bold text-red-600 mt-1">{pkg.price} ج.م</p>
                </div>
              ))}
              {(!currentSubject.packages || currentSubject.packages.length === 0) && (
                <p className="text-gray-500 col-span-2">لا توجد باقات متاحة لهذه المادة</p>
              )}
            </div>
          </div>
        )}

        {selectedPkg && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>الباقة</span><span className="font-semibold">{selectedPkg.name}</span></div>
            <div className="flex justify-between text-sm"><span>الساعات</span><span className="font-semibold">{selectedPkg.hoursCount} س</span></div>
            <div className="flex justify-between text-sm"><span>السعر</span><span className="font-semibold">{selectedPkg.price} ج.م</span></div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span>الرصيد</span>
              <span className={`font-semibold ${(wallet?.balance || 0) >= selectedPkg.price ? 'text-green-600' : 'text-red-600'}`}>
                {wallet?.balance || 0} ج.م
              </span>
            </div>
            {wallet && wallet.balance < selectedPkg.price && (
              <p className="text-xs text-red-500">الرصيد غير كافٍ. قم بشحن المحفظة أولاً</p>
            )}
          </div>
        )}

        <button onClick={handlePurchase} disabled={!canPurchase || purchasing}
          className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {purchasing ? 'جاري الشراء...' : <><ShoppingCart size={20} /> تأكيد الشراء</>}
        </button>
      </div>
    </div>
  );
};

export default ParentBuyPackagePage;
