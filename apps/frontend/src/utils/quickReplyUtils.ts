/**
 * Replace template variables in quick reply content
 * @param content - Template content with variables like {{name}}, {{order_id}}
 * @param variables - Object with variable values
 * @returns Processed content with variables replaced
 */
export const replaceVariables = (
  content: string,
  variables: Record<string, string>,
): string => {
  if (!content) return "";
  let result = content;

  Object.entries(variables).forEach(([key, value]) => {
    // Replace exact key: {{name}}
    const exactRegex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    result = result.replace(exactRegex, value);
  });

  // Clean any remaining unresolved single bracket or unmatched brackets if needed
  return result;
};

/**
 * Extract variable names from template content
 * @param content - Template content
 * @returns Array of variable names
 */
export const extractVariables = (content: string): string[] => {
  const regex = /{{\s*(\w+)\s*}}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
};

/**
 * Get customer/conversation context variables
 */
export const getContextVariables = (
  conversation: any,
  user: any,
): Record<string, string> => {
  const rawCustomerName =
    conversation?.customerName ||
    conversation?.customer?.name ||
    conversation?.name ||
    "";

  const customerName =
    rawCustomerName && rawCustomerName !== "undefined" && rawCustomerName !== "null"
      ? rawCustomerName.trim()
      : "";

  const politeName = customerName || "يا فندم";
  const firstName = customerName ? customerName.split(" ")[0] : "يا فندم";
  const lastName = customerName ? customerName.split(" ").slice(1).join(" ") : "";

  const companyName =
    conversation?.company?.name ||
    user?.company?.name ||
    user?.companyName ||
    "أميرال - Ameerelle";

  const agentName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.name ||
    "فريق خدمة العملاء";

  const companyPhone =
    conversation?.company?.phone ||
    user?.company?.phone ||
    user?.phone ||
    "";

  const companyEmail =
    conversation?.company?.email ||
    user?.company?.email ||
    "info@maxp.online";

  const companyWebsite =
    conversation?.company?.domain ||
    user?.company?.domain ||
    "https://ameerelle.maxp.online/shop";

  const orderNumber =
    conversation?.metadata?.orderId ||
    conversation?.metadata?.orderNumber ||
    conversation?.orders?.[0]?.orderNumber ||
    "---";

  const price =
    conversation?.metadata?.price ||
    conversation?.metadata?.total ||
    "---";

  return {
    name: politeName,
    customerName: politeName,
    customer_name: politeName,
    client_name: politeName,
    first_name: firstName,
    firstName: firstName,
    last_name: lastName,
    lastName: lastName,
    order_id: orderNumber,
    orderId: orderNumber,
    orderNumber: orderNumber,
    order_number: orderNumber,
    price: String(price),
    total: String(price),
    currency: "جنيه",
    agent_name: agentName,
    agentName: agentName,
    company_name: companyName,
    companyName: companyName,
    phone: companyPhone,
    companyPhone: companyPhone,
    email: companyEmail,
    companyEmail: companyEmail,
    website: companyWebsite,
    companyWebsite: companyWebsite,
  };
};
