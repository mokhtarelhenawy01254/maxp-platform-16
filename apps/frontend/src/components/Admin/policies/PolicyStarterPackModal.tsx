import { useState } from "react";
import { X, Check, Sparkles, Building2, ShieldCheck } from "lucide-react";
import { INDUSTRY_POLICY_PACKS, StarterPolicy, IndustryPolicyPack } from "./policyPresets";

interface PolicyStarterPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (policies: StarterPolicy[]) => Promise<void>;
  isInstalling: boolean;
}

export default function PolicyStarterPackModal({
  isOpen,
  onClose,
  onInstall,
  isInstalling,
}: PolicyStarterPackModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>("dental_lab");
  const [selectedPolicies, setSelectedPolicies] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const currentPack: IndustryPolicyPack =
    INDUSTRY_POLICY_PACKS.find((p) => p.id === selectedPackId) || INDUSTRY_POLICY_PACKS[0]!;

  const isPolicySelected = (idx: number) => {
    const key = `${selectedPackId}-${idx}`;
    return selectedPolicies[key] !== false; // Default to checked
  };

  const togglePolicy = (idx: number) => {
    const key = `${selectedPackId}-${idx}`;
    setSelectedPolicies((prev) => ({
      ...prev,
      [key]: !isPolicySelected(idx),
    }));
  };

  const handleSelectAll = (select: boolean) => {
    const updates: Record<string, boolean> = {};
    currentPack.policies.forEach((_, idx) => {
      updates[`${selectedPackId}-${idx}`] = select;
    });
    setSelectedPolicies((prev) => ({ ...prev, ...updates }));
  };

  const handleInstall = async () => {
    const toInstall = currentPack.policies.filter((_, idx) => isPolicySelected(idx));
    if (toInstall.length === 0) return;
    await onInstall(toInstall);
  };

  const selectedCount = currentPack.policies.filter((_, idx) => isPolicySelected(idx)).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                حزم السياسات والشروط المعتمدة حسب نشاط الشركة
              </h2>
              <p className="text-[11px] text-muted-foreground">
                اختر مجال عملك لتثبيت حزمة سياسات وشروط قانونية واضحة ومجهزة فوراً لردود الذكاء الاصطناعي
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Industry Tabs */}
        <div className="px-5 py-2.5 border-b border-border/60 bg-muted/10 overflow-x-auto flex items-center gap-1.5">
          {INDUSTRY_POLICY_PACKS.map((pack) => {
            const isActive = pack.id === selectedPackId;
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackId(pack.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {pack.title}
              </button>
            );
          })}
        </div>

        {/* Content & Policies List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl p-3">
            <div>
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                {currentPack.title}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{currentPack.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAll(true)}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                تحديد الكل
              </button>
              <span className="text-muted-foreground/40">•</span>
              <button
                type="button"
                onClick={() => handleSelectAll(false)}
                className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {currentPack.policies.map((p, idx) => {
              const checked = isPolicySelected(idx);
              return (
                <div
                  key={idx}
                  onClick={() => togglePolicy(idx)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer text-right ${
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-card hover:bg-muted/20 opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition shrink-0 ${
                        checked
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border/80 bg-background"
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-foreground leading-snug">{p.title}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0 border border-border/60 font-medium">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{p.content}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-1.5 py-0.2 bg-background border border-border/70 rounded text-muted-foreground font-mono"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border/70 bg-muted/20 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            المحدد: <span className="font-semibold text-foreground font-mono tabular-nums">{selectedCount}</span> من{" "}
            <span className="font-mono tabular-nums">{currentPack.policies.length}</span> سياسة
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isInstalling}
              className="px-3.5 py-2 text-xs rounded-xl border border-border/80 text-foreground hover:bg-muted transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleInstall}
              disabled={isInstalling || selectedCount === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isInstalling ? "جاري التثبيت في قاعدة المعرفة..." : `تثبيت ${selectedCount} سياسات في القاعدة`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
