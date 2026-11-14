import React, { useState } from 'react';
import {
  Workflow,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  Users,
  Smartphone,
  Send,
  SlidersHorizontal,
} from 'lucide-react';
import type { EducationFlowRecord, FlowCategory, EducationChannelType } from './types';

interface EducationFlowsListViewProps {
  flows: EducationFlowRecord[];
  onOpenCanvas: (flowId: string, category: FlowCategory) => void;
  onToggleFlow: (flowId: string) => void;
  onOpenNewFlowModal: () => void;
  onOpenTestModal: () => void;
}

export const EducationFlowsListView: React.FC<EducationFlowsListViewProps> = ({
  flows,
  onOpenCanvas,
  onToggleFlow,
  onOpenNewFlowModal,
  onOpenTestModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FlowCategory>('all');

  const filteredFlows = flows.filter((f) => {
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.triggerLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderChannelBadges = (channels: EducationChannelType[]) => {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {channels.map((ch) => {
          if (ch === 'WHATSAPP_WABA') {
            return (
              <span
                key={ch}
                title="واتساب سحابي معتمد (Meta Cloud API)"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-700/50"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                واتساب رسمي WABA
              </span>
            );
          }
          if (ch === 'WHATSAPP_BAILEYS') {
            return (
              <span
                key={ch}
                title="واتساب ويب عادي (Baileys QR)"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300/50 dark:border-teal-700/50"
              >
                <Smartphone className="w-2.5 h-2.5" />
                واتساب عادي QR
              </span>
            );
          }
          if (ch === 'FACEBOOK_MESSENGER') {
            return (
              <span
                key={ch}
                title="فيسبوك ماسنجر مع أزرار سريعة"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/50 dark:border-blue-700/50"
              >
                <MessageSquare className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                ماسنجر
              </span>
            );
          }
          if (ch === 'INSTAGRAM_DIRECT') {
            return (
              <span
                key={ch}
                title="إنستجرام دايركت"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-300/50 dark:border-pink-700/50"
              >
                <MessageSquare className="w-2.5 h-2.5 text-pink-600 dark:text-pink-400" />
                إنستجرام
              </span>
            );
          }
          if (ch === 'PUSH_FIRST') {
            return (
              <span
                key={ch}
                title="إشعار البوابة أولاً لتوفير رسائل واتساب"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300/50 dark:border-indigo-700/50"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                توفير ذكي (Push First)
              </span>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Workflow className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                دليل مسارات الأتمتة والمراسلة
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              إدارة رحلات الطلاب وأولياء الأمور عبر واتساب المعتمد، فيسبوك ماسنجر، وإنستجرام مع التوجيه الذكي
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTestModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>تجربة إرسال حي</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewFlowModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء مسار جديد</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في أسماء المسارات، المشغلات، أو الوصف..."
              className="w-full pr-9 pl-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'جميع المسارات' },
              { id: 'demo_booking', label: 'حجز الديمو داي' },
              { id: 'attendance', label: 'تذكيرات الحضور' },
              { id: 'enrollment', label: 'الاشتراك والدفع' },
              { id: 'retention', label: 'تجديد الساعات' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as FlowCategory)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flows Table & Cards */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">اسم المسار والمشغل</th>
                  <th className="py-3 px-4">القنوات المفعلة</th>
                  <th className="py-3 px-4 text-center">الطلاب المشاركون</th>
                  <th className="py-3 px-4 text-center">نسبة التسليم</th>
                  <th className="py-3 px-4 text-center">نسبة التفاعل</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredFlows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Workflow className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <p className="font-semibold text-sm">لم يتم العثور على مسارات مطابقة</p>
                        <p className="text-xs">جرب تغيير كلمات البحث أو التصنيف المحدد</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFlows.map((flow) => (
                    <tr
                      key={flow.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Trigger */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 max-w-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              {flow.name}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {flow.nodeCount} خطوات
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {flow.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">مشغل البدء:</span>
                            <span className="text-[10px] font-semibold text-primary/90 bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded">
                              {flow.triggerLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Channels */}
                      <td className="py-4 px-4">{renderChannelBadges(flow.channels)}</td>

                      {/* Enrolled Count */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-foreground">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="tabular-nums">{flow.totalEnrolled}</span>
                        </div>
                      </td>

                      {/* Delivery Rate */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{flow.deliveryRate}%</span>
                        </div>
                      </td>

                      {/* Response Rate */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span className="tabular-nums">{flow.responseRate}%</span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleFlow(flow.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            flow.isEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              flow.isEnabled ? 'translate-x-0' : '-translate-x-4'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => onOpenCanvas(flow.id, flow.category)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-foreground transition-all shadow-2xs hover:text-primary"
                        >
                          <span>فتح الكانفاس</span>
                          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
