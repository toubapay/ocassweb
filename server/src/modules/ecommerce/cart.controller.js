const { z } = require("zod");
const prisma = require("../../lib/prisma");

const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

const updateItemSchema = z.object({
  quantity: z.number().int().positive(),
});

async function getCart(req, res, next) {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.id },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const { productId, quantity } = addItemSchema.parse(req.body);
    const item = await prisma.cartItem.upsert({
      where: { userId_productId: { userId: req.user.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { userId: req.user.id, productId, quantity },
      include: { product: true },
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

async function updateItem(req, res, next) {
  try {
    const { quantity } = updateItemSchema.parse(req.body);
    const existing = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    const item = await prisma.cartItem.update({
      where: { id: req.params.id },
      data: { quantity },
      include: { product: true },
    });
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    const existing = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    await prisma.cartItem.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addItem, updateItem, removeItem };
