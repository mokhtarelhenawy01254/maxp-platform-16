import React, { useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import {
  KIT_QUESTIONS,
  KIT_SCREENS,
  KIT_TIERS,
  KIT_WHATSAPP,
  csbFmt,
  kitWhatsApp,
} from "../merchant-kit/kitData";

/** السعر: أرضين وحافة حادة بينهم. */
export const PosterPlans: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => {
  const [name, setName] = useState("");
  const target = name.trim() ? `/register?store=${encodeURIComponent(name.trim())}` : "/register";

  return (
    <section className="po" dir="rtl">
      <div className="grid md:grid-cols-12">
        <div
          className="order-1 flex min-h-[64svh] flex-col justify-between p-7 md:col-span-5 md:p-10"
          style={{ background: "var(--po-bg)" }}
        >
          <div>
            <h2 className="po-head">متجر مجاني</h2>
            <p className="po-lead mt-4 max-w-[24ch]">تبدأ من غير مقدم وتستقبل أوردرات.</p>
            <p className="po-body mt-4 max-w-[32ch]">
              ومعاه إدارة الأوردر بـ<span className="po-num">1</span> ج.م للأوردر.
            </p>
          </div>
          <p className="po-num po-shout leading-none">0</p>
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("poster_plan_free", { landing_variant: "merchant-poster" })
            }
            className="po-action self-start"
          >
            افتح المتجر
          </Link>
        </div>

        <div
          className="order-2 flex min-h-[64svh] flex-col justify-between p-7 md:col-span-7 md:p-10"
          style={{ background: "var(--po-lime)" }}
        >
          <div>
            <h2 className="po-head">الباقة الكاملة</h2>
            <p className="po-lead mt-4 max-w-[26ch]">الـ17 أداة شغالين مع بعض.</p>
            <p className="po-body mt-4 max-w-[40ch]">
              فرادى يطلعوا <span className="po-num">{csbFmt(2936)}</span> ج.م في الشهر، وفي الباقة{" "}
              <span className="po-num">{csbFmt(999)}</span>.
            </p>
          </div>
          <p className="po-shout leading-none">
            <span className="po-num">999</span>
            <span className="po-body" style={{ marginInlineStart: 12 }}>
              ج.م / شهر
            </span>
          </p>
          <Link
            to={target}
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("poster_plan_bundle", { landing_variant: "merchant-poster" })
            }
            className="po-action po-action--accent self-start"
          >
            ابدأ بالباقة
          </Link>
        </div>
      </div>

      <div className="po-shell flex flex-wrap items-center gap-3 py-6">
        <label className="po-small font-bold" htmlFor="po-store">
          اسم متجرك:
        </label>
        <input
          id="po-store"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="متجر النور"
          className="po-body min-w-[220px] flex-1 p-4 font-bold"
          style={{ background: "var(--po-paper)", border: 0, color: "var(--po-ink)" }}
        />
        <Link to={target} className="po-action">
          يلا نبدأ
        </Link>
      </div>
    </section>
  );
};

/** الأسئلة: شريط لكل سؤال. */
export const PosterFaq: React.FC = () => (
  <section className="po po-band" style={{ background: "var(--po-sky)" }}>
    <div className="po-shell">
      <h2 className="po-head mb-8 max-w-[12ch]">قبل ما تدفع</h2>
      <div className="po-faq">
        {KIT_QUESTIONS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p className="po-body">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/** الختام: الكلام الأخير + الفوتر بالرقم كعنوان. */
export const PosterClose: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => (
  <>
    <section className="po po-band" style={{ background: "var(--po-paper)" }}>
      <div className="po-shell grid items-center gap-8 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 className="po-head">الشاشة الأولى مفتوحة</h2>
          <p className="po-lead mt-4 max-w-[30ch]">
            افتح المتجر دلوقتي بـ0 ج.م، وشوف الأوردرات بتمشي.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/register"
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={() =>
                trackPlatformSiteLead("poster_close", { landing_variant: "merchant-poster" })
              }
              className="po-action po-action--accent"
            >
              افتح المتجر ، 0 ج.م
            </Link>
            <a
              href={kitWhatsApp("مرحباً، عايز أبدأ على MaxP")}
              target="_blank"
              rel="noopener noreferrer"
              className="po-action"
            >
              واتساب
            </a>
          </div>
        </div>

        <div className="po-tilt--right po-crop lg:col-span-6">
          <img
            src={KIT_SCREENS.rows}
            alt="صفوف الطلبات في المنصة"
            loading="lazy"
            className="h-[clamp(180px,22vw,300px)] w-full"
          />
        </div>
      </div>
    </section>

    <footer className="po" style={{ background: "var(--po-dark)", color: "var(--po-paper)" }}>
      <div className="po-shell py-14">
        <p className="po-shout" style={{ color: "var(--po-paper)" }}>
          <span className="po-num">+{KIT_WHATSAPP}</span>
        </p>
        <p className="po-lead mt-4">كلّمنا على واتساب، أو افتح المتجر بنفسك.</p>
        <p className="po-small mt-8" style={{ opacity: 0.7 }}>
          MaxP · نظام تشغيل واحد للمحل والأونلاين · الشاشات من المنصة ببيانات تجريبية.
        </p>
      </div>
    </footer>
  </>
);
