import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import './marketingLanding.css';
import { marketingSections } from './marketingLandingData';

const MarketingLandingHub = () => {
  const liveCount = marketingSections.filter((section) => section.status === 'live').length;
  const upcomingCount = marketingSections.filter((section) => section.status === 'upcoming').length;

  return (
    <main className="ml-shell" dir="rtl">
      <nav className="ml-nav">
        <div className="ml-wrap ml-nav-row">
          <Link to="/marketing" className="ml-brand">
            <span className="ml-brand-badge">MX</span>
            <span>Marketing Landing Kit</span>
          </Link>
          <div className="ml-hero-actions">
            <Link to="/auth/register" className="ml-btn">ابدأ الآن</Link>
            <Link to="/auth/login" className="ml-btn-ghost">دخول النظام</Link>
          </div>
        </div>
      </nav>

      <section className="ml-wrap ml-hero">
        <span className="ml-kicker">Modern Arabic Commerce Style</span>
        <h1 className="ml-title">مركز صفحات الهبوط التسويقية</h1>
        <p className="ml-lead">
          كل قسم في المشروع له Landing مستقلة برسالة بيعية واضحة. الصفحة دي هي نقطة الانطلاق
          لفريق التسويق والمحتوى والمبيعات.
        </p>
        <div className="ml-strip">
          <div className="ml-chip">15 Landing مقترحة على مستوى المنتج</div>
          <div className="ml-chip">{liveCount} صفحة جاهزة للبيع المباشر</div>
          <div className="ml-chip">{upcomingCount} صفحة Upcoming لخطوط المنتج القادمة</div>
        </div>
      </section>

      <section className="ml-wrap">
        <h2 className="ml-section-head">اختار القسم وابدأ التنفيذ</h2>
        <div className="ml-hub-grid">
          {marketingSections.map((section) => {
            const cardStyle = {
              '--ml-accent': section.theme.accent,
              '--ml-accent-soft': section.theme.accentSoft,
            } as CSSProperties;

            return (
              <article key={section.slug} className="ml-hub-card" style={cardStyle}>
                <span className={`ml-status ${section.status}`}>
                  {section.status === 'upcoming' ? 'قريبًا' : 'جاهزة'}
                </span>
                <h3>{section.pageTitle}</h3>
                <p>{section.heroLead}</p>
                <Link to={`/marketing/${section.slug}`} className="ml-btn-ghost">
                  فتح الصفحة
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="ml-wrap ml-cta-block">
        <h3>الخطوة التالية لفريقك</h3>
        <p>
          بعد اعتماد التقسيم، نقدر ننفذ لكل Landing: نسخة إعلانات، نسخة واتساب، نسخة فيديو قصير،
          ونسخة Sales Deck بنفس الرسالة.
        </p>
        <div className="ml-cta-actions">
          <Link to="/auth/register" className="ml-btn">ابدأ التنفيذ</Link>
          <Link to="/marketing/platform-overview" className="ml-btn-ghost">شوف نموذج كامل</Link>
        </div>
      </section>

      <div className="ml-wrap ml-footnote">
        <p>المسار: <code>/marketing</code> ثم <code>/marketing/:slug</code></p>
      </div>
    </main>
  );
};

export default MarketingLandingHub;
