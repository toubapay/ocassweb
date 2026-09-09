const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  listMyRides,
  getRide,
  createRide,
  getFeeQuote,
  cancelRide,
  listAvailable,
  listMyJobs,
  acceptRide,
  startRide,
  updateLocation,
  completeRide,
} = require("./rideshare.controller");

const router = Router();
const requireRider = requireRole("RIDER");

router.get("/fee-quote", getFeeQuote);
router.get("/rides", requireAuth, listMyRides);
router.get("/rides/:id", requireAuth, getRide);
router.post("/rides", requireAuth, createRide);
router.patch("/rides/:id/cancel", requireAuth, cancelRide);

// Rider dispatch - own /jobs prefix, same reasoning as delivery.routes.js.
router.get("/jobs/available", requireAuth, requireRider, listAvailable);
router.get("/jobs/mine", requireAuth, requireRider, listMyJobs);
router.post("/jobs/:id/accept", requireAuth, requireRider, acceptRide);
router.post("/jobs/:id/start", requireAuth, requireRider, startRide);
router.patch("/jobs/:id/location", requireAuth, requireRider, updateLocation);
router.post("/jobs/:id/complete", requireAuth, requireRider, completeRide);

module.exports = router;
