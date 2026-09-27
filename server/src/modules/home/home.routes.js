const { Router } = require("express");
const { getHomeBanner } = require("./home.controller");

const router = Router();

router.get("/banner", getHomeBanner);

module.exports = router;
