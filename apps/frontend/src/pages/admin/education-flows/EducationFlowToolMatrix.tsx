import React from 'react';
import {
  Sparkles,
  Clock,
  Presentation,
  Smartphone,
  MessageSquare,
  MousePointerClick,
  CreditCard,
  Headphones,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import type { FlowToolItem } from './types';

interface EducationFlowToolMatrixProps {
  tools: FlowToolItem[];
}

export const EducationFlowToolMatrix: React.FC<EducationFlowToolMatrixProps> = ({
  tools,
}) => {
  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-purple-500" />;
      case 'Clock':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Presentation':
        return <Presentation className="w-4 h-4 text-teal-500" />;
      case 'Smartphone':
        return <Smartphone className="w-4 h-4 text-emerald-500" />;
      case 'MessageSquare':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'MousePointerClick':
        return <MousePointerClick className="w-4 h-4 text-indigo-500" />;
      case 'CreditCard':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      case 'Headphones':
        return <Headphones className="w-4 h-4 text-orange-500" />;
      default:
        return <Layers className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 border-t border-border bg-card/30">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              مصفوفة الأدوات المتكاملة في الفلو (Multi-Tool Registry)
            </h3>
            <p className="text-xs text-muted-foreground">
              الأدوات البرمجية الـ 8 التي تعمل بتناغم لإدارة مسار الطالب وولي الأمر تلقائياً
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium self-start sm:self-auto flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>8 من 8 أدوات جاهزة ومتصلة</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {getToolIcon(tool.iconName)}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    {tool.statusBadgeAr}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-foreground">
                  {tool.nameAr}
                </h4>
                <span className="text-[10px] text-primary/80 font-medium block mt-0.5">
                  {tool.categoryAr}
                </span>

                <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                  {tool.descriptionAr}
                </p>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>المسارات المشتركة:</span>
                <span className="font-mono font-semibold text-foreground">
                  {tool.connectedSubFlows.length} مسار
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
