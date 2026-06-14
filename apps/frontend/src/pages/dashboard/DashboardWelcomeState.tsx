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
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 mb-6">
        <RocketLaunchIcon className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">
        {t("welcomeState.title")}
      </h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        {t("welcomeState.description")}
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => navigate(step.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">
                {t(step.key)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
