import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";

interface OlNavProps {
  onPreloadAuth?: () => void;
  onPreloadRegister?: () => void;
}

export const OlNav: React.FC<OlNavProps> = ({
  onPreloadAuth,
  onPreloadRegister,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#f0f5f3]/85 border-b border-[#013735]/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[#013735] text-[#3fffba] flex items-center justify-center font-bold text-xl shadow-md transition-transform group-hover:scale-105">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-2xl tracking-tight text-[#013735] flex items-center gap-1.5 leading-none">
              MaxP <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#3fffba] text-[#002624] font-bold">OS</span>
            </span>
            <span className="text-[11px] text-[#4e6362] font-semibold mt-1">
              نظام تشغيل التجارة والمتاجر
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Exact Operix Top Nav) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#072524]">
          <a
            href="#modules"
            className="hover:text-[#02817d] transition-colors py-2"
          >
            وحدات النظام
          </a>
          <a
            href="#why-maxp"
            className="hover:text-[#02817d] transition-colors py-2"
          >
            لماذا MaxP؟
          </a>
          <a
            href="#integrations"
            className="hover:text-[#02817d] transition-colors py-2"
          >
            التكاملات
          </a>
          <a
            href="#faq"
            className="hover:text-[#02817d] transition-colors py-2"
          >
            الأسئلة الشائعة
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            onMouseEnter={onPreloadAuth}
            className="px-4 py-2 rounded-xl text-sm font-bold text-[#013735] hover:text-[#025956] transition-colors"
          >
            تسجيل الدخول
          </Link>

          <a
            href="https://wa.me/201123087745?text=مرحباً،%20أريد%20حجز%20عرض%20توضيحي%20لمنصة%20MaxP"
            target="_blank"
            rel="noopener noreferrer"
            className="ol-btn-mint px-5 py-2.5 rounded-full text-xs font-bold inline-flex items-center gap-2 shadow-sm"
          >
            <span>احجز عرضاً توضيحياً</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};
