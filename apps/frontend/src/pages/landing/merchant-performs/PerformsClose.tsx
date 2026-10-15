import React, { useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { KIT_QUESTIONS, KIT_TIERS, KIT_WHATSAPP, kitWhatsApp } from "../merchant-kit/kitData";

/** السعر: أسماء المستويات + رقم حي واحد بيتغيّر بالتبديل. */
const PerformsPlans: React.FC<{ onPreloadRegister?: () => void }> = ({ onPreloadRegister }) => {
  const [tierId, setTierId] = useState("bundle");
  const tier = KIT_TIERS.find((item) => item.id === tierId) || KIT_TIERS[2];

  return (
    <section id="pf-plans" className="pf pf-section">
      <div className="pf-shell">
        <h2 className="pf-head max-w-[20ch]">اختار المستوى وشوف الرقم بعينك</h2>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <div className="pf-seg" role="group" aria-label="اختيار المستوى">
            {KIT_TIERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === tierId}
                onClick={() => setTierId(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <p className="flex items-baseline gap-2">
            <span className="pf-num pf-display">
              {tier.price}
            </span>
            <span className="pf-body">{tier.unit}</span>
          </p>
        </div>

        <p className="pf-lead mt-6 max-w-[46ch]">{tier.line}</p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link
            to="/register"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
            onClick={() =>
              trackPlatformSiteLead("performs_plan", {
                tier: tier.id,
                landing_variant: "merchant-performs",
              })
            }
            className="pf-action"
          >
            {tier.id === "bundle" ? "ابدأ بالباقة" : "ابدأ بـ0 ج.م"}
          </Link>
          <a
            href={kitWhatsApp(`مرحباً، عايز أختار بين مستويات MaxP`)}
            target="_blank"
            rel="noopener noreferrer"
            className="pf-action pf-action--quiet"
          >
            اسأل قبل ما تختار
          </a>
        </div>
      </div>
    </section>
  );
};

/** الأسئلة: بلاطات مليانة، والسؤال الواحد بيفتح جواه. */
const PerformsFaq: React.FC = () => (
  <section className="pf pf-section">
    <div className="pf-shell grid gap-10 lg:grid-cols-12">
      <h2 className="pf-head max-w-[14ch] lg:col-span-4">أسئلة بتتسأل فعلًا</h2>
      <div className="pf-faq min-w-0 lg:col-span-8">
        {KIT_QUESTIONS.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p className="pf-body pf-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/** الختام: جملة فيها فراغ ، الاسم اللي تكتبه يمشي معاك. */
const PerformsClose: React.FC<{ onPreloadRegister?: () => void }> = ({ onPreloadRegister }) => {
  const [name, setName] = useState("");
  const target = name.trim()
    ? `/register?store=${encodeURIComponent(name.trim())}`
    : "/register";

  return (
    <>
      <section className="pf pf-section">
        <div className="pf-shell">
          <p className="pf-display flex flex-wrap items-center gap-4 leading-tight">
            <span>افتح متجرك باسم</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="متجر النور"
              aria-label="اسم المتجر"
              className="pf-body min-w-[220px] flex-1 border-0 p-4 font-semibold"
              style={{ background: "#ecf0f2", borderRadius: 12, color: "var(--pf-ink)" }}
            />
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link
              to={target}
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={() =>
                trackPlatformSiteLead("performs_close", {
                  landing_variant: "merchant-performs",
                })
              }
              className="pf-action"
            >
              افتح المتجر ، 0 ج.م
            </Link>
            <a
              href={kitWhatsApp("مرحباً، عايز أبدأ على MaxP")}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-action pf-action--quiet"
            >
              واتساب
            </a>
          </div>
        </div>
      </section>

      <footer className="pf pb-14">
        <div className="pf-shell flex flex-wrap items-center justify-between gap-4">
          <p className="pf-small pf-muted">
            MaxP · نظام تشغيل واحد للمحل والأونلاين ·{" "}
            <span className="pf-num">+{KIT_WHATSAPP}</span>
          </p>
          <p className="pf-small pf-muted">
            الشاشات في الصفحة دي من المنصة نفسها ببيانات تجريبية.
          </p>
        </div>
      </footer>
    </>
  );
};

export const PerformsEnd: React.FC<{ onPreloadRegister?: () => void }> = PerformsClose;
export { PerformsPlans, PerformsFaq };
export default PerformsClose;
