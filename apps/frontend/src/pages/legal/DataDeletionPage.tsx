import React from "react";

const DataDeletionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-8 sm:p-10 text-right" dir="rtl">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              تعليمات حذف بيانات المستخدم (User Data Deletion)
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
              وفقاً لسياسة منصة فيسبوك (Meta Platform Terms) وحماية الخصوصية
            </p>

            <div className="space-y-6 text-gray-700 dark:text-gray-300 leading-relaxed text-base">
              <section className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-lg border border-blue-150 dark:border-blue-800">
                <p>
                  منصة <strong>MaxP</strong> تحترم خصوصيتك وتلتزم بمنحك التحكم الكامل في بياناتك الشخصية وحساباتك المرتبطة عبر فيسبوك (Facebook Login / Pages / Messenger / Instagram).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  1. كيفية إلغاء ربط تطبيق MaxP وحذف البيانات عبر فيسبوك:
                </h2>
                <ol className="list-decimal list-inside space-y-2 pr-2">
                  <li>قم بتسجيل الدخول إلى حسابك على <strong>Facebook</strong>.</li>
                  <li>انتقل إلى <strong>الإعدادات والخصوصية (Settings & Privacy)</strong> ثم اختر <strong>الإعدادات (Settings)</strong>.</li>
                  <li>من القائمة الجانبية، اختر <strong>التطبيقات والمواقع الإلكترونية (Apps and Websites)</strong>.</li>
                  <li>ابحث عن تطبيق <strong>MaxP</strong> في قائمة التطبيقات النشطة.</li>
                  <li>اضغط على زر <strong>إزالة (Remove)</strong>.</li>
                  <li>سيقوم فيسبوك فوراً بإلغاء وصول التطبيق، ويمكنك أيضاً تحديد خيار حذف جميع المنشورات أو الفيديوهات أو الأحداث التي نشرها التطبيق نيابةً عنك.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  2. كيفية طلب حذف بياناتك وسجلاتك نهائياً من خوادم MaxP:
                </h2>
                <p className="mb-3">
                  إذا كنت ترغب في حذف كافة السجلات والرسائل والبيانات المخزنة في خوادم MaxP نهائياً:
                </p>
                <div className="bg-gray-100 dark:bg-gray-700/60 p-4 rounded-lg space-y-2">
                  <p>
                    <strong>إرسال بريد إلكتروني:</strong> أرسل طلباً إلى:{" "}
                    <a href="mailto:support@maxp.online" className="text-blue-600 dark:text-blue-400 underline">
                      support@maxp.online
                    </a>
                  </p>
                  <p>
                    <strong>عنوان الرسالة:</strong> طلب حذف بيانات فيسبوك (Facebook Data Deletion Request)
                  </p>
                  <p>
                    <strong>البيانات المطلوبة في الرسالة:</strong> اسم الصفحة أو معرف المستخدم (Facebook User ID / Page ID) والبريد الإلكتروني المسجل لدينا.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    * يتم مراجعة وتنفيذ طلب الحذف وحذف البيانات المرتبطة خلال مدة أقصاها 48 ساعة من استلام الطلب مع إشعارك بتأكيد الحذف.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  3. الدعم الفني والاستفسارات:
                </h2>
                <p>
                  الموقع الرسمي:{" "}
                  <a href="https://maxp.online" className="text-blue-600 dark:text-blue-400 underline">
                    https://maxp.online
                  </a>
                </p>
                <p>
                  البريد الإلكتروني:{" "}
                  <a href="mailto:support@maxp.online" className="text-blue-600 dark:text-blue-400 underline">
                    support@maxp.online
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDeletionPage;
