const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  listMyRequests,
  getRequest,
  createRequest,
  cancelRequest,
  getFeeQuote,
  listPackageTypes,
  listAvailable,
  listMyJobs,
  acceptRequest,
  markPickedUp,
  markDelivered,
  updateLocation,
} = require("./delivery.controller");

const router = Router();
const requireAgent = requireRole("DELIVERY_AGENT");

// Public (no requireAuth) - lets a guest preview distance/price before
// logging in, same as mobile's GET /mobile/fee-quote. Static path, so it
// must come before the dynamic /requests/:id below to avoid being shadowed.
router.get("/fee-quote", getFeeQuote);
router.get("/package-types", listPackageTypes);

router.get("/requests", requireAuth, listMyRequests);
router.post("/requests", requireAuth, createRequest);
router.get("/requests/:id", requireAuth, getRequest);
router.patch("/requests/:id/cancel", requireAuth, cancelRequest);

// Delivery-agent dispatch - static routes before the dynamic /requests/:id
// ones above would be a hazard if these were nested under /requests, so
// they get their own /jobs prefix instead.
router.get("/jobs/available", requireAuth, requireAgent, listAvailable);
router.get("/jobs/mine", requireAuth, requireAgent, listMyJobs);
router.post("/jobs/:id/accept", requireAuth, requireAgent, acceptRequest);
router.post("/jobs/:id/picked-up", requireAuth, requireAgent, markPickedUp);
router.post("/jobs/:id/delivered", requireAuth, requireAgent, markDelivered);
router.patch("/jobs/:id/location", requireAuth, requireAgent, updateLocation);

module.exports = router;
