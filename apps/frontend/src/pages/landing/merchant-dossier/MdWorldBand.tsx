import React from "react";
import { MD_PHOTOS } from "./merchantDossierData";

/**
 * شريط الصور: عالم الشغل نفسه ، محل، سوق، رصيد، وبوالص.
 * كل صور من الأرشيف المفتوح، ومعتمدة بالاسم والترخيص في آخر الصفحة.
 */
const PHOTOS = [
  {
    id: "shop",
    src: MD_PHOTOS.talaatHarb,
    alt: "واجهات محلات في شارع طلعت حرب بوسط القاهرة",
    caption: "المحل: البيع بالمقاس، والرصيد اللي قدام الكاشير.",
    ratio: "h-[420px]",
  },
  {
    id: "market",
    src: MD_PHOTOS.khanMarket,
    alt: "سوق خان الخليلي في القاهرة",
    caption: "الأونلاين: نفس الرصيد، بس الطلب جاي من رسالة.",
    ratio: "h-[420px]",
  },
  {
    id: "souq",
    src: MD_PHOTOS.luxorSouq,
    alt: "سوق في الأقصر",
    caption: "كل يوم بيخرج من هنا بوالص شحن.",
    ratio: "h-[420px]",
  },
  {
    id: "stock",
    src: MD_PHOTOS.textile,
    alt: "أثواب ملفوفة على رف",
    caption: "المخزون: مقاسات وألوان على رف واحد.",
    ratio: "h-[420px]",
  },
];

export const MdWorldBand: React.FC = () => (
  <section className="md md-section" dir="rtl">
    <div className="md-shell grid gap-2 md:grid-cols-12">
      {PHOTOS.map((photo, index) => {
        const span = ['md:col-span-7', 'md:col-span-5', 'md:col-span-5', 'md:col-span-7'][index];
        const offset = [0, 56, 0, 72][index];
        const height = [
          'h-[420px] md:h-[520px]',
          'h-[420px] md:h-[440px]',
          'h-[420px] md:h-[440px]',
          'h-[420px] md:h-[520px]',
        ][index];
        return (
          <figure key={photo.id} className={`md-rise m-0 ${span}`} style={{ marginTop: offset }}>
            <div
              className="md-photo-tab overflow-hidden"
              style={{ '--tab-w': '120px', '--tab-h': '24px' } as React.CSSProperties}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                width={1000}
                height={1250}
                loading="lazy"
                className={`w-full object-cover ${height}`}
              />
            </div>
            <figcaption className="md-body mt-4 max-w-[30ch]">{photo.caption}</figcaption>
          </figure>
        );
      })}
    </div>
  </section>
);

export default MdWorldBand;
