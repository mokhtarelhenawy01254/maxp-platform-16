export const openUrlInNewTab = (targetUrl: string): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  // Open a blank tab first so browsers do not report a false popup failure
  // when the final navigation uses noopener-like protections.
  const targetWindow = window.open("", "_blank");

  if (!targetWindow) {
    return false;
  }

  try {
    targetWindow.opener = null;
  } catch {
    // Ignore opener assignment failures and continue to navigation.
  }

  try {
    targetWindow.location.replace(targetUrl);
    return true;
  } catch {
    try {
      targetWindow.location.href = targetUrl;
      return true;
    } catch {
      try {
        targetWindow.close();
      } catch {
        // Ignore close failures on blocked or already-closed tabs.
      }

      return false;
    }
  }
};
