import React, { useState } from 'react';
import { EducationFlowNodeCard } from './EducationFlowNodeCard';
import type { CanvasNodeData, FlowNodeType } from './types';
import {
  ArrowDown,
  Plus,
  MessageSquare,
  Clock,
  GitFork,
  CreditCard,
  X,
  CheckCircle2,
  XCircle,
  GitMerge,
} from 'lucide-react';

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

  // Track branch targets that are rendered side-by-side inside condition splits
  const branchTargetIds = new Set<string>();
  nodes.forEach((node) => {
    if (node.type === 'condition' && node.branches) {
      if (node.branches.yes?.targetId) branchTargetIds.add(node.branches.yes.targetId);
      if (node.branches.no?.targetId) branchTargetIds.add(node.branches.no.targetId);
    }
  });

  return (
    <div className="relative flex-1 w-full min-h-[calc(100vh-140px)] overflow-x-auto overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 sm:p-12">
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
          // If this node is rendered inside a condition branch pair, skip top-level rendering
          if (branchTargetIds.has(node.id)) {
            return null;
          }

          const isLast = index === nodes.length - 1;
          const isInsertOpen = activeInsertIndex === index;

          // Check if this is a condition node with side-by-side branches
          const isConditionWithBranches =
            node.type === 'condition' &&
            node.branches?.yes?.targetId &&
            node.branches?.no?.targetId;

          const yesNode = isConditionWithBranches
            ? nodes.find((n) => n.id === node.branches?.yes.targetId)
            : null;
          const noNode = isConditionWithBranches
            ? nodes.find((n) => n.id === node.branches?.no.targetId)
            : null;

          return (
            <React.Fragment key={node.id}>
              {/* 1. Normal Node Card or Condition Root */}
              <div className="w-full relative z-10">
                <EducationFlowNodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={onSelectNode}
                />
              </div>

              {/* 2. If Condition Node with Branches: Render Visual 2-Column Split Tree (ManyChat / ActiveCampaign Style) */}
              {isConditionWithBranches && (yesNode || noNode) && (
                <div className="w-full relative z-10 flex flex-col items-center my-1">
                  {/* Branching Fork Header with SVG curve */}
                  <div className="w-full max-w-2xl flex flex-col items-center mb-4">
                    {/* Stem from condition node */}
                    <div className="w-0.5 h-6 bg-cyan-500/60" />

                    {/* Horizontal Split Bar */}
                    <div className="w-3/4 h-0.5 bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 relative">
                      <div className="absolute -top-1.5 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                      <div className="absolute -top-1.5 left-0 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 shadow-xs" />
                    </div>

                    {/* Branch Labels Header */}
                    <div className="w-full grid grid-cols-2 gap-4 sm:gap-8 mt-2 text-center text-xs font-bold">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{node.branches?.yes.label}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{node.branches?.no.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Two Parallel Branch Columns */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Right Column: Yes Branch */}
                    <div className="flex flex-col items-center p-2 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
                      {yesNode && (
                        <div className="w-full">
                          <EducationFlowNodeCard
                            node={yesNode}
                            isSelected={selectedNodeId === yesNode.id}
                            onSelect={onSelectNode}
                          />
                        </div>
                      )}
                    </div>

                    {/* Left Column: No Branch */}
                    <div className="flex flex-col items-center p-2 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20">
                      {noNode && (
                        <div className="w-full">
                          <EducationFlowNodeCard
                            node={noNode}
                            isSelected={selectedNodeId === noNode.id}
                            onSelect={onSelectNode}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Convergence / Merge Indicator below the branches */}
                  <div className="flex flex-col items-center mt-4">
                    <div className="w-3/4 h-0.5 bg-gradient-to-r from-amber-500/40 via-primary/60 to-emerald-500/40" />
                    <div className="w-0.5 h-6 bg-primary/60" />
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-muted-foreground border border-slate-200 dark:border-slate-700">
                      <GitMerge className="w-3 h-3 text-primary" />
                      <span>استئناف المسار الرئيسي</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Connector Line with Interactive (+) Step Inserter (Only when not right before condition split) */}
              {!isLast && !isConditionWithBranches && (
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

                        {/* 2. Delay / Timer */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'delay')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover/item:bg-amber-500 group-hover/item:text-white transition-colors">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">مؤقت زمني ذكي</span>
                            <span className="text-[10px] text-muted-foreground">انتظار ساعات أو أيام محددة</span>
                          </div>
                        </button>

                        {/* 3. Condition Split */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'condition')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover/item:bg-cyan-500 group-hover/item:text-white transition-colors">
                            <GitFork className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">تفرع شرطي منطقي</span>
                            <span className="text-[10px] text-muted-foreground">حضور، عدم حضور، أو استجابة</span>
                          </div>
                        </button>

                        {/* 4. Action / Payment Link */}
                        <button
                          type="button"
                          onClick={() => handleInsertStep(index, 'action')}
                          className="w-full p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 text-xs text-foreground transition-colors group/item"
                        >
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover/item:bg-purple-500 group-hover/item:text-white transition-colors">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="font-bold block">إجراء حجز أو دفع</span>
                            <span className="text-[10px] text-muted-foreground">إنشاء رابط دفع أو فاتورة</span>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="w-0.5 h-6 bg-gradient-to-b from-primary/30 to-primary/60" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 -mt-0.5" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
