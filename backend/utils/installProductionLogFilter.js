const NOISY_PRODUCTION_PATTERNS = [
  /\[TIMING-/,
  /\[CONV-UPDATE\]/,
  /\[VERIFY-TOKEN\]/,
  /\[BLOCK-CHECK\]/,
  /\[WEBHOOK-RCV\]/,
  /\[WEBHOOK-DURABLE-INGRESS\] queued \d+ Facebook webhook job\(s\)/,
  /\[PROFILE\] Making request to Facebook API/,
  /\[SECURITY\] (GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD) /,
  /\[SECURITY\] Auth Success:/,
  /\[SECURITY-LOW\] (request_received|company_access_granted|auth_failure)/,
  /\[GET-CONV\]/,
  /\[NEW-CONVERSATION\]/,
  /\[NOTIFICATIONS-API\]/,
  /\[SUPER-ADMIN-MIDDLEWARE\]/,
  /\[PERMISSION-LOOKUP\]/,
  /WhatsApp Router:/,
  /\[IMAGE-PROXY\] Remote asset fetch failed, trying fallback:/,
  /\[IMAGE-PROXY\] No proxyable avatar asset was found, serving fallback avatar:/,
  /\[IMAGE-PROXY\] Avatar fetch failed for all candidates, serving fallback avatar:/,
  /BullMQ Webhook Worker started/,
];

function shouldSuppress(args) {
  return args.some((arg) => (
    typeof arg === 'string'
      && NOISY_PRODUCTION_PATTERNS.some((pattern) => pattern.test(arg))
  ));
}

function wrapConsoleMethod(methodName) {
  const original = console[methodName].bind(console);

  console[methodName] = (...args) => {
    if (shouldSuppress(args)) {
      return;
    }

    return original(...args);
  };
}

function installProductionLogFilter() {
  if (console.__maxpProductionFilterInstalled) {
    return;
  }

  wrapConsoleMethod('log');
  wrapConsoleMethod('info');
  wrapConsoleMethod('debug');
  wrapConsoleMethod('warn');

  console.__maxpProductionFilterInstalled = true;
}

module.exports = {
  installProductionLogFilter,
};
