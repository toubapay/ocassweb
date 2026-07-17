const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listMyRides, createRide } = require("./rideshare.controller");

const router = Router();

router.get("/rides", requireAuth, listMyRides);
router.post("/rides", requireAuth, createRide);

module.exports = router;
