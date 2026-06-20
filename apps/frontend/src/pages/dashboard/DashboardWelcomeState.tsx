import { useNavigate } from "react-router-dom";
import { RocketLaunchIcon, ShoppingCartIcon, CubeIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, SparklesIcon, LinkIcon } from "@heroicons/react/24/outline";

interface Step {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  slug?: string;
}

const ALL_STEPS: Step[] = [
  { label: "إضافة منتج", icon: CubeIcon, path: "/products/new", slug: "ecommerce-basic" },
  { label: "إعداد المتجر", icon: ShoppingCartIcon, path: "/settings/store", slug: "ecommerce-basic" },
  { label: "ربط قناة تواصل", icon: ChatBubbleLeftRightIcon, path: "/unified-inbox/connections" },
  { label: "إعداد الذكاء الاصطناعي", icon: SparklesIcon, path: "/admin/ai-hub", slug: "ai-chat-basic" },
  { label: "ضبط الإعدادات", icon: Cog6ToothIcon, path: "/settings" },
];

export default function DashboardWelcomeState({ activeApps = [] }: { activeApps?: string[] }) {
  const navigate = useNavigate();
  const activeLower = activeApps.map((a) => a.toLowerCase());

  const steps = ALL_STEPS.filter((s) => !s.slug || activeLower.includes(s.slug));

  const subtitle = steps.length === 1 && steps[0].slug === "ai-chat-basic"
    ? "اختر خطوتك الأولى — اربط قنوات التواصل وفعّل الذكاء الاصطناعي للرد على العملاء."
    : "اختر خطوتك الأولى لبدء تشغيل منصتك — أضف منتجات، اربط قنوات تواصل، أو جهز متجرك.";

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
      <div className="p-4 rounded-2xl border mb-6" style={{ background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-background))", borderColor: "color-mix(in srgb, var(--color-primary) 18%, transparent)" }}>
        <RocketLaunchIcon className="w-10 h-10" style={{ color: "var(--color-primary)" }} />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">مرحباً بك في MaxP</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">{subtitle}</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.label}
              type="button"
              onClick={() => navigate(step.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-background))" }}>
                <Icon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              <span className="text-xs font-medium text-foreground">{step.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
