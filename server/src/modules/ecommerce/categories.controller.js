const prisma = require("../../lib/prisma");

/**
 * Public category browsing, shared across every module that has
 * categories (ecommerce products, restaurant menu items, ...) - scoped by
 * `moduleKey` so each module only ever sees its own list. Mounted at
 * GET /ecommerce/categories (moduleKey defaults to "ecommerce" here for
 * that module's own callers) and reused as-is by the restaurant module's
 * GET /restaurants/categories (see restaurant.routes.js).
 */
function listCategoriesForModule(defaultModuleKey) {
  return async function listCategories(req, res, next) {
    try {
      const moduleKey = req.query.moduleKey || defaultModuleKey;
      const categories = await prisma.category.findMany({
        where: { moduleKey, parentId: null, isActive: true },
        include: { children: { where: { isActive: true }, orderBy: { name: "asc" } } },
        orderBy: { name: "asc" },
      });
      res.json({ categories });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { listCategoriesForModule, listCategories: listCategoriesForModule("ecommerce") };
