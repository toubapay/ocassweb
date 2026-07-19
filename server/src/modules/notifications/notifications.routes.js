const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const { listMine, unreadCount, markRead, markAllRead } = require("./notifications.controller");

const router = Router();
router.use(requireAuth);

router.get("/", listMine);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markRead);

module.exports = router;
