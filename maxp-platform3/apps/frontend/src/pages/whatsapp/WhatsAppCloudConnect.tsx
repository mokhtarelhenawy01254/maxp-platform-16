import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Facebook,
  Globe,
  Loader2,
  LogIn,
  Smartphone,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { apiClient } from "../../services/apiClient";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

type ConnectionStep =
  | "intro"
  | "connecting"
  | "success"
  | "error"
  | "callback";

interface FacebookConfig {
  appId: string;
  redirectUri: string;
  configured?: boolean;
}

const FACEBOOK_PERMISSIONS = [
  "business_management",
  "whatsapp_business_messaging",
  "whatsapp_business_management",
].join(",");

const getFacebookOAuthUrl = (config: FacebookConfig, state: string) => {
  const base = "https://www.facebook.com/v25.0/dialog/oauth";
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: FACEBOOK_PERMISSIONS,
    state,
    response_type: "code",
  });
  return `${base}?${params.toString()}`;
};

function StepIndicator({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all duration-500",
            i < current
              ? "w-8 bg-[color:var(--business-success)]"
              : i === current
                ? "w-8 bg-[color:var(--color-primary)]"
                : "w-4 bg-[color:var(--shell-control-border)]",
          )}
        />
      ))}
    </div>
  );
}

function RequirementItem({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          checked
            ? "bg-emerald-500/15 text-emerald-600"
            : "bg-amber-500/15 text-amber-600",
        )}
      >
        {checked ? (
          <CheckCircle2 className="size-3.5" />
        ) : (
          <AlertCircle className="size-3.5" />
        )}
      </div>
      <span className="text-sm text-[color:var(--color-foreground)]">
        {label}
      </span>
    </div>
  );
}

