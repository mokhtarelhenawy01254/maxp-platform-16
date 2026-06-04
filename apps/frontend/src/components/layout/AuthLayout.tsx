import React from "react";
import { useVisualTheme } from "../../contexts/VisualThemeContext";
import { BUSINESS_THEME_ID } from "../../config/themes";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { currentTheme } = useVisualTheme();

  return (
    <div
      className="business-auth-shell"
      data-theme={BUSINESS_THEME_ID}
      data-visual-theme={currentTheme.id}
      dir="rtl"
      style={{ minHeight: '100vh', width: '100%' }}
    >
      {/* 
        We delegate the visual layout (split-screen/cockpit) 
        to the AuthSurface component within the children.
      */}
      {children}
    </div>
  );
};

export default React.memo(AuthLayout);
