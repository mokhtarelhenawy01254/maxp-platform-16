import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Globe, Palette } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";

/**
 * WebChatWidgetPage ΓÇö embed setup for the public website chat widget.
 * Generates a copy-paste <script> snippet gated by the company's storefront domain.
 */
export default function WebChatWidgetPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState("#2563eb");
  const [title, setTitle] = useState("Need help?");

  const companyId = user?.companyId || "";
  const apiOrigin = (() => {
    try { return new URL(window.location.origin).origin; } catch { return window.location.origin; }
  })();

  const embedCode = `<script
  src="${apiOrigin}/api/v1/public/widget/script.js"
  data-widget-key="${companyId}"
  data-theme-color="${color}"
  data-title="${title}"
  async></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Globe className="size-5 text-indigo-600" />
          {t("aiHub.widget.title", "Web Chat Widget")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("aiHub.widget.subtitle", "Add the AI agent to any website with one line. Visitors chat with your agent directly on the site.")}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Palette className="size-4 text-muted-foreground" />
              {t("aiHub.widget.themeColor", "Theme color")}
            </label>
            <div className="flex items-center gap-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-9 w-14 rounded-lg border border-input bg-background cursor-pointer" />
              <span className="text-sm text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">{t("aiHub.widget.titleLabel", "Widget title")}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{t("aiHub.widget.embedCode", "Embed code")}</label>
            <button onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
              {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
              {copied ? t("aiHub.widget.copied", "Copied") : t("aiHub.widget.copy", "Copy")}
            </button>
          </div>
          <pre className="rounded-lg bg-slate-950 text-slate-100 text-xs p-4 overflow-x-auto font-mono leading-relaxed">
{embedCode}
          </pre>
          <p className="text-xs text-muted-foreground">
            {t("aiHub.widget.usage", "Paste this before </body> on your website, or before </head> with the async attribute.")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-bold mb-3">{t("aiHub.widget.routingHint", "Route the agent to Web Chat")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("aiHub.widget.routingBody", "Open the Routing tab and assign an agent to the \"Web Chat\" channel. Without an assigned agent, visitors get a fallback reply.")}
        </p>
      </div>
    </div>
  );
}
