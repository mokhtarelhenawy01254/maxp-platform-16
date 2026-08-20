import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getDisplaySettings,
  saveDisplaySettings,
  type TikTokDisplaySettings,
} from "../../services/tiktokDisplayService";
import TikTokEventsSettingsCard from "../../components/tiktok/TikTokEventsSettingsCard";
import TikTokMessagingSettingsCard from "../../components/tiktok/TikTokMessagingSettingsCard";

const TikTokSettings: React.FC = () => {
  const [username, setUsername] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getDisplaySettings()
      .then((settings: TikTokDisplaySettings) => {
        if (!active) return;
        setUsername(settings.storefrontUsername || "");
        setEnabled(Boolean(settings.storefrontEnabled));
      })
      .catch(() => {
        if (active) toast.error("╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪Ñ╪╣╪»╪º╪»╪º╪¬ TikTok");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveDisplaySettings({
        storefrontUsername: username.trim() || null,
        storefrontEnabled: enabled,
      });
      setUsername(saved.storefrontUsername || "");
      setEnabled(Boolean(saved.storefrontEnabled));
      toast.success("╪¬┘à ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪¿┘å╪¼╪º╪¡");
    } catch {
      toast.error("┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">╪Ñ╪╣╪»╪º╪»╪º╪¬ TikTok</h1>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">
          ╪╣╪▒╪╢ ┘ü┘è╪»┘è┘ê┘ç╪º╪¬ TikTok ┘ü┘è ╪º┘ä┘à╪¬╪¼╪▒
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          ╪¡╪»╪» ╪º╪│┘à ╪¡╪│╪º╪¿ TikTok ┘ä┘è╪╕┘ç╪▒ ┘à╪¡╪¬┘ê╪º┘ç ┘ü┘è ┘à╪¬╪¼╪▒┘â ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">╪¼╪º╪▒┘É ╪º┘ä╪¬╪¡┘à┘è┘ä...</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                ╪º╪│┘à ╪º┘ä┘à╪│╪¬╪«╪»┘à ╪╣┘ä┘ë TikTok
              </label>
              <input
                type="text"
                dir="ltr"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="┘à╪½╪º┘ä: maxp_store"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              ╪¬┘ü╪╣┘è┘ä ╪╣╪▒╪╢ ╪º┘ä┘à╪¡╪¬┘ê┘ë ┘ü┘è ╪º┘ä┘à╪¬╪¼╪▒
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "╪¼╪º╪▒┘É ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬"}
            </button>
          </div>
        )}
      </section>

      <TikTokMessagingSettingsCard />

      <TikTokEventsSettingsCard />
    </div>
  );
};

export default TikTokSettings;
