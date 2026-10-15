import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import {
  KIT_FACTS,
  KIT_SCREENS,
  KIT_STAGES,
  KIT_TIERS,
  KIT_WHATSAPP,
  csbFmt,
  kitWhatsApp,
} from "../merchant-kit/kitData";
import { KitFragment } from "../merchant-kit/KitFragment";

/** الماستهد: ثلاث قصّات من شاشة المنصة بأحجام مختلفة، وبعدها العنوان على المحور. */
export const AnnualHero: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => (
  <header className="an" dir="rtl">
    <div className="an-shell flex items-center justify-between gap-4 py-5">
      <span className="an-num an-body font-bold">MaxP</span>
      <nav className="hidden gap-7 md:flex" aria-label="أقسام الصفحة">
        <a className="an-small font-bold" href="#an-figures">
          الأرقام
        </a>
        <a className="an-small font-bold" href="#an-parts">
          الشاشات
        </a>
        <a className="an-small font-bold" href="#an-plans">
          الأسعار
        </a>
      </nav>
      <Link
        to="/register"
        onMouseEnter={onPreloadRegister}
        onFocus={onPreloadRegister}
        onClick={() =>
          trackPlatformSiteLead("annual_nav", { landing_variant: "merchant-annual" })
        }
        className="an-action"
        style={{ minHeight: 44, padding: "0 18px", fontSize: 14 }}
      >
        افتح متجرك
      </Link>
    </div>

    <div className="an-shell pb-10">
      <div className="an-masthead">
        <figure>
          <img
            src={KIT_SCREENS.orders}
            alt="شاشة الطلبات في المنصة"
            loading="eager"
            style={{ height: "clamp(190px, 26vw, 330px)" }}
          />
        </figure>
        <figure>
          <img
            src={KIT_SCREENS.rows}
            alt="صفوف الطلبات"
            loading="lazy"
            style={{ height: "clamp(140px, 16vw, 210px)" }}
          />
        </figure>
        <figure>
          <img
            src={KIT_SCREENS.filters}
            alt="فلاتر الطلبات"
            loading="lazy"
            style={{ height: "clamp(140px, 16vw, 210px)" }}
          />
        </figure>
      </div>
    </div>

    <div className="an-shell an-axis pb-14">
      <h1 className="an-display an-start">تقرير تشغيل التاجر</h1>

      <div className="an-note">
        <p className="an-lead max-w-[52ch]">
          شغل التاجر بيتقاس بأربع حاجات: أوردر اتأكد، بوليصة طلعت، كاش اتلمّ، وربح اتقفل.
        </p>
        <p className="an-body an-muted mt-4">
          MaxP بتحط الأربعة دول على نفس البيانات: رسالة العميل، تأكيد الأوردر، الشحن، المخزون،
          والحساب. والباقي تفاصيل.
        </p>
      </div>

      <p className="an-sidenote an-small an-muted an-note">
        تقرير تشغيل · أكتوبر 2026 · <span className="an-num">101</span> متجر ·{" "}
        <span className="an-num">2,775</span> أوردر في 30 يوم
      </p>

      <div className="an-note flex flex-wrap gap-3 pt-2">
        <Link
          to="/register"
          onMouseEnter={onPreloadRegister}
          onFocus={onPreloadRegister}
          onClick={() =>
            trackPlatformSiteLead("annual_hero", {
              destination: "/register",
              landing_variant: "merchant-annual",
            })
          }
          className="an-action"
        >
          ابدأ بـ0 ج.م
        </Link>
        <a
          href={kitWhatsApp("مرحباً، قريت التقرير وعايز أعرف تفاصيل أكتر")}
          target="_blank"
          rel="noopener noreferrer"
          className="an-action"
          style={{ background: "var(--an-ink)" }}
        >
          اسأل على واتساب
        </a>
      </div>
    </div>
  </header>
);

