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

  test("sends owner accounts with no login history to the marketplace", () => {
    const user = {
      role: "OWNER",
      lastLoginAt: null,
      company: {
        onboarding: onboardingReady,
      },
    };

    expect(isFirstLoginCompanyOwner(user)).toBe(true);
    expect(getPostAuthDestination(user)).toBe("/apps");
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
    expect(getPostAuthDestination(user)).toBe("/apps");
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

  test("sends app-dashboard company users to the apps landing page", () => {
    expect(
      getPostAuthDestination({
        role: "OWNER",
        lastLoginAt: "2026-05-23T12:00:00.000Z",
        company: {
          sidebarLayout: "app-dashboard",
          onboarding: onboardingReady,
        },
      }),
    ).toBe("/apps");
  });
});
