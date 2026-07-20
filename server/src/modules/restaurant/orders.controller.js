const { z } = require("zod");
const prisma = require("../../lib/prisma");

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  note: z.string().optional(),
});

async function listMyOrders(req, res, next) {
  try {
    const orders = await prisma.restaurantOrder.findMany({
      where: { userId: req.user.id },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { items, note } = createOrderSchema.parse(req.body);
    const restaurant = await prisma.restaurant.findUnique({ where: { slug: req.params.slug } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) }, restaurantId: restaurant.id },
    });
    if (menuItems.length !== items.length) {
      return res.status(400).json({ message: "One or more menu items are invalid for this restaurant" });
    }
    const menuItemById = new Map(menuItems.map((m) => [m.id, m]));

    const total = items.reduce((sum, item) => {
      const menuItem = menuItemById.get(item.menuItemId);
      return sum + Number(menuItem.price) * item.quantity;
    }, 0);

    const order = await prisma.restaurantOrder.create({
      data: {
        userId: req.user.id,
        restaurantId: restaurant.id,
        total,
        note,
        items: {
          create: items.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: menuItemById.get(item.menuItemId).price,
          })),
        },
      },
      include: { items: { include: { menuItem: true } }, restaurant: true },
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyOrders, createOrder };
