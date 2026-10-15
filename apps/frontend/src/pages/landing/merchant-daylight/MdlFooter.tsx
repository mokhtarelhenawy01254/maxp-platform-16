import React from "react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";
import { MDL_WHATSAPP_NUMBER, mdlWhatsAppLink } from "./merchantDaylightData";

const SECTOR_LINKS = [
  "متجر أونلاين",
  "مطاعم وكافيهات",
  "عيادات ومراكز طبية",
  "معامل أسنان",
  "إدارة صفحات وإعلانات",
  "شركات بموظفين",
];

const INTEGRATIONS = [
  "WhatsApp Cloud API",
  "بوسطة",
  "Turbo",
  "QP Express",
  "Paymob",
  "الفاتورة الإلكترونية ETA",
];

export const MdlFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#E6E8EC] bg-white">
      <div className="mdl-shell grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0E1116] text-[13px] font-bold text-white">
              M
            </span>
            <span className="text-[15px] font-bold">MaxP</span>
          </div>
          <p className="mdl-body mt-3 max-w-[34ch]">
            نظام تشغيل واحد للمتاجر والشركات: متجر، أوردرات، شحن، مخزون، محادثات، وحسابات — على نفس
            البيانات.
          </p>
        </div>

        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold">القطاعات</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {SECTOR_LINKS.map((sector) => (
              <li key={sector} className="text-[13px] text-[#6B7280]">
                {sector}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold">التكاملات</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {INTEGRATIONS.map((integration) => (
              <li key={integration} className="text-[13px] text-[#6B7280]">
                {integration}
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold">ابدأ أو اسأل</h3>
          <ul className="mt-3 flex flex-col gap-2">
            <li>
              <Link to="/register" className="mdl-link text-[13px]">
                إنشاء حساب جديد
              </Link>
            </li>
            <li>
              <Link to="/login" className="mdl-link text-[13px]">
                تسجيل الدخول
              </Link>
            </li>
            <li>
              <a
                href={mdlWhatsAppLink("مرحباً، عايز أعرف أكتر عن MaxP")}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackPlatformSiteLead("footer_whatsapp", { landing_variant: "merchant-daylight" })
                }
                className="mdl-link text-[13px]"
              >
                واتساب
              </a>
            </li>
            <li className="text-[13px] text-[#6B7280]">
              <span className="mdl-code">+{MDL_WHATSAPP_NUMBER}</span>
            </li>
            <li className="text-[13px] text-[#6B7280]">
              <span className="mdl-code">support@maxp.online</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#E6E8EC]">
        <div className="mdl-shell flex flex-col gap-2 py-4 text-[12px] text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
          <span>جميع الحقوق محفوظة © {new Date().getFullYear()} MaxP</span>
          <span className="flex flex-wrap items-center gap-4">
            <Link to="/terms" className="mdl-link">
              الشروط والأحكام
            </Link>
            <Link to="/privacy" className="mdl-link">
              سياسة الخصوصية
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
};

export default MdlFooter;
