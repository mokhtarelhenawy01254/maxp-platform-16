import React from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "./button";
import { useTheme } from "../../hooks/useTheme";

const ThemeToggle: React.FC = () => {
  const { derivedTheme, toggleTheme } = useTheme();

  const isDark = derivedTheme === "dark";

  return (
    <Button
      onClick={toggleTheme}
      variant="ghost"
      size="sm"
      aria-label={isDark ? "تبديل للوضع النهاري" : "تبديل للوضع الليلي"}
      className="business-icon-button business-theme-toggle"
      title={isDark ? "تبديل للوضع النهاري" : "تبديل للوضع الليلي"}
    >
      {isDark ? (
        <Sun
          aria-hidden="true"
          className="business-theme-toggle-icon"
          data-mode="light"
        />
      ) : (
        <Moon
          aria-hidden="true"
          className="business-theme-toggle-icon"
          data-mode="dark"
        />
      )}
    </Button>
  );
};

export default ThemeToggle;
