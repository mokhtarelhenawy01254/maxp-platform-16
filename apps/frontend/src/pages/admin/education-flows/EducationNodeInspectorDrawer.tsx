import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Clock, GitFork, Check, Save } from 'lucide-react';
import type { CanvasNodeData } from './types';

interface EducationNodeInspectorDrawerProps {
  node: CanvasNodeData | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNodeText: (nodeId: string, updatedText: string) => void;
}

export const EducationNodeInspectorDrawer: React.FC<EducationNodeInspectorDrawerProps> = ({
  node,
  isOpen,
  onClose,
  onSaveNodeText,
}) => {
  const [draftText, setDraftText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (node) {
      setDraftText(node.messageText || node.delayDetail || '');
      setSavedSuccess(false);
    }
  }, [node]);

  if (!isOpen || !node) return null;

  const handleSave = () => {
    onSaveNodeText(node.id, draftText);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              {node.type === 'message' && <MessageSquare className="w-4 h-4" />}
              {node.type === 'delay' && <Clock className="w-4 h-4" />}
              {node.type === 'condition' && <GitFork className="w-4 h-4" />}
              {node.type === 'trigger' && <MessageSquare className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                {node.title}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                معاينة وتعديل نص الرسالة وتوقيت الإرسال
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>تم حفظ نص الرسالة بنجاح</span>
            </div>
          )}

          {/* If Message: Text Editor */}
          {node.type === 'message' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">
                نص الرسالة المرسلة لولي الأمر (واتساب):
              </label>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={8}
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs text-foreground leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="اكتب نص الرسالة هنا..."
              />
              <span className="text-[11px] text-muted-foreground block">
                يمكن استخدام متغيرات تلقائية مثل [اسم الطالب] و [موعد الجلسة].
              </span>
            </div>
          )}

          {/* If Buttons */}
          {node.buttons && node.buttons.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold text-foreground block">
                الأزرار التفاعلية المرفقة بالرسالة:
              </label>
              <div className="space-y-1.5">
                {node.buttons.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold flex items-center justify-between"
                  >
                    <span>{b.label}</span>
                    <span className="text-[10px] text-muted-foreground">زر اختيار سريع</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If Delay */}
          {node.type === 'delay' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                توقيت الإطلاق التلقائي:
              </span>
              <div className="text-sm font-bold text-foreground">
                {node.delayText}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {node.delayDetail}
              </p>
            </div>
          )}

          {/* If Condition */}
          {node.type === 'condition' && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
              <span className="text-xs font-bold text-cyan-800 dark:text-cyan-400">
                سؤال التحقق والتفرع:
              </span>
              <p className="text-xs text-foreground font-semibold">
                {node.conditionQuestion}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold text-center">
                  {node.branches?.yes.label}
                </div>
                <div className="p-2 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-bold text-center">
                  {node.branches?.no.label}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            إغلاق
          </button>
          {node.type === 'message' && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ النص</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
