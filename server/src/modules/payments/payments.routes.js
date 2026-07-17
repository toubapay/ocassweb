const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { ipn, getStatus } = require("./payments.controller");

const router = Router();

// Public - called by PayDunya's own servers, not through our session auth.
router.post("/paydunya/ipn", ipn);

// Used by the frontend's return-URL page to check/confirm status.
router.get("/paydunya/status/:token", requireAuth, getStatus);

module.exports = router;
