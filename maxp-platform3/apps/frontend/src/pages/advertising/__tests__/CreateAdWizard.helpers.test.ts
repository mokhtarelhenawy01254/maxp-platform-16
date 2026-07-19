import {
  buildCreateAdWizardTargetingPayload,
  getCompatibleAttributionWindows,
  getFullAdMinimumBudgetAmount,
  normalizeAttributionWindowForObjective,
  normalizeWizardBidStrategy,
} from "../CreateAdWizard.helpers";

const windows = [
  { value: "1d_click", label: "1 يوم نقرة", description: "" },
  { value: "7d_click_1d_view", label: "7 أيام + مشاهدة", description: "" },
];

describe("CreateAdWizard helpers", () => {
  it("normalizes UI and Meta bid strategy values to the backend contract", () => {
    expect(normalizeWizardBidStrategy("LOWEST_COST_WITHOUT_CAP")).toBe(
      "LOWEST_COST",
    );
    expect(normalizeWizardBidStrategy("LOWEST_COST_WITH_BID_CAP")).toBe(
      "BID_CAP",
    );
    expect(normalizeWizardBidStrategy("TARGET_COST")).toBe("COST_CAP");
  });

  it("keeps traffic attribution v25-safe for link-click ad sets", () => {
    expect(
      normalizeAttributionWindowForObjective(
        "OUTCOME_TRAFFIC",
        "7d_click_1d_view",
      ),
    ).toBe("1d_click");
    expect(getCompatibleAttributionWindows("OUTCOME_TRAFFIC", windows)).toEqual([
      windows[0],
    ]);
  });

  it("uses the account currency minimum for full-ad budget validation", () => {
    expect(getFullAdMinimumBudgetAmount("EGP")).toBe(200);
    expect(getFullAdMinimumBudgetAmount("USD")).toBe(1);
  });

  it("builds an effective targeting payload from selected wizard controls", () => {
    const payload = buildCreateAdWizardTargetingPayload(
      {
        ageMin: 21,
        ageMax: 45,
        genders: ["female"],
        locations: ["EG"],
        regions: [],
        cities: [],
        locationTypes: ["home", "recent"],
        advantageAudience: false,
      },
      {
        selectedInterests: [{ id: "6003139266461", name: "Shoes" }],
        selectedCustomAudiences: ["238custom"],
        selectedLookalikeAudiences: ["238lookalike"],
        excludedAudiences: ["238exclude"],
        selectedLanguages: [6],
        selectedDevices: ["iOS"],
        relationshipStatuses: [4],
        selectedEducation: [3],
      },
    );

    expect(payload).toEqual(
      expect.objectContaining({
        ageMin: 21,
        locations: ["EG"],
        interests: [{ id: "6003139266461", name: "Shoes" }],
        customAudiences: ["238custom"],
        lookalikeAudiences: ["238lookalike"],
        excludedAudiences: ["238exclude"],
        locales: [6],
        devices: { platforms: ["iOS"] },
        relationshipStatuses: [4],
        education: { statuses: [3] },
        advantageAudience: false,
      }),
    );
  });
});
