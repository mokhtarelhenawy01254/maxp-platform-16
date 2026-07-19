describe("installProductionLogFilter", () => {
  const originalConsole = {};
  const consoleMocks = {};

  beforeEach(() => {
    jest.resetModules();
    for (const methodName of ["log", "info", "debug", "warn"]) {
      originalConsole[methodName] = console[methodName];
      consoleMocks[methodName] = jest.fn();
      console[methodName] = consoleMocks[methodName];
    }
    delete console.__maxpProductionFilterInstalled;
  });

  afterEach(() => {
    for (const methodName of ["log", "info", "debug", "warn"]) {
      console[methodName] = originalConsole[methodName];
    }
    delete console.__maxpProductionFilterInstalled;
  });

  test("suppresses noisy WhatsApp and avatar proxy production logs", () => {
    const { installProductionLogFilter } = require("../../utils/installProductionLogFilter");

    installProductionLogFilter();

    console.log("📱 WhatsApp Router: GET /conversations");
    console.info("📋 [NOTIFICATIONS-API] Found 20 notifications");
    console.log("[WEBHOOK-DURABLE-INGRESS] queued 1 Facebook webhook job(s)");
    console.log("🤖 [CORE-AI] بدء معالجة رسالة للمحادثة: conversation-id");
    console.log("⏸️ [CORE-AI] الذكاء الاصطناعي معطّل لهذه الشركة (autoReplyEnabled = false) - لن يتم الرد");
    console.warn("⚠️ [IMAGE-PROXY] Remote asset fetch failed, trying fallback:", {
      status: 404,
    });
    console.warn("important warning");

    expect(consoleMocks.log).not.toHaveBeenCalled();
    expect(consoleMocks.info).not.toHaveBeenCalled();
    expect(consoleMocks.warn).toHaveBeenCalledTimes(1);
    expect(consoleMocks.warn).toHaveBeenCalledWith("important warning");
  });
});
