const fs = require("fs");
const path = require("path");

describe("affiliate and merchant permission model", () => {
  const schemaSource = fs.readFileSync(
    path.resolve(__dirname, "../../prisma/schema/enums.prisma"),
    "utf8",
  );

  test("UserCompaniesRole includes AFFILIATE as a company-scoped role", () => {
    const userCompaniesRoleBlock = schemaSource.match(
      /enum UserCompaniesRole \{([\s\S]*?)\}/,
    )?.[1];

    expect(userCompaniesRoleBlock).toBeTruthy();
    expect(userCompaniesRoleBlock).toContain("AFFILIATE");
  });

  test("UserCompaniesRole does not currently expose MERCHANT as a company-scoped user role", () => {
    const userCompaniesRoleBlock = schemaSource.match(
      /enum UserCompaniesRole \{([\s\S]*?)\}/,
    )?.[1];

    expect(userCompaniesRoleBlock).toBeTruthy();
    expect(userCompaniesRoleBlock).not.toContain("MERCHANT");
  });

  test("CommissionType still supports MERCHANT commissions for dropshipping workflows", () => {
    const commissionTypeBlock = schemaSource.match(
      /enum CommissionType \{([\s\S]*?)\}/,
    )?.[1];

    expect(commissionTypeBlock).toBeTruthy();
    expect(commissionTypeBlock).toContain("AFFILIATE");
    expect(commissionTypeBlock).toContain("MERCHANT");
    expect(commissionTypeBlock).toContain("PLATFORM");
  });
});
