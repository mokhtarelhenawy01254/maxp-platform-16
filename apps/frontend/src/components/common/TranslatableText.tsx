import { useTranslation } from 'react-i18next';
import React from 'react';
interface TProps {
  k: string;
  values?: Record<string, string | number>;
  fallback?: string;
  className?: string;
}

const TranslatableText: React.FC<TProps> = ({ k, values, fallback, className }) => {
  const { t } = useTranslation();
  const translated = t(k, values);
  const display = translated === k && fallback ? fallback : translated;
  return <span className={className}>{display}</span>;
};

export default TranslatableText;
