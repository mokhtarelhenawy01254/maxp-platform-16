import TemplateCenter, { resolveVariablesForPreview, buildLocalContentFromMetaBody } from "../templates/TemplateCenter";
import { orderScopeConfig } from "../templates/scopes/orderScope";

export { resolveVariablesForPreview, buildLocalContentFromMetaBody };

export default function OrderStatusTemplatesPage() {
  return <TemplateCenter config={orderScopeConfig} />;
}
