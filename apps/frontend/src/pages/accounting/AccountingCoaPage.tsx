import React, { useEffect, useState } from 'react';
import {
  ListTree,
  Plus,
  RotateCw,
  Folder,
  FileText,
  Search,
  Database,
} from 'lucide-react';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, Account } from './accountingApi';
import { AccountingAccountModal } from './AccountingAccountModal';

export const AccountingCoaPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      const data = await accountingApi.getChartOfAccounts();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load accounts', err);
      setError(err.response?.data?.message || 'تعذر تحميل دليل الحسابات حالياً');
      setAccounts([]);
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
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
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

  const filteredAccounts = (accounts || []).filter((acc) => {
    if (selectedType !== 'ALL' && acc.type !== selectedType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        acc.code.includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        (acc.nameEn && acc.nameEn.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <AccountingHeader
        title="دليل الحسابات الشجري (Chart of Accounts)"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSeed}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Database className="w-3.5 h-3.5" />
              <span>تثبيت الدليل المصري القياسي</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة حساب</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {error && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadAccounts}
              className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 text-[11px] flex items-center gap-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        )}

        {/* Filters and search toolbar */}
        <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-80 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث برقم الحساب أو الاسم العربي/الإنجليزي..."
              className="w-full pr-9 pl-3 py-1.5 rounded-lg border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  selectedType === t
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {t === 'ALL'
                  ? 'الكل'
                  : t === 'ASSET'
                  ? 'أصول'
                  : t === 'LIABILITY'
                  ? 'خصوم'
                  : t === 'EQUITY'
                  ? 'حقوق ملكية'
                  : t === 'REVENUE'
                  ? 'إيرادات'
                  : 'مصروفات'}
              </button>
            ))}
          </div>
        </div>

        {/* Tree Table */}
        <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground">
                  <th className="p-3 font-semibold">كود الحساب</th>
                  <th className="p-3 font-semibold">اسم الحساب</th>
                  <th className="p-3 font-semibold">النوع المالي</th>
                  <th className="p-3 font-semibold">طبيعة الحساب</th>
                  <th className="p-3 font-semibold text-left">الرصيد الدفتري</th>
                  <th className="p-3 font-semibold text-center w-20">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <RotateCw className="w-4 h-4 animate-spin text-primary" />
                        <span>جارٍ تحميل دليل الحسابات...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      لا توجد حسابات مسجلة مطابقة للبحث. يمكنك النقر على &quot;تثبيت الدليل المصري القياسي&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((acc) => {
                    const depth = (acc.code.length - 1) * 12;
                    return (
                      <tr key={acc.id} className="hover:bg-muted/30 transition">
                        <td className="p-3 font-mono font-bold text-foreground">
                          <div style={{ paddingRight: `${depth}px` }} className="flex items-center gap-1.5">
                            {acc.isGroup ? (
                              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span>{acc.code}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{acc.name}</div>
                          {acc.nameEn && <div className="text-[11px] text-muted-foreground font-mono">{acc.nameEn}</div>}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              acc.type === 'ASSET'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                : acc.type === 'LIABILITY'
                                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                : acc.type === 'EQUITY'
                                ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20'
                                : acc.type === 'REVENUE'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {acc.type === 'ASSET'
                              ? 'أصول'
                              : acc.type === 'LIABILITY'
                              ? 'خصوم'
                              : acc.type === 'EQUITY'
                              ? 'حقوق ملكية'
                              : acc.type === 'REVENUE'
                              ? 'إيرادات'
                              : 'مصروفات'}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {acc.isGroup ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">تجميعي (رئيسي)</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">يقبل الترحيل (فرعي)</span>
                          )}
                        </td>
                        <td className="p-3 text-left font-mono font-bold tabular-nums text-foreground">
                          {formatEGP(acc.balance || 0)} <span className="text-[11px] font-normal text-muted-foreground font-sans">ج.م</span>
                        </td>
                        <td className="p-3 text-center">
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
                            className="px-2 py-1 text-[11px] rounded font-semibold text-primary hover:bg-primary/10 transition"
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

      {/* Add / Edit Modal Subcomponent */}
      <AccountingAccountModal
        showModal={showModal}
        setShowModal={setShowModal}
        editingAccount={editingAccount}
        formData={formData}
        setFormData={setFormData}
        handleSave={handleSave}
        loading={loading}
      />
    </div>
  );
};

export default AccountingCoaPage;
