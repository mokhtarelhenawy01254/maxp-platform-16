/**
 * Shared External & Internal Dependencies
 */
const crypto = require("crypto");
const axios = require("axios");
const FacebookAdsService = require("../../../services/facebookAdsService");
const facebookAdsDecisionService = require("../../../services/facebookAdsDecisionService");
const { FacebookAdLibraryService } = require("../../../services/facebookAdLibraryService");
const { getSharedPrismaClient } = require("../../../services/sharedDatabase");
const { validateFacebookPageAccessToken } = require("../../../utils/facebookPageTokenUtils");

module.exports = {
  crypto,
  axios,
  FacebookAdsService,
  facebookAdsDecisionService,
  FacebookAdLibraryService,
  getSharedPrismaClient,
  validateFacebookPageAccessToken,
};
