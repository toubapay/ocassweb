const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { requestOtp, verifyOtpAndLogin, me, updateRole } = require("./auth.controller");

const router = Router();

router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtpAndLogin);
router.get("/me", requireAuth, me);
router.patch("/role", requireAuth, updateRole);

module.exports = router;
