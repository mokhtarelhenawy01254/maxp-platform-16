import React from 'react';
import { resolveSectionVariant } from '../variants';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { resolveSectionContentAlign } from '../utils/contentAlignment';

interface NewsletterProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    description?: string;
    buttonText?: string;
    placeholder?: string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

const NewsletterForm = ({
  emailInputId,
  buttonText,
  placeholder,
  label,
}: {
  emailInputId: string;
  buttonText: string;
  placeholder: string;
  label: string;
}) => (
  <form 
    className="w-full flex flex-col sm:flex-row gap-3 mt-4"
    onSubmit={(e) => e.preventDefault()}
  >
    <label htmlFor={emailInputId} className="sr-only">
      {label}
    </label>
    <input 
      id={emailInputId}
      name="email"
      type="email" 
      placeholder={placeholder}
      required
      autoComplete="email"
      className="flex-1 px-6 py-4 rounded-[var(--radius)] bg-primary-foreground text-foreground border-none focus:ring-4 focus:ring-white/20 transition-all text-lg placeholder:text-muted-foreground"
    />
    <button 
      type="submit"
      className="px-8 py-4 bg-foreground text-background font-bold rounded-[var(--radius)] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 text-lg whitespace-nowrap"
    >
      {buttonText}
    </button>
  </form>
);

const FeaturesList = ({ 
  noSpamText, 
  weeklyUpdatesText, 
  unsubscribeText 
}: { 
  noSpamText?: string; 
  weeklyUpdatesText?: string; 
  unsubscribeText?: string; 
}) => (
  <div className="flex flex-wrap gap-6 pt-4 text-sm font-medium text-primary-foreground/90">
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
      {noSpamText || 'No Spam'}
    </div>
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
      {weeklyUpdatesText || 'Weekly Updates'}
    </div>
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
      {unsubscribeText || 'Unsubscribe anytime'}
    </div>
  </div>
);

const StandardNewsletter = ({ title, subtitle, emailInputId, buttonText, placeholder, noSpamText, weeklyUpdatesText, unsubscribeText, direction }: any) => (
  <section className="w-full py-20 lg:py-28 bg-primary text-primary-foreground relative overflow-hidden" dir={direction}>
    <div className="absolute top-0 end-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 rtl:-translate-x-1/2 blur-2xl" />
    <div className="absolute bottom-0 start-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 blur-2xl" />

    <div className="container px-4 md:px-6 relative z-10 flex flex-col items-center text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-heading">
          {title}
        </h2>
        <p className="max-w-[600px] text-primary-foreground/80 md:text-xl font-sans text-balance">
          {subtitle}
        </p>
      </div>

      <div className="w-full max-w-lg">
        <NewsletterForm
          emailInputId={emailInputId}
          buttonText={buttonText}
          placeholder={placeholder}
          label={placeholder}
        />
      </div>

      <div className="flex justify-center">
        <FeaturesList 
          noSpamText={noSpamText}
          weeklyUpdatesText={weeklyUpdatesText}
          unsubscribeText={unsubscribeText}
        />
      </div>
    </div>
  </section>
);

const SplitPanelNewsletter = ({ title, subtitle, emailInputId, buttonText, placeholder, noSpamText, weeklyUpdatesText, unsubscribeText, direction, contentAlign }: any) => (
  <section className="w-full bg-background border-y border-border" dir={direction}>
    <div className="container px-0 md:px-6 py-8 md:py-12 lg:py-20">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center bg-primary text-primary-foreground md:rounded-[var(--radius)] overflow-hidden">
        <div className={`p-8 md:p-12 lg:p-16 space-y-6 relative h-full flex flex-col justify-center bg-black/10 ${contentAlign === 'center' ? 'items-center text-center' : ''}`}>
           <div className="absolute top-0 start-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2 rtl:translate-x-1/2 blur-2xl" />
           <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl font-heading relative z-10 leading-tight">
            {title}
          </h2>
          <p className="text-primary-foreground/90 md:text-lg text-balance relative z-10">
            {subtitle}
          </p>
        </div>
        <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center space-y-8">
          <NewsletterForm
            emailInputId={emailInputId}
            buttonText={buttonText}
            placeholder={placeholder}
            label={placeholder}
          />
          <FeaturesList 
            noSpamText={noSpamText}
            weeklyUpdatesText={weeklyUpdatesText}
            unsubscribeText={unsubscribeText}
          />
        </div>
      </div>
    </div>
  </section>
);

