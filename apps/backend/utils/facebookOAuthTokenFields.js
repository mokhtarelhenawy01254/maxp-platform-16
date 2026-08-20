function buildFacebookTokenUpdateData(accessToken, type = "page") {
  if (type === "pixel") {
    return {
      facebookPixelAccessToken: accessToken,
      facebookAdsAccessToken: accessToken,
    };
  }

  if (type === "ads") {
    return {
      facebookAdsAccessToken: accessToken,
    };
  }

  return {
    facebookUserAccessToken: accessToken,
  };
}

module.exports = {
  buildFacebookTokenUpdateData,
};
