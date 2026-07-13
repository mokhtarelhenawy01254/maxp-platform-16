import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import './marketingLanding.css';
import { findMarketingSection } from './marketingLandingData';

const MarketingSectionLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const section = slug ? findMarketingSection(slug) : undefined;

  if (!section) {
    return (
      <main className="ml-shell" dir="rtl">
        <nav className="ml-nav">
          <div className="ml-wrap ml-nav-row">
            <Link to="/marketing" className="ml-brand">
              <span className="ml-brand-badge">MX</span>
              <span>Marketing Landing Kit</span>
            </Link>
          </div>
        </nav>
        <section className="ml-wrap ml-hero">
          <span className="ml-kicker">404</span>
          <h1 className="ml-title">الصفحة غير موجودة</h1>
          <p className="ml-lead">تأكد من الرابط أو ارجع لمركز الصفحات التسويقية.</p>
          <div className="ml-hero-actions">
            <Link to="/marketing" className="ml-btn">الرجوع للمركز</Link>
          </div>
        </section>
      </main>
    );
  }

  const themeStyle = {
    '--ml-accent': section.theme.accent,
    '--ml-accent-soft': section.theme.accentSoft,
    '--ml-gradient-from': section.theme.gradientFrom,
    '--ml-gradient-to': section.theme.gradientTo,
  } as CSSProperties;

  return (
    <main className="ml-shell" style={themeStyle} dir="rtl">
      <nav className="ml-nav">
        <div className="ml-wrap ml-nav-row">
          <Link to="/marketing" className="ml-brand">
            <span className="ml-brand-badge">MX</span>
            <span>{section.navLabel}</span>
          </Link>
          <div className="ml-hero-actions">
            <Link to="/marketing" className="ml-btn-ghost">كل الصفحات</Link>
            <Link to="/auth/register" className="ml-btn">ابدأ الآن</Link>
          </div>
        </div>
      </nav>

      <section className="ml-wrap ml-hero">
        <span className="ml-kicker">{section.kicker}</span>
        <h1 className="ml-title">{section.pageTitle}</h1>
        <p className="ml-lead">{section.heroLead}</p>
        <div className="ml-strip">
          <div className="ml-chip">الجمهور: {section.audience}</div>
          <div className="ml-chip">الهدف: {section.conversionGoal}</div>
          <div className="ml-chip">
            الحالة:
            <span className={`ml-status ${section.status}`}>
              {section.status === 'upcoming' ? ' قريبًا' : ' جاهزة'}
            </span>
          </div>
        </div>
        <div className="ml-hero-actions">
          <Link to="/auth/register" className="ml-btn">{section.primaryCta}</Link>
          <Link to="/marketing" className="ml-btn-ghost">{section.secondaryCta}</Link>
        </div>
      </section>

      <section className="ml-wrap ml-section">
        <h2 className="ml-section-head">المشكلة الحالية في السوق</h2>
        <div className="ml-two-col">
          <div className="ml-panel">
            <h4>نقاط الألم</h4>
            <ul className="ml-list">
              {section.pains.map((pain) => (
                <li key={pain}>{pain}</li>
              ))}
            </ul>
          </div>
          <div className="ml-panel">
            <h4>العرض التسويقي المقترح</h4>
            <div className="ml-offers">
              {section.offers.map((offer) => (
                <div key={offer} className="ml-offer">{offer}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="ml-wrap ml-section">
        <h2 className="ml-section-head">رسائل الصفحة الأساسية</h2>
        <div className="ml-card-grid">
          {section.pillars.map((pillar) => (
            <article key={pillar.title} className="ml-card">
              <h3>{pillar.title}</h3>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ml-wrap ml-section">
        <h2 className="ml-section-head">عناصر إثبات القيمة</h2>
        <div className="ml-metrics">
          {section.metrics.map((metric) => (
            <div key={metric.label} className="ml-metric">
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="ml-wrap ml-cta-block">
        <h3>CTA المقترح لهذه الصفحة</h3>
        <p>
          الهدف من هذه Landing هو دفع الزائر لخطوة قرار مباشرة. استخدم CTA موحد عبر الإعلانات
          والمحتوى والمبيعات لضمان أعلى Conversion.
        </p>
        <div className="ml-cta-actions">
          <Link to="/auth/register" className="ml-btn">{section.primaryCta}</Link>
          <Link to="/marketing" className="ml-btn-ghost">العودة لمركز الصفحات</Link>
        </div>
      </section>

      <div className="ml-wrap ml-footnote">
        <p>Slug: <code>{section.slug}</code></p>
      </div>
    </main>
  );
};

export default MarketingSectionLanding;
