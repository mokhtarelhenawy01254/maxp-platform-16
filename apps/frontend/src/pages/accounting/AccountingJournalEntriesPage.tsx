import React, { useEffect, useState } from 'react';
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  NoSymbolIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { AccountingHeader } from './AccountingHeader';
import { accountingApi, JournalEntry, Account } from './accountingApi';
import { AccountingNewEntryModal, AccountingVoidModal } from './AccountingEntryModals';

export const AccountingJournalEntriesPage: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [voidingEntry, setVoidingEntry] = useState<JournalEntry | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [entriesRes, accountsRes] = await Promise.all([
        accountingApi.listEntries({ status: statusFilter !== 'ALL' ? statusFilter : undefined }),
        accountingApi.getChartOfAccounts(),
      ]);
      setEntries(entriesRes.entries || []);
      setAccounts(accountsRes.filter((a) => a.isPostable));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSaveEntry = async (data: {
    date: string;
    narration: string;
    status: 'DRAFT' | 'POSTED';
    lines: Array<{ accountId: string; debit: number; credit: number; narration?: string }>;
  }) => {
    try {
      setLoading(true);
      await accountingApi.createEntry(data);
      setShowNewModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostEntry = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من ترحيل القيد إلى دفتر الأستاذ العام والقوائم المالية؟')) return;
    try {
      setLoading(true);
      await accountingApi.postEntry(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmVoid = async (reason: string) => {
    if (!voidingEntry) return;
    try {
      setLoading(true);
      await accountingApi.voidEntry(voidingEntry.id, reason);
      setVoidingEntry(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatEGP = (num: number) => {
    return (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      <AccountingHeader
        title="دفتر قيود اليومية العامة (Journal Entries)"
        actions={
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 shadow-sm transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>تسجيل قيد جديد</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* Status Filter Tabs */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'جميع القيود' },
              { id: 'POSTED', label: 'المرحلة' },
              { id: 'DRAFT', label: 'المسودات' },
              { id: 'VOID', label: 'الملغاة (المعكوسة)' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === s.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono">العدد: {entries.length} قيد</span>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
              {loading ? 'جارٍ تحميل قيود اليومية...' : 'لا توجد قيود مسجلة في هذا النطاق'}
            </div>
          ) : (
            entries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;
              const entryTotal = entry.lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);

              return (
                <div
                  key={entry.id}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                  <div
                    onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                    className="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          entry.status === 'POSTED'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : entry.status === 'VOID'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-slate-500/10 text-slate-600'
                        }`}
                      >
                        <DocumentDuplicateIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">{entry.entryNumber}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.status === 'POSTED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : entry.status === 'VOID'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-slate-500/10 text-slate-600'
                            }`}
                          >
                            {entry.status === 'POSTED' ? 'مرحل' : entry.status === 'VOID' ? 'ملغي' : 'مسودة'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">[{entry.sourceType}]</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{entry.narration}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-left">
                        <span className="text-[11px] text-slate-400 block">إجمالي القيد</span>
                        <span className="text-xs font-bold tabular-nums">{formatEGP(entryTotal)} ج.م</span>
                      </div>
                      <div className="text-left text-slate-500 text-xs">
                        <span>{new Date(entry.date).toLocaleDateString('ar-EG')}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Lines Table */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/30">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <th className="py-2">كود الحساب</th>
                            <th className="py-2">اسم الحساب</th>
                            <th className="py-2">البيان الفرعي</th>
                            <th className="py-2 text-left">مدين (Debit)</th>
                            <th className="py-2 text-left">دائن (Credit)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {entry.lines.map((l, i) => (
                            <tr key={i}>
                              <td className="py-2 font-mono font-semibold">{l.account?.code || '—'}</td>
                              <td className="py-2 font-medium">{l.account?.name || '—'}</td>
                              <td className="py-2 text-slate-500">{l.narration || '—'}</td>
                              <td className="py-2 text-left font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                {Number(l.debit) > 0 ? formatEGP(Number(l.debit)) : '—'}
                              </td>
                              <td className="py-2 text-left font-mono tabular-nums text-rose-600 dark:text-rose-400">
                                {Number(l.credit) > 0 ? formatEGP(Number(l.credit)) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Entry Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {entry.reversalOfId && `قيد عكسي للقيد رقم: ${entry.reversalOfId}`}
                        </span>
                        <div className="flex items-center gap-2">
                          {entry.status === 'DRAFT' && (
                            <button
                              onClick={() => handlePostEntry(entry.id)}
                              className="px-3 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              ترحيل القيد الآن
                            </button>
                          )}
                          {entry.status === 'POSTED' && (
                            <button
                              onClick={() => setVoidingEntry(entry)}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                            >
                              <NoSymbolIcon className="w-3.5 h-3.5" />
                              <span>إلغاء وعكس القيد (Void)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Entry Modal */}
      {showNewModal && (
        <AccountingNewEntryModal
          accounts={accounts}
          loading={loading}
          onClose={() => setShowNewModal(false)}
          onSave={handleSaveEntry}
        />
      )}

      {/* Void Modal */}
      {voidingEntry && (
        <AccountingVoidModal
          entry={voidingEntry}
          loading={loading}
          onClose={() => setVoidingEntry(null)}
          onConfirm={handleConfirmVoid}
        />
      )}
    </div>
  );
};

export default AccountingJournalEntriesPage;
