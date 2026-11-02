import React, { useState } from 'react';
import { Users, X, Plus } from 'lucide-react';
import type { DuplicateOrderSettingsData } from './types';

interface DuplicateOrderWhitelistCardProps {
  settings?: DuplicateOrderSettingsData;
  setSettings?: React.Dispatch<React.SetStateAction<DuplicateOrderSettingsData>>;
  exemptPhonesText?: string;
  setExemptPhonesText?: (v: string) => void;
}

export const DuplicateOrderWhitelistCard: React.FC<DuplicateOrderWhitelistCardProps> = ({
  settings,
  setSettings,
  exemptPhonesText,
  setExemptPhonesText,
}) => {
  const [inputValue, setInputValue] = useState('');

  // Extract phones from settings or fallback to exemptPhonesText
  const phones =
    settings?.excludedPhones ||
    settings?.exemptPhones ||
    (exemptPhonesText
      ? exemptPhonesText
          .split(/[\n,;]+/)
          .map((p) => p.trim())
          .filter(Boolean)
      : []);

  const updatePhones = (newPhones: string[]) => {
    if (setSettings) {
      setSettings((prev) => ({
        ...prev,
        excludedPhones: newPhones,
        exemptPhones: newPhones,
      }));
    }
    if (setExemptPhonesText) {
      setExemptPhonesText(newPhones.join('\n'));
    }
  };

  const handleAdd = (valueToAdd?: string) => {
    const raw = (valueToAdd !== undefined ? valueToAdd : inputValue).trim();
    if (!raw) return;

    const parts = raw
      .split(/[\n,;\s]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) return;

    const newItems = parts.filter((p) => !phones.includes(p));
    const updated = [...phones, ...newItems];
    updatePhones(updated);
    setInputValue('');
  };

  const handleRemove = (phoneToRemove: string) => {
    const updated = phones.filter((p) => p !== phoneToRemove);
    updatePhones(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary shrink-0" />
          <label className="text-xs font-semibold text-foreground">
            استثناءات (أرقام مستثناة من الفحص)
          </label>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
          {phones.length} رقم مستثنى
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        أرقام تجار الجملة والعملاء المميزين (VIP) لتجاوز فحص التكرار والسماح بطلبات متتالية دون تقييد:
      </p>

      {/* Input to add numbers */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رقم الهاتف واضغط Enter أو إضافة (يمكنك لصق عدة أرقام مفصولة)..."
          className="flex-1 px-3 py-1.5 text-xs border border-border/60 rounded-lg bg-background text-foreground font-mono tabular-nums focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={() => handleAdd()}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="size-3.5" />
          <span>إضافة</span>
        </button>
      </div>

      {/* Chips container */}
      <div className="min-h-[64px] p-2.5 rounded-lg border border-border/40 bg-muted/20">
        {phones.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/70 text-center py-3">
            لا توجد أرقام مستثناة حالياً. أضف أرقام تجار الجملة لتجاوز الفحص.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {phones.map((phone) => (
              <span
                key={phone}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-background border border-border/70 text-foreground shadow-2xs hover:border-destructive/40 transition-colors group"
              >
                <span dir="ltr">{phone}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(phone)}
                  aria-label={`حذف الرقم ${phone}`}
                  className="text-muted-foreground group-hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
