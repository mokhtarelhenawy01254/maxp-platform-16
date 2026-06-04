const express = require("express");
const router = express.Router();
const platformSiteHomepageController = require("../controller/platformSiteHomepageController");
const platformSiteMetaPixelController = require("../controller/platformSiteMetaPixelController");

router.get("/homepage", platformSiteHomepageController.getPublicSettings);
router.get("/meta-pixel", platformSiteMetaPixelController.getPublicSettings);

module.exports = router;
