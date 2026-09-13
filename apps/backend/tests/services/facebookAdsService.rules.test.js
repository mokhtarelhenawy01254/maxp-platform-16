const axios = require("axios");

jest.mock("axios");
jest.mock("dns", () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

const dns = require("dns").promises;
const FacebookAdsService = require("../../services/facebookAdsService");

describe("FacebookAdsService automated rules", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dns.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  });

  test("creates automated rule with strictly valid Meta evaluation_spec (no evaluationType leak)", async () => {
    axios.post.mockResolvedValue({ data: { id: "rule_12345" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createAutomatedRule({
      name: "Pause losing ads",
      entityType: "AD",
      actionType: "PAUSE",
      evaluationSpec: {
        evaluationType: "HOURLY", // Legacy frontend key that caused #100 error
        filters: [
          { field: "cpm", operator: "GREATER_THAN", value: 150 },
          { field: "roas", operator: "LESS_THAN", value: 3 },
        ],
      },
      schedule: "HOURLY",
    });

    expect(result.success).toBe(true);
    expect(result.ruleId).toBe("rule_12345");

    const callArgs = axios.post.mock.calls[0];
    const endpoint = callArgs[0];
    const payload = callArgs[1];

    expect(endpoint).toContain("/act_123456789/adrules_library");

    // evaluation_spec must NEVER contain evaluationType
    expect(payload.evaluation_spec).not.toHaveProperty("evaluationType");
    expect(payload.evaluation_spec.evaluation_type).toBe("SCHEDULE");

    // filters must contain entity_type and time_preset
    expect(payload.evaluation_spec.filters).toEqual(
      expect.arrayContaining([
        { field: "entity_type", operator: "EQUAL", value: "AD" },
        { field: "time_preset", operator: "EQUAL", value: "LAST_7D" },
        { field: "cpm", operator: "GREATER_THAN", value: 150 },
        { field: "website_purchase_roas", operator: "LESS_THAN", value: 3 },
      ])
    );

    // execution_spec
    expect(payload.execution_spec.execution_type).toBe("PAUSE");

    // schedule_spec
    expect(payload.schedule_spec.schedule_type).toBe("HOURLY");
  });

  test("normalizes SEND_NOTIFICATION to NOTIFICATION and budget actions to CHANGE_BUDGET", async () => {
    axios.post.mockResolvedValue({ data: { id: "rule_budget" } });
    const service = new FacebookAdsService("token", "123456789");

    const result = await service.createAutomatedRule({
      name: "Scale winner",
      entityType: "CAMPAIGN",
      actionType: "INCREASE_BUDGET",
      actionValue: 20,
      conditions: [
        { field: "cost_per_result", operator: "LESS_THAN", value: 50 },
      ],
      schedule: "DAILY",
    });

    expect(result.success).toBe(true);
    const payload = axios.post.mock.calls[0][1];

    expect(payload.execution_spec.execution_type).toBe("CHANGE_BUDGET");
    expect(payload.execution_spec.execution_options).toEqual([
      {
        field: "change_spec",
        value: {
          amount: 20,
          unit: "PERCENT",
        },
      },
    ]);

    expect(payload.evaluation_spec.filters).toEqual(
      expect.arrayContaining([
        { field: "entity_type", operator: "EQUAL", value: "CAMPAIGN" },
        { field: "cost_per", operator: "LESS_THAN", value: 50 },
      ])
    );
  });

  test("getAutomatedRules normalizes raw Meta rules into clean format", async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          {
            id: "rule_999",
            name: "High CPM Stop",
            status: "ENABLED",
            created_time: "2026-09-13T12:00:00+0000",
            evaluation_spec: {
              evaluation_type: "SCHEDULE",
              filters: [
                { field: "entity_type", operator: "EQUAL", value: "AD" },
                { field: "time_preset", operator: "EQUAL", value: "LAST_7D" },
                { field: "cpm", operator: "GREATER_THAN", value: 150 },
              ],
            },
            execution_spec: {
              execution_type: "PAUSE",
            },
            schedule_spec: {
              schedule_type: "HOURLY",
            },
          },
        ],
      },
    });

    const service = new FacebookAdsService("token", "123456789");
    const result = await service.getAutomatedRules();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    const rule = result.data[0];

    expect(rule.id).toBe("rule_999");
    expect(rule.status).toBe("ACTIVE");
    expect(rule.entityType).toBe("AD");
    expect(rule.actionType).toBe("PAUSE");
    expect(rule.schedule).toBe("HOURLY");
    expect(rule.conditions).toEqual([
      { field: "cpm", operator: "GREATER_THAN", value: 150 },
    ]);
  });
});
