import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calculator, ArrowLeftRight, Scale, ShieldAlert } from 'lucide-react';
import ManufacturingHeader from '../ManufacturingHeader';
import FabricConversionTab from './FabricConversionTab';
import FabricRequirementsTab from './FabricRequirementsTab';
import FabricActualWasteTab from './FabricActualWasteTab';

export const FabricCalculatorPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'requirements';
  const [activeTab, setActiveTab] = useState<'conversion' | 'requirements' | 'waste'>(
    initialTab === 'conversion' || initialTab === 'waste' ? initialTab : 'requirements'
  );

  const initialWidth = searchParams.get('widthM') || '1.6';
  const initialGsm = searchParams.get('gsm') || '240';
  const initialConsumption = searchParams.get('consumption') || '1.4';
  const initialPieces = searchParams.get('pieces') || '1000';

  const handleTabChange = (tab: 'conversion' | 'requirements' | 'waste') => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-right" dir="rtl">
      {/* Module Navigation Header */}
      <ManufacturingHeader
        title="حاسبة القماش والمعادلات النسيجية"
        subtitle="تحويل الكيلو والمتر وGSM، تخطيط استهلاك وتكلفة القماش، وتسوية الهالك الفعلي (معايير HUINZO)"
      />

      {/* Main Container */}
      <div className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
        {/* Anti-Error & Rule Banner */}
        <div className="p-3 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>
              <strong>قاعدة المنظومة:</strong> «يمنع تسجيل وحدة غير مبرمجة / قسمة على صفر أو نسبة هالك غير صالحة».
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-muted/60 border border-border/60">
              1م طولي = العرض × GSM ÷ 1000
            </span>
            <span className="hidden md:inline px-2 py-0.5 rounded bg-muted/60 border border-border/60">
              المطلوب = الأساسي ÷ (1 − الهالك%)
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/70 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('requirements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'requirements'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Calculator className="w-4 h-4 text-primary" />
            <span>احتياجات القماش والتكلفة (BOM & Costing)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('conversion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'conversion'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <span>تحويل كيلو ↔ متر (GSM & Weights)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('waste')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'waste'
                ? 'bg-card text-foreground shadow-sm border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Scale className="w-4 h-4 text-primary" />
            <span>الهالك الفعلي والجرد (Actual Scrap)</span>
          </button>
        </div>

        {/* Tab Content Panes */}
        <div className="transition-all duration-150">
          {activeTab === 'requirements' && (
            <FabricRequirementsTab
              initialWidth={initialWidth}
              initialGsm={initialGsm}
              initialConsumption={initialConsumption}
              initialPieces={initialPieces}
            />
          )}

          {activeTab === 'conversion' && (
            <FabricConversionTab
              initialWidth={initialWidth}
              initialGsm={initialGsm}
            />
          )}

          {activeTab === 'waste' && <FabricActualWasteTab />}
        </div>
      </div>
    </div>
  );
};

export default FabricCalculatorPage;
