const prisma = require("../../lib/prisma");
const { isFlashSaleLive, getFlashSaleWindow } = require("../../utils/flashSaleSchedule");

const PRODUCT_INCLUDE = { category: true, store: true };

/**
 * GET /ecommerce/flash-sales/active?placement=home|ecommerce - the public
 * endpoint pages/index.js (main Home Screen) and pages/ecommerce/index.js
 * (discover page) poll to decide whether to render a flash sale section at
 * all. Evaluates every campaign enabled for that placement against its
 * recurring schedule (see flashSaleSchedule.js) and returns the first live
 * one, most-recently-created first if more than one currently overlaps -
 * admins are expected to keep at most one active per placement, but this
 * keeps the response well-defined if they don't. Returns
 * `{ flashSale: null }` (never an error) when nothing is live right now.
 */
async function getActiveFlashSale(req, res, next) {
  try {
    const placementField = req.query.placement === "home" ? "onHomeScreen" : "onEcommerceHome";
    const candidates = await prisma.flashSale.findMany({
      where: { isActive: true, [placementField]: true },
      include: { products: { where: { isActive: true }, include: PRODUCT_INCLUDE } },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const live = candidates.find((sale) => isFlashSaleLive(sale, now));
    if (!live) return res.json({ flashSale: null });

    const products =
      live.selectionMode === "MANUAL"
        ? live.products
        : await prisma.product.findMany({
            where: { isActive: true, discountPercent: { not: null }, store: { isActive: true } },
            include: PRODUCT_INCLUDE,
            orderBy: { discountPercent: "desc" },
            take: 10,
          });

    const { end } = getFlashSaleWindow(live, now);
    res.json({
      flashSale: {
        id: live.id,
        title: live.title,
        endsAt: end.toISOString(),
        products,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getActiveFlashSale };
