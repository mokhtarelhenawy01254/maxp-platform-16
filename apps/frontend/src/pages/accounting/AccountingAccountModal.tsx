import React from 'react';
import { X } from 'lucide-react';
import { Account } from './accountingApi';

interface AccountingAccountModalProps {
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  editingAccount: Account | null;
  formData: {
    code: string;
    name: string;
    nameEn: string;
    type: Account['type'];
    parentId: string;
    isGroup: boolean;
    isPostable: boolean;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      code: string;
      name: string;
      nameEn: string;
      type: Account['type'];
      parentId: string;
      isGroup: boolean;
      isPostable: boolean;
    }>
  >;
  handleSave: (e: React.FormEvent) => void;
  loading: boolean;
}

export const AccountingAccountModal: React.FC<AccountingAccountModalProps> = ({
  showModal,
  setShowModal,
  editingAccount,
  formData,
  setFormData,
  handleSave,
  loading,
}) => {
  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        <div className="p-4 border-b border-border/60 flex justify-between items-center">
          <h3 className="text-sm font-bold tracking-tight">
            {editingAccount ? 'تعديل بيانات الحساب' : 'إضافة حساب جديد بالدليل'}
          </h3>
          <button
            onClick={() => setShowModal(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium mb-1">كود الحساب (رقمي)</label>
            <input
              type="text"
              required
              disabled={!!editingAccount}
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              placeholder="مثال: 110103"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">اسم الحساب (عربي)</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="مثال: خزينة الفرع الثاني"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">الاسم بالإنجليزية (اختياري)</label>
            <input
              type="text"
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Branch 2 Vault"
            />
          </div>
          {!editingAccount && (
            <>
              <div>
                <label className="block font-medium mb-1">النوع المالي</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-border/70 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ASSET">أصول (ASSET)</option>
                  <option value="LIABILITY">خصوم والتزامات (LIABILITY)</option>
                  <option value="EQUITY">حقوق ملكية (EQUITY)</option>
                  <option value="REVENUE">إيرادات (REVENUE)</option>
                  <option value="EXPENSE">مصروفات (EXPENSE)</option>
                </select>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={formData.isGroup}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isGroup: e.target.checked,
                        isPostable: !e.target.checked,
                      })
                    }
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>حساب تجميعي رئيسي (Group)</span>
                </label>
              </div>
            </>
          )}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              {loading ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
