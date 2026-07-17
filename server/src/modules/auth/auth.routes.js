const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requestOtp, verifyOtpAndLogin, me } = require("./auth.controller");

const router = Router();

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtpAndLogin);
router.get("/me", requireAuth, me);

module.exports = router;
