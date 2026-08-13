import TemplateCenter from "../templates/TemplateCenter";
import { customerScopeConfig } from "../templates/scopes/customerScope";

export default function CustomerNotifications() {
  return <TemplateCenter config={customerScopeConfig} />;
}
