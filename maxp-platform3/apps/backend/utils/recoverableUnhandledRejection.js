function getReasonMessage(reason) {
  if (reason instanceof Error) {
    return reason.message || "";
  }

  if (reason && typeof reason === "object" && typeof reason.message === "string") {
    return reason.message;
  }

  return String(reason || "");
}

function isWhatsAppBaileysConnectionClosed(reason) {
  const message = getReasonMessage(reason);
  const stack = reason && typeof reason.stack === "string" ? reason.stack : "";
  const statusCode = reason?.output?.statusCode;
  const isBoomConnectionClosed =
    reason?.isBoom === true &&
    statusCode === 428 &&
    /connection closed/i.test(message);

  const cameFromBaileys =
    stack.includes("@whiskeysockets/baileys") ||
    stack.includes("node_modules/@whiskeysockets/baileys") ||
    isBoomConnectionClosed;

  return cameFromBaileys && /connection closed/i.test(message);
}

function isGramJsResolveError(reason) {
  const message = getReasonMessage(reason);
  const stack = reason && typeof reason.stack === "string" ? reason.stack : "";
  return (
    message.includes("resolve()") &&
    message.includes("called for non-request instance") &&
    (stack.includes("node_modules/telegram") ||
      stack.includes("node_modules\\telegram") ||
      stack.includes("node_modules/gramjs") ||
      stack.includes("node_modules\\gramjs"))
  );
}

module.exports = {
  getReasonMessage,
  isWhatsAppBaileysConnectionClosed,
  isGramJsResolveError,
};
