import React, { useState } from 'react';
import { X, Sparkles, FolderPlus, GitCommit, Truck, FileText, BarChart3, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { agentReportsService, AgentReportType } from '../../services/agentReportsService';

interface CreateTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: AgentReportType) => void;
}

const AVAILABLE_ICONS = [
  { id: 'file-text', label: 'تقرير عام', icon: FileText },
  { id: 'sparkles', label: 'ذكاء اصطناعي', icon: Sparkles },
  { id: 'git-commit', label: 'جت هاب', icon: GitCommit },
  { id: 'truck', label: 'شحن', icon: Truck },
  { id: 'bar-chart', label: 'إحصائيات', icon: BarChart3 },
  { id: 'activity', label: 'نشاط', icon: Activity },
];

export const CreateTypeModal: React.FC<CreateTypeModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('file-text');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم نوع التقرير');
      return;
    }

    setLoading(true);
    try {
      const created = await agentReportsService.createType({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        icon,
      });
      toast.success('تم إنشاء نوع التقرير بنجاح');
      onCreated(created);
      onClose();
      setName('');
      setSlug('');
      setDescription('');
      setIcon('file-text');
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'فشل في إنشاء نوع التقرير';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">إنشاء نوع تقرير جديد</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              اسم النوع <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\u0621-\u064A-]+/g, '-').replace(/^-+|-+$/g, ''));
                }
              }}
              placeholder="مثال: إبديت الحملات الإعلانية"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              المعرف اللاتيني (Slug) <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
              placeholder="ads-update"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              الوصف <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للغرض من هذا النوع من التقارير"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">الأيقونة</label>
            <div className="grid grid-cols-3 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComp = item.icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-primary hover:bg-primary/95 rounded-lg active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? 'جاري الإنشاء…' : 'إنشاء النوع'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
