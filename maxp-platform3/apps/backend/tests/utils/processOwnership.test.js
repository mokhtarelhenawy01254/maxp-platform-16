const {
  getProcessInstanceId,
  shouldOwnSingletonWork,
} = require("../../utils/processOwnership");

describe("processOwnership", () => {
  test("owns singleton work outside PM2 cluster mode", () => {
    expect(shouldOwnSingletonWork({})).toBe(true);
  });

  test("only PM2 instance zero owns singleton work by default", () => {
    expect(shouldOwnSingletonWork({ NODE_APP_INSTANCE: "0" })).toBe(true);
    expect(shouldOwnSingletonWork({ NODE_APP_INSTANCE: "1" })).toBe(false);
    expect(shouldOwnSingletonWork({ NODE_APP_INSTANCE: "3" })).toBe(false);
  });

  test("supports explicit singleton owner override", () => {
    expect(shouldOwnSingletonWork({ NODE_APP_INSTANCE: "2", MAXP_SINGLETON_OWNER: "true" })).toBe(true);
    expect(shouldOwnSingletonWork({ NODE_APP_INSTANCE: "0", MAXP_SINGLETON_OWNER: "false" })).toBe(false);
  });

  test("returns the configured process instance id", () => {
    expect(getProcessInstanceId({ NODE_APP_INSTANCE: "2" })).toBe("2");
    expect(getProcessInstanceId({ PM2_INSTANCE_ID: "7" })).toBe("7");
    expect(getProcessInstanceId({})).toBeNull();
  });
});
