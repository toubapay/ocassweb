const prisma = require("../../lib/prisma");

/**
 * GET /ecommerce/showcase-slides - public, active slides for the Boutique
 * home page's ProductShowcaseCarousel (see AdminShowcaseTab.js for
 * management). Ordered by sortOrder, no schedule/live-window concept
 * (unlike FlashSale) - a slide is simply shown or not.
 */
async function listActiveShowcaseSlides(req, res, next) {
  try {
    const slides = await prisma.showcaseSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ slides });
  } catch (err) {
    next(err);
  }
}

module.exports = { listActiveShowcaseSlides };
