const prisma = require("../../lib/prisma");

/**
 * GET .../showcase-slides - public, active slides for a module's home-page
 * ProductShowcaseCarousel (see AdminShowcaseTab.js for management), scoped
 * by `moduleKey` so each module only ever sees its own list. Mounted at
 * GET /ecommerce/showcase-slides (moduleKey defaults to "ecommerce" here
 * for that module's own callers) and reused as-is by the restaurant
 * module's GET /restaurants/showcase-slides (see restaurant.routes.js).
 * Ordered by sortOrder, no schedule/live-window concept (unlike
 * FlashSale) - a slide is simply shown or not.
 */
function listShowcaseSlidesForModule(defaultModuleKey) {
  return async function listActiveShowcaseSlides(req, res, next) {
    try {
      const moduleKey = req.query.moduleKey || defaultModuleKey;
      const slides = await prisma.showcaseSlide.findMany({
        where: { moduleKey, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      res.json({ slides });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  listShowcaseSlidesForModule,
  listActiveShowcaseSlides: listShowcaseSlidesForModule("ecommerce"),
};