/** الأرقام: أعمدة واقفة على الحافة، والأرقام بأسعار المنصة. */
export const AnnualFigures: React.FC = () => (
  <section id="an-figures" className="an an-section">
    <div className="an-shell an-axis">
      <h2 className="an-head an-start">الأرقام زي ما هي</h2>
      <p className="an-body an-note an-muted">
        إحصاء إنتاج المنصة نفسها، محدّث 13 أكتوبر 2026. مش تقديرات تسويق.
      </p>

      <div className="an-note an-bars" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        {KIT_FACTS.map((fact, index) => (
          <div
            key={fact.value}
            className={`an-bar ${index === 0 ? "an-bar--accent" : ""}`}
            style={{ height: `${[92, 74, 58][index]}%` }}
          >
            <p className="an-num an-head">{fact.value}</p>
            <p className="an-small" style={{ marginTop: 8 }}>
              {fact.label}
            </p>
          </div>
        ))}
      </div>

      <p className="an-body an-note">
        والباقة الكاملة بـ<span className="an-num">{csbFmt(999)}</span> ج.م في الشهر، مقابل{" "}
        <span className="an-num">{csbFmt(2936)}</span> ج.م لو جبت الـ17 أداة واحدة واحدة.
      </p>
    </div>
  </section>
);

/** الشاشات: تلصيعة قصّات مختلفة الأحجام، كل واحدة ليها عنوان وسطر. */
export const AnnualMosaic: React.FC = () => (
  <section id="an-parts" className="an an-section">
    <div className="an-shell an-axis">
      <h2 className="an-head an-start">جوه المنصة</h2>
      <p className="an-body an-note an-muted">
        كل حاجة هنا من شاشات التطبيق نفسها ببيانات تجريبية.
      </p>

      <div className="an-note grid gap-3 md:grid-cols-12">
        <figure className="md:col-span-7" style={{ margin: 0 }}>
          <div style={{ background: "var(--an-surface)", padding: 16 }}>
            <KitFragment id="waybill" />
          </div>
          <figcaption className="an-body an-muted" style={{ marginTop: 12 }}>
            البوليصة بتصدر من نفس الأوردر.
          </figcaption>
        </figure>

        <figure className="md:col-span-5 md:pt-8" style={{ margin: 0 }}>
          <div style={{ background: "var(--an-surface)", padding: 16 }}>
            <KitFragment id="stock" />
          </div>
          <figcaption className="an-body an-muted" style={{ marginTop: 12 }}>
            والمخزون بالمقاس لكل فرع.
          </figcaption>
        </figure>

        <figure className="md:col-span-5" style={{ margin: 0 }}>
          <div style={{ background: "var(--an-accent)", padding: 16 }}>
            <KitFragment id="cod" />
          </div>
          <figcaption className="an-body an-muted" style={{ marginTop: 12 }}>
            والتحصيل منسوب للأوردر.
          </figcaption>
        </figure>

        <figure className="md:col-span-7 md:pt-8" style={{ margin: 0 }}>
          <div style={{ background: "var(--an-surface)", padding: 16 }}>
            <KitFragment id="profit" />
          </div>
          <figcaption className="an-body an-muted" style={{ marginTop: 12 }}>
            وصافي الربح بعد الشحن والإعلان.
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
);

/** الخطوات: أعمدة سؤال/جواب على المحور. */
export const AnnualStages: React.FC = () => (
  <section className="an an-section">
    <div className="an-shell an-axis">
      <h2 className="an-head an-start">دورة الأوردر</h2>
      <dl className="an-note" style={{ display: "grid", gap: 18 }}>
        {KIT_STAGES.map((stage) => (
          <div key={stage.name} style={{ display: "grid", gap: 4 }}>
            <dt className="an-body font-bold">
              {stage.name} · <span className="an-num an-muted">{stage.duration}</span>
            </dt>
            <dd className="an-body an-muted" style={{ margin: 0 }}>
              {stage.clause}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export const AnnualFacts = KIT_FACTS;
export const AnnualNumber = KIT_WHATSAPP;
