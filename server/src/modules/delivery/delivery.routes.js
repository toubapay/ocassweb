const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listMyRequests, createRequest, cancelRequest } = require("./delivery.controller");

const router = Router();

router.get("/requests", requireAuth, listMyRequests);
router.post("/requests", requireAuth, createRequest);
router.patch("/requests/:id/cancel", requireAuth, cancelRequest);

module.exports = router;
