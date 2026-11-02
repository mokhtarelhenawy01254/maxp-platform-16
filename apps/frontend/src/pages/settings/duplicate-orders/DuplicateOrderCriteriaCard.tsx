import React from 'react';
import { CRITERION_OPTIONS } from './constants';
import type { DuplicateOrderSettingsData } from './types';

interface DuplicateOrderCriteriaCardProps {
  settings: DuplicateOrderSettingsData;
  setSettings: React.Dispatch<React.SetStateAction<DuplicateOrderSettingsData>>;
}

export const DuplicateOrderCriteriaCard: React.FC<DuplicateOrderCriteriaCardProps> = ({
  settings,
  setSettings,
}) => {
  const currentCriterion = settings.criterion || (settings.criteria === 'phone_items' ? 'phone_products' : settings.criteria) || 'phone';

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
      <label className="block text-xs font-semibold text-foreground">معيار كشف التكرار</label>
      <div className="space-y-2">
        {CRITERION_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              currentCriterion === opt.id
                ? 'border-primary/50 bg-primary/5'
                : 'border-border/50 hover:bg-muted/40'
            }`}
          >
            <input
              type="radio"
              name="duplicateCriteria"
              value={opt.id}
              checked={currentCriterion === opt.id}
              onChange={() =>
                setSettings((s) => ({
                  ...s,
                  criterion: opt.id,
                  criteria: opt.id,
                }))
              }
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">{opt.title}</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
