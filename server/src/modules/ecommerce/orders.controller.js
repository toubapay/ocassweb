const { z } = require("zod");
const prisma = require("../../lib/prisma");
const paymentsService = require("../payments/payments.service");

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

    // Cart is intentionally left untouched until payment initiation succeeds
    // below - if PayDunya is unreachable or rejects the request, the order
    // is rolled back and the customer keeps their cart to retry, instead of
    // seeing a bare error with an orphaned order and an emptied cart.
    const order = await prisma.order.create({
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

    let payment;
    try {
      payment = await paymentsService.initiatePayment({
        userId: req.user.id,
        amount: total,
        purpose: "ECOMMERCE_ORDER",
        purposeId: order.id,
        description: `Ocass order #${order.id.slice(0, 8)}`,
      });
    } catch (paymentErr) {
      await prisma.order.delete({ where: { id: order.id } });
      return res.status(502).json({ message: "Could not start payment. Please try again." });
    }

    const [, updatedOrder] = await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { userId: req.user.id } }),
      prisma.order.update({
        where: { id: order.id },
        data: { paymentId: payment.id },
        include: { items: { include: { product: true } } },
      }),
    ]);

    res.status(201).json({ order: updatedOrder, paymentUrl: payment.checkoutUrl });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, createOrder };
