const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listMyRequests, createRequest } = require("./delivery.controller");

const router = Router();

router.get("/requests", requireAuth, listMyRequests);
router.post("/requests", requireAuth, createRequest);

module.exports = router;
