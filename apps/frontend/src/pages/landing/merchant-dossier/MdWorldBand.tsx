import React from "react";
import { MD_SCREENS } from "./merchantDossierData";
import MdFragment from "./MdFragment";

/**
 * شاشات المنصة نفسها — مصوّرة من التطبيق ببيانات تجريبية.
 * مفيش أي صور خارجية ومفيش أي بيانات عملاء حقيقيين.
 */
export const MdWorldBand: React.FC = () => (
  <section className="md md-section" dir="rtl">
    <div className="md-shell grid gap-3 md:grid-cols-12">
      <figure className="md-rise m-0 md:col-span-8">
        <div
          className="md-photo-tab overflow-hidden bg-[#e9edf5]"
          style={{ "--tab-w": "120px", "--tab-h": "24px" } as React.CSSProperties}
        >
          <img
            src={MD_SCREENS.orders}
            alt="شاشة الطلبات في المنصة: رقم الأوردر، العميل، المبلغ، حالته، والمدينة"
            width={1160}
            height={700}
            loading="lazy"
            className="w-full object-cover"
          />
        </div>
        <figcaption className="md-body mt-4 max-w-[42ch]">
          دي الشاشة اللي بتفتحها الصبح: الأوردر، العميل، المبلغ، وحالته — وبعدها التأكيد على واتساب.
        </figcaption>
      </figure>

      <div className="md:col-span-4 md:pt-14">
        <figure className="md-rise m-0">
          <div
            className="md-photo-tab overflow-hidden bg-[#e9edf5]"
            style={{ "--tab-w": "90px", "--tab-h": "20px" } as React.CSSProperties}
          >
            <img
              src={MD_SCREENS.ordersMobile}
              alt="نفس شاشة الطلبات على الموبايل"
              width={390}
              height={640}
              loading="lazy"
              className="mx-auto h-[320px] w-auto object-cover"
            />
          </div>
          <figcaption className="md-body mt-4 max-w-[26ch]">
            ونفسها على الموبايل، لنفس صاحب الشغل.
          </figcaption>
        </figure>
      </div>

      <figure className="md-rise m-0 md:col-span-5 md:col-start-2 md:mt-6">
        <div
          className="md-photo-tab flex h-[190px] items-center justify-center overflow-hidden bg-[#ebebeb] p-5"
          style={{ "--tab-w": "110px", "--tab-h": "22px" } as React.CSSProperties}
        >
          <MdFragment id="waybill" />
        </div>
        <figcaption className="md-body mt-4 max-w-[34ch]">
          البوليصة بتصدر من نفس الأوردر، ومصاريفها مسجّلة عليه.
        </figcaption>
      </figure>

      <figure className="md-rise m-0 md:col-span-5 md:mt-6">
        <div
          className="md-photo-tab flex h-[190px] items-center justify-center overflow-hidden bg-[#f6e016] p-5"
          style={{ "--tab-w": "110px", "--tab-h": "22px" } as React.CSSProperties}
        >
          <MdFragment id="cod" />
        </div>
        <figcaption className="md-body mt-4 max-w-[34ch]">
          والتحصيل منسوب لنفس الأوردر لحد ما يوصل الخزنة.
        </figcaption>
      </figure>
    </div>
  </section>
);

export default MdWorldBand;
