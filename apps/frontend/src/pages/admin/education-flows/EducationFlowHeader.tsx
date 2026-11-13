import React from 'react';
import {
  GitBranch,
  Play,
  Settings2,
  Clock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import type { ChannelType } from './types';

interface EducationFlowHeaderProps {
  selectedChannel: ChannelType;
  onSelectChannel: (channel: ChannelType) => void;
  onOpenSimulator: () => void;
  onOpenSettings: () => void;
}

export const EducationFlowHeader: React.FC<EducationFlowHeaderProps> = ({
  selectedChannel,
  onSelectChannel,
  onOpenSimulator,
  onOpenSettings,
}) => {
  const channels: { id: ChannelType; label: string }[] = [
    { id: 'ALL', label: 'كافة القنوات' },
    { id: 'WHATSAPP', label: 'واتساب كلاود & QR' },
    { id: 'MESSENGER', label: 'فيسبوك ماسنجر' },
    { id: 'INSTAGRAM', label: 'إنستغرام دايركت' },
  ];

  return (
    <div className="bg-card border-b border-border px-4 py-3.5 sm:px-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Left / Title & Breadcrumb */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              <GitBranch className="w-3.5 h-3.5" />
              النظام التعليمي
            </span>
            <span className="text-muted-foreground text-xs">/</span>
            <h1 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              مسارات الرسايل والأتمتة التعليمية
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            فلو مركب متعدد القنوات (واتساب، ماسنجر، إنستا) محكوم بنافذة الـ 24 ساعة وأدوات الذكاء الاصطناعي
          </p>
        </div>

        {/* Right / Status & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 24h Window Live Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Clock className="w-3.5 h-3.5" />
            <span>حارس الـ 24h نشط</span>
          </div>

          {/* Channel Selector Pills */}
          <div className="hidden sm:inline-flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/80">
            {channels.map((ch) => {
              const active = selectedChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => onSelectChannel(ch.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    active
                      ? 'bg-background text-foreground shadow-xs font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={onOpenSimulator}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>محاكاة الفلو</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted/50 text-foreground text-xs font-medium transition-all"
            title="سياسات وقواعد المسار"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden md:inline">السياسات</span>
          </button>
        </div>
      </div>
    </div>
  );
};
