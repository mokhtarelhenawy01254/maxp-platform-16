import { useParams } from "react-router-dom";
import WhatsAppChat from "../whatsapp-inbox/WhatsAppChat";

export default function SuperAdminWhatsAppCompanyChat() {
  const { companyId } = useParams<{ companyId: string }>();

  if (!companyId) return null;

  return (
    <WhatsAppChat
      companyId={companyId}
      superAdminMode
    />
  );
}
