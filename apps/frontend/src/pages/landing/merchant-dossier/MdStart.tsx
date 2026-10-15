import React, { useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

const CHANNELS = [
  { id: "shop", label: "محل" },
  { id: "online", label: "أونلاين" },
  { id: "both", label: "الاتنين" },
];

/** الخطوة الأولى: شاشة إنشاء المتجر مفتوحة فعلًا ، الاسم اللي تكتبه هو اللي يمشي معاك. */
export const MdStart: React.FC<{ onPreloadRegister?: () => void }> = ({ onPreloadRegister }) => {
  const [storeName, setStoreName] = useState("متجر النور للأحذية");
  const [channel, setChannel] = useState("both");

  const target = `/register?store=${encodeURIComponent(storeName)}&channel=${channel}`;

  return (
    <section id="md-start" className="md md-field-yellow min-h-[84svh]" dir="rtl">
      <div className="md-shell grid min-h-[84svh] items-center gap-14 py-20 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-6 lg:col-start-1">
          <div
            className="md-ui md-rise md-dialog mx-auto w-full max-w-[440px] p-6"
            data-ui="create-store"
          >
            <p className="text-[17px] font-semibold">سمّي متجرك</p>
            <label className="mt-5 block text-[13px] font-semibold" htmlFor="md-store-name">
              اسم المتجر
            </label>
            <input
              id="md-store-name"
              value={storeName}
              onChange={(event) => setStoreName(event.target.value)}
              className="mt-2 w-full px-3 py-3 text-[15px]"
              style={{ border: "1px solid #d3d7de", color: "#0e1116", background: "#fff" }}
            />
            <p className="mt-5 text-[13px] font-semibold">بتبيع منين؟</p>
            <div className="mt-2 flex gap-1">
              {CHANNELS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={channel === option.id}
                  onClick={() => setChannel(option.id)}
                  className="flex-1 px-3 py-2 text-[14px] font-semibold"
                  style={{
                    border: "1px solid #d3d7de",
                    background: channel === option.id ? "#0e1116" : "#fff",
                    color: channel === option.id ? "#fff" : "#39414d",
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Link
              to={target}
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              onClick={() =>
                trackPlatformSiteLead("dossier_start_action", {
                  channel,
                  landing_variant: "merchant-dossier",
                })
              }
              className="md-action mt-6 w-full"
            >
              افتح المتجر ، 0 ج.م
            </Link>
            <p className="mt-3 text-[13px]" style={{ color: "#5f6b64" }}>
              من غير بطاقة بنكية. تقدر تغيّر الاسم بعدين.
            </p>
          </div>
        </div>

        <div className="md-rise flex flex-col justify-end gap-5 lg:col-span-5 lg:col-start-8 lg:self-end lg:pb-6">
          <h2 className="md-display">
            ابدأ بملف فاضي
          </h2>
          <p className="md-body max-w-[36ch]">
            تكتب اسم المتجر وتدخل على اللوحة فورًا ، والدفع يبدأ لما تختار الباقة بنفسك.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MdStart;
