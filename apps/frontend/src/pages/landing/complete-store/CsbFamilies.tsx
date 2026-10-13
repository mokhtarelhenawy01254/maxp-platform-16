import React from "react";
import { CSB_FAMILIES, CSB_LINES, csbFmt } from "./csbData";

const lineById = (id: string) => CSB_LINES.find((l) => l.id === id);

const familySum = (ids: string[]) =>
  ids.reduce((acc, id) => acc + (lineById(id)?.price ?? 0), 0);

/** Bento غير متماثل: عائلتين فوق + عمود جانبي ممتد + عائلتين تحت */
export const CsbFamilies: React.FC = () => {
  const [selling, conversations, logistics, measurement] = CSB_FAMILIES;

  const renderList = (ids: string[]) => (
    <ul>
      {ids.map((id) => {
        const line = lineById(id);
        if (!line) return null;
        return (
          <li key={id}>
            <span className="csb-li-name">
              {line.name}
              {line.price === 0 && (
                <em
                  style={{
                    fontStyle: "normal",
                    fontSize: 10.5,
                    fontWeight: 600,
                    color: "var(--csb-green)",
                    background: "var(--csb-green-soft)",
                    borderRadius: 5,
                    padding: "1.5px 6px",
                  }}
                >
                  شاملة
                </em>
              )}
            </span>
            <span className="csb-li-price">
              {line.price === 0 ? (
                "—"
              ) : (
                <>
                  <b>{csbFmt(line.price)}</b> ج.م
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  const foot = (ids: string[]) => (
    <div className="csb-family-foot">
      <span>قيمتها لو اتشترت منفردة</span>
      <b>{csbFmt(familySum(ids))} ج.م/شهر — داخلة في الـ999</b>
    </div>
  );

  return (
    <section className="csb-section" id="families">
      <div className="csb-section-head csb-reveal">
        <span className="csb-sec-eyebrow">الـ17 أداة في 4 عائلات</span>
        <h2>كل عائلة بتقفل فجوة معينة في متجرك</h2>
        <p>
          الأسعار اللي جنب كل أداة هي سعرها المنفرد في السوق — وكلها داخلة في اشتراك
          الباقة الواحد.
        </p>
      </div>

      <div className="csb-families">
        <div className="csb-family csb-family-wide csb-reveal">
          <h3>{selling.name}</h3>
          <p className="csb-family-tag">{selling.tagline}</p>
          {renderList(selling.lineIds)}
          {foot(selling.lineIds)}
        </div>

        <div className="csb-family csb-family-side-a csb-reveal">
          <h3>{conversations.name}</h3>
          <p className="csb-family-tag">{conversations.tagline}</p>
          {renderList(conversations.lineIds)}
          {foot(conversations.lineIds)}
        </div>

        <div className="csb-family-bottom csb-reveal">
          <div className="csb-family-inner">
            <h3>{logistics.name}</h3>
            <p className="csb-family-tag">{logistics.tagline}</p>
            {renderList(logistics.lineIds)}
            {foot(logistics.lineIds)}
          </div>
          <div className="csb-family-inner">
            <h3>{measurement.name}</h3>
            <p className="csb-family-tag">{measurement.tagline}</p>
            {renderList(measurement.lineIds)}
            {foot(measurement.lineIds)}
          </div>
        </div>
      </div>
    </section>
  );
};
