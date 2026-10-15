import React from 'react';
import { Check } from 'lucide-react';

interface StepItem {
  num: number;
  label: string;
}

interface CreateAdStepsNavProps {
  steps: StepItem[];
  currentStep: number;
  onSelectStep: (step: number) => void;
}

export const CreateAdStepsNav: React.FC<CreateAdStepsNavProps> = ({
  steps,
  currentStep,
  onSelectStep,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-border/60 pb-3">
      {steps.map((step) => {
        const isCurrent = currentStep === step.num;
        const isCompleted = step.num < currentStep;

        return (
          <button
            key={step.num}
            type="button"
            onClick={() => onSelectStep(step.num)}
            className={`flex items-center gap-2 p-2 rounded-lg text-right transition border text-xs ${
              isCurrent
                ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                : isCompleted
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-mono font-bold shrink-0 ${
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isCompleted ? <Check className="h-3 w-3 stroke-[2.5]" /> : step.num}
            </div>
            <span className="text-[11px] truncate">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
};
