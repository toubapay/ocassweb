const prisma = require("../../lib/prisma");

async function listCategories(req, res, next) {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories };
