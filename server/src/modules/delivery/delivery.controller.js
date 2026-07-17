const { z } = require("zod");
const prisma = require("../../lib/prisma");

const createSchema = z.object({
  pickupAddress: z.string().min(3),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(3),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  packageNote: z.string().optional(),
});

// Flat-rate style estimate for the MVP; replace with a real distance-based
// pricing engine once routing/maps integration lands.
function estimatePrice() {
  return 1500 + Math.round(Math.random() * 2000);
}

async function listMyRequests(req, res, next) {
  try {
    const requests = await prisma.deliveryRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const request = await prisma.deliveryRequest.create({
      data: { ...data, userId: req.user.id, priceEstimate: estimatePrice() },
    });
    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}

async function cancelRequest(req, res, next) {
  try {
    const existing = await prisma.deliveryRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (existing.status !== "REQUESTED") {
      return res.status(400).json({ message: `Cannot cancel a request that is ${existing.status}` });
    }
    const request = await prisma.deliveryRequest.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyRequests, createRequest, cancelRequest };
