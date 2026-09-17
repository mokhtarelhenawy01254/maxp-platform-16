import { useState, useEffect } from "react";

export type ClientPlatform = "android" | "ios" | "windows" | "macos" | "linux" | "other";

export interface PlatformDetectResult {
  os: ClientPlatform;
  osLabel: string;
  isMobile: boolean;
  isStandalone: boolean;
  isIosSafari: boolean;
}

export function usePlatformDetect(): PlatformDetectResult {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [os, setOs] = useState<ClientPlatform>("other");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isIosSafari, setIsIosSafari] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMedia =
        typeof window !== "undefined" && typeof window.matchMedia === "function"
          ? window.matchMedia("(display-mode: standalone)").matches
          : false;
      const isNavigatorStandalone =
        typeof window !== "undefined" && (window.navigator as any)?.standalone === true;
      setIsStandalone(Boolean(isStandaloneMedia || isNavigatorStandalone));
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
  }, []);

  const getOsLabel = (platform: ClientPlatform): string => {
    switch (platform) {
      case "android":
        return "\u0623\u0646\u062F\u0631\u0648\u064A\u062F (Android)";
      case "ios":
        return "\u0622\u0628\u0644 (iOS / iPhone)";
      case "windows":
        return "\u0648\u064A\u0646\u062F\u0648\u0632 (Windows)";
      case "macos":
        return "\u0645\u0627\u0643 (macOS)";
      case "linux":
        return "\u0644\u064A\u0646\u0643\u0633 (Linux)";
      default:
        return "\u0646\u0638\u0627\u0645 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062D\u0627\u0644\u064A";
    }
  };

  return {
    os,
    osLabel: getOsLabel(os),
    isMobile,
    isStandalone,
    isIosSafari,
  };
}
