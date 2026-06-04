import {
  buildAsyncReportPayload,
  normalizeAsyncReportStatus,
} from "../MediaBuyingReports.helpers";

describe("MediaBuyingReports helpers", () => {
  it("builds an async report payload with a custom time range", () => {
    expect(
      buildAsyncReportPayload({
        adAccountId: "1120545302307751",
        level: "ad",
        dateMode: "range",
        datePreset: "last_30d",
        since: "2026-05-01",
        until: "2026-05-08",
        fields: ["ad_name", "spend"],
        breakdowns: ["publisher_platform"],
      }),
    ).toEqual({
      adAccountId: "1120545302307751",
      level: "ad",
      fields: ["ad_name", "spend"],
      breakdowns: ["publisher_platform"],
      timeRange: {
        since: "2026-05-01",
        until: "2026-05-08",
      },
    });
  });

  it("builds an async report payload with a date preset", () => {
    expect(
      buildAsyncReportPayload({
        adAccountId: "",
        level: "campaign",
        dateMode: "preset",
        datePreset: "last_7d",
        since: "",
        until: "",
        fields: ["campaign_name", "ctr"],
        breakdowns: [],
      }),
    ).toEqual({
      adAccountId: undefined,
      level: "campaign",
      fields: ["campaign_name", "ctr"],
      breakdowns: [],
      datePreset: "last_7d",
    });
  });

  it("normalizes Meta v25 async error fields from nested status data", () => {
    expect(
      normalizeAsyncReportStatus({
        data: {
          async_status: "Job Failed",
          async_percent_completion: 37,
          error_code: 190,
          error_message: "Invalid OAuth access token.",
          error_subcode: 463,
        },
      }),
    ).toMatchObject({
      status: "Job Failed",
      percentComplete: 37,
      errorCode: 190,
      errorMessage: "Invalid OAuth access token.",
      errorSubcode: 463,
    });
  });
});
