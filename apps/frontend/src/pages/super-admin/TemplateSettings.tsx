import React from "react";
import { useTemplate } from "../../templates/useTemplate";
import { templateMetas } from "../../config/templates";

const TemplateSettings: React.FC = () => {
  const { templateId, setTemplate, meta } = useTemplate();

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">╪Ñ╪»╪º╪▒╪⌐ ┘é┘ê╪º┘ä╪¿ ┘ê╪º╪¼┘ç╪⌐ ╪º┘ä┘à╪│╪¬╪«╪»┘à</h1>
        <p className="text-muted-foreground">╪º╪«╪¬╪▒ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪░┘è ╪¬╪▒┘è╪» ╪¬╪╖╪¿┘è┘é┘ç ╪╣┘ä┘ë ┘â┘ä ╪º┘ä╪┤╪▒┘â╪º╪¬. ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪¬╪ñ╪½╪▒ ┘ü┘é╪╖ ╪╣┘ä┘ë ╪º┘ä╪┤┘â┘ä ┘ê╪º┘ä┘à╪╕┘ç╪▒╪î ┘ê┘ä╪º ╪¬╪ñ╪½╪▒ ╪╣┘ä┘ë ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪ú┘ê ╪º┘ä┘à┘ç╪º┘à.</p>
      </div>

      {meta ? (
        <div className="mb-6 p-4 rounded-lg border bg-card text-card-foreground">
          <p className="text-sm text-muted-foreground">╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪¡╪º┘ä┘è</p>
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
                  ┘å╪┤╪╖
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
                  <p className="text-xs text-muted-foreground">{t.id === "template-1" ? "╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è (Business OS)" : t.id === "template-2" ? "╪¬╪╡┘à┘è┘à ╪»╪º┘â┘å ╪╣╪╡╪▒┘è ┘à╪│╪¬┘ê╪¡┘ë ┘à┘å Linear" : ""}</p>
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
        <h3 className="font-medium text-sm mb-2">┘à┘ä╪º╪¡╪╕╪⌐ ┘à┘ç┘à╪⌐</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿ ┘è╪╖╪¿┘é ┘ü┘ê╪▒╪º┘ï ╪╣┘ä┘ë ┘â┘ä ╪º┘ä┘à╪│╪¬╪«╪»┘à┘è┘å ┘ü┘è ╪¼┘à┘è╪╣ ╪º┘ä╪┤╪▒┘â╪º╪¬</li>
          <li>╪º┘ä┘é┘ê╪º┘ä╪¿ ┘ä╪º ╪¬╪ñ╪½╪▒ ╪╣┘ä┘ë ╪º┘ä╪¿┘è╪º┘å╪º╪¬╪î ╪º┘ä╪╖┘ä╪¿╪º╪¬╪î ╪º┘ä╪╣┘à┘ä╪º╪í╪î ╪º┘ä┘à╪«╪▓┘ê┘å╪î ╪ú┘ê ╪ú┘è ╪Ñ╪╣╪»╪º╪»╪º╪¬</li>
          <li>┘è┘à┘â┘å┘â ╪º┘ä╪▒╪¼┘ê╪╣ ┘ä┘ä┘é╪º┘ä╪¿ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è ┘ü┘è ╪ú┘è ┘ê┘é╪¬</li>
        </ul>
      </div>
    </div>
  );
};

export default TemplateSettings;
