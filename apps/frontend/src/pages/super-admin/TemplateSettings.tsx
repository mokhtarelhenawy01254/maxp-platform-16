import React from "react";
import { useTemplate } from "../../templates/useTemplate";
import { templateMetas } from "../../config/templates";

const TemplateSettings: React.FC = () => {
  const { templateId, setTemplate, meta } = useTemplate();

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">إدارة قوالب واجهة المستخدم</h1>
        <p className="text-muted-foreground">اختر القالب الذي تريد تطبيقه على كل الشركات. القوالب تؤثر فقط على الشكل والمظهر، ولا تؤثر على البيانات أو المهام.</p>
      </div>

      {meta ? (
        <div className="mb-6 p-4 rounded-lg border bg-card text-card-foreground">
          <p className="text-sm text-muted-foreground">القالب الحالي</p>
          <p className="text-lg font-semibold">{meta.name}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {templateMetas.map((t) => {
          const isActive = t.id === templateId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`relative rounded-xl border-2 p-5 text-right transition-all duration-200 hover:shadow-lg ${
                isActive
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {isActive ? (
                <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                  نشط
                </span>
              ) : null}

              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: `rgb(${t.colors.primary})` }}
                >
                  {t.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-base">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.id === "template-1" ? "القالب الافتراضي (Business OS)" : t.id === "template-2" ? "تصميم داكن عصري مستوحى من Linear" : ""}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <div className="w-full h-8 rounded-md" style={{ background: `rgb(${t.colors.primary})` }} />
                <div className="w-full h-8 rounded-md" style={{ background: `rgb(${t.colors.secondary})` }} />
                <div className="w-full h-8 rounded-md" style={{ background: `rgb(${t.colors.background})` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-lg border bg-muted/30">
        <h3 className="font-medium text-sm mb-2">ملاحظة مهمة</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>تغيير القالب يطبق فوراً على كل المستخدمين في جميع الشركات</li>
          <li>القوالب لا تؤثر على البيانات، الطلبات، العملاء، المخزون، أو أي إعدادات</li>
          <li>يمكنك الرجوع للقالب الافتراضي في أي وقت</li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateSettings;
