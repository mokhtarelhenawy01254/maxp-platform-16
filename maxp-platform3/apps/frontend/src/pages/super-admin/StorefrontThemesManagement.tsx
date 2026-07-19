import React from "react";
import SubscriptionCenter from "./SubscriptionCenter";

const StorefrontThemesManagement: React.FC = () => {
  return (
    <SubscriptionCenter
      initialTab={4}
      storefrontThemesOnly
      pageTitle="إدارة وتسعير قوالب المتجر"
      pageDescription="حدّد سعر كل قالب، واظهره أو أخفه عن الشركات، وميّز القوالب المهمة من شاشة مستقلة خاصة بالسوبر أدمن."
    />
  );
};

export default StorefrontThemesManagement;
