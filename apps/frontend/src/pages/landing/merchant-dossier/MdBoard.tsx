import React from "react";
import { MD_TILES, type MdTile } from "./merchantDossierData";
import MdFragment from "./MdFragment";

const TONES: Record<MdTile["tone"], { bg: string; ink: string }> = {
  accent: { bg: "#f6e016", ink: "#0d2a1c" },
  surface: { bg: "#ebebeb", ink: "#0d2a1c" },
  field2: { bg: "#d9d9d2", ink: "#0d2a1c" },
  ink: { bg: "#0d2a1c", ink: "#f7f7f7" },
};

const SPAN: Record<MdTile["span"], string> = {
  wide: "col-span-12 md:col-span-6 md:row-span-2",
  tall: "col-span-6 md:col-span-3 md:row-span-4",
  small: "col-span-6 md:col-span-3 md:row-span-2",
};

/** الشاشات: لوح تقريب ، كل بلاطة قريبة مكبَّرة من جزء صغير من واجهة المنصة. */
export const MdBoard: React.FC = () => (
  <section id="md-board" className="md md-section" dir="rtl">
    <div className="md-shell">
      <div className="grid grid-cols-12 gap-2 md:auto-rows-[104px]">
        <div className="md-rise col-span-12 flex min-h-[168px] flex-col justify-between bg-[#f6e016] p-5 md:col-span-6 md:row-span-2">
          <h2 className="md-head max-w-[16ch] text-[#0d2a1c]">شاشات بتشتغل لوحدها</h2>
          <p className="md-small max-w-[30ch] text-[#0d2a1c]">
            الأرقام في الشاشات دي مثال ، الشكل والحقول من المنصة نفسها.
          </p>
        </div>

        {MD_TILES.map((tile) => {
          const tone = TONES[tile.tone];
          return (
            <article
              key={tile.id}
              className={`md-rise relative overflow-hidden ${SPAN[tile.span]}`}
              style={{ background: tone.bg, color: tone.ink, minHeight: 168 }}
            >
              <div
                className="pointer-events-none absolute overflow-hidden"
                style={{
                  width: 340,
                  height: 150,
                  top: 0,
                  insetInlineEnd: -28,
                }}
                aria-hidden="true"
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    insetInlineEnd: 0,
                    transform: "scale(2.3)",
                    transformOrigin: "top right",
                  }}
                >
                  <MdFragment id={tile.id} />
                </div>
              </div>
              <div className="relative z-10 flex h-full flex-col justify-end p-5">
                <p className="md-body font-semibold">{tile.name}</p>
                <p className="md-small mt-1 max-w-[26ch]">{tile.line}</p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);

export default MdBoard;
