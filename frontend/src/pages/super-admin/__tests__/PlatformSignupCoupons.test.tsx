import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PlatformSignupCoupons from "../PlatformSignupCoupons";

const listCouponsMock = jest.fn();
const createCouponMock = jest.fn();
const updateCouponMock = jest.fn();
const removeCouponMock = jest.fn();

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../services/platformSignupCouponService", () => {
  const zeroBenefits = {
    trialDays: 0,
    bonusUsers: 0,
    bonusProducts: 0,
    bonusOrdersPerMonth: 0,
    bonusCustomers: 0,
  };

  return {
    __esModule: true,
    platformSignupCouponService: {
      zeroBenefits,
      listCoupons: (...args: unknown[]) => listCouponsMock(...args),
      createCoupon: (...args: unknown[]) => createCouponMock(...args),
      updateCoupon: (...args: unknown[]) => updateCouponMock(...args),
      removeCoupon: (...args: unknown[]) => removeCouponMock(...args),
    },
    default: {
      zeroBenefits,
      listCoupons: (...args: unknown[]) => listCouponsMock(...args),
      createCoupon: (...args: unknown[]) => createCouponMock(...args),
      updateCoupon: (...args: unknown[]) => updateCouponMock(...args),
      removeCoupon: (...args: unknown[]) => removeCouponMock(...args),
    },
  };
});

describe("PlatformSignupCoupons page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    listCouponsMock.mockResolvedValue({
      items: [
        {
          id: "coupon-1",
          code: "WELCOME14",
          name: "Welcome 14",
          description: "Extra trial and higher limits",
          trialDays: 14,
          bonusUsers: 3,
          bonusProducts: 50,
          bonusOrdersPerMonth: 200,
          bonusCustomers: 100,
          usageLimit: 20,
          usageCount: 2,
          isActive: true,
          validFrom: "2026-04-22T00:00:00.000Z",
          validTo: "2026-05-22T00:00:00.000Z",
          createdBy: "root@example.com",
          createdAt: "2026-04-22T00:00:00.000Z",
          updatedAt: "2026-04-22T00:00:00.000Z",
          redemptionsCount: 2,
          benefitSummary: ["14 يوم إضافي مجانا", "200 طلب إضافي شهريا"],
          state: "live" as const,
          lastRedemption: {
            redeemedAt: "2026-04-22T10:00:00.000Z",
            email: "owner@example.com",
            companyName: "Demo Co",
          },
        },
      ],
      summary: {
        totalCoupons: 1,
        liveCoupons: 1,
        scheduledCoupons: 0,
        expiredCoupons: 0,
        inactiveCoupons: 0,
        depletedCoupons: 0,
        totalRedemptions: 2,
      },
    });
    removeCouponMock.mockResolvedValue({
      action: "deleted",
      couponId: "coupon-1",
    });
  });

  test("loads coupons and renders the new admin surface", async () => {
    render(<PlatformSignupCoupons />);

    await waitFor(() => {
      expect(listCouponsMock).toHaveBeenCalledWith("", "all");
    });

    expect((await screen.findAllByText(/Welcome 14/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/WELCOME14/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /إنشاء كوبون|Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¨ÙˆÙ†/i })).toBeInTheDocument();
  });

  test("opens create coupon dialog from the hero action", async () => {
    render(<PlatformSignupCoupons />);

    expect((await screen.findAllByText(/Welcome 14/i)).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /إنشاء كوبون|Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¨ÙˆÙ†/i }),
    );

    expect(
      await screen.findByText(/إنشاء كوبون تسجيل جديد|Ø¥Ù†Ø´Ø§Ø¡ ÙƒÙˆØ¨ÙˆÙ† ØªØ³Ø¬ÙŠÙ„ Ø¬Ø¯ÙŠØ¯/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/اسم الكوبون|Ø§Ø³Ù… Ø§Ù„ÙƒÙˆØ¨ÙˆÙ†/i)).toBeInTheDocument();
  });

  test("opens delete confirmation for a coupon row", async () => {
    render(<PlatformSignupCoupons />);

    expect((await screen.findAllByText(/Welcome 14/i)).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getAllByRole("button", {
        name: /حذف الكوبون WELCOME14|Ø­Ø°Ù Ø§Ù„ÙƒÙˆØ¨ÙˆÙ† WELCOME14/i,
      })[0]!,
    );

    expect(
      await screen.findByText(/حذف كوبون التسجيل|Ø­Ø°Ù ÙƒÙˆØ¨ÙˆÙ† Ø§Ù„ØªØ³Ø¬ÙŠÙ„/i),
    ).toBeInTheDocument();
  });
});
