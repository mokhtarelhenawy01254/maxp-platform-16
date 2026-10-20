import React, { useState, useEffect } from 'react';
import {
  ListOrdered,
  Layers,
  Sparkles,
  RotateCw,
  AlertCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { ManufacturingHeader } from '../ManufacturingHeader';
import {
  manufacturingApi,
  ProductionStageTemplate,
  ProductionStageTemplateSet,
} from '../manufacturingApi';
import { StageTemplatesListTab } from './tabs/StageTemplatesListTab';
import { StageTemplateSetsTab } from './tabs/StageTemplateSetsTab';

export const StageTemplatesLibraryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'SETS' | 'TEMPLATES'>('SETS');
  const [templates, setTemplates] = useState<ProductionStageTemplate[]>([]);
  const [sets, setSets] = useState<ProductionStageTemplateSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tmplData, setsData] = await Promise.all([
        manufacturingApi.listStageTemplates(),
        manufacturingApi.listStageTemplateSets(),
      ]);
      setTemplates(tmplData);
      setSets(setsData);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحميل بيانات مكتبة مراحل الإنتاج');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalTemplateUsages = templates.reduce((sum, t) => sum + (t.usageCount || 0), 0);
  const activeTemplatesCount = templates.filter((t) => t.isActive).length;
  const activeSetsCount = sets.filter((s) => s.isActive).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
      <ManufacturingHeader
        title="مكتبة مراحل الإنتاج القياسية (Standards & Stage Templates)"
        subtitle="تعريف القوالب ومسارات التشغيل المعيارية، واستدعاؤها في أوامر التشغيل والـBOM بنظام النسخ المنفصل (Snapshot)"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={loadData}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* Overview Stats Chassis */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">المسارات القياسية (Sets)</span>
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                {activeSetsCount}
              </span>
              <span className="text-[11px] text-muted-foreground">مسار نشط</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">قوالب المراحل الفردية</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <ListOrdered className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                {activeTemplatesCount}
              </span>
              <span className="text-[11px] text-muted-foreground">قالب جاهز</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/70 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">مرات الاستدعاء للأوامر</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                {totalTemplateUsages}
              </span>
              <span className="text-[11px] text-muted-foreground">مرة استخدام</span>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-1">
          <button
            onClick={() => setActiveTab('SETS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SETS'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>المسارات والمجموعات القياسية ({sets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('TEMPLATES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'TEMPLATES'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>مكتبة القوالب الفردية ({templates.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'SETS' ? (
          <StageTemplateSetsTab sets={sets} loading={loading} onRefresh={loadData} />
        ) : (
          <StageTemplatesListTab templates={templates} loading={loading} onRefresh={loadData} />
        )}
      </div>
    </div>
  );
};

export default StageTemplatesLibraryPage;
