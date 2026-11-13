import React from 'react';
import {
  MessageSquare,
  Clock,
  Sparkles,
  Database,
  MousePointerClick,
  UserCheck,
  Send,
  Calendar,
  GitFork,
  Bell,
  Smartphone,
  RotateCcw,
  Award,
  Calculator,
  CreditCard,
  CheckCircle,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
  RefreshCw,
  Headphones,
  ArrowDown,
  Info,
} from 'lucide-react';
import type { FlowNode, SubFlowDefinition, NodeCategory } from './types';

interface EducationFlowVisualCanvasProps {
  subFlow: SubFlowDefinition;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export const EducationFlowVisualCanvas: React.FC<EducationFlowVisualCanvasProps> = ({
  subFlow,
  selectedNodeId,
  onSelectNode,
}) => {
  const getNodeIcon = (iconName: string) => {
    switch (iconName) {
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4" />;
      case 'Clock':
        return <Clock className="w-4 h-4" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'Database':
        return <Database className="w-4 h-4" />;
      case 'MousePointerClick':
        return <MousePointerClick className="w-4 h-4" />;
      case 'UserCheck':
        return <UserCheck className="w-4 h-4" />;
      case 'Send':
        return <Send className="w-4 h-4" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4" />;
      case 'GitFork':
        return <GitFork className="w-4 h-4" />;
      case 'Bell':
        return <Bell className="w-4 h-4" />;
      case 'Smartphone':
        return <Smartphone className="w-4 h-4" />;
      case 'RotateCcw':
        return <RotateCcw className="w-4 h-4" />;
      case 'Award':
        return <Award className="w-4 h-4" />;
      case 'Calculator':
        return <Calculator className="w-4 h-4" />;
      case 'CreditCard':
        return <CreditCard className="w-4 h-4" />;
      case 'CheckCircle':
        return <CheckCircle className="w-4 h-4" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4" />;
      case 'CheckSquare':
        return <CheckSquare className="w-4 h-4" />;
      case 'AlertCircle':
        return <AlertCircle className="w-4 h-4" />;
      case 'RefreshCw':
        return <RefreshCw className="w-4 h-4" />;
      case 'Headphones':
        return <Headphones className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getCategoryTheme = (category: NodeCategory) => {
    switch (category) {
      case 'trigger':
        return {
          pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          border: 'hover:border-blue-500/50',
          label: 'مشغل (Trigger)',
        };
      case 'window':
        return {
          pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          border: 'hover:border-amber-500/50',
          label: 'حارس 24h (Meta Window)',
        };
      case 'brain':
        return {
          pill: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
          border: 'hover:border-purple-500/50',
          label: 'عقل المحادثة (AI Brain)',
        };
      case 'data':
        return {
          pill: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
          border: 'hover:border-teal-500/50',
          label: 'استعلام قاعدة البيانات',
        };
      case 'interactive':
        return {
          pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          border: 'hover:border-emerald-500/50',
          label: 'تفاعل وأزرار سريعة',
        };
      case 'payment':
        return {
          pill: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          border: 'hover:border-indigo-500/50',
          label: 'سداد مالي (Checkout)',
        };
      case 'notify':
        return {
          pill: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          border: 'hover:border-rose-500/50',
          label: 'إشعار وقوالب ميتا',
        };
      case 'handover':
        return {
          pill: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
          border: 'hover:border-orange-500/50',
          label: 'تصعيد بشري (Human)',
        };
      default:
        return {
          pill: 'bg-muted text-muted-foreground border-border',
          border: 'hover:border-border',
          label: 'خطوة',
        };
    }
  };

  const getWindowRuleBadge = (rule: FlowNode['windowRule']) => {
    switch (rule) {
      case 'IN_24H_ONLY':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            داخل 24h فقط (محادثة حرة)
          </span>
        );
      case 'OUT_24H_ONLY':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
            خارج 24h (قوالب معتمدة فقط)
          </span>
        );
      case 'BOTH':
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
            يعمل داخل وخارج 24h
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Sub-flow Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-foreground">
              {subFlow.titleAr}
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {subFlow.stageBadgeAr}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{subFlow.shortDescAr}</p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-[11px] text-muted-foreground block">
            الهدف التشغيلي (Target Outcome):
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {subFlow.targetOutcomeAr}
          </span>
        </div>
      </div>

      {/* Visual Sequence of Nodes */}
      <div className="space-y-3 relative">
        {subFlow.nodes.map((node, index) => {
          const isSelected = selectedNodeId === node.id;
          const theme = getCategoryTheme(node.category);
          const isLast = index === subFlow.nodes.length - 1;

          return (
            <React.Fragment key={node.id}>
              <div
                onClick={() => onSelectNode(node.id)}
                className={`cursor-pointer rounded-xl border p-3.5 sm:p-4 transition-all ${
                  isSelected
                    ? 'bg-background border-primary shadow-sm ring-2 ring-primary/20'
                    : `bg-card border-border ${theme.border} hover:bg-muted/30`
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Step & Title */}
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {node.stepNumber}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          {node.titleAr}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${theme.pill}`}
                        >
                          {theme.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {node.subtitleAr}
                      </p>
                    </div>
                  </div>

                  {/* Tool Badge & Window Status */}
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-muted text-foreground border border-border font-mono font-medium">
                      {getNodeIcon(node.iconName)}
                      <span>{node.assignedTool}</span>
                    </span>
                    {getWindowRuleBadge(node.windowRule)}
                  </div>
                </div>

                {/* Expanded Details on Click */}
                {isSelected && (
                  <div className="mt-3.5 pt-3 border-t border-border/70 text-xs text-muted-foreground space-y-1.5 animate-in fade-in-50 duration-150">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Info className="w-3.5 h-3.5 text-primary" />
                      <span>تفاصيل التشغيل والأدوات المرتبطة:</span>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">
                      {node.detailsAr}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px]">
                      <span className="text-muted-foreground">
                        المفتاح البرمجي للأداة:
                      </span>
                      <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-primary text-[10px]">
                        {node.toolKey}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {/* Connecting Arrow */}
              {!isLast && (
                <div className="flex justify-center py-0.5 text-muted-foreground/40">
                  <ArrowDown className="w-4 h-4 stroke-[2]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