const MinimalNewsletter = ({ title, subtitle, emailInputId, buttonText, placeholder, noSpamText, weeklyUpdatesText, unsubscribeText, direction, contentAlign }: any) => (
  <section className="w-full bg-muted border-y border-border py-12 lg:py-16" dir={direction}>
    <div className="container px-4 md:px-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className={`flex-1 space-y-3 text-center ${contentAlign === 'center' ? '' : 'lg:text-start'}`}>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-heading text-foreground">
            {title}
          </h2>
          <p className="text-muted-foreground text-balance md:text-lg">
            {subtitle}
          </p>
        </div>
        <div className="w-full lg:w-auto lg:min-w-[450px]">
           <NewsletterForm
             emailInputId={emailInputId}
             buttonText={buttonText}
             placeholder={placeholder}
             label={placeholder}
           />
           <div className={`flex justify-center ${contentAlign === 'center' ? '' : 'lg:justify-start'}`}>
             <FeaturesList 
               noSpamText={noSpamText}
               weeklyUpdatesText={weeklyUpdatesText}
               unsubscribeText={unsubscribeText}
             />
           </div>
        </div>
      </div>
    </div>
  </section>
);

const EditorialStripNewsletter = ({ title, subtitle, emailInputId, buttonText, placeholder, direction }: any) => (
  <section className="w-full border-y border-[#efe3dd] bg-[#fcf8f5] py-16 lg:py-20" dir={direction}>
    <div className="container px-4 md:px-6">
      <div className="mx-auto max-w-3xl space-y-5 text-center">
        <h2 className="font-heading text-[2rem] font-semibold tracking-tight text-[#201915] md:text-[2.7rem]">
          {title}
        </h2>
        <p className="mx-auto max-w-2xl text-sm leading-7 text-[#7b6d68] md:text-base">
          {subtitle}
        </p>
        <div className="mx-auto max-w-2xl">
          <NewsletterForm
            emailInputId={emailInputId}
            buttonText={buttonText}
            placeholder={placeholder}
            label={placeholder}
          />
        </div>
      </div>
    </div>
  </section>
);

const normalizeNewsletterVariant = (rawVariant: unknown): 'standard' | 'minimal' | 'split-panel' | 'dark' | 'editorial-strip' =>
  resolveSectionVariant('Newsletter', rawVariant, 'standard');

const Newsletter: React.FC<NewsletterProps> = ({ section, settings }) => {
  const { theme } = useStorefrontTheme();
  const isRtl = theme.direction === 'rtl';
  const emailInputId = React.useId();
  const variant = normalizeNewsletterVariant(section?.variant);
  const contentAlign = resolveSectionContentAlign(
    settings?.contentAlign,
    theme.tokens?.layout?.contentAlign,
  );

  const title = settings?.title || (isRtl ? 'اشترك للحصول على أحدث الإصدارات' : 'Stay in the Loop');
  const subtitle =
    settings?.subtitle ||
    settings?.description ||
    (isRtl
      ? 'اشترك ليصلك جديد المتجر والعروض الحصرية قبل نفادها.'
      : 'Subscribe to receive curated design stories, early access to new collections, and exclusive member-only offers.');

  const buttonText = settings?.buttonText || (isRtl ? 'اشترك الآن' : 'Subscribe');
  const placeholder = settings?.placeholder || (isRtl ? 'أدخل بريدك الإلكتروني' : 'Enter your email address');

  const noSpamText = (settings?.['noSpamText'] as string) || (isRtl ? 'بدون إزعاج' : 'No Spam');
  const weeklyUpdatesText = (settings?.['weeklyUpdatesText'] as string) || (isRtl ? 'تحديثات أسبوعية' : 'Weekly Updates');
  const unsubscribeText = (settings?.['unsubscribeText'] as string) || (isRtl ? 'إلغاء الاشتراك في أي وقت' : 'Unsubscribe anytime');

  switch (variant) {
    case 'split-panel':
      return (
        <SplitPanelNewsletter
          title={title}
          direction={theme.direction}
          subtitle={subtitle}
          emailInputId={emailInputId}
          buttonText={buttonText}
          placeholder={placeholder}
          noSpamText={noSpamText}
          weeklyUpdatesText={weeklyUpdatesText}
          unsubscribeText={unsubscribeText}
          contentAlign={contentAlign}
        />
      );
    case 'minimal':
      return (
        <MinimalNewsletter
          title={title}
          direction={theme.direction}
          subtitle={subtitle}
          emailInputId={emailInputId}
          buttonText={buttonText}
          placeholder={placeholder}
          noSpamText={noSpamText}
          weeklyUpdatesText={weeklyUpdatesText}
          unsubscribeText={unsubscribeText}
          contentAlign={contentAlign}
        />
      );
    case 'editorial-strip':
      return (
        <EditorialStripNewsletter
          title={title}
          direction={theme.direction}
          subtitle={subtitle}
          emailInputId={emailInputId}
          buttonText={buttonText}
          placeholder={placeholder}
        />
      );
    case 'dark':
    case 'standard':
    default:
      return (
        <StandardNewsletter
          title={title}
          direction={theme.direction}
          subtitle={subtitle}
          emailInputId={emailInputId}
          buttonText={buttonText}
          placeholder={placeholder}
          noSpamText={noSpamText}
          weeklyUpdatesText={weeklyUpdatesText}
          unsubscribeText={unsubscribeText}
        />
      );
  }
};

export default Newsletter;
