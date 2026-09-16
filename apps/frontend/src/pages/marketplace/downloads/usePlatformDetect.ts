import { useState, useEffect } from "react";

export type ClientPlatform = "android" | "ios" | "windows" | "macos" | "linux" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PlatformDetectResult {
  os: ClientPlatform;
  osLabel: string;
  isMobile: boolean;
  isStandalone: boolean;
  canInstallPwa: boolean;
  isIosSafari: boolean;
  installPwa: () => Promise<boolean>;
}

export function usePlatformDetect(): PlatformDetectResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [os, setOs] = useState<ClientPlatform>("other");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isIosSafari, setIsIosSafari] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMedia || isNavigatorStandalone);
    };
    checkStandalone();

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    let detectedOs: ClientPlatform = "other";

    if (/android/i.test(ua)) {
      detectedOs = "android";
    } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      detectedOs = "ios";
    } else if (/Win/i.test(ua)) {
      detectedOs = "windows";
    } else if (/Mac/i.test(ua)) {
      detectedOs = "macos";
    } else if (/Linux/i.test(ua)) {
      detectedOs = "linux";
    }

    setOs(detectedOs);
    setIsMobile(detectedOs === "android" || detectedOs === "ios");

    const isSafari =
      /Safari/i.test(ua) &&
      !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua) &&
      detectedOs === "ios";
    setIsIosSafari(isSafari);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installPwa = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const getOsLabel = (platform: ClientPlatform): string => {
    switch (platform) {
      case "android":
        return "أندرويد (Android)";
      case "ios":
        return "آبل (iOS / iPhone)";
      case "windows":
        return "ويندوز (Windows)";
      case "macos":
        return "ماك (macOS)";
      case "linux":
        return "لينكس (Linux)";
      default:
        return "نظام التشغيل الحالي";
    }
  };

  return {
    os,
    osLabel: getOsLabel(os),
    isMobile,
    isStandalone,
    canInstallPwa: deferredPrompt !== null,
    isIosSafari,
    installPwa,
  };
}
