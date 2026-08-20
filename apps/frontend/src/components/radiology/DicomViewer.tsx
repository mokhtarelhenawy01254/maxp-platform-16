import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Enums,
  RenderingEngine,
  StackViewport,
  imageLoader,
  init as coreInit,
} from "@cornerstonejs/core";
import {
  Enums as ToolsEnums,
  PanTool,
  ToolGroupManager,
  WindowLevelTool,
  ZoomTool,
  addTool,
  init as toolsInit,
} from "@cornerstonejs/tools";
import {
  init as dicomLoaderInit,
  wadouri,
} from "@cornerstonejs/dicom-image-loader";
import type { Types as CoreTypes } from "@cornerstonejs/core";
import type { Types as ToolsTypes } from "@cornerstonejs/tools";
import tokenManager from "../../utils/tokenManager";

export interface DicomImage {
  id: string;
  fileName: string;
  fileSize?: number;
  url: string;
}

export interface RadiologyDicomViewerProps {
  studyId: string;
  images: DicomImage[];
}

const WL_PRESETS: Record<string, { label: string; ww?: number; wc?: number }> = {
  auto: { label: "radiology.dicomViewer.presets.auto" },
  bone: { label: "radiology.dicomViewer.presets.bone", ww: 400, wc: 1000 },
  lung: { label: "radiology.dicomViewer.presets.lung", ww: 1500, wc: -500 },
  brain: { label: "radiology.dicomViewer.presets.brain", ww: 80, wc: 40 },
  soft: { label: "radiology.dicomViewer.presets.soft", ww: 400, wc: 50 },
};

type ActiveTool = "wl" | "zoom" | "pan";

let cornerstoneReady = false;
let engineSequence = 0;

const getCompanyId = (): string | null => {
  try {
    return (
      (JSON.parse(localStorage.getItem("user") || "{}") as {
        companyId?: string;
      }).companyId || null
    );
  } catch {
    return null;
  }
};

const ensureCornerstoneInitialized = (): void => {
  if (cornerstoneReady) return;
  cornerstoneReady = true;
  coreInit();
  toolsInit();
  const maxWebWorkers = Math.max(
    1,
    Math.floor((navigator.hardwareConcurrency || 4) / 2),
  );
  dicomLoaderInit({
    maxWebWorkers,
    beforeSend() {
      const headers = tokenManager.createAuthHeaders();
      const companyId = getCompanyId();
      if (companyId) headers["X-Company-Id"] = companyId;
      return headers;
    },
  });
  imageLoader.registerUnknownImageLoader(
    wadouri.loadImage as unknown as CoreTypes.ImageLoaderFn,
  );
  addTool(WindowLevelTool);
  addTool(PanTool);
  addTool(ZoomTool);
};

