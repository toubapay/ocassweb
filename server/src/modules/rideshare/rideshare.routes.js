const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listMyRides, createRide, cancelRide } = require("./rideshare.controller");

const router = Router();

router.get("/rides", requireAuth, listMyRides);
router.post("/rides", requireAuth, createRide);
router.patch("/rides/:id/cancel", requireAuth, cancelRide);

module.exports = router;
