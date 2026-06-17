import {
  getPostAuthDestination,
  isFirstLoginCompanyOwner,
} from "../companyOnboarding";

describe("companyOnboarding routing", () => {
  const onboardingReady = {
    needsAttention: false,
  } as NonNullable<
    NonNullable<Parameters<typeof getPostAuthDestination>[0]>["company"]
  >["onboarding"];

  test("sends owner accounts with no login history to the main dashboard", () => {
    const user = {
      role: "OWNER",
      lastLoginAt: null,
      company: {
        onboarding: onboardingReady,
      },
    };

    expect(isFirstLoginCompanyOwner(user)).toBe(true);
    expect(getPostAuthDestination(user)).toBe("/company-dashboard");
  });

  test("keeps returning owner accounts on the normal post-auth destination", () => {
    const user = {
      role: "OWNER",
      lastLoginAt: "2026-05-23T12:00:00.000Z",
      company: {
        onboarding: onboardingReady,
      },
    };

    expect(isFirstLoginCompanyOwner(user)).toBe(false);
    expect(getPostAuthDestination(user)).toBe("/company-dashboard");
  });

  test("does not override role-specific destinations", () => {
    expect(
      getPostAuthDestination({
        role: "SUPER_ADMIN",
        lastLoginAt: null,
        company: {
          onboarding: onboardingReady,
        },
      }),
    ).toBe("/super-admin/dev-dashboard");

    expect(
      getPostAuthDestination({
        role: "MERCHANT",
        lastLoginAt: null,
        company: {
          onboarding: onboardingReady,
        },
      }),
    ).toBe("/merchant-portal");
  });

  test("sends all company users to the main dashboard", () => {
    expect(
      getPostAuthDestination({
        role: "OWNER",
        lastLoginAt: "2026-05-23T12:00:00.000Z",
        company: {
          sidebarLayout: "app-dashboard",
          onboarding: onboardingReady,
        },
      }),
    ).toBe("/company-dashboard");
  });
});
