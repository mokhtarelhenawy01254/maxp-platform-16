function buildFacebookPixelTokenCandidates(company = {}) {
  const seenTokens = new Set();
  const candidates = [];

  [
    ["facebookPixelAccessToken", company.facebookPixelAccessToken],
    ["facebookAdsAccessToken", company.facebookAdsAccessToken],
  ].forEach(([source, token]) => {
    if (typeof token !== "string" || !token.trim()) {
      return;
    }

    const normalizedToken = token.trim();
    if (seenTokens.has(normalizedToken)) {
      return;
    }

    seenTokens.add(normalizedToken);
    candidates.push({
      source,
      token: normalizedToken,
    });
  });

  return candidates;
}

module.exports = {
  buildFacebookPixelTokenCandidates,
};
