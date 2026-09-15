const prisma = require("../../lib/prisma");

const HOME_BANNER_KEY = "main";

/**
 * GET /api/home/banner - the single admin-editable promo card on the main
 * Home Screen (see AdminHomeBannerTab.js for management). Not gated
 * behind any requireModuleEnabled check, unlike every other module route -
 * the Home Screen itself is never a togglable module, so this must stay
 * reachable regardless of which business modules are enabled. Resolves to
 * `{ banner: null }` when the admin has toggled it off, so the client can
 * just conditionally render without special-casing an inactive banner.
 */
async function getHomeBanner(req, res, next) {
  try {
    const banner = await prisma.homeBanner.findUnique({ where: { key: HOME_BANNER_KEY } });
    res.json({ banner: banner?.isActive ? banner : null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHomeBanner };
