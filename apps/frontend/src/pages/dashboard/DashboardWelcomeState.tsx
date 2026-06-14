import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RocketLaunchIcon, ShoppingCartIcon, CubeIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

interface Step {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const steps: Step[] = [
  { key: "welcomeState.addProduct", icon: CubeIcon, path: "/products/new" },
  { key: "welcomeState.setupStore", icon: ShoppingCartIcon, path: "/settings/store" },
  { key: "welcomeState.connectChannel", icon: ChatBubbleLeftRightIcon, path: "/whatsapp" },
  { key: "welcomeState.configureSettings", icon: Cog6ToothIcon, path: "/settings" },
];

export default function DashboardWelcomeState() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
      <div className="p-4 rounded-2xl border mb-6" style={{ background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-background))", borderColor: "color-mix(in srgb, var(--color-primary) 18%, transparent)" }}>
        <RocketLaunchIcon className="w-10 h-10" style={{ color: "var(--color-primary)" }} />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{t("welcomeState.title")}</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">{t("welcomeState.description")}</p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => navigate(step.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-background))" }}>
                <Icon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              </div>
              <span className="text-xs font-medium text-foreground">{t(step.key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
