/**
 * Facebook Ads Controller Barrel
 * 
 * Re-exports all 75 methods across 12 domain modules
 * with 100% backward compatibility.
 */
module.exports = {
  ...require("./campaigns"),
  ...require("./wizard"),
  ...require("./accounts"),
  ...require("./adSets"),
  ...require("./creatives"),
  ...require("./analytics"),
  ...require("./sync"),
  ...require("./audiences"),
  ...require("./abTests"),
  ...require("./leads"),
  ...require("./conversions"),
  ...require("./advanced"),
};
