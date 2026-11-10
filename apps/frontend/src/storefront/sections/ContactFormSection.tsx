import React, { useMemo, useState } from 'react';

interface ContactFormSectionProps {
  section?: Record<string, unknown>;
  settings?: {
    title?: string;
    subtitle?: string;
    infoItems?: unknown;
    whatsapp?: string;
    email?: string;
    submitText?: string;
    successText?: string;
    i18n?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

type InfoItem = { icon?: string; title?: string; value?: string; href?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const parseInfoItems = (value: unknown): InfoItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry) => ({
    icon: asText(entry.icon),
    title: asText(entry.title),
    value: asText(entry.value),
    href: asText(entry.href),
  }));
};

const ICONS: Record<string, React.ReactNode> = {
  pin: (
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
  ),
  mail: <path d="M4 4h16v16H4z M22 6l-10 7L2 6" />,
  clock: <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2" />,
};

const ContactFormSection: React.FC<ContactFormSectionProps> = ({ settings }) => {
  const s = isRecord(settings) ? settings : {};
  const locale = document.documentElement.lang || 'ar';
  const isEnglish = locale.toLowerCase().startsWith('en');

  const localized = useMemo(() => {
    const block = isRecord(s.i18n) && isRecord(s.i18n.en) ? (s.i18n.en as Record<string, unknown>) : {};
    return isEnglish ? block : {};
  }, [s.i18n, isEnglish]);

  const pick = (key: string, fallback: string) => {
    const en = localized[key];
    if (isEnglish && typeof en === 'string' && en.trim()) return en;
    const base = s[key];
    return typeof base === 'string' && base.trim() ? base : fallback;
  };

  const items = parseInfoItems(s.infoItems);
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const whatsapp = asText(s.whatsapp);
  const email = asText(s.email);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const lines = [
      `${pick('nameLabel', 'الاسم')}: ${form.name}`,
      `${pick('phoneLabel', 'الهاتف')}: ${form.phone}`,
      form.email ? `${pick('emailLabel', 'البريد')}: ${form.email}` : '',
      '',
      form.message,
    ].filter(Boolean);
    const body = encodeURIComponent(lines.join('\n'));

    if (whatsapp) {
      const digits = whatsapp.replace(/[^\d]/g, '');
      window.open(`https://wa.me/${digits}?text=${body}`, '_blank', 'noopener');
    } else if (email) {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(pick('title', 'رسالة من الموقع'))}&body=${body}`;
    }
    setSent(true);
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';

  return (
    <section className="w-full bg-background py-12 md:py-16">
      <div className="mx-auto w-full max-w-[1235px] px-4 md:px-6">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
            {pick('title', 'تواصل معنا')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {pick('subtitle', 'فريقنا بيرد على استفساراتك خلال ساعات العمل.')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="space-y-3">
            {items.map((item, index) => {
              const icon = ICONS[(item.icon || 'pin').toLowerCase()] || ICONS.pin;
              const content = (
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4 transition hover:border-primary/40">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.title}</p>
                    <p className="mt-1 text-sm font-bold text-foreground break-words" dir="auto">{item.value}</p>
                  </div>
                </div>
              );
              return item.href ? (
                <a key={`${item.title}-${index}`} href={item.href} className="block" target="_blank" rel="noreferrer">
                  {content}
                </a>
              ) : (
                <div key={`${item.title}-${index}`}>{content}</div>
              );
            })}
          </div>

          <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-foreground">{pick('nameLabel', 'الاسم')}</span>
                <input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-foreground">{pick('phoneLabel', 'رقم الموبايل')}</span>
                <input className={inputClass} required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold text-foreground">{pick('emailLabel', 'البريد الإلكتروني')}</span>
              <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs font-bold text-foreground">{pick('messageLabel', 'رسالتك')}</span>
              <textarea
                className={`${inputClass} min-h-[130px] resize-y`}
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </label>
            <button
              type="submit"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 sm:w-auto"
            >
              {pick('submitText', 'إرسال الرسالة')}
            </button>
            {sent ? (
              <p className="mt-3 text-xs font-bold text-emerald-600">
                {pick('successText', 'تم تجهيز رسالتك — كمّل الإرسال من واتساب/البريد.')}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactFormSection;
