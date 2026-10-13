import React from "react";
import { CSB_JOURNEY } from "./csbData";

/** واجهات توضيحية مصغرة لكل محطة — شكل عناصر المنتج الحقيقية (inbox/واتساب/بوليصة/أرباح) */
const STEP_UI: Record<string, React.ReactNode> = {
  message: (
    <div className="csb-ui" aria-hidden="true">
      <div className="csb-ui-row">
        <span className="csb-ui-main">
          <span className="csb-ui-dot" style={{ background: "#7fb8a2" }} />
          <span className="csb-ui-muted">Messenger — دعاء طارق</span>
        </span>
        <span className="csb-ui-chip csb-ui-chip-ok">جديدة</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted" style={{ minWidth: 0 }}>
          «عايزة الجزمة ده مقاس 38 لون بيج، متوفر؟»
        </span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-main">
          <span className="csb-ui-dot" style={{ background: "#c9a24b" }} />
          <span className="csb-ui-muted">WhatsApp — نفس العميل</span>
        </span>
        <span className="csb-ui-chip">موحدة</span>
      </div>
    </div>
  ),
  reply: (
    <div className="csb-ui" aria-hidden="true">
      <div className="csb-ui-row">
        <span className="csb-ui-muted">العميل: «المقاسات المتاحة إيه؟»</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted" style={{ minWidth: 0 }}>
          البوت: «المقاسات المتاحة 38، 39، 40 — والتوصيل 2-4 أيام.»
        </span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-main">
          <span className="csb-ui-dot" style={{ background: "#7fd0ae" }} />
          <span className="csb-ui-muted">كلمة مفتاحية: مقاسات</span>
        </span>
        <span className="csb-ui-chip csb-ui-chip-green">رد آلي</span>
      </div>
    </div>
  ),
  confirm: (
    <div className="csb-ui" aria-hidden="true">
      <div className="csb-ui-row">
        <span className="csb-ui-num">ORD-8412</span>
        <span className="csb-ui-chip csb-ui-chip-ok">مؤكد</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted" style={{ minWidth: 0 }}>
          «تأكيد الأوردر: جزمة بيج 38 — المعادي، 0122xxxxxxx»
        </span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-main">
          <span className="csb-ui-dot" style={{ background: "#7fd0ae" }} />
          <span className="csb-ui-muted">قالب واتساب رسمي</span>
        </span>
        <span className="csb-ui-chip">تم التسليم</span>
      </div>
    </div>
  ),
  ship: (
    <div className="csb-ui" aria-hidden="true">
      <div className="csb-ui-row">
        <span className="csb-ui-num">AWB 7741-2290</span>
        <span className="csb-ui-chip csb-ui-chip-green">بوليصة صدرت</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted">الناقل: Turbo</span>
        <span className="csb-ui-chip">COD 620 ج.م</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted">التتبع: خرج للتسليم</span>
        <span className="csb-ui-chip csb-ui-chip-ok">محدّث</span>
      </div>
    </div>
  ),
  collect: (
    <div className="csb-ui" aria-hidden="true">
      <div className="csb-ui-row">
        <span className="csb-ui-num">ORD-8412</span>
        <span className="csb-ui-chip csb-ui-chip-ok">تم التسليم</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted">محصّل من العميل</span>
        <span className="csb-ui-num">620 ج.م</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted">مستحق للشركة</span>
        <span className="csb-ui-num">581 ج.م</span>
      </div>
    </div>
  ),
  measure: (
    <div className="csb-ui" aria-hidden="true">
      <div className="csb-ui-row">
        <span className="csb-ui-muted">صافي ربح الشهر</span>
        <span className="csb-ui-num">+18,430 ج.م</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted">حملة Meta — Retargeting EG</span>
        <span className="csb-ui-chip csb-ui-chip-green">12 أوردر منسوب</span>
      </div>
      <div className="csb-ui-row">
        <span className="csb-ui-muted">UTM: fb/cpc/oct-2026</span>
        <span className="csb-ui-chip">مؤكد</span>
      </div>
    </div>
  ),
};

export const CsbJourney: React.FC = () => {
  return (
    <section className="csb-journey" id="journey">
      <div className="csb-section">
        <div className="csb-section-head csb-reveal">
          <span className="csb-sec-eyebrow">رحلة الأوردر الواحد</span>
          <h2>من رسالة العميل لحد صافي الربح — من غير شيت ولا مكالمة</h2>
          <p>
              الأدوات مش «ميزات» منفصلة؛ دي محطات الأوردر وهو بيمشي. دي شكل المحطات الست
              جوه النظام:
          </p>
        </div>

        <div className="csb-journey-grid">
          {CSB_JOURNEY.map((step, i) => (
            <article className="csb-jstep csb-reveal" key={step.id}>
              <span className="csb-jstep-num">
                {String(i + 1).padStart(2, "0")} — {step.tools}
              </span>
              <h3>{step.title}</h3>
              <p>{step.caption}</p>
              {STEP_UI[step.id]}
            </article>
          ))}
        </div>

        <p className="csb-journey-note">واجهات توضيحية مبسطة لعناصر موجودة فعليًا في المنتج.</p>
      </div>
    </section>
  );
};
