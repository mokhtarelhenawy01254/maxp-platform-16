import React, { useState } from "react";
import { Users, Trash2 } from "lucide-react";
import type { ClinicDoctorItem } from "../../../shared";

export interface DoctorClinicTeamSectionProps {
  doctors: ClinicDoctorItem[];
  onAddDoctor: (doc: ClinicDoctorItem) => void;
  onRemoveDoctor: (index: number) => void;
  inputCls: string;
}

export const DoctorClinicTeamSection: React.FC<DoctorClinicTeamSectionProps> = ({
  doctors,
  onAddDoctor,
  onRemoveDoctor,
  inputCls,
}) => {
  const [docNameInput, setDocNameInput] = useState("");
  const [docPhoneInput, setDocPhoneInput] = useState("");
  const [docSpecInput, setDocSpecInput] = useState("");

  const handleAdd = () => {
    if (!docNameInput.trim()) return;
    const newDoc: ClinicDoctorItem = {
      id: "doc_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: docNameInput.trim(),
      phone: docPhoneInput.trim() || undefined,
      specialty: docSpecInput.trim() || undefined,
    };
    onAddDoctor(newDoc);
    setDocNameInput("");
    setDocPhoneInput("");
    setDocSpecInput("");
  };

  return (
    <div className="sm:col-span-2 border-t dark:border-gray-700 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            <span>أطباء العيادة / الفريق الطبي التابع للعيادة</span>
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            إذا كانت العيادة أو المركز يضم أكثر من دكتور، يمكنك تسجيل أسمائهم هنا لربط أوردراتهم بنفس حساب العيادة الموحد دون تشتيت الحسابات.
          </p>
        </div>
      </div>

      {/* فورم إضافة دكتور للعيادة */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-lg border dark:border-gray-700 mb-3">
        <input
          className={`${inputCls} text-xs`}
          placeholder="اسم الدكتور (مثال: د. سارة أحمد)"
          value={docNameInput}
          onChange={(e) => setDocNameInput(e.target.value)}
        />
        <input
          className={`${inputCls} text-xs`}
          placeholder="التخصص (مثال: تركيبات / زراعة)"
          value={docSpecInput}
          onChange={(e) => setDocSpecInput(e.target.value)}
        />
        <div className="flex gap-2">
          <input
            className={`${inputCls} text-xs flex-1 font-mono`}
            placeholder="الهاتف (اختياري)"
            value={docPhoneInput}
            onChange={(e) => setDocPhoneInput(e.target.value)}
            dir="ltr"
          />
          <button
            type="button"
            disabled={!docNameInput.trim()}
            onClick={handleAdd}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-40 shrink-0"
          >
            إضافة
          </button>
        </div>
      </div>

      {/* قائمة الأطباء المضافين */}
      {doctors && doctors.length > 0 ? (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {doctors.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="flex items-center justify-between bg-white dark:bg-gray-800 border dark:border-gray-700 px-3 py-1.5 rounded-lg text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {doc.name}
                </span>
                {doc.specialty && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px]">
                    {doc.specialty}
                  </span>
                )}
                {doc.phone && (
                  <span className="text-gray-400 text-[10px] font-mono" dir="ltr">
                    {doc.phone}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemoveDoctor(idx)}
                className="p-1 text-gray-400 hover:text-red-500 rounded"
                title="حذف الطبيب من العيادة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">
          لم يتم إضافة أطباء إضافيين للعيادة بعد (الحساب يسجل باسم الطبيب الرئيسي أعلاه).
        </p>
      )}
    </div>
  );
};

export default DoctorClinicTeamSection;
