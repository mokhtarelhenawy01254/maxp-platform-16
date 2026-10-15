import React from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { KitFragment } from "../merchant-kit/KitFragment";
import { KIT_FACTS, KIT_SCREENS, KIT_STAGES, KIT_WHATSAPP, kitWhatsApp } from "../merchant-kit/kitData";

/** الهيرو: صرخة على الحافة + قصّة حقيقية مايلة تدخل على الكلام. */
export const PosterHero: React.FC<{ onPreloadRegister?: () => void }> = ({
  onPreloadRegister,
}) => (
  <header className="po" dir="rtl">
    <div className="po-shell flex items-center justify-between gap-4 py-4">
      <span className="po-num po-body font-bold">MaxP</span>
      <div className="flex items-center gap-3">
        <a className="po-small font-bold hidden sm:inline" href={`tel:+${KIT_WHATSAPP}`}>
          <span className="po-num">+{KIT_WHATSAPP}</span>
        </a>
        <Link
          to="/register"
          onMouseEnter={onPreloadRegister}
          onFocus={onPreloadRegister}
          onClick={() =>
            trackPlatformSiteLead("poster_nav", { landing_variant: "merchant-poster" })
          }
          className="po-action"
          style={{ minHeight: 46, padding: "0 18px", fontSize: 15 }}
        >
          افتح متجرك
        </Link>
      </div>
    </div>

    <div className="po-shell pb-6 pt-2">
      <h1 className="po-shout max-w-[16ch]">كل جنيه ليه بوليصة</h1>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-12">
        <p className="po-lead lg:col-span-5">
          من رسالة العميل للبوليصة للكاش. نظام واحد بدل 5 برامج.
        </p>
        <div className="flex flex-wrap gap-3 lg:col-span-4 lg:pt-2">
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("poster_hero", {
                destination: "/register",
                landing_variant: "merchant-poster",
              })
            }
            className="po-action"
          >
            0 ج.م. ابدأ دلوقتي
          </Link>
          <a
            href={kitWhatsApp("مرحباً، شفت البوستر وعايز أبدأ")}
            target="_blank"
            rel="noopener noreferrer"
            className="po-action po-action--accent"
          >
            اتكلم معانا
          </a>
        </div>
      </div>

      <div className="po-tilt po-crop mt-10 lg:ml-auto lg:w-[78%]">
        <img
          src={KIT_SCREENS.orders}
          alt="شاشة الطلبات في المنصة"
          loading="eager"
          className="h-[clamp(200px,30vw,420px)] w-full"
        />
      </div>
    </div>
  </header>
);

/** الأرقام: بلاطات متدرجة بألوان البوستر. */
export const PosterFigures: React.FC = () => (
  <section className="po po-band" style={{ background: "var(--po-paper)" }}>
    <div className="po-shell po-tiles">
      {KIT_FACTS.map((fact, index) => (
        <div
          key={fact.value}
          className="po-rise p-6"
          style={{
            background: ["var(--po-accent)", "var(--po-sky)", "var(--po-lime)"][index],
            color: index === 0 ? "#fff" : "var(--po-ink)",
            gridColumn: ["span 6", "span 3", "span 3"][index],
            minHeight: 150,
          }}
        >
          <p className="po-num po-head">{fact.value}</p>
          <p className="po-small font-bold" style={{ marginTop: 10 }}>
            {fact.label}
          </p>
        </div>
      ))}
    </div>

    <div className="po-shell mt-6 grid gap-4 md:grid-cols-12">
      <div className="po-rise po-tilt--right po-crop md:col-span-5">
        <img
          src={KIT_SCREENS.ordersMobile}
          alt="شاشة الطلبات على الموبايل"
          loading="lazy"
          className="mx-auto h-[280px] object-cover"
        />
      </div>
      <div className="po-rise po-tilt po-crop md:col-span-7">
        <img
          src={KIT_SCREENS.filters}
          alt="فلاتر الطلبات في المنصة"
          loading="lazy"
          className="h-[280px] w-full object-cover"
        />
      </div>
    </div>
  </section>
);

/** الرحلة: شريط واحد بأربع مراحل، عرض كل واحدة على قد طولها. */
export const PosterStages: React.FC = () => (
  <section className="po po-band">
    <div className="po-shell">
      <h2 className="po-head mb-8 max-w-[14ch]">من الرسالة للكاش</h2>
      <div className="po-rail" data-ui="order-lifecycle">
        {KIT_STAGES.map((stage, index) => (
          <div
            key={stage.name}
            style={{
              flexGrow: stage.weight,
              flexBasis: 0,
              background: ["var(--po-dark)", "var(--po-sky)", "var(--po-paper)", "var(--po-lime)"][
                index
              ],
              color: index === 0 ? "var(--po-paper)" : "var(--po-ink)",
            }}
          >
            <p className="po-body font-bold">{stage.name}</p>
            <p className="po-num po-lead">{stage.duration}</p>
            <p className="po-small" style={{ marginTop: "auto" }}>
              {stage.clause}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/** الشرائح: عنوان ثابت وقايمة بتعدي جنبه. */
export const PosterRows: React.FC = () => {
  const rows = [
    { id: "confirm", line: "تأكيد الأوردر على واتساب قبل الشحن" },
    { id: "waybill", line: "بوليصة الشحن من نفس الشاشة" },
    { id: "stock", line: "المخزون بالمقاس لكل فرع" },
    { id: "returns", line: "سبب المرتجع مكتوب" },
    { id: "cod", line: "التحصيل منسوب للأوردر" },
    { id: "profit", line: "صافي الربح بعد الشحن والإعلان" },
  ];

  return (
    <section className="po po-band" style={{ background: "var(--po-dark)", color: "var(--po-paper)" }}>
      <div className="po-shell grid gap-10 lg:grid-cols-12">
        <h2 className="po-head lg:col-span-5 lg:sticky lg:top-8 lg:self-start" style={{ color: "var(--po-paper)" }}>
          شغّالة لوحدها
        </h2>
        <ul className="lg:col-span-7" style={{ display: "grid", gap: 14 }}>
          {rows.map((row) => (
            <li
              key={row.id}
              className="po-rise flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              style={{ background: "#242423" }}
            >
              <p className="po-lead">{row.line}</p>
              <div style={{ background: "var(--po-paper)", padding: 10 }}>
                <KitFragment id={row.id} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
