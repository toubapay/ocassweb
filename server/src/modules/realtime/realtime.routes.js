const { Router } = require("express");
const { requireAuth, requireRole } = require("../../middleware/auth");
const { stream, stats } = require("./realtime.controller");

const router = Router();

// Authenticated inside the handler rather than by requireAuth, because the
// browser's EventSource cannot send an Authorization header and this route
// also accepts the session cookie - see authenticateStream.
router.get("/stream", stream);

// Operational only: how many connections this process holds.
router.get("/stats", requireAuth, requireRole("ADMIN"), stats);

module.exports = router;
