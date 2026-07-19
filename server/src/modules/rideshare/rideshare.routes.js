const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  listMyRides,
  createRide,
  cancelRide,
  listAvailable,
  listMyJobs,
  acceptRide,
  startRide,
  completeRide,
} = require("./rideshare.controller");

const router = Router();
const requireRider = requireRole("RIDER");

router.get("/rides", requireAuth, listMyRides);
router.post("/rides", requireAuth, createRide);
router.patch("/rides/:id/cancel", requireAuth, cancelRide);

// Rider dispatch - own /jobs prefix, same reasoning as delivery.routes.js.
router.get("/jobs/available", requireAuth, requireRider, listAvailable);
router.get("/jobs/mine", requireAuth, requireRider, listMyJobs);
router.post("/jobs/:id/accept", requireAuth, requireRider, acceptRide);
router.post("/jobs/:id/start", requireAuth, requireRider, startRide);
router.post("/jobs/:id/complete", requireAuth, requireRider, completeRide);

module.exports = router;
