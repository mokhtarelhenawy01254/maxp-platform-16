import { ExternalLink as ArrowTopRightOnSquareIcon, Clipboard as ClipboardDocumentIcon, Check as CheckIcon } from 'lucide-react';
import { useState } from 'react';
;
import { marketingSections } from '../landing/marketingLandingData';

const SuperAdminMarketingLinks = () => {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const liveCount = marketingSections.filter((section) => section.status === 'live').length;
  const upcomingCount = marketingSections.filter((section) => section.status === 'upcoming').length;

  const copyLink = async (slug: string) => {
    const path = `/marketing/${slug}`;
    const fullUrl = `${window.location.origin}${path}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 1800);
    } catch (error) {
      console.error('Failed to copy link', error);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto space-y-6">
        <header className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
            مركز روابط صفحات التسويق
          </h1>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            هذا القسم مخصص لفريق السوبر أدمن لتجميع كل روابط صفحات الهبوط التسويقية مع شرح واضح
            لكل صفحة: الجمهور المستهدف، الهدف التحويلي، وحالة الصفحة.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <article className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">إجمالي صفحات اللاندنج</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{marketingSections.length}</p>
          </article>
          <article className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">صفحات جاهزة الآن</p>
            <p className="text-3xl font-bold text-emerald-600">{liveCount}</p>
          </article>
          <article className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">صفحات قيد الإطلاق</p>
            <p className="text-3xl font-bold text-amber-600">{upcomingCount}</p>
          </article>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">الروابط والشرح</h2>
            <a
              href="/marketing"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              فتح مركز اللاندنج العام
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
            </a>
          </div>

          <div className="space-y-4">
            {marketingSections.map((section) => {
              const sectionPath = `/marketing/${section.slug}`;
              const isCopied = copiedSlug === section.slug;

              return (
                <article
                  key={section.slug}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-5 bg-slate-50/70 dark:bg-slate-900/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{section.pageTitle}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{section.kicker}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        section.status === 'upcoming'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }`}
                    >
                      {section.status === 'upcoming' ? 'قريبًا' : 'جاهزة'}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
                    {section.heroLead}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الجمهور المستهدف</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{section.audience}</p>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">هدف الصفحة (Conversion)</p>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{section.conversionGoal}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <code className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm">
                      {sectionPath}
                    </code>
                    <div className="flex items-center gap-2">
                      <a
                        href={sectionPath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                      >
                        فتح الصفحة
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyLink(section.slug)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {isCopied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                        {isCopied ? 'تم النسخ' : 'نسخ الرابط'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SuperAdminMarketingLinks;

