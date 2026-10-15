import React from "react";
import { useParams, Link } from "react-router-dom";
import { Award, ArrowRight, Printer } from "lucide-react";

const StudentCertificatePage: React.FC = () => {
  const { enrollmentId } = useParams<{ enrollmentId: string }>();

  if (!enrollmentId) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">لم يتم تحديد معرّف الشهادة</p>
        <Link to="/portal/my-courses" className="text-xs text-indigo-600 font-bold underline">
          العودة لكورساتي
        </Link>
      </div>
    );
  }

  const certificateUrl = `/api/v1/academy/certificates/${enrollmentId}/view`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900">شهادة إتمام الكورس</h1>
            <p className="text-xs text-slate-500">تهانينا على إتمام مسارك التعليمي بنجاح!</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الشهادة</span>
          </button>
          <Link
            to="/portal/my-courses"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
          >
            <span>كورساتي</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Certificate Frame */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[650px]">
        <iframe
          src={certificateUrl}
          title="شهادة إتمام الكورس"
          className="w-full min-h-[650px] border-0"
        />
      </div>
    </div>
  );
};

export default StudentCertificatePage;
