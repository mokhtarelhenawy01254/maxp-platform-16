import { useTranslation } from 'react-i18next';
import React, { useState } from "react";
import { changeLanguage } from "../../i18n";

interface LanguageSwitcherProps {
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = "",
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLanguage = i18n.language || "ar";

  const languages = [
    { code: "ar", name: "العربية", flag: "🇸🇦" },
    { code: "en", name: "English", flag: "🇬🇧" },
  ];

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="business-icon-button business-shell-utility-button relative"
        title="تغيير اللغة / Change language"
        aria-label="Change language"
      >
        <span className="text-xs font-bold font-mono tracking-wider text-gray-700 dark:text-gray-300 uppercase">
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
          <div className="absolute ltr:right-0 rtl:left-0 z-50 mt-2 w-48 rounded-2xl bg-white shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full text-start px-4 py-2 text-sm flex items-center space-x-2 space-x-reverse
                    ${currentLanguage === language.code
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                    }
                    transition-colors duration-150
                  `}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span>{language.name}</span>
                  {currentLanguage === language.code && (
                    <span className="mr-auto">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
