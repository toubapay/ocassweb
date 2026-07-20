const { z } = require("zod");
const prisma = require("../../lib/prisma");

const toggleSchema = z.object({ productId: z.string().uuid() });

async function listWishlist(req, res, next) {
  try {
    const items = await prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function toggleWishlist(req, res, next) {
  try {
    const { productId } = toggleSchema.parse(req.body);
    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return res.json({ wishlisted: false });
    }

    await prisma.wishlist.create({ data: { userId: req.user.id, productId } });
    res.json({ wishlisted: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listWishlist, toggleWishlist };
