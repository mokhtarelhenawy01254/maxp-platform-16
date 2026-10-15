import React from "react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { MDL_SOLUTIONS, mdlWhatsAppLink } from "./merchantDaylightData";

export const MdlSolutions: React.FC = () => {
  return (
    <section id="mdl-solutions" className="mdl-section">
      <div className="mdl-shell">
        <p className="mdl-eyebrow">حلول جاهزة — من كتالوج المنصة</p>
        <h2 className="mdl-h2 mt-2 max-w-[34ch]">
          كل نشاط ليه باقة بمكوناتها وسعرها — مش نفس الباقة للكل.
        </h2>

        <div className="mdl-surface mt-8">
          <div className="mdl-row-divide">
            {MDL_SOLUTIONS.map((solution) => (
              <article
                key={solution.id}
                className="grid gap-4 p-4 sm:grid-cols-12 sm:items-center sm:gap-5 sm:p-5"
              >
                <div className="min-w-0 sm:col-span-5">
                  <h3 className="mdl-h3">{solution.name}</h3>
                  <p className="mdl-body mt-1">{solution.audience}</p>
                </div>

                <ul className="flex min-w-0 flex-wrap gap-1.5 sm:col-span-4">
                  {solution.apps.slice(0, 4).map((app) => (
                    <li key={app} className="mdl-chip">
                      {app}
                    </li>
                  ))}
                  {solution.apps.length > 4 && (
                    <li className="mdl-chip">
                      +<span className="mdl-num">{solution.apps.length - 4}</span> أدوات
                    </li>
                  )}
                </ul>

                <div className="min-w-0 sm:col-span-3 sm:text-left">
                  <p className="text-[13px] text-[#6B7280]">
                    <span className="mdl-num text-[22px] font-bold text-[#0E1116]">
                      {solution.price.toLocaleString("en-US")}
                    </span>{" "}
                    ج.م / شهر
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#9AA1AC]">{solution.priceNote}</p>
                  <a
                    href={mdlWhatsAppLink(`مرحباً، عايز أعرف تفاصيل ${solution.name} ونشاطي مناسب ليها ولا لأ`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      trackPlatformSiteLead("solution_whatsapp", {
                        solution: solution.id,
                        landing_variant: "merchant-daylight",
                      })
                    }
                    className="mdl-link mt-2 inline-block text-[13px] font-semibold"
                  >
                    اسأل عن الباقة
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[12px] text-[#6B7280]">
          الأسعار والمكونات من كتالوج المنصة الفعلي. أي أداة زيادة بتربطها لوحدها لو احتجتها —
          من غير ما تغيّر باقتك.
        </p>
      </div>
    </section>
  );
};

export default MdlSolutions;
