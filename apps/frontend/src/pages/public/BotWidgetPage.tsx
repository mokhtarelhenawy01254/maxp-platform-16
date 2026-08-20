import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

interface WidgetButton {
  channel: string;
  label: string;
  url: string;
}

interface WidgetData {
  enabled: boolean;
  color: string;
  buttons: WidgetButton[];
}

const EMPTY_WIDGET: WidgetData = { enabled: false, color: "#4f46e5", buttons: [] };

const BotWidgetPage: React.FC = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    if (!companyId) return;
    apiClient
      .get(`/public/bot-widget/${companyId}`)
      .then((r) => {
        const d = (r.data as { data?: WidgetData })?.data;
        setData(d || EMPTY_WIDGET);
      })
      .catch(() => setData(EMPTY_WIDGET));
  }, [companyId]);

  if (!data?.enabled || data.buttons.length === 0) {
    return <div style={{ width: 0, height: 0 }} />;
  }

  const primary = data.buttons[0];
  if (!primary) {
    return <div style={{ width: 0, height: 0 }} />;
  }
  return (
    <a
      href={primary.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={primary.label}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9999,
        backgroundColor: data.color || "#4f46e5",
        color: "#fff",
        fontSize: 28,
        textDecoration: "none",
      }}
      title={primary.label}
    >
      ≡ƒÆ¼
    </a>
  );
};

export default BotWidgetPage;
