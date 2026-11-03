import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';
import { ShippingBranch, formatDate } from './shippingOpsShared';
import { BranchCustodyTab } from './branches/BranchCustodyTab';

export const BranchesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [branches, setBranches] = useState<ShippingBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'custody' | 'branches'>('custody');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<ShippingBranch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    code: '',
    governorate: 'القاهرة',
    address: '',
    phone: '',
    isActive: true,
  });

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/shipping-portal/branches?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches || []);
      }
    } catch {
      toast.error('فشل في جلب قائمة الفروع');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setForm({
      name: '',
      code: '',
      governorate: 'القاهرة',
      address: '',
      phone: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (b: ShippingBranch) => {
    setEditingBranch(b);
    setForm({
      name: b.name,
      code: b.code,
      governorate: b.governorate,
      address: b.address || '',
      phone: b.phone || '',
      isActive: b.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.governorate) {
      toast.error('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingBranch
        ? `/api/v1/shipping-portal/branches/${editingBranch.id}`
        : '/api/v1/shipping-portal/branches';
      const method = editingBranch ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editingBranch ? 'تم تحديث بيانات الفرع' : 'تم إضافة الفرع بنجاح');
        setShowModal(false);
        fetchBranches();
      } else {
        toast.error(data.error || 'حدث خطأ أثناء الحفظ');
      }
    } catch {
      toast.error('حدث خطأ بالاتصال');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الفرع؟')) return;
    try {
      const res = await fetch(`/api/v1/shipping-portal/branches/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        toast.success('تم حذف الفرع');
        fetchBranches();
      } else {
        toast.error(data.error || 'فشل حذف الفرع');
      }
    } catch {
      toast.error('حدث خطأ بالاتصال');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isEn ? 'Shipping Branches & Hubs' : 'فروع ومراكز الشحن (Hubs)'}
            </h1>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
              {branches.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isEn ? 'Manage sorting hubs and local delivery branches' : 'إدارة مراكز الفرز، الاستلام، ونقاط توزيع الشحنات'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('custody')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'custody'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Branch Custody' : 'عهدة الفرع والتحويل'}
            </button>
            <button
              onClick={() => setActiveTab('branches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'branches'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Branches' : 'إدارة الفروع'}
            </button>
          </div>

          {activeTab === 'branches' && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'Add Branch' : 'إضافة فرع جديد'}</span>
            </button>
          )}
        </div>
      </div>

{activeTab === 'custody' ? (
        <BranchCustodyTab branches={branches} />
      ) : (
        <>
      {/* Search Toolbar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-3 rtl:right-3 ltr:left-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search branches by name, code, governorate...' : 'البحث باسم الفرع، الكود، أو المحافظة...'}
            className="w-full rtl:pr-9 ltr:pl-9 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          onClick={fetchBranches}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Branches Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">{isEn ? 'Branch Name' : 'اسم الفرع'}</th>
                <th className="px-4 py-3">{isEn ? 'Code' : 'الكود'}</th>
                <th className="px-4 py-3">{isEn ? 'Governorate' : 'المحافظة'}</th>
                <th className="px-4 py-3">{isEn ? 'Address & Phone' : 'العنوان والهاتف'}</th>
                <th className="px-4 py-3">{isEn ? 'Status' : 'الحالة'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Actions' : 'إجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading branches...' : 'جاري تحميل الفروع...'}</span>
                  </td>
                </tr>
              ) : branches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>{isEn ? 'No branches found' : 'لا توجد فروع مسجلة حالياً'}</span>
                  </td>
                </tr>
              ) : (
                branches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {b.code}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {b.governorate}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{b.address || '—'}</div>
                      {b.phone && <div className="font-mono text-slate-400 mt-0.5">{b.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {b.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400">
                          <XCircle className="w-3 h-3" />
                          <span>غير نشط</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                          title="تعديل"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold">
                  {editingBranch ? 'تعديل بيانات الفرع' : 'إضافة فرع / هاَب جديد'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  اسم الفرع أو الهاَب *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: هاَب القاهرة المركزي"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    كود الفرع
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none font-mono uppercase"
                    placeholder="مثال: CAI-MAIN"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    المحافظة *
                  </label>
                  <select
                    value={form.governorate}
                    onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none"
                  >
                    {EGYPT_GOVERNORATES.map((g) => (
                      <option key={g.id} value={g.nameAr}>
                        {isEn ? g.nameEn : g.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  العنوان التفصيلي
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none"
                  placeholder="مثال: المنطقة الصناعية، بلوك 4..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  رقم الهاتف
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 outline-none font-mono"
                  placeholder="مثال: 022334455"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="branchIsActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="branchIsActive" className="text-xs font-medium cursor-pointer">
                  الفرع نشط ومتاح لعمليات الاستلام والتوزيع
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'جاري الحفظ...' : editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;
