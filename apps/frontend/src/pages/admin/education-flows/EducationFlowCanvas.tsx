import React, { useState } from 'react';
import { EducationFlowNodeCard } from './EducationFlowNodeCard';
import type { CanvasNodeData, FlowCategory, FlowNodeType } from './types';
import { ArrowDown, Plus, MessageSquare, Clock, GitFork, CreditCard, X } from 'lucide-react';

interface EducationFlowCanvasProps {
  nodes: CanvasNodeData[];
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
  onAddStep?: (afterIndex: number, stepType: FlowNodeType) => void;
  zoomLevel: number;
}

export const EducationFlowCanvas: React.FC<EducationFlowCanvasProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onAddStep,
  zoomLevel,
}) => {
  const [activeInsertIndex, setActiveInsertIndex] = useState<number | null>(null);

  const handleInsertStep = (index: number, type: FlowNodeType) => {
    if (onAddStep) {
      onAddStep(index, type);
    }
    setActiveInsertIndex(null);
  };

  return (
    <div className="relative flex-1 w-full min-h-[calc(100vh-140px)] overflow-x-auto overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 sm:p-12">
      {/* Customer.io & n8n Style Dot-Grid Canvas Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60 dark:opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Scaled Flow Surface */}
      <div
        className="relative mx-auto max-w-4xl transition-transform duration-200 origin-top flex flex-col items-center gap-6"
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          const isInsertOpen = activeInsertIndex === index;

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div className="w-full relative z-10">
                <EducationFlowNodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={onSelectNode}
                />
              </div>

              {/* Connector Line with Interactive (+) Step Inserter (Customer.io Style) */}
              {!isLast && (
                <div className="flex flex-col items-center justify-center -my-2 relative z-20 group">
                  <div className="w-0.5 h-6 bg-gradient-to-b from-primary/60 to-primary/30" />

                  {/* The (+) Button or Step Inserter Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      title="إضافة خطوة جديدة في هذا الموضع"
                      onClick={() => setActiveInsertIndex(isInsertOpen ? null : index)}
                      className={`w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 transition-all flex items-center justify-center shadow-xs cursor-pointer ${
                        isInsertOpen
                          ? 'border-primary bg-primary text-white scale-110'
                          : 'border-slate-300 dark:border-slate-700 text-muted-foreground hover:border-primary hover:text-primary hover:scale-115'
                      }`}
                    >
                      {isInsertOpen ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>

                    {/* Step Inserter Popover Palette */}
                    {isInsertOpen && (
                      <div className="absolute top-9 left-1/2 -translate-x-1/2 z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 text-right space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="text-[11px] font-bold text-muted-foreground pb-1 border-b border-slate-100 dark:border-slate-800">
                          اختر نوع الخطوة للإضافة:
                        </div>

                        {/* 1. Message */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'message')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-colors">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">رسالة محادثة جديدة</span>
                            <span className="text-[10px] text-muted-foreground">واتساب، ماسنجر، أو إنستجرام</span>
                          </div>
                        </button>

                        {/* 2. Delay */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'delay')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover/item:bg-amber-500 group-hover/item:text-white transition-colors">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">تأخير زمني وجدولة</span>
                            <span className="text-[10px] text-muted-foreground">انتظار ساعات أو توقيت نسبي للحدث</span>
                          </div>
                        </button>

                        {/* 3. Condition */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'condition')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover/item:bg-cyan-500 group-hover/item:text-white transition-colors">
                            <GitFork className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">شرط وتفرع ذكي</span>
                            <span className="text-[10px] text-muted-foreground">فحص الحضور، الساعات، أو السن</span>
                          </div>
                        </button>

                        {/* 4. Action */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'action')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover/item:bg-purple-500 group-hover/item:text-white transition-colors">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">إجراء مالي أو تقني</span>
                            <span className="text-[10px] text-muted-foreground">توليد رابط دفع أو تعيين وسم</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-0.5 h-6 bg-gradient-to-b from-primary/30 to-primary/60" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
