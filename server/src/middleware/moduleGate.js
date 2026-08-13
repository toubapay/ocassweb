const prisma = require("../lib/prisma");

/**
 * Blocks an entire module's routes with 503 when an ADMIN has disabled it
 * from /admin/modules (see server/src/modules/admin). Mounted per-module
 * in app.js, before that module's router, so disabling e.g. "delivery"
 * takes effect on the very next request - no restart needed.
 */
function requireModuleEnabled(key) {
  return async (req, res, next) => {
    try {
      const config = await prisma.moduleConfig.findUnique({ where: { key } });
      // No row yet (fresh DB that hasn't hit GET /admin/modules once to lazy-
      // seed defaults) - default to enabled rather than blocking everything.
      if (config && !config.enabled) {
        return res.status(503).json({ message: "This service is temporarily unavailable" });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireModuleEnabled };
