import React from "react";

export const StatementPrintableFooter: React.FC = () => {
  return (
    <div className="hidden print:block pt-8 mt-6 border-t border-slate-300">
      <div className="grid grid-cols-2 gap-8 text-center text-xs font-semibold text-slate-800">
        <div>
          <p className="mb-10">ختم واعتماد إدارة المعمل</p>
          <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
        </div>
        <div>
          <p className="mb-10">توقيع وموافقة الطبيب / المستلم</p>
          <div className="border-b border-dashed border-slate-400 w-48 mx-auto" />
        </div>
      </div>
      <p className="text-[10px] text-center text-slate-500 mt-8">
        يعتبر هذا الكشف مطابقاً للحسابات ما لم يرد اعتراض كتابي خلال 7 أيام من
        تاريخه • منصة MaxP Dental Lab
      </p>
    </div>
  );
};

export default StatementPrintableFooter;
