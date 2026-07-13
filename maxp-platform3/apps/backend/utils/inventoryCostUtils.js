function toOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value || 0) * factor) / factor;
}

function buildInventoryCostSummary(inventories = []) {
  const rows = (Array.isArray(inventories) ? inventories : [])
    .map((inventory) => {
      const cost = toOptionalNumber(inventory?.cost);
      const available = toOptionalNumber(inventory?.available);
      const quantity = toOptionalNumber(inventory?.quantity);

      return {
        cost,
        quantity: Math.max(0, available ?? quantity ?? 0),
      };
    })
    .filter((row) => row.cost !== null && row.cost > 0);

  if (rows.length === 0) {
    return {
      unitCost: null,
      source: "NONE",
      records: 0,
      stockedUnits: 0,
    };
  }

  const stockedUnits = rows.reduce((sum, row) => sum + row.quantity, 0);

  if (stockedUnits > 0) {
    const weightedCost =
      rows.reduce((sum, row) => sum + row.cost * row.quantity, 0) /
      stockedUnits;

    return {
      unitCost: round(weightedCost),
      source: "INVENTORY_WEIGHTED_AVERAGE",
      records: rows.length,
      stockedUnits: round(stockedUnits, 0),
    };
  }

  const averageCost =
    rows.reduce((sum, row) => sum + row.cost, 0) / rows.length;

  return {
    unitCost: round(averageCost),
    source: "INVENTORY_AVERAGE",
    records: rows.length,
    stockedUnits: 0,
  };
}

module.exports = {
  buildInventoryCostSummary,
};
