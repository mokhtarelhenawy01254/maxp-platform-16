import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Globe } from "lucide-react";
import { changeLanguage } from "../../i18n";

interface LanguageSwitcherProps {
  className?: string;
}

const LANGUAGES = [
  { code: "ar", name: "العربية", tag: "AR" },
  { code: "en", name: "English", tag: "EN" },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "",
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = i18n.language || "ar";

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="business-icon-button business-shell-utility-button relative inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors shadow-2xs active:scale-95"
        title="تغيير اللغة / Change language"
        aria-label="Change language"
      >
        <Globe className="size-3.5 text-muted-foreground" />
        <span className="text-[11px] font-bold font-mono tracking-wider text-foreground uppercase tabular-nums">
          {currentLanguage}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute ltr:right-0 rtl:left-0 z-50 mt-1.5 w-44 rounded-xl border border-border/70 bg-card p-1 shadow-lg divide-y divide-border/40">
            <div className="py-0.5 space-y-0.5">
              {LANGUAGES.map((language) => {
                const isActive = currentLanguage === language.code;
                return (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`
                      w-full text-start px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between gap-2 transition-colors
                      ${isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center size-5 rounded-md bg-muted text-[10px] font-mono font-bold text-muted-foreground">
                        {language.tag}
                      </span>
                      <span className="truncate">{language.name}</span>
                    </div>
                    {isActive && (
                      <Check className="size-3.5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
