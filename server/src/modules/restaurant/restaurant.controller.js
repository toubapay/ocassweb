const prisma = require("../../lib/prisma");

async function listRestaurants(req, res, next) {
  try {
    const { search } = req.query;
    const restaurants = await prisma.restaurant.findMany({
      where: search
        ? { name: { contains: String(search), mode: "insensitive" } }
        : undefined,
      orderBy: { rating: "desc" },
    });
    res.json({ restaurants });
  } catch (err) {
    next(err);
  }
}

async function getRestaurant(req, res, next) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: req.params.slug },
      include: { menuItems: true },
    });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRestaurants, getRestaurant };