const WhatsAppCloudConnect: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<ConnectionStep>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fbConfig, setFbConfig] = useState<FacebookConfig | null>(null);
  const [stateToken, setStateToken] = useState("");

  const loadFbConfig = useCallback(async () => {
    try {
      const response = await apiClient.get("/whatsapp/facebook/config");
      setFbConfig(response.data);
    } catch {
      setErrorMessage("تعذر تحميل إعدادات Facebook");
    }
  }, []);

  React.useEffect(() => {
    void loadFbConfig();
  }, [loadFbConfig]);

  React.useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (code && state) {
      setStep("connecting");
      setStateToken(state);
      const name = sessionStorage.getItem("wa_cloud_session_name") || "";
      setSessionName(name);

      const exchangeCode = async () => {
        try {
          setIsLoading(true);
          const response = await apiClient.post("/whatsapp/facebook/connect", {
            code,
            state,
            sessionName: name,
          });
          setSessionId(response.data.session.id);
          setStep("success");
        } catch (err: unknown) {
          const apiErr = err as { response?: { data?: { error?: string } } };
          setErrorMessage(
            apiErr.response?.data?.error || "فشل الاتصال بحساب Facebook",
          );
          setStep("error");
        } finally {
          setIsLoading(false);
        }
      };
      void exchangeCode();
    } else if (error) {
      setErrorMessage("تم إلغاء الاتصال بحساب Facebook");
      setStep("error");
    }
  }, [searchParams]);

  const handleStartConnect = () => {
    if (!fbConfig) {
      setErrorMessage("لم يتم تحميل إعدادات Facebook بعد");
      setStep("error");
      return;
    }

    const csrfToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    setStateToken(csrfToken);
    sessionStorage.setItem("wa_cloud_csrf", csrfToken);
    sessionStorage.setItem("wa_cloud_session_name", sessionName);

    const oauthUrl = getFacebookOAuthUrl(fbConfig, csrfToken);
    window.location.href = oauthUrl;
  };

  const isRtl = i18n.dir() === "rtl";

  return (
    <WhatsAppPageShell
      title={
        isRtl
          ? "ربط واتساب السحابي عبر Facebook"
          : "Connect WhatsApp Cloud via Facebook"
      }
      description={
        isRtl
          ? "اربط رقم واتساب أعمالك بضغطة زر واحدة عبر حساب Facebook — بدون تعبئة بيانات يدوية"
          : "Connect your WhatsApp Business number with one click via Facebook — no manual setup needed"
      }
      icon={Globe}
      backHref="/whatsapp/settings"
      backLabel={isRtl ? "العودة للإعدادات" : "Back to Settings"}
      eyebrow="WhatsApp Cloud"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {step === "intro" && (
            <WhatsAppSurfaceCard
              title={
                isRtl
                  ? "الربط السحابي المضمن (Embedded Sign-Up)"
                  : "WhatsApp Cloud Embedded Sign-Up"
              }
              description={
                isRtl
                  ? "هذه الطريقة تستخدم حساب Facebook الخاص بك لإنشاء وربط واتساب أعمال تلقائياً"
                  : "This method uses your Facebook account to automatically create and connect WhatsApp Business"
              }
            >
              <div className="space-y-6">
                <div className="rounded-2xl border border-emerald-300/70 bg-emerald-500/5 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        {isRtl
                          ? "معتمد من Meta — Zero Ban Risk"
                          : "Meta Compliant — Zero Ban Risk"}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">
                        {isRtl
                          ? "يتم الربط عبر WhatsApp Cloud API الرسمي — أمان 100%"
                          : "Connected via official WhatsApp Cloud API — 100% safe"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {isRtl ? "المتطلبات" : "Requirements"}
                  </h3>
                  <div className="space-y-3">
                    <RequirementItem
                      checked
                      label={
                        isRtl
                          ? "حساب Facebook (صفحة شخصية أو Business Manager)"
                          : "Facebook account (personal or Business Manager)"
                      }
                    />
                    <RequirementItem
                      checked
                      label={
                        isRtl
                          ? "رقم هاتف غير مستخدم في واتساب حالياً"
                          : "Phone number not currently used on WhatsApp"
                      }
                    />
                    <RequirementItem
                      checked
                      label={
                        isRtl
                          ? "الرقم قادر على استقبال SMS أو مكالمة للتحقق (OTP)"
                          : "Number can receive SMS or call for OTP verification"
                      }
                    />
                    <RequirementItem
                      checked
                      label={
                        isRtl
                          ? "موقع إلكتروني نشط لبيزنسك (اختياري)"
                          : "Active website for your business (optional)"
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {isRtl ? "خطوات الربط" : "Connection Steps"}
                  </h3>
                  <div className="space-y-3">
                    {[
                      isRtl
                        ? "سجل الدخول لحساب Facebook الخاص بك"
                        : "Log in to your Facebook account",
                      isRtl
                        ? "اختر Business Manager أو أنشئ واحداً جديداً"
                        : "Select or create a Business Manager",
                      isRtl
                        ? "أدخل رقم الهاتف المستهدف (لإرسال كود التحقق)"
                        : "Enter your target phone number (for OTP)",
                      isRtl
                        ? "انتظر إنشاء الحساب — يستغرق 1-2 دقيقة"
                        : "Wait for account creation — takes 1-2 minutes",
                      isRtl
                        ? "جاهز! الرقم مرتبط تلقائياً"
                        : "Done! Number is automatically connected",
                    ].map((text, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-primary)]/10 text-xs font-semibold text-[color:var(--color-primary)]">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm text-[color:var(--color-foreground)]">
                            {text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </WhatsAppSurfaceCard>
          )}

          {step === "connecting" && (
            <WhatsAppSurfaceCard
              title={
                isRtl
                  ? "جاري الاتصال بحساب Facebook..."
                  : "Connecting to Facebook..."
              }
            >
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Loader2 className="mb-4 size-10 animate-spin text-[color:var(--color-primary)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {isRtl
                    ? "جاري إنشاء حساب واتساب للأعمال وربطه..."
                    : "Creating and connecting WhatsApp Business Account..."}
                </p>
                <p className="mt-2 text-xs text-[color:var(--color-muted-foreground)]">
                  {isRtl
                    ? "قد يستغرق ذلك من 30 ثانية إلى دقيقتين"
                    : "This may take 30 seconds to 2 minutes"}
                </p>
              </div>
            </WhatsAppSurfaceCard>
          )}

          {step === "success" && (
            <WhatsAppSurfaceCard
              title={
                isRtl
                  ? "تم الربط بنجاح!"
                  : "Connected Successfully!"
              }
            >
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                  {isRtl
                    ? "رقم واتساب الأعمال مرتبط وجاهز"
                    : "WhatsApp Business number is connected and ready"}
                </h3>
                <p className="mt-2 max-w-md text-sm text-[color:var(--color-muted-foreground)]">
                  {isRtl
                    ? `تم إنشاء الجلسة بنجاح. يمكنك الآن استخدام الرقم للرد على العملاء وإرسال الحملات.`
                    : "Session created successfully. You can now use this number to reply to customers and send campaigns."}
                </p>
                {sessionName && (
                  <Badge
                    variant="outline"
                    className="mt-4 rounded-full border-emerald-300/70 bg-emerald-500/10 px-4 py-1.5 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200"
                  >
                    {sessionName}
                  </Badge>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-[color:var(--business-success)] px-6 text-white hover:brightness-90"
                    onClick={() => navigate("/whatsapp/settings")}
                  >
                    {isRtl ? "الذهاب للإعدادات" : "Go to Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] px-6"
                    onClick={() => navigate("/whatsapp")}
                  >
                    {isRtl ? "فتح صندوق الوارد" : "Open Inbox"}
                  </Button>
                </div>
              </div>
            </WhatsAppSurfaceCard>
          )}

          {step === "error" && (
            <WhatsAppSurfaceCard
              title={
                isRtl ? "فشل الاتصال" : "Connection Failed"
              }
            >
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-rose-500/15">
                  <AlertCircle className="size-8 text-rose-600" />
                </div>
                <h3 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                  {isRtl
                    ? "حدث خطأ أثناء الربط"
                    : "An error occurred during connection"}
                </h3>
                <p className="mt-2 max-w-md text-sm text-[color:var(--color-muted-foreground)]">
                  {errorMessage}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    className="rounded-full bg-[color:var(--color-primary)] px-6 text-white hover:brightness-90"
                    onClick={() => {
                      setStep("intro");
                      setErrorMessage("");
                    }}
                  >
                    {isRtl ? "حاول مرة أخرى" : "Try Again"}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-[color:var(--shell-control-border)] px-6"
                    onClick={() => navigate("/whatsapp/settings")}
                  >
                    {isRtl
                      ? "الربط اليدوي"
                      : "Manual Setup"}
                  </Button>
                </div>
              </div>
            </WhatsAppSurfaceCard>
          )}
        </div>

        <div className="space-y-6">
          {step === "intro" && (
            <>
              {fbConfig && fbConfig.configured === false && (
                <Alert className="rounded-2xl border-amber-300/70 bg-amber-500/10">
                  <AlertCircle className="size-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-200">
                    {isRtl ? "Facebook غير مهيأ" : "Facebook Not Configured"}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    {isRtl
                      ? "بيانات اعتماد Facebook App غير مضبوطة. الرجاء ضبط FACEBOOK_APP_SECRET في ملف .env."
                      : "Facebook App credentials not configured. Please set FACEBOOK_APP_SECRET in the .env file."}
                  </AlertDescription>
                </Alert>
              )}

              <Card className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-sm sm:rounded-3xl sm:shadow-md">
                <CardHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] pb-4">
                  <CardTitle className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {isRtl ? "اسم الجلسة" : "Session Name"}
                  </CardTitle>
                  <CardDescription className="text-xs text-[color:var(--color-muted-foreground)]">
                    {isRtl
                      ? "اختر اسماً لهذه الجلسة ليسهل التعرف عليها"
                      : "Choose a name for this session"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <Label
                    htmlFor="session-name"
                    className="sr-only"
                  >
                    {isRtl ? "اسم الجلسة" : "Session Name"}
                  </Label>
                  <Input
                    id="session-name"
                    placeholder={
                      isRtl
                        ? "مثلاً: واتساب الرئيسي"
                        : "e.g., Main WhatsApp"
                    }
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="rounded-xl border-[color:var(--shell-control-border)] bg-[color:var(--color-background)]"
                  />
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-sm sm:rounded-3xl sm:shadow-md">
                <CardHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] pb-4">
                  <CardTitle className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {isRtl ? "الربط عبر Facebook" : "Connect via Facebook"}
                  </CardTitle>
                  <CardDescription className="text-xs text-[color:var(--color-muted-foreground)]">
                    {isRtl
                      ? "اضغط الزر أدناه لبدء عملية الربط التلقائي"
                      : "Click the button below to start auto-connection"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 py-4">
                  <Button
                    className="w-full rounded-xl bg-[#1877F2] py-6 text-white hover:bg-[#1877F2]/90"
                    onClick={handleStartConnect}
                    disabled={!fbConfig}
                  >
                    {!fbConfig ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {isRtl ? "جاري التحميل..." : "Loading..."}
                      </>
                    ) : (
                      <>
                        <Facebook className="mr-2 size-5" />
                        {isRtl
                          ? "Connect with Facebook"
                          : "Connect with Facebook"}
                      </>
                    )}
                  </Button>

                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {isRtl
                        ? "بالنقر على الزر أعلاه، ستنتقل إلى Facebook لتسجيل الدخول ومنح الأذونات اللازمة."
                        : "By clicking the button above, you'll be redirected to Facebook to log in and grant necessary permissions."}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {isRtl
                        ? "مطلوب: صلاحيات إدارة الأعمال وواتساب للأعمال."
                        : "Required: business_management and whatsapp_business_messaging permissions."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-sm sm:rounded-3xl sm:shadow-md">
                <CardHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] pb-4">
                  <CardTitle className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {isRtl ? "مقارنة الطرق" : "Method Comparison"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 py-4">
                  <div className="rounded-xl border border-emerald-300/70 bg-emerald-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        {isRtl
                          ? "الربط السحابي (مقترح)"
                          : "Cloud Connect (Recommended)"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                      {isRtl
                        ? "ضغطة زر، بدون بيانات يدوية، رسمي من Meta"
                        : "One click, no manual data, official Meta solution"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] p-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-[color:var(--color-muted-foreground)]" />
                      <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        {isRtl
                          ? "ربط ويب (Baileys)"
                          : "Web Link (Baileys)"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                      {isRtl
                        ? "مسح QR code — سريع لكن غير رسمي"
                        : "QR code scan — fast but unofficial"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] p-3">
                    <div className="flex items-center gap-2">
                      <LogIn className="size-4 text-[color:var(--color-muted-foreground)]" />
                      <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                        {isRtl
                          ? "ربط يدوي (Meta Cloud API)"
                          : "Manual (Meta Cloud API)"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                      {isRtl
                        ? "إدخال Token و IDs يدوياً — للمطورين"
                        : "Enter Token and IDs manually — for developers"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {step !== "intro" && step !== "callback" && (
            <Card className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-sm sm:rounded-3xl sm:shadow-md">
              <CardContent className="px-4 py-4">
                <div className="flex items-center gap-3">
                  {step === "connecting" ? (
                    <Loader2 className="size-5 animate-spin text-[color:var(--color-primary)]" />
                  ) : step === "success" ? (
                    <CheckCircle2 className="size-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="size-5 text-rose-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                      {step === "connecting"
                        ? isRtl
                          ? "جاري الاتصال..."
                          : "Connecting..."
                        : step === "success"
                          ? isRtl
                            ? "تم بنجاح"
                            : "Success"
                          : isRtl
                            ? "فشل"
                            : "Failed"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </WhatsAppPageShell>
  );
};

export default WhatsAppCloudConnect;
