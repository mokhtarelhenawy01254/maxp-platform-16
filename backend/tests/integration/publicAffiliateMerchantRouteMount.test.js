const fs = require("fs");
const path = require("path");

describe("public affiliate and merchant route registration", () => {
  test("server mounts public affiliate routes under /api/v1/public/affiliates", () => {
    const serverSource = fs.readFileSync(
      path.resolve(__dirname, "../../server.js"),
      "utf8",
    );

    expect(serverSource).toContain(
      'app.use("/api/v1/public/affiliates", publicAffiliateRoutes);',
    );
  });

  test("server mounts public merchant routes under /api/v1/public/merchants", () => {
    const serverSource = fs.readFileSync(
      path.resolve(__dirname, "../../server.js"),
      "utf8",
    );

    expect(serverSource).toContain(
      'app.use("/api/v1/public/merchants", publicMerchantRoutes);',
    );
  });
});
