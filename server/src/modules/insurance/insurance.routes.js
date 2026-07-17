const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listPlans, listMyPolicies, subscribe } = require("./insurance.controller");

const router = Router();

router.get("/plans", listPlans);
router.get("/policies", requireAuth, listMyPolicies);
router.post("/policies", requireAuth, subscribe);

module.exports = router;
