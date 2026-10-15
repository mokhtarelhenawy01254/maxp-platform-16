import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { MDL_SOLUTIONS, mdlWhatsAppLink } from "./merchantDaylightData";

const ORDER_VOLUMES = ["أقل من 100 أوردر/شهر", "100 – 500 أوردر/شهر", "500 – 2,000 أوردر/شهر", "أكثر من 2,000 أوردر/شهر"];

interface MdlFinalCtaProps {
  onPreloadRegister?: () => void;
}

export const MdlFinalCta: React.FC<MdlFinalCtaProps> = ({ onPreloadRegister }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [activity, setActivity] = useState("");
  const [volume, setVolume] = useState("");
  const [error, setError] = useState("");

  const message = useMemo(
    () =>
      [
        "مرحباً، عايز أبدأ على MaxP.",
        name ? `الاسم: ${name}` : "",
        phone ? `الموبايل: ${phone}` : "",
        activity ? `النشاط: ${activity}` : "",
        volume ? `حجم الشغل: ${volume}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    [name, phone, activity, volume],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (!name.trim()) {
      setError("اكتب اسمك عشان نعرف نناديك.");
      return;
    }
    if (digits.length < 10) {
      setError("رقم الموبايل ناقص — اكتبه بالشكل 01xxxxxxxxx.");
      return;
    }
    setError("");
    trackPlatformSiteLead("final_form_whatsapp", {
      destination: "whatsapp",
      landing_variant: "merchant-daylight",
    });
    window.open(mdlWhatsAppLink(message), "_blank", "noopener,noreferrer");
  };

  return (
    <section id="mdl-start" className="mdl-section">
      <div className="mdl-shell grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-5">
          <p className="mdl-eyebrow">الخطوة الأولى</p>
          <h2 className="mdl-h2 mt-2">ابدأ بمتجر مجاني — وقرّر بعد ما تشوف بنفسك.</h2>
          <p className="mdl-lead mt-3">
            سيب بياناتك ونكلّمك على واتساب. لو المتجر المجاني كفايتك تفضل عليه، ولو محتاج الباقة
            هنقولك الفرق بالأرقام.
          </p>
          <ul className="mt-5 flex flex-col gap-2.5">
            {[
              "مكالمة قصيرة على قد شغلك — مش عرض عام",
              "نقولك أنهي باقة تناسب نشاطك من الكتالوج",
              "من غير مقدم ومن غير التزام سنوي",
            ].map((point) => (
              <li key={point} className="flex gap-2 text-[13.5px] text-[#39414D]">
                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[#D3D7DE]" aria-hidden="true" />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <div className="mdl-surface p-5">
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mdl-label" htmlFor="mdl-name">
                    اسمك
                  </label>
                  <input
                    id="mdl-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    className="mdl-field"
                    placeholder="مثال: محمود"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mdl-label" htmlFor="mdl-phone">
                    موبايل / واتساب
                  </label>
                  <input
                    id="mdl-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    className="mdl-field text-right"
                    placeholder="01xxxxxxxxx"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mdl-label" htmlFor="mdl-activity">
                    نشاطك
                  </label>
                  <select
                    id="mdl-activity"
                    name="activity"
                    className="mdl-field"
                    value={activity}
                    onChange={(event) => setActivity(event.target.value)}
                  >
                    <option value="">اختار النشاط</option>
                    {MDL_SOLUTIONS.map((solution) => (
                      <option key={solution.id} value={solution.name}>
                        {solution.name}
                      </option>
                    ))}
                    <option value="نشاط تاني">نشاط تاني</option>
                  </select>
                </div>
                <div>
                  <label className="mdl-label" htmlFor="mdl-volume">
                    حجم الشغل
                  </label>
                  <select
                    id="mdl-volume"
                    name="volume"
                    className="mdl-field"
                    value={volume}
                    onChange={(event) => setVolume(event.target.value)}
                  >
                    <option value="">اختار الحجم</option>
                    {ORDER_VOLUMES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button type="submit" className="mdl-btn mdl-btn--wa">
                  أرسل على واتساب
                </button>
                <Link
                  to="/register"
                  onMouseEnter={onPreloadRegister}
                  onFocus={onPreloadRegister}
                  onClick={() =>
                    trackPlatformSiteLead("final_register", {
                      destination: "/register",
                      landing_variant: "merchant-daylight",
                    })
                  }
                  className="mdl-btn mdl-btn--primary"
                >
                  افتح المتجر المجاني فورًا
                </Link>
              </div>

              <p
                className="mt-3 text-[12px]"
                style={{ color: error ? "#B42318" : "#6B7280" }}
                role="status"
                aria-live="polite"
              >
                {error ||
                  "بالضغط بتفتح محادثة واتساب وبياناتك مكتوبة مسبقًا — مفيش بيانات بتتخزن على أي سيرفر."}
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MdlFinalCta;
