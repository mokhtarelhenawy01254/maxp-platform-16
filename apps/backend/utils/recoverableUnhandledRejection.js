function getReasonMessage(reason) {
  if (reason instanceof Error) {
    return reason.message || "";
  }

  if (reason && typeof reason === "object" && typeof reason.message === "string") {
    return reason.message;
  }

  return String(reason || "");
}

module.exports = {
  getReasonMessage,
};
