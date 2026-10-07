const { z } = require("zod");
const prisma = require("../../lib/prisma");

/**
 * A customer's saved delivery addresses.
 *
 * The `Address` model has existed since the first schema and `Order`
 * has always had a nullable `deliveryAddressId`, but nothing ever wrote
 * one: there were no routes, so every order was placed without an
 * address. That was invisible until a vendor tried to hand an order to
 * the couriers - dispatchForDelivery needs a dropoff point, so it refused
 * every real order with "This order has no delivery address", and the
 * whole vendor delivery path was unreachable.
 *
 * Coordinates are optional but matter: delivery pricing is distance-based
 * (see computeQuote in delivery.controller.js), so an address picked from
 * Places autocomplete - which carries lat/lng - gets a real fare, and a
 * hand-typed one falls back the same way the rest of the module does
 * rather than being rejected.
 */
const addressSchema = z.object({
  label: z.string().min(1).max(40),
  line1: z.string().min(3),
  city: z.string().min(2),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
});

async function listAddresses(req, res, next) {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ addresses });
  } catch (err) {
    next(err);
  }
}

/**
 * The first address a customer saves becomes their default whether they
 * asked for it or not - otherwise checkout's "deliver to" would start
 * empty for someone who has exactly one address, which is the common
 * case.
 */
async function createAddress(req, res, next) {
  try {
    const data = addressSchema.parse(req.body);
    const count = await prisma.address.count({ where: { userId: req.user.id } });
    const isDefault = data.isDefault ?? count === 0;

    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId: req.user.id },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: { ...data, isDefault, userId: req.user.id },
      });
    });
    res.status(201).json({ address });
  } catch (err) {
    next(err);
  }
}

async function updateAddress(req, res, next) {
  try {
    const data = addressSchema.partial().parse(req.body);
    const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Address not found" });
    }
    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id: req.params.id }, data });
    });
    res.json({ address });
  } catch (err) {
    next(err);
  }
}

/**
 * Deleted, not soft-deleted - but only when no order points at it.
 * `Order.deliveryAddressId` is what a courier was sent to and what a
 * receipt shows, so removing one out from under a past order would
 * rewrite where last month's parcel actually went. An address in use is
 * refused with a reason rather than silently kept.
 */
async function deleteAddress(req, res, next) {
  try {
    const existing = await prisma.address.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Address not found" });
    }
    const used = await prisma.order.count({ where: { deliveryAddressId: req.params.id } });
    if (used > 0) {
      return res.status(409).json({
        message: "This address is on past orders and can't be deleted",
        reason: "in_use",
      });
    }
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAddresses, createAddress, updateAddress, deleteAddress };
