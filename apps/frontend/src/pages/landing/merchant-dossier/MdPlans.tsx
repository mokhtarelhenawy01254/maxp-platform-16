import React from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { INDIVIDUAL_TOTAL, csbFmt } from "./merchantDossierData";

interface MdPlansProps {
  onPreloadRegister?: () => void;
}

/** السعر: مستويين بس، كل واحد أرضه لوحده والحافة بينهم حادة. */
export const MdPlans: React.FC<MdPlansProps> = ({ onPreloadRegister }) => {
  const act = (tier: string) => () =>
    trackPlatformSiteLead("dossier_plan_action", { tier, landing_variant: "merchant-dossier" });

  return (
    <section id="md-plans" className="md" dir="rtl">
      <div className="grid md:grid-cols-12">
        {/* المتجر المجاني */}
        <div className="md-rise order-2 flex min-h-[70svh] flex-col justify-between bg-[#ebebeb] p-7 md:order-1 md:col-span-5 md:min-h-[90svh] md:p-10">
          <div>
            <h2 className="text-[clamp(30px,5vw,58px)] font-semibold leading-[1.05]">متجر مجاني</h2>
            <p className="md-lead mt-4 max-w-[26ch]">
              تبدأ من غير مقدم: متجر تستقبل فيه الأوردرات وتشوف رصيدك.
            </p>
            <p className="md-body mt-5 max-w-[34ch]">
              ومعاه إدارة الأوردر بـ<span className="md-num">1</span> ج.م للأوردر ، تكفي لو شغلك لسه
              بيكبر، وتسيب الباقة لما تحتاجها.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-end justify-between gap-5">
            <p className="md-num md-display">0</p>
            <Link
              to="/register"
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={act("free")}
              className="md-action md-action--ink"
            >
              افتح المتجر
            </Link>
          </div>
        </div>

        {/* الباقة الكاملة */}
        <div className="md-field md-rise order-1 flex min-h-[70svh] flex-col justify-between p-7 md:order-2 md:col-span-7 md:min-h-[90svh] md:p-10">
          <div>
            <h2 className="text-[clamp(30px,5vw,58px)] font-semibold leading-[1.05]">
              الباقة الكاملة
            </h2>
            <p className="md-lead mt-4 max-w-[26ch]">
              لما تحتاج الـ<span className="md-num">17</span> أداة كلهم شغالين مع بعض.
            </p>
            <p className="md-body mt-5 max-w-[40ch]">
              المتجر، الأوردرات بتتأكد على واتساب، الإنبوكس الموحد، الشحن والمخزون، المرتجعات
              بأسبابها، وتقارير الربح ، الـ<span className="md-num">17</span> لو جبتهم فرادى يطلعوا{" "}
              <span className="md-num">{csbFmt(INDIVIDUAL_TOTAL)}</span> ج.م في الشهر.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap items-end justify-between gap-5">
            <p className="md-display">
              <span className="md-num">999</span>{" "}
              <span style={{ fontSize: "var(--step-body)", fontWeight: 400 }}>ج.م في الشهر</span>
            </p>
            <Link
              to="/register"
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={act("bundle")}
              className="md-action"
            >
              ابدأ بالباقة
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MdPlans;
