import React, { useEffect } from "react";

interface TikTokFeedSectionProps {
  username?: string;
  title?: string;
  count?: number;
  section?: unknown;
  settings?: Record<string, unknown>;
}

const TIKTOK_EMBED_JS_URL = "https://www.tiktok.com/embed.js";

let tiktokEmbedJsInjected = false;

const ensureTiktokEmbedJs = () => {
  if (tiktokEmbedJsInjected) return;
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${TIKTOK_EMBED_JS_URL}"]`)) {
    tiktokEmbedJsInjected = true;
    return;
  }
  const script = document.createElement("script");
  script.src = TIKTOK_EMBED_JS_URL;
  script.async = true;
  document.body.appendChild(script);
  tiktokEmbedJsInjected = true;
};

const TikTokFeedSection: React.FC<TikTokFeedSectionProps> = ({
  username: usernameProp,
  title: titleProp,
  count: countProp,
  settings,
}) => {
  const settingsAny = (settings || {}) as Record<string, unknown>;
  const username = String(
    (usernameProp as string) ??
      (settingsAny["username"] as string) ??
      "",
  );
  const title = String(
    (titleProp as string) ??
      (settingsAny["title"] as string) ??
      "",
  );
  const rawCount = (countProp as number) ?? (settingsAny["count"] as number);
  const count =
    typeof rawCount === "number"
      ? rawCount
      : parseInt(String(rawCount || ""), 10) || 0;

  useEffect(() => {
    ensureTiktokEmbedJs();
  }, []);

  if (!username) {
    return (
      <section className="w-full py-12 lg:py-16" dir="rtl">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {title || "╪¬╪º╪¿╪╣┘å╪º ╪╣┘ä┘ë TikTok"}
            </h2>
            <p className="mt-3 text-muted-foreground">╪¡╪│╪º╪¿ TikTok ╪║┘è╪▒ ┘à╪╢╪¿┘ê╪╖</p>
          </div>
        </div>
      </section>
    );
  }

  const cleanUsername = username.replace(/^@/, "").trim();

  return (
    <section className="w-full py-12 lg:py-16" dir="rtl">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title || "╪¬╪º╪¿╪╣┘å╪º ╪╣┘ä┘ë TikTok"}
          </h2>
          {count > 0 && (
            <p className="mt-2 text-muted-foreground">{`╪ú╪¡╪»╪½ ${count} ┘à┘é╪º╪╖╪╣ ┘ü┘è╪»┘è┘ê`}</p>
          )}
        </div>
        <div className="flex justify-center">
          <blockquote
            className="tiktok-embed"
            cite={`https://www.tiktok.com/@${cleanUsername}`}
            data-unique-id={cleanUsername}
          >
            <section />
          </blockquote>
        </div>
      </div>
    </section>
  );
};

export default TikTokFeedSection;
