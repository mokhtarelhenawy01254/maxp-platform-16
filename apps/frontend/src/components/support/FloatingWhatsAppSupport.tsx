import React, { useEffect, useState } from "react";

const WhatsAppIcon = () => (
  <svg viewBox="0 0 32 32" className="size-6 text-white" fill="currentColor">
    <path d="M16 0C7.164 0 0 7.164 0 16c0 3.098.88 5.992 2.398 8.44L.812 31.188l7.027-1.844A15.926 15.926 0 0016 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm8.496 22.684c-.578 1.633-2.879 3.02-4.715 3.422-1.258.277-2.844.5-8.285-1.781-6.977-2.926-8.539-7.352-8.797-7.688-.258-.34-2.098-2.801-2.098-5.344 0-2.543 1.332-3.793 1.805-4.309s.996-.414 1.328-.414c.332 0 .664.004.957.018.308.015.719-.117 1.125.86.422 1.02 1.434 3.535 1.563 3.789.129.254.215.55.043.887-.172.34-.258.55-.516.848-.258.3-.543.668-.777.895-.258.258-.528.539-.227 1.059.301.52 1.332 2.199 2.863 3.562 1.965 1.746 3.621 2.29 4.137 2.543.516.254.82.211 1.125-.129.301-.34 1.289-1.508 1.632-2.027.344-.516.687-.43 1.16-.258.472.172 2.996 1.414 3.512 1.672.52.258.86.387.992.601.129.215.129 1.227-.449 2.86z" />
  </svg>
);

const FloatingWhatsAppSupport: React.FC = () => {
  const envPhone = import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || "";
  const [phone, setPhone] = useState(envPhone);
  const isRTL = typeof document !== "undefined" && (document.dir === "rtl" || document.documentElement.dir === "rtl");

  useEffect(() => {
    fetch("/api/v1/public/support-settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data.phone) setPhone(res.data.phone);
      })
      .catch(() => {});
  }, []);

  if (!phone) return null;

  const cleanNumber = phone.replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={waLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-6 z-50 flex size-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-xl transition-all duration-200 hover:bg-[#20BD5A] hover:shadow-2xl hover:scale-105 active:scale-95 border border-emerald-400/25 cursor-pointer ${
        isRTL ? "left-6" : "right-6"
      }`}
      title="التواصل مع الدعم الفني عبر واتساب"
      aria-label="التواصل مع الدعم الفني عبر واتساب"
    >
      <WhatsAppIcon />
    </a>
  );
};

export default FloatingWhatsAppSupport;
