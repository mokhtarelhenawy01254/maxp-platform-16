import type { Dispatch, SetStateAction } from "react";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { MODAL_INPUT_CLS } from "../../../../shared";
import type { TechnicianForm } from "../../types/technicianTypes";

interface TechnicianAccountSectionProps {
  modal: TechnicianForm;
  setModal: Dispatch<SetStateAction<TechnicianForm | null>>;
}

export function TechnicianAccountSection({ modal, setModal }: TechnicianAccountSectionProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <>
      <div className="sm:col-span-2 border-t dark:border-gray-700/80 pt-4 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
            بيانات تسجيل الدخول لحساب الفني بالمنصة (Portal Login Account)
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>البريد الإلكتروني / اسم الدخول *</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
              <input
                className={`${inputCls} pr-9 font-mono`}
                type="email"
                value={modal.email}
                onChange={(e) => setModal({ ...modal, email: e.target.value })}
                placeholder="technician@lab.com"
                dir="ltr"
                required
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              {modal.id ? "تحديث كلمة المرور (فارغ للإبقاء)" : "كلمة المرور للدخول *"}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none" />
              <input
                className={`${inputCls} pr-9 font-mono`}
                type="password"
                value={modal.password}
                onChange={(e) => setModal({ ...modal, password: e.target.value })}
                placeholder={modal.id ? "•••••••• (فارغ للإبقاء)" : "6 أحرف على الأقل"}
                dir="ltr"
                required={!modal.id}
              />
            </div>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
          يتم إنشاء وتفعيل حساب المستخدم فورياً لتمكين الفني من الدخول لبوابة المعمل ومسح باركود الحالات وتتبع مهامه.
        </p>
      </div>

      {modal.id && (
        <div className="sm:col-span-2 flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="tech-active"
            checked={modal.isActive}
            onChange={(e) => setModal({ ...modal, isActive: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="tech-active" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            عضو نشط (متاح لتعيين مراحل الشغل له)
          </label>
        </div>
      )}
    </>
  );
}
