import React from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import {
  CSB_FAMILIES,
  CSB_LINES,
  MDL_TIERS,
  mdlWhatsAppLink,
} from "./merchantDaylightData";

interface MdlPricingProps {
  onPreloadRegister?: () => void;
}

export const MdlPricing: React.FC<MdlPricingProps> = ({ onPreloadRegister }) => {
  return (
    <section id="mdl-pricing" className="mdl-section">
      <div className="mdl-shell">
        <p className="mdl-eyebrow">الأسعار</p>
        <h2 className="mdl-h2 mt-2 max-w-[34ch]">
          <span className="mdl-num">3</span> مستويات بس — واضحة من الأول.
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {MDL_TIERS.map((tier) => (
            <article
              key={tier.id}
              className="flex flex-col rounded-[14px] border bg-white p-5"
              style={{
                borderColor: tier.highlight ? "var(--mdl-ink)" : "var(--mdl-line)",
                boxShadow: tier.highlight ? "0 1px 0 0 var(--mdl-ink)" : "none",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="mdl-h3">{tier.name}</h3>
                {tier.highlight && (
                  <span className="rounded-md bg-[#0E1116] px-2 py-1 text-[11px] font-semibold text-white">
                    الأكثر اكتمالًا
                  </span>
                )}
              </div>

              <p className="mt-4 flex items-baseline gap-1.5">
                <span className="mdl-num text-[34px] font-bold leading-none">{tier.price}</span>
                <span className="text-[13px] text-[#6B7280]">{tier.unit}</span>
              </p>

              <p className="mt-3 text-[13.5px] font-semibold text-[#39414D]">{tier.headline}</p>

              <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                {tier.points.map((point) => (
                  <li key={point} className="flex gap-2 text-[13px] text-[#39414D]">
                    <span
                      className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#D3D7DE]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0">{point}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={tier.ctaTo}
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
                onClick={() =>
                  trackPlatformSiteLead("pricing_cta", {
                    tier: tier.id,
                    destination: tier.ctaTo,
                    landing_variant: "merchant-daylight",
                  })
                }
                className={`mdl-btn mt-5 ${tier.highlight ? "mdl-btn--primary" : "mdl-btn--ghost"}`}
              >
                {tier.ctaLabel}
              </Link>
            </article>
          ))}
        </div>

        <div className="mdl-surface mt-6">
          <div className="border-b border-[#E6E8EC] px-5 py-4">
            <h3 className="mdl-h3">
              اللي جوه باقة المتجر الكاملة — <span className="mdl-num">{CSB_LINES.length}</span> أداة
            </h3>
          </div>
          <div className="grid sm:grid-cols-2">
            {CSB_FAMILIES.map((family, index) => {
              const lines = CSB_LINES.filter((line) => family.lineIds.includes(line.id));
              return (
                <div
                  key={family.id}
                  className="border-b border-[#E6E8EC] p-4 last:border-b-0 sm:border-b-0"
                  style={{
                    borderInlineEnd:
                      index % 2 === 0 ? "1px solid var(--mdl-line)" : undefined,
                    borderBottom: index < CSB_FAMILIES.length - 1 ? "1px solid var(--mdl-line)" : undefined,
                  }}
                >
                  <h4 className="text-[13.5px] font-semibold">{family.name}</h4>
                  <p className="mt-0.5 text-[12px] text-[#6B7280]">{family.tagline}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {lines.map((line) => (
                      <li key={line.id} className="mdl-chip">
                        {line.name}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-[#6B7280]">
          <span>تجديد شهري — بدون التزام سنوي</span>
          <span>تلغي في أي وقت وبياناتك تفضل ملكك</span>
          <a
            href={mdlWhatsAppLink("مرحباً، محتاج أختار المستوى المناسب لشغلي في MaxP")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackPlatformSiteLead("pricing_whatsapp", { landing_variant: "merchant-daylight" })
            }
            className="mdl-link font-semibold"
          >
            محتار بين المستويات؟ اسأل على واتساب
          </a>
        </div>
      </div>
    </section>
  );
};

export default MdlPricing;
