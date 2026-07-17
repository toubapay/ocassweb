const { z } = require("zod");
const prisma = require("../../lib/prisma");

const createOrderSchema = z.object({
  deliveryAddressId: z.string().uuid().optional(),
});

async function listOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: { include: { product: true } }, deliveryAddress: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

async function createOrder(req, res, next) {
  try {
    const { deliveryAddressId } = createOrderSchema.parse(req.body);

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const total = cartItems.reduce((sum, item) => {
      const unitPrice = item.product.discountPrice ?? item.product.price;
      return sum + Number(unitPrice) * item.quantity;
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          deliveryAddressId,
          total,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.discountPrice ?? item.product.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });
      await tx.cartItem.deleteMany({ where: { userId: req.user.id } });
      return created;
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, createOrder };
