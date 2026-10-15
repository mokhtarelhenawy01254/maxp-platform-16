import React from "react";
import { MD_PHOTOS } from "./merchantDossierData";

/** شريط فاصل بعرض الصفحة: صورة واحدة كبيرة بحركة بطيئة ، نفس شكل اللسان. */
export const MdStreetBand: React.FC = () => (
  <section className="md" dir="rtl">
    <div className="relative">
      <div
        className="md-photo-tab relative overflow-hidden"
        style={{ "--tab-w": "220px", "--tab-h": "34px" } as React.CSSProperties}
      >
        <img
          src={MD_PHOTOS.khanStreet}
          alt="شارع خان الخليلي في القاهرة"
          width={1600}
          height={900}
          loading="lazy"
          className="md-drift h-[52vh] min-h-[320px] w-full object-cover"
        />
      </div>
      <div className="md-shell mt-6">
        <p className="md-body max-w-[46ch]">
          الشارع ده فيه محل على كل ناصية. اللي بيفرّق بينهم مش الإعلان ، البيعة اللي بتقفل،
          والبوليصة اللي بترجع مصاريفها.
        </p>
      </div>
    </div>
  </section>
);

export default MdStreetBand;