export function RadiologyDicomViewer({
  studyId,
  images,
}: RadiologyDicomViewerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RenderingEngine | null>(null);
  const toolGroupRef = useRef<ToolsTypes.IToolGroup | null>(null);
  const viewportRef = useRef<StackViewport | null>(null);

  const [currentSlice, setCurrentSlice] = useState(0);
  const [totalSlices, setTotalSlices] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inverted, setInverted] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("wl");
  const [presetKey, setPresetKey] = useState("auto");

  const ids = useMemo(() => {
    const sequence = ++engineSequence;
    return {
      engineId: `dicom-re-${studyId}-${sequence}`,
      viewportId: `dicom-vp-${studyId}-${sequence}`,
      toolGroupId: `dicom-tg-${studyId}-${sequence}`,
    };
  }, [studyId]);

  const imageIdsKey = useMemo(
    () => images.map((i) => i.url).join("\u0000"),
    [images],
  );
  const imageIds = useMemo(
    () => (imageIdsKey === "" ? [] : imageIdsKey.split("\u0000")),
    [imageIdsKey],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element || imageIds.length === 0) return;

    let disposed = false;

    const teardown = () => {
      disposed = true;
      viewportRef.current = null;
      const toolGroup = toolGroupRef.current;
      toolGroupRef.current = null;
      if (toolGroup) {
        ToolGroupManager.destroyToolGroup(toolGroup.id);
      }
      const engine = engineRef.current;
      engineRef.current = null;
      if (engine && !engine.hasBeenDestroyed) {
        engine.destroy();
      }
    };

    const render = async () => {
      try {
        ensureCornerstoneInitialized();
        const engine = new RenderingEngine(ids.engineId);
        engineRef.current = engine;
        engine.enableElement({
          viewportId: ids.viewportId,
          type: Enums.ViewportType.STACK,
          element,
        });

        const viewport = engine.getViewport(ids.viewportId) as StackViewport;
        viewportRef.current = viewport;

        const toolGroup = ToolGroupManager.createToolGroup(ids.toolGroupId);
        if (toolGroup) {
          toolGroupRef.current = toolGroup;
          toolGroup.addViewport(ids.viewportId, ids.engineId);
          toolGroup.addTool(WindowLevelTool.toolName);
          toolGroup.addTool(PanTool.toolName);
          toolGroup.addTool(ZoomTool.toolName);
          toolGroup.setToolActive(WindowLevelTool.toolName, {
            bindings: [{ mouseButton: ToolsEnums.MouseBindings.Primary }],
          });
        }

        setLoading(true);
        setError(null);
        await viewport.setStack(imageIds);
        if (disposed) return;
        setTotalSlices(viewport.getNumberOfSlices());
        setCurrentSlice(viewport.getCurrentImageIdIndex());
        setPresetKey("auto");
        setLoading(false);
      } catch (err) {
        if (disposed) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : t("radiology.dicomViewer.loadFailed"));
      }
    };

    render();

    return teardown;
  }, [ids, imageIdsKey, imageIds]);

  const setPrimaryTool = useCallback(
    (toolName: string) => {
      const toolGroup = toolGroupRef.current;
      if (!toolGroup) return;
      toolGroup.setToolPassive(WindowLevelTool.toolName);
      toolGroup.setToolPassive(PanTool.toolName);
      toolGroup.setToolPassive(ZoomTool.toolName);
      toolGroup.setToolActive(toolName, {
        bindings: [{ mouseButton: ToolsEnums.MouseBindings.Primary }],
      });
    },
    [],
  );

  const handleZoomToggle = () => {
    const next: ActiveTool = activeTool === "zoom" ? "wl" : "zoom";
    setActiveTool(next);
    setPrimaryTool(
      next === "zoom" ? ZoomTool.toolName : WindowLevelTool.toolName,
    );
  };

  const handlePanToggle = () => {
    const next: ActiveTool = activeTool === "pan" ? "wl" : "pan";
    setActiveTool(next);
    setPrimaryTool(
      next === "pan" ? PanTool.toolName : WindowLevelTool.toolName,
    );
  };

  const handleInvert = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const next = !inverted;
    viewport.setProperties({ invert: next });
    setInverted(next);
  };

  const handleRotate = (degrees: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const currentRotation = viewport.getViewPresentation().rotation ?? 0;
    viewport.setViewPresentation({
      rotation: (currentRotation + degrees + 360) % 360,
    });
  };

  const handleFit = () => {
    viewportRef.current?.resetCamera();
  };

  const goToSlice = useCallback(async (target: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const total = viewport.getNumberOfSlices();
    if (total <= 0) return;
    const next = Math.max(0, Math.min(total - 1, target));
    try {
      await viewport.setImageIdIndex(next);
      setCurrentSlice(next);
    } catch {
      return;
    }
  }, []);

  const handlePresetChange = (presetKey: string) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setPresetKey(presetKey);
    const preset = WL_PRESETS[presetKey];
    if (!preset) return;
    if (presetKey === "auto") {
      const defaults = viewport.getDefaultProperties();
      if (defaults && defaults.voiRange) {
        viewport.setProperties({ voiRange: defaults.voiRange });
      } else {
        viewport.resetProperties();
      }
      return;
    }
    if (typeof preset["ww"] === "number" && typeof preset["wc"] === "number") {
      viewport.setProperties({
        voiRange: {
          lower: preset["wc"] - preset["ww"] / 2,
          upper: preset["wc"] + preset["ww"] / 2,
        },
      });
    }
  };

  if (images.length === 0) {
    return (
      <div
        dir="rtl"
        className="flex min-h-[360px] w-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
      >
        {t("radiology.dicomViewer.noImages")}
      </div>
    );
  }

  const buttonBase =
    "rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700";
  const buttonActive =
    "rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors";

  return (
    <div dir="rtl" className="w-full">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={buttonBase}
            onClick={() => goToSlice(currentSlice - 1)}
            disabled={totalSlices === 0 || currentSlice <= 0}
          >
            {t("radiology.dicomViewer.previous")}
          </button>
          <span className="min-w-[96px] text-center text-sm font-medium text-gray-700 dark:text-gray-200">
            {t("radiology.dicomViewer.slice", { current: totalSlices > 0 ? currentSlice + 1 : 0, total: totalSlices })}
          </span>
          <button
            type="button"
            className={buttonBase}
            onClick={() => goToSlice(currentSlice + 1)}
            disabled={totalSlices === 0 || currentSlice >= totalSlices - 1}
          >
            {t("radiology.dicomViewer.next")}
          </button>
        </div>

        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          value={presetKey}
          onChange={(e) => handlePresetChange(e.target.value)}
        >
          {Object.entries(WL_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {t(preset.label)}
            </option>
          ))}
        </select>

        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <button
          type="button"
          className={activeTool === "zoom" ? buttonActive : buttonBase}
          onClick={handleZoomToggle}
        >
          {t("radiology.dicomViewer.zoom")}
        </button>
        <button
          type="button"
          className={activeTool === "pan" ? buttonActive : buttonBase}
          onClick={handlePanToggle}
        >
          {t("radiology.dicomViewer.pan")}
        </button>
        <button type="button" className={buttonBase} onClick={handleInvert}>
          {t("radiology.dicomViewer.invert")}
        </button>

        <div className="mx-1 h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <button
          type="button"
          className={buttonBase}
          onClick={() => handleRotate(90)}
        >
          {t("radiology.dicomViewer.rotate90")}
        </button>
        <button
          type="button"
          className={buttonBase}
          onClick={() => handleRotate(-90)}
        >
          {t("radiology.dicomViewer.rotateMinus90")}
        </button>
        <button type="button" className={buttonBase} onClick={handleFit}>
          {t("radiology.dicomViewer.fit")}
        </button>
      </div>

      <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700 lg:h-[560px]">
        <div ref={containerRef} className="h-full w-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
            <span className="text-sm font-medium">{t("radiology.dicomViewer.loading")}</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center">
            <div className="text-sm font-medium text-red-400">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RadiologyDicomViewer;
