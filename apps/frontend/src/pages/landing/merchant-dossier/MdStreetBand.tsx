import React from "react";
import { MD_SCREENS } from "./merchantDossierData";

/** شريط فاصل بعرض الصفحة: شاشة المنصة نفسها، بحركة بطيئة، بنفس شكل اللسان. */
export const MdStreetBand: React.FC = () => (
  <section className="md" dir="rtl">
    <div className="relative">
      <div
        className="md-photo-tab relative overflow-hidden bg-[#e9edf5]"
        style={{ "--tab-w": "220px", "--tab-h": "34px" } as React.CSSProperties}
      >
        <img
          src={MD_SCREENS.orders}
          alt="شاشة الطلبات في منصة MaxP"
          width={1160}
          height={700}
          loading="lazy"
          className="md-drift h-[52vh] min-h-[320px] w-full object-cover object-top"
        />
      </div>
      <div className="md-shell mt-6">
        <p className="md-body max-w-[46ch]">
          كل حاجة في الشغل بتبدأ من هنا: أوردر داخل، حالة واضحة، ومبلغ معروف — والباقي منسوب ليه.
        </p>
      </div>
    </div>
  </section>
);

export default MdStreetBand;
