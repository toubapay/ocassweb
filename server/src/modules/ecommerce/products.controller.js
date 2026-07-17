const prisma = require("../../lib/prisma");

async function listProducts(req, res, next) {
  try {
    const { category, store, search, page = "1", pageSize = "20" } = req.query;
    const take = Math.min(Number(pageSize) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    let categoryFilter;
    if (category) {
      // A category slug may refer to a parent (e.g. "footwear") which has no
      // products of its own, so resolve it to itself + its children.
      const found = await prisma.category.findUnique({
        where: { slug: String(category) },
        include: { children: true },
      });
      if (found) {
        const ids = found.children.length
          ? found.children.map((c) => c.id)
          : [found.id];
        categoryFilter = { categoryId: { in: ids } };
      } else {
        categoryFilter = { categoryId: "__none__" };
      }
    }

    const where = {
      ...(categoryFilter || {}),
      ...(store ? { store: { slug: store } } : {}),
      ...(search
        ? { name: { contains: String(search), mode: "insensitive" } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, store: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ items, total, page: Number(page), pageSize: take });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        store: true,
        reviews: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct };
