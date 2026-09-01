import React from "react";
import Header from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="w-full py-4 sm:py-6 px-2.5 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
};

export default Layout;
