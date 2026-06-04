const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8').replace(/\r\n/g, '\n');
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start === -1) {
    throw new Error(`Missing function ${name}`);
  }
  const paramsStart = source.indexOf('(', start);
  let parenDepth = 0;
  let bodyStart = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth -= 1;
    if (parenDepth === 0) {
      bodyStart = source.indexOf('{', index);
      break;
    }
  }
  if (bodyStart === -1) {
    throw new Error(`Could not find function body ${name}`);
  }
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  throw new Error(`Could not parse function ${name}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertMatches(source, pattern, message) {
  assert(pattern.test(source), message);
}

function main() {
  const relevance = read('services/aiAgent/agentIntentRelevanceService.js');
  const planner = read('services/aiAgent/agentIntentPlannerService.js');
  const classifier = read('services/aiAgent/agentIntentClassifierService.js');
  const ceoAgent = read('services/aiAgent/CEOAgent.js').replace(/\r\n/g, '\n');
  const routerSource = read('services/aiAgent/executors/intentExecutionRouter.js');
  const allFunctions = read('utils/allFunctions.js');
  const customerSoulPaths = [
    'agents/facebook-sales-support-agent/SOUL.md',
    'agents/sales-agent/SOUL.md',
  ];

  // Assert no keyword routing lists in relevance service
  assert(!/HR_ATTENDANCE_HINTS|ORDER_CREATE_HINTS|AGENT_HINTS|EMPLOYEE_TODAY_HINTS|SHIPPING_HINTS/.test(relevance), 'Keyword arrays must be absent from agentIntentRelevanceService');

  const customerSeed = extractFunction(relevance, 'buildCustomerClassifierSeed');
  assert(customerSeed.includes("customerIntentMode: 'llm_structured_only'"), 'Customer seed must mark llm_structured_only mode');
  assert(!/keywordPolicyHint|includesAny|matchesAny|resolvePolicyPlan|_HINTS/.test(customerSeed), 'Customer seed must not carry keyword routing hints');

  const resolveToolPlan = extractFunction(relevance, 'resolveToolPlan');
  assert(resolveToolPlan.includes('isCustomerChatChannel'), 'resolveToolPlan must detect customer chat channels');
  assert(resolveToolPlan.includes('buildCustomerClassifierSeed()'), 'Customer chat channels must start from the neutral classifier seed');
  assert(
    resolveToolPlan.includes('const adminPolicyPlan = !customerChannel') && resolveToolPlan.includes('resolveAdminPolicyPlan({ message, availableTools, context })'),
    'Admin-only policy routes must be gated away from customer chat channels',
  );

  assert(planner.includes("context?.customerIntentMode === 'llm_structured_only'"), 'Planner must recognize customer llm_structured_only mode');
  assert(
    /context\?\.customerIntentMode === 'llm_structured_only'[\s\S]*?return true;[\s\S]*?return !messageHasSlot/.test(planner),
    'Customer slot checks must not fall back to message regex extraction',
  );

  const jsonFallbackClassifier = extractFunction(classifier, 'classifyIntentWithJsonFallback');
  assert(jsonFallbackClassifier.includes('Return exactly one JSON object'), 'Classifier must provide a model-generated structured JSON fallback');
  assert(!/includesAny|matchesAny|RegExp|keyword|regex/i.test(jsonFallbackClassifier), 'Classifier JSON fallback must not add keyword or regex routing');

  // Check pipeline stages for customer channel detection
  const resolveIntentSource = read('services/aiAgent/pipeline/stages/resolveIntent.js');
  assert(resolveIntentSource.includes('detectCustomerChannel'), 'resolveIntent must detect customer reply channels');
  assert(resolveIntentSource.includes('CUSTOMER_CHANNELS'), 'resolveIntent must define customer channel list');

  const routeToToolsSource = read('services/aiAgent/pipeline/stages/routeToTools.js');
  assertMatches(
    routeToToolsSource,
    /const deterministicReadExecution =[\s\S]*?&& !isCustomerReplyChannel[\s\S]*?\? intentExecutionRouter\._getDeterministicReadToolExecution/,
    'Customer channels must not use deterministic read fallback',
  );
  assertMatches(
    routeToToolsSource,
    /const deterministicActionExecution =[\s\S]*?&& !isCustomerReplyChannel[\s\S]*?\? intentExecutionRouter\._getDeterministicActionToolExecution/,
    'Customer channels must not use deterministic action fallback',
  );
  assert(routeToToolsSource.includes('const contextOrderDraftParams = !isCustomerReplyChannel'), 'Customer channels must not parse order draft params with local fallback');

  const executeToolsSource = read('services/aiAgent/pipeline/stages/executeTools.js');
  assert(executeToolsSource.includes('isCustomerReplyChannel'), 'executeTools must be aware of customer channels');

  const handleFallbackSource = read('services/aiAgent/pipeline/stages/handleFallback.js');
  assert(handleFallbackSource.includes('isCustomerReplyChannel'), 'handleFallback must be aware of customer channels');
  assert(handleFallbackSource.includes('_getModelClassifiedHandoffExecution'), 'Customer handoff repair must use model-classified handoff execution');
  assert(!handleFallbackSource.includes('_getDeterministicActionToolExecution(relevancePlan'), 'Customer handoff repair must not call deterministic action fallback');
  assert(handleFallbackSource.includes('_getModelClassifiedReadToolExecution'), 'handleFallback must use LLM-classified read repair');
  assert(handleFallbackSource.includes('_getModelClassifiedWriteToolExecution'), 'handleFallback must use LLM-classified write repair');
  assert(handleFallbackSource.includes('model-classified-slot-repair'), 'handleFallback must label slot repair source');
  const customerRepairBranch = (handleFallbackSource.match(/if \(isCustomerReplyChannel\) \{([\s\S]*?)\} else \{/) || [])[1] || '';
  assert(customerRepairBranch && !/_getDeterministic(?:Read|Write|Action)ToolExecution/.test(customerRepairBranch), 'Customer repair branch must not call deterministic parser helpers');

  const validateReplySource = read('services/aiAgent/pipeline/stages/validateReply.js');
  assert(validateReplySource.includes('isCustomerReplyChannel'), 'validateReply must be aware of customer channels');

  const modelClassifiedReadExecution = extractFunction(routerSource, '_getModelClassifiedReadToolExecution');
  assert(modelClassifiedReadExecution.includes('toolDefinition.readOnly === false'), 'Customer read repair must be limited to read-only tools');
  assert(!/_parseInventoryCheckParams|_parseOrderLookupParams|_parseShippingRateParams|RegExp|match\(|intentMessage|message/.test(modelClassifiedReadExecution), 'Customer read repair must not parse the raw message locally');
  assert(handleFallbackSource.includes("source: 'model-classified-read-repair'"), 'Customer read repair execution must be explicitly labeled');
  assert(!allFunctions.includes('textReferencesCustomerImageForAi'), 'Facebook customer messages must not be skipped with image-reference regex gates');
  assert(!allFunctions.includes('waiting for the attachment event to avoid duplicate replies'), 'Facebook customer image wording must be handled by the model, not local routing');

  for (const soulPath of customerSoulPaths) {
    const soul = read(soulPath);
    assert(!/[\u0600-\u06FF]/.test(soul), `${soulPath} must not include fixed Arabic customer-facing reply examples`);
  }

  console.log('Customer intent architecture guard passed');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
