import React, { useState } from "react";
import { CSB_FAMILIES, CSB_LINES, MD_PREVIEWS, csbFmt } from "./merchantDossierData";

/** الأدوات: فهرس مقروء ، كل عائلة ليها صورتها في إطار ثابت، والسطر اللي تحته بيبان. */
export const MdIndex: React.FC = () => {
  const [activeFamily, setActiveFamily] = useState(CSB_FAMILIES[0].id);
  const activePreview = MD_PREVIEWS.find((preview) => preview.id === activeFamily);

  return (
    <section id="md-index" className="md md-section" dir="rtl">
      <div className="md-shell">
        <h2 className="md-head md-rise max-w-[22ch]">
          الـ<span className="md-num">{CSB_LINES.length}</span> أداة ، كلها على ملف واحد
        </h2>

        <div className="mt-12 hidden gap-10 md:grid md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="md-index-frame md-photo-tab md-rise sticky top-8 h-[520px]" style={{ "--tab-w": "120px", "--tab-h": "24px" } as React.CSSProperties}>
              {MD_PREVIEWS.map((preview) => (
                <img
                  key={preview.id}
                  src={preview.src}
                  alt=""
                  width={1000}
                  height={1250}
                  loading="lazy"
                  className={`md-index-img md-drift ${preview.id === activeFamily ? "is-active" : ""}`}
                  aria-hidden={preview.id === activeFamily ? "false" : "true"}
                />
              ))}
            </div>
            <p className="md-small md-muted mt-4 max-w-[32ch]">
              {activePreview ? `صور من عالم الشغل ده ، معتمدة في آخر الصفحة.` : ""}
            </p>
          </div>

          <div className="md-index md:col-span-7">
            {CSB_FAMILIES.map((family) => (
              <div key={family.id} className="md-rise mb-8">
                <h3 className="md-lead font-semibold">{family.name}</h3>
                <div className="mt-2">
                  {CSB_LINES.filter((line) => family.lineIds.includes(line.id)).map((line) => (
                    <button
                      key={line.id}
                      type="button"
                      className="md-index-row"
                      onMouseEnter={() => setActiveFamily(family.id)}
                      onFocus={() => setActiveFamily(family.id)}
                      onClick={() => setActiveFamily(family.id)}
                    >
                      <span className="md-body">{line.name}</span>
                      <span className="md-num md-body md-muted">
                        {line.price === 0 ? "شاملة" : csbFmt(line.price)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* الهاتف: كل عائلة بصورتها وبعدها أدواتها ، مفيش hover على اللمس */}
        <div className="mt-10 flex flex-col gap-12 md:hidden">
          {CSB_FAMILIES.map((family) => {
            const photo = MD_PREVIEWS.find((preview) => preview.id === family.id);
            return (
              <div key={family.id}>
                {photo && (
                  <div className="md-photo-tab overflow-hidden" style={{ "--tab-w": "96px", "--tab-h": "20px" } as React.CSSProperties}>
                    <img
                      src={photo.src}
                      alt=""
                      width={1000}
                      height={1250}
                      loading="lazy"
                      className="h-[240px] w-full object-cover"
                    />
                  </div>
                )}
                <h3 className="md-lead mt-5 font-semibold">{family.name}</h3>
                <ul className="mt-2">
                  {CSB_LINES.filter((line) => family.lineIds.includes(line.id)).map((line) => (
                    <li
                      key={line.id}
                      className="flex items-baseline justify-between gap-4 py-2"
                    >
                      <span className="md-body">{line.name}</span>
                      <span className="md-num md-small md-muted">
                        {line.price === 0 ? "شاملة" : csbFmt(line.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="md-body mt-10 max-w-[54ch]">
          الأسعار دي أسعار التطبيقات لو اشتركتها واحدة واحدة. لما تاخد الباقة بـ
          <span className="md-num"> {csbFmt(999)} </span>
          ج.م في الشهر، الـ
          <span className="md-num"> {CSB_LINES.length} </span>
          كلهم بيفتحوا مع بعض على نفس البيانات.
        </p>
      </div>
    </section>
  );
};

export default MdIndex;
