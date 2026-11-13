import React from 'react';
import {
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Check,
  Send,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import type { SimulatorScenario } from './types';

interface EducationFlowSimulatorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: SimulatorScenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  scenario: SimulatorScenario;
  isSimulating: boolean;
  currentStep: number;
  isFinished: boolean;
  onStartSimulation: () => void;
  onResetSimulation: () => void;
}

export const EducationFlowSimulatorDrawer: React.FC<EducationFlowSimulatorDrawerProps> = ({
  isOpen,
  onClose,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
  scenario,
  isSimulating,
  currentStep,
  isFinished,
  onStartSimulation,
  onResetSimulation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                محاكي فلو الرسايل التفاعلي
              </h3>
              <p className="text-[11px] text-muted-foreground">
                تجربة حية لسيناريوهات واتساب، نافذة الـ 24 ساعة، واستدعاء أدوات الذكاء الاصطناعي
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Scenario Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              اختر سيناريو المحاكاة التجريبي:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {scenarios.map((scen) => {
                const active = scen.id === selectedScenarioId;
                return (
                  <button
                    key={scen.id}
                    type="button"
                    onClick={() => {
                      onSelectScenario(scen.id);
                      onResetSimulation();
                    }}
                    className={`text-right p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                      active
                        ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                        : 'bg-card border-border hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-foreground">
                        {scen.titleAr}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        العميل: {scen.parentName} · الطالب: {scen.studentName} ({scen.studentAge} سنة)
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${
                        scen.windowState === 'IN_WINDOW_24H'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {scen.windowState === 'IN_WINDOW_24H'
                        ? 'داخل 24h (رد حر)'
                        : 'خارج 24h (قالب Utility)'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Incoming Message Box */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5 text-foreground font-semibold">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                الرسالة / المشغل الوارد ({scenario.channel}):
              </span>
              <span className="text-[11px] font-mono">
                {scenario.parentName}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border text-xs text-foreground font-mono">
              {scenario.incomingMessage}
            </div>
          </div>

          {/* Trigger Simulation Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSimulating}
              onClick={onStartSimulation}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSimulating ? 'جاري تنفيذ خطوات الفلو...' : 'تشغيل محاكاة الفلو الآن'}</span>
            </button>

            {(currentStep > 0 || isFinished) && (
              <button
                type="button"
                onClick={onResetSimulation}
                className="p-2.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                title="إعادة ضبط"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Step-by-Step Execution Trace */}
          {currentStep > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                سجل تتبع التنفيذ اللحظي (Execution Trace):
              </h4>

              <div className="space-y-2">
                {scenario.traceSteps.map((step, idx) => {
                  const isCurrent = currentStep === step.step;
                  const isPast = currentStep > step.step;
                  const isPending = currentStep < step.step;

                  return (
                    <div
                      key={step.step}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        isCurrent
                          ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                          : isPast
                          ? 'bg-card border-border'
                          : 'opacity-40 bg-muted/20 border-border/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isPast
                                ? 'bg-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-primary text-primary-foreground animate-pulse'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isPast ? <Check className="w-3 h-3" /> : step.step}
                          </div>
                          <span className="font-bold text-foreground">
                            {step.nodeTitleAr}
                          </span>
                        </div>

                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono text-muted-foreground">
                          {step.toolUsed}
                        </code>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1.5 pr-7">
                        {step.resultAr}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outbound Preview (Simulated Chat Bubble) */}
          {(isFinished || currentStep >= scenario.traceSteps.length) && (
            <div className="space-y-2 pt-2 border-t border-border animate-in fade-in-50 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  معاينة الرسالة الصادرة للعميل (Outbound Preview):
                </h4>
                {scenario.outboundPreview.isMetaUtilityTemplate && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                    قالب معتمد: {scenario.outboundPreview.templateName}
                  </span>
                )}
              </div>

              {/* Chat Bubble Container */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-3">
                <div className="p-3.5 rounded-2xl rounded-tr-xs bg-card border border-border shadow-xs text-xs text-foreground whitespace-pre-line leading-relaxed">
                  {scenario.outboundPreview.messageText}
                </div>

                {/* Clickable Quick Reply Action Buttons */}
                {scenario.outboundPreview.actionButtons &&
                  scenario.outboundPreview.actionButtons.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground block pr-1">
                        أزرار الاختيار السريع للعميل:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {scenario.outboundPreview.actionButtons.map((btn, i) => (
                          <div
                            key={i}
                            className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold shadow-2xs flex items-center gap-1.5"
                          >
                            <span>{btn}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
