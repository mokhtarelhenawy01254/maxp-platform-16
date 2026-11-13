import React, { useEffect, useState } from "react";
import { ChatBubbleLeftRightIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { getApiUrl } from "../../../config/environment";
import { getAccessToken } from "./types";

export interface SpecialtyItem {
  id: string;
  slug: string;
  nameAr: string;
  nameEn?: string;
  descriptionAr?: string;
  icon?: string;
}

export interface CompanyInboxProfileSectionProps {
  inboxVerticalProfile: string;
  savingInboxProfile: boolean;
  handleInboxProfileChange: (profile: string) => Promise<void>;
  businessSpecialtyId: string;
  savingSpecialty: boolean;
  handleSpecialtyChange: (specialtyId: string) => Promise<void>;
  currentSpecialtyName?: string;
}

const INBOX_PROFILES = [
  {
    id: "auto",
    name: "تلقائي (الوضع الذكي الموصى به)",
    description: "تحديد واجهة المحادثات تلقائياً بناءً على تخصص الشركة والتطبيقات المثبتة لديها.",
  },
  {
    id: "education",
    name: "أكاديميات ومراكز التعليم",
    description: "واجهة متخصصة للمنظومة التعليمية: تسجيل الديمو داي، متابعة الطلاب، مواعيد الجلسات، واشتراكات الدورات.",
  },
  {
    id: "commerce",
    name: "التجارة والمتاجر الإلكترونية",
    description: "واجهة متجر كلاسيكية: كتالوج المنتجات، سلات التسوق، استخراج بوليصات الشحن، ومتابعة الطلبات.",
  },
  {
    id: "services",
    name: "الخدمات والصيانة الميدانية",
    description: "إدارة طلبات الصيانة والخدمات، معاينات ومواعيد الفنيين، وتكلفة أوامر الشغل.",
  },
  {
    id: "medical",
    name: "العيادات والمراكز الطبية",
    description: "واجهة طبية متكاملة: كشوفات المرضى، المواعيد والروشتات، والسجلات الطبية.",
  },
  {
    id: "dental",
    name: "معامل الأسنان",
    description: "تشغيل معامل الأسنان: استلام حالات التركيبات، مراحل المعمل، باركود، وفواتير أطباء الأسنان.",
  },
  {
    id: "agency",
    name: "وكالات التسويق والدعاية",
    description: "متابعة العملاء المحتملين، مهام الحملات الإعلانية، وتنسيق مواعيد الاجتماعات.",
  },
  {
    id: "cafe",
    name: "الكافيهات والمطاعم",
    description: "استقبال طلبات الطعام والمشروبات السريعة، منيو الأصناف، وحجوزات الطاولات.",
  },
];

export const CompanyInboxProfileSection: React.FC<CompanyInboxProfileSectionProps> = ({
  inboxVerticalProfile,
  savingInboxProfile,
  handleInboxProfileChange,
  businessSpecialtyId,
  savingSpecialty,
  handleSpecialtyChange,
  currentSpecialtyName,
}) => {
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchSpecialties = async () => {
      try {
        setLoadingSpecialties(true);
        const token = getAccessToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${getApiUrl()}/auth/business-specialties`, { headers });
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data?.items)) {
          setSpecialties(json.data.items);
        }
      } catch (err) {
        console.warn("Could not load business specialties:", err);
      } finally {
        if (isMounted) setLoadingSpecialties(false);
      }
    };

    fetchSpecialties();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
          طبيعة واجهة صندوق المحادثات ونشاط الشركة
        </h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          تحكم فوري ودقيق
        </span>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        حدد تخصص شركتك الرسمي وطبيعة التجربة التي تظهر لفريق العمل داخل صندوق محادثات فيسبوك وواتساب، لضمان ظهور الأدوات المناسبة (الديمو داي للتعليم، الكشوفات للعيادات، الكتالوج للمتاجر).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Specialty Selector */}
        <div>
          <label
            htmlFor="company-business-specialty"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            تخصص الشركة المسجل في المنصة
          </label>
          <select
            id="company-business-specialty"
            value={businessSpecialtyId || ""}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            disabled={savingSpecialty || loadingSpecialties}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="">بدون تخصص محدد (تلقائي)</option>
            {specialties.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nameAr} ({item.nameEn || item.slug})
              </option>
            ))}
          </select>
          {savingSpecialty && (
            <p className="mt-1.5 text-xs text-blue-600 flex items-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1.5"></span>
              جاري حفظ التخصص...
            </p>
          )}
          {currentSpecialtyName && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              التخصص الحالي: {currentSpecialtyName}
            </p>
          )}
        </div>

        {/* Inbox Profile Override */}
        <div>
          <label
            htmlFor="company-inbox-profile"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            واجهة صندوق المحادثات المخصصة (Inbox Experience)
          </label>
          <select
            id="company-inbox-profile"
            value={inboxVerticalProfile || "auto"}
            onChange={(e) => handleInboxProfileChange(e.target.value)}
            disabled={savingInboxProfile}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            {INBOX_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {savingInboxProfile && (
            <p className="mt-1.5 text-xs text-blue-600 flex items-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1.5"></span>
              جاري حفظ إعداد الواجهة...
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
            {INBOX_PROFILES.find((p) => p.id === (inboxVerticalProfile || "auto"))?.description}
          </p>
        </div>
      </div>
    </div>
  );
};
