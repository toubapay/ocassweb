const { z } = require("zod");
const prisma = require("../../lib/prisma");

const createSchema = z.object({
  pickupAddress: z.string().min(3),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(3),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  vehicleType: z.enum(["MOTO", "ECONOMY", "COMFORT"]).default("ECONOMY"),
});

const RATE_PER_KM = { MOTO: 150, ECONOMY: 250, COMFORT: 400 };

function estimatePrice(vehicleType) {
  const base = 500;
  const simulatedKm = 3 + Math.round(Math.random() * 7);
  return base + simulatedKm * (RATE_PER_KM[vehicleType] || RATE_PER_KM.ECONOMY);
}

async function listMyRides(req, res, next) {
  try {
    const rides = await prisma.rideRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ rides });
  } catch (err) {
    next(err);
  }
}

async function createRide(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const ride = await prisma.rideRequest.create({
      data: {
        ...data,
        userId: req.user.id,
        priceEstimate: estimatePrice(data.vehicleType),
      },
    });
    res.status(201).json({ ride });
  } catch (err) {
    next(err);
  }
}

async function cancelRide(req, res, next) {
  try {
    const existing = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Ride not found" });
    }
    if (existing.status !== "REQUESTED") {
      return res.status(400).json({ message: `Cannot cancel a ride that is ${existing.status}` });
    }
    const ride = await prisma.rideRequest.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
    });
    res.json({ ride });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyRides, createRide, cancelRide };
