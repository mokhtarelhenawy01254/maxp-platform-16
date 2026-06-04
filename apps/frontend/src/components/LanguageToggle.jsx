import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { toggleLanguage, getDirection } from '../i18n';

const LanguageToggle = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isArabic = currentLang === 'ar';

  const handleLanguageToggle = () => {
    const newLang = toggleLanguage();
    
    // Update page title and meta description
    const title = t('platform.title');
    const description = t('platform.description');
    
    document.title = title;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Update Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    
    if (ogTitle) ogTitle.setAttribute('content', title);
    if (ogDescription) ogDescription.setAttribute('content', description);
    if (twitterTitle) twitterTitle.setAttribute('content', title);
    if (twitterDescription) twitterDescription.setAttribute('content', description);
  };

  return (
    <button 
      onClick={handleLanguageToggle}
      className="language-toggle"
      title={`Switch to ${isArabic ? 'English' : 'العربية'}`}
    >
      <Globe size={16} />
      <span className="language-text">{t('language.switch')}</span>
    </button>
  );
};

export default LanguageToggle;
