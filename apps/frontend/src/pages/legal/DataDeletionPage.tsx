import React from "react";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Trash2, 
  Mail, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  ArrowRight
} from "lucide-react";

const DataDeletionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background py-8 sm:py-12" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Header Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-primary font-mono uppercase tracking-wider block">
                  Meta Platform Compliance
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-foreground">
                  تعليمات وسياسة حذف بيانات المستخدم (User Data Deletion)
                </h1>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>سياسة الخصوصية الرسمية</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            وفقاً لبنود حماية البيانات وشروط منصة ميتا (Meta Platform Terms)، تلتزم منصة <strong>MaxP</strong> باحترام خصوصيتك وتوفير آليات واضحة تتيح لك التحكم الكامل في بياناتك الشخصية والحسابات المرتبطة عبر فيسبوك وإنستجرام.
          </p>
        </div>

        {/* Section 1: Facebook Deletion Steps */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-sm font-bold text-foreground border-b border-border/40 pb-3">
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
              1
            </div>
            <h2>إلغاء ربط تطبيق MaxP وحذف الصلاحيات عبر فيسبوك</h2>
          </div>

          <p className="text-xs text-muted-foreground">
            يمكنك في أي وقت سحب الأذونات الممنوحة للتطبيق وإزالة ارتباط حسابك عبر لوحة تحكم فيسبوك:
          </p>

          <ol className="space-y-2.5 text-xs text-foreground pr-2">
            <li className="flex items-start gap-2">
              <span className="font-mono text-primary font-bold">1.</span>
              <span>سجل الدخول إلى حسابك الشخصي على موقع <strong>Facebook</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-primary font-bold">2.</span>
              <span>انتقل إلى <strong>الإعدادات والخصوصية (Settings & Privacy)</strong> ثم اختر <strong>الإعدادات (Settings)</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-primary font-bold">3.</span>
              <span>من القائمة الجانبية، اختر <strong>التطبيقات والمواقع الإلكترونية (Apps and Websites)</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-primary font-bold">4.</span>
              <span>ابحث عن تطبيق <strong>MaxP</strong> في قائمة التطبيقات النشطة.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-primary font-bold">5.</span>
              <span>اضغط على خيار <strong>إزالة (Remove)</strong> لتأكيد إلغاء الوصول.</span>
            </li>
          </ol>
        </div>

        {/* Section 2: Direct Server Deletion Request */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 text-sm font-bold text-foreground border-b border-border/40 pb-3">
            <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono text-xs">
              2
            </div>
            <h2>طلب حذف البيانات والسجلات نهائياً من خوادم MaxP</h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            إذا كنت ترغب في محو وتطهير كافة السجلات والرسائل والبيانات التفاعلية المخزنة في قواعد بيانات MaxP بصورة نهائية:
          </p>

          <div className="bg-muted/20 border border-border/70 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="font-bold text-foreground">البريد الإلكتروني المخصص لطلبات الحذف:</span>
              <a href="mailto:support@maxp.online" className="text-primary font-mono hover:underline mr-auto">
                support@maxp.online
              </a>
            </div>

            <div className="space-y-1 text-muted-foreground pt-1 border-t border-border/40">
              <p>
                <strong className="text-foreground">عنوان الرسالة:</strong> طلب حذف بيانات فيسبوك (Facebook Data Deletion Request)
              </p>
              <p>
                <strong className="text-foreground">المعلومات المطلوبة:</strong> اسم الصفحة أو معرف المستخدم (User ID / Page ID) والبريد الإلكتروني المسجل.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>يتم مراجعة الطلب وتنفيذ الحذف التام خلال مدة أقصاها <strong>48 ساعة</strong> مع إرسال تأكيد رسمي.</span>
            </div>
          </div>
        </div>

        {/* Section 3: Official Support Channels */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-foreground block">قنوات التواصل والدعم الفني المعتمدة</span>
            <span className="text-[11px] text-muted-foreground">فريق حماية البيانات وأمن المعلومات متاح لمساعدتك على مدار الساعة</span>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="https://maxp.online" 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/70 bg-background hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>الموقع الرسمي</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
            <a 
              href="mailto:support@maxp.online" 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>مراسلة الدعم الفني</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataDeletionPage;
