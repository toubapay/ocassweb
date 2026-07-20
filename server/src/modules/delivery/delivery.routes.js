const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const {
  listMyRequests,
  createRequest,
  cancelRequest,
  listAvailable,
  listMyJobs,
  acceptRequest,
  markPickedUp,
  markDelivered,
} = require("./delivery.controller");

const router = Router();
const requireAgent = requireRole("DELIVERY_AGENT");

router.get("/requests", requireAuth, listMyRequests);
router.post("/requests", requireAuth, createRequest);
router.patch("/requests/:id/cancel", requireAuth, cancelRequest);

// Delivery-agent dispatch - static routes before the dynamic /requests/:id
// ones above would be a hazard if these were nested under /requests, so
// they get their own /jobs prefix instead.
router.get("/jobs/available", requireAuth, requireAgent, listAvailable);
router.get("/jobs/mine", requireAuth, requireAgent, listMyJobs);
router.post("/jobs/:id/accept", requireAuth, requireAgent, acceptRequest);
router.post("/jobs/:id/picked-up", requireAuth, requireAgent, markPickedUp);
router.post("/jobs/:id/delivered", requireAuth, requireAgent, markDelivered);

module.exports = router;
