import React, { useEffect, useState } from 'react';
import {
  TableCellsIcon,
  PlusIcon,
  ArrowPathIcon,
  FolderIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, Account } from './accountingApi';

export const AccountingCoaPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    nameEn: '',
    type: 'ASSET' as Account['type'],
    parentId: '',
    isGroup: false,
    isPostable: true,
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountingApi.getChartOfAccounts();
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSeed = async () => {
    if (!window.confirm('هل تريد تهيئة وتثبيت دليل الحسابات المصري القياسي (EAS)؟')) return;
    try {
      setLoading(true);
      await accountingApi.seedStandardCOA();
      await loadAccounts();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingAccount) {
        await accountingApi.updateAccount(editingAccount.id, {
          name: formData.name,
          nameEn: formData.nameEn,
          parentId: formData.parentId || null,
        });
      } else {
        await accountingApi.createAccount({
          code: formData.code,
          name: formData.name,
          nameEn: formData.nameEn,
          type: formData.type,
          parentId: formData.parentId || null,
          isGroup: formData.isGroup,
          isPostable: formData.isGroup ? false : formData.isPostable,
        });
      }
      setShowModal(false);
      setEditingAccount(null);
      await loadAccounts();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (selectedType !== 'ALL' && acc.type !== selectedType) return false;
    if (search) {
      const q = search.toLowerCase();
      return acc.code.includes(q) || acc.name.toLowerCase().includes(q) || (acc.nameEn && acc.nameEn.toLowerCase().includes(q));
    }
    return true;
  });

  const typeLabels: Record<string, { label: string; color: string }> = {
    ASSET: { label: 'أصول', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    LIABILITY: { label: 'خصوم والتزامات', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    EQUITY: { label: 'حقوق ملكية', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    REVENUE: { label: 'إيرادات', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    EXPENSE: { label: 'مصروفات', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="دليل شجرة الحسابات (Chart of Accounts)"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>تهيئة الدليل القياسي (EAS)</span>
            </button>
            <button
              onClick={() => {
                setEditingAccount(null);
                setFormData({
                  code: '',
                  name: '',
                  nameEn: '',
                  type: 'ASSET',
                  parentId: '',
                  isGroup: false,
                  isPostable: true,
                });
                setShowModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 shadow-sm transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              <span>إضافة حساب جديد</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Filter Bar */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث برقم الحساب أو الاسم العربي/الإنجليزي..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  selectedType === t
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t === 'ALL' ? 'الكل' : typeLabels[t]?.label || t}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">كود الحساب</th>
                  <th className="py-3 px-4 font-semibold">اسم الحساب (عربي)</th>
                  <th className="py-3 px-4 font-semibold">English Name</th>
                  <th className="py-3 px-4 font-semibold">النوع المالي</th>
                  <th className="py-3 px-4 font-semibold">طبيعة الحساب</th>
                  <th className="py-3 px-4 font-semibold">القيود المسجلة</th>
                  <th className="py-3 px-4 font-semibold text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {loading ? 'جارٍ تحميل شجرة الحسابات...' : 'لا توجد حسابات مطابقة للبحث'}
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => {
                    const depth = (acc.code.length > 4 ? 2 : acc.code.length > 2 ? 1 : 0);
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          <span style={{ marginRight: `${depth * 14}px` }}>{acc.code}</span>
                        </td>
                        <td className="py-2.5 px-4 font-medium flex items-center gap-1.5">
                          {acc.isGroup ? (
                            <FolderIcon className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <DocumentIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <span>{acc.name}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-sans">{acc.nameEn || '—'}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${typeLabels[acc.type]?.color}`}>
                            {typeLabels[acc.type]?.label || acc.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              acc.isGroup
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-emerald-500/10 text-emerald-600'
                            }`}
                          >
                            {acc.isGroup ? 'تجميعي (رئيسي)' : 'قابل للترحيل (فرعي)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums text-slate-500">
                          {acc._count?.journalLines || 0} حركة
                        </td>
                        <td className="py-2.5 px-4 text-left">
                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setFormData({
                                code: acc.code,
                                name: acc.name,
                                nameEn: acc.nameEn || '',
                                type: acc.type,
                                parentId: acc.parentId || '',
                                isGroup: acc.isGroup,
                                isPostable: acc.isPostable,
                              });
                              setShowModal(true);
                            }}
                            className="px-2 py-1 text-[11px] rounded font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            تعديل
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-sm font-bold">{editingAccount ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد بالدليل'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">كود الحساب (رقمي)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingAccount}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono disabled:opacity-60"
                  placeholder="مثال: 110103"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">اسم الحساب (عربي)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  placeholder="مثال: خزينة الفرع الثاني"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">الاسم بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  placeholder="e.g. Branch 2 Vault"
                />
              </div>
              {!editingAccount && (
                <>
                  <div>
                    <label className="block font-semibold mb-1">النوع المالي</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    >
                      <option value="ASSET">أصول (ASSET)</option>
                      <option value="LIABILITY">خصوم والتزامات (LIABILITY)</option>
                      <option value="EQUITY">حقوق ملكية (EQUITY)</option>
                      <option value="REVENUE">إيرادات (REVENUE)</option>
                      <option value="EXPENSE">مصروفات (EXPENSE)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isGroup}
                        onChange={(e) => setFormData({ ...formData, isGroup: e.target.checked, isPostable: !e.target.checked })}
                      />
                      <span>حساب تجميعي رئيسي (Group)</span>
                    </label>
                  </div>
                </>
              )}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                >
                  {loading ? 'جارٍ الحفظ...' : 'حفظ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingCoaPage;
