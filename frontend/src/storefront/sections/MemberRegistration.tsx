import React, { useState } from 'react';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { 
  CameraIcon, 
  MapPinIcon, 
  ChevronRightIcon, 
  AcademicCapIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

interface MemberRegistrationProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
}

const MemberRegistration: React.FC<MemberRegistrationProps> = ({ settings }) => {
  const { theme } = useStorefrontTheme();
  
  // Theme-aware colors
  const primaryColor = `hsl(${theme.tokens.colors.primary})`;
  const accentBg = `hsl(${theme.tokens.colors.muted})`;
  const textColor = `hsl(${theme.tokens.colors.foreground})`;

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = settings?.title || 'تسجيل العضوية';
  const description = settings?.description || `الخطوة ${step}: يرجى تقديم معلوماتك الأساسية`;

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    constituency: '',
    party: '',
    position: '',
    birthDate: '',
    gender: '',
    vision: ''
  });

  const [educationList, setEducationList] = useState<EducationEntry[]>([]);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', year: '' });

  const addEducation = () => {
    if (newEdu.degree && newEdu.institution) {
      setEducationList([...educationList, { ...newEdu, id: Date.now().toString() }]);
      setNewEdu({ degree: '', institution: '', year: '' });
    }
  };

  const removeEducation = (id: string) => {
    setEducationList(educationList.filter(e => e.id !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/membership/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          education: educationList,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.message || 'حدث خطأ أثناء محاولة التسجيل. يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <CheckCircleIcon className="w-16 h-16 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>تم إرسال طلبك بنجاح!</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8">
          شكراً لانضمامك إلينا. سنقوم بمراجعة بياناتك والتواصل معك في أقرب وقت ممكن عبر البريد الإلكتروني أو رقم الهاتف المسجل.
        </p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-10 h-14 text-white rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: primaryColor }}
        >
          العودة للمتجر
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-12 px-4 md:px-0 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden border border-gray-100 flex flex-col relative">
        
        {/* Progress Stepper */}
        <div className="px-8 pt-10 pb-6 flex items-center justify-between border-b border-gray-50" dir="rtl">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-2 relative">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step >= s 
                      ? 'shadow-lg scale-110' 
                      : 'bg-gray-100 text-gray-400'
                  }`}
                  style={{ 
                    backgroundColor: step >= s ? primaryColor : undefined,
                    color: step >= s ? '#fff' : undefined
                  }}
                >
                  {s}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s === 1 ? 'أساسي' : s === 2 ? 'تواصل' : 'تحقق'}
                </span>
              </div>
              {s < 3 && (
                <div className="flex-1 h-[2px] mx-4 mb-6 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500" 
                    style={{ 
                      width: step > s ? '100%' : '0%',
                      backgroundColor: primaryColor
                    }} 
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-8 md:p-10 flex-1 overflow-y-auto" dir="rtl">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: textColor }}>
                {title}
              </h1>
              <p className="text-sm text-gray-500">
                {step === 1 ? description : `الخطوة ${step}: تابعي إكمال بياناتك`}
              </p>
            </div>
            
            {/* Photo Upload Circle */}
            <div className="relative group cursor-pointer">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: primaryColor }}
              >
                <CameraIcon className="w-8 h-8 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-sm border border-gray-100">
                <PlusIcon className="w-3 h-3 text-gray-900" />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 rounded-2xl flex items-center gap-3 text-red-600 text-sm animate-in fade-in slide-in-from-top-2">
              <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            
            {step === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">الاسم الكامل</label>
                  <input 
                    type="text" 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    placeholder="مثال: سارة أحمد"
                    className="w-full h-14 px-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-opacity-50 transition-all outline-none text-[0.95rem] font-medium"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">تاريخ الميلاد</label>
                  <input 
                    type="date" 
                    value={formData.birthDate}
                    onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    className="w-full h-14 px-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-opacity-50 transition-all outline-none text-[0.95rem] font-medium"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">الجنس</label>
                  <div className="flex gap-6 h-14 items-center px-2">
                    {['أنثى', 'ذكر'].map((g) => (
                      <label key={g} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="radio" 
                          name="gender" 
                          checked={formData.gender === g}
                          onChange={() => setFormData({...formData, gender: g})}
                          className="peer hidden" 
                        />
                        <div 
                          className={`w-5 h-5 rounded-full border-2 transition-all ${formData.gender === g ? 'border-4' : 'border-gray-200'}`}
                          style={{ borderColor: formData.gender === g ? primaryColor : undefined }}
                        />
                        <span className={`text-sm font-bold ${formData.gender === g ? 'text-gray-900' : 'text-gray-400'}`}>{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">الدائرة الانتخابية</label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={formData.constituency}
                      onChange={e => setFormData({...formData, constituency: e.target.value})}
                      placeholder="ابحث عن منطقتك"
                      className="w-full h-14 pr-12 pl-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-opacity-50 transition-all outline-none text-[0.95rem] font-medium"
                      style={{ '--tw-ring-color': primaryColor } as any}
                    />
                    <MapPinIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">الحزب السياسي</label>
                  <select 
                    value={formData.party}
                    onChange={e => setFormData({...formData, party: e.target.value})}
                    className="w-full h-14 px-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-opacity-50 transition-all outline-none text-[0.95rem] font-medium appearance-none cursor-pointer"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  >
                    <option value="">اختر الحزب</option>
                    <option value="Independent">مستقل</option>
                    <option value="Party A">حزب أ</option>
                    <option value="Party B">حزب ب</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">المنصب</label>
                  <select 
                    value={formData.position}
                    onChange={e => setFormData({...formData, position: e.target.value})}
                    className="w-full h-14 px-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-opacity-50 transition-all outline-none text-[0.95rem] font-medium appearance-none cursor-pointer"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  >
                    <option value="">اختر المنصب</option>
                    <option value="Member">عضو</option>
                    <option value="Delegate">مندوب</option>
                  </select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                {/* Vision Textarea */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">الرؤية / الأهداف</label>
                  <textarea 
                    value={formData.vision}
                    onChange={e => setFormData({...formData, vision: e.target.value})}
                    placeholder="صفي رؤيتك أو أهدافك باختصار"
                    className="w-full h-32 p-5 bg-gray-50 border-none rounded-[1.8rem] focus:ring-2 focus:ring-opacity-50 transition-all outline-none text-[0.95rem] font-medium resize-none text-right"
                    style={{ '--tw-ring-color': primaryColor } as any}
                  />
                </div>

                {/* Education Subsection */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <AcademicCapIcon className="w-5 h-5" style={{ color: primaryColor }} />
                    <h3 className="font-bold text-sm uppercase tracking-wider text-gray-800">بيانات التعليم</h3>
                  </div>

                  <div className="space-y-3">
                    {educationList.map((edu) => (
                      <div key={edu.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                            <AcademicCapIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase">{edu.year}</p>
                            <p className="text-sm font-bold text-gray-900">{edu.degree}</p>
                            <p className="text-xs text-gray-500">{edu.institution}</p>
                          </div>
                        </div>
                        <button onClick={() => removeEducation(edu.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <div className="p-6 rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col gap-4" style={{ backgroundColor: accentBg }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                          placeholder="المؤهل / الدرجة العلمية"
                          className="h-12 px-4 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-opacity-20 outline-none transition-all font-medium text-right"
                          value={newEdu.degree}
                          onChange={e => setNewEdu({...newEdu, degree: e.target.value})}
                        />
                        <input 
                          placeholder="المدرسة / الجامعة"
                          className="h-12 px-4 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-opacity-20 outline-none transition-all font-medium text-right"
                          value={newEdu.institution}
                          onChange={e => setNewEdu({...newEdu, institution: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <input 
                          placeholder="السنة"
                          className="h-12 w-24 px-4 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-opacity-20 outline-none transition-all font-medium text-right"
                          value={newEdu.year}
                          onChange={e => setNewEdu({...newEdu, year: e.target.value})}
                        />
                        <button 
                          onClick={addEducation}
                          className="px-6 h-12 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <PlusIcon className="w-4 h-4" />
                          حفظ البيانات
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-10 flex gap-4">
              {step > 1 && (
                <button 
                  type="button"
                  onClick={prevStep}
                  className="flex-1 h-16 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  السابق
                </button>
              )}
              <button 
                type="button"
                onClick={nextStep}
                disabled={isSubmitting}
                className={`flex-[2] h-16 text-white rounded-2xl font-bold shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: primaryColor }}
              >
                {isSubmitting ? 'جارٍ الإرسال...' : step === 3 ? 'إكمال التسجيل' : 'الخطوة التالية'}
                {!isSubmitting && <ChevronRightIcon className="w-5 h-5 transform rotate-180" />}
              </button>
            </div>

          </form>
        </div>

        {/* Footer info */}
        <div className="px-10 py-6 bg-gray-50/50 flex justify-center border-t border-gray-50">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center leading-relaxed">
            البيانات الشخصية مشفرة وآمنة تماماً <br />
            © 2026 مكتب العضوية
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberRegistration;
