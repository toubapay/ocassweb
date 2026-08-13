const { z } = require("zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { haversineDistanceKm, hasCoordinates } = require("../../utils/geo");
const { getModuleFeeConfig } = require("../../utils/feeConfig");

const createSchema = z.object({
  pickupAddress: z.string().min(3),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(3),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  vehicleType: z.enum(["MOTO", "ECONOMY", "COMFORT"]).default("ECONOMY"),
});

// Falls back to these when an admin hasn't set ModuleConfig("rideshare").
// feeConfig, or has only set some of these fields (see getModuleFeeConfig).
const DEFAULT_FEE_CONFIG = {
  baseFare: 500,
  ratePerKmByVehicle: { MOTO: 150, ECONOMY: 250, COMFORT: 400 },
  // Percent of the fare credited to the rider on completion; the rest is
  // an implicit platform fee (not tracked as its own ledger anywhere yet).
  riderSharePercent: 80,
};

/**
 * Real distance-based pricing when both pickup and dropoff coordinates are
 * available (e.g. from the browser's Geolocation API - there's no
 * geocoding in this app, so a typed address alone never has coordinates).
 * Falls back to the original simulated-distance estimate otherwise, so the
 * flow still works without location permission.
 */
function estimatePrice({ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType }, feeConfig) {
  const ratesByVehicle = feeConfig.ratePerKmByVehicle || DEFAULT_FEE_CONFIG.ratePerKmByVehicle;
  const rate = ratesByVehicle[vehicleType] || ratesByVehicle.ECONOMY;
  if (hasCoordinates(pickupLat, pickupLng, dropoffLat, dropoffLng)) {
    const km = haversineDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    return Math.round(feeConfig.baseFare + km * rate);
  }
  const simulatedKm = 3 + Math.round(Math.random() * 7);
  return feeConfig.baseFare + simulatedKm * rate;
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
    const feeConfig = await getModuleFeeConfig("rideshare", DEFAULT_FEE_CONFIG);
    const ride = await prisma.rideRequest.create({
      data: { ...data, userId: req.user.id, priceEstimate: estimatePrice(data, feeConfig) },
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

/** Unassigned, still-open ride requests any rider can pick up. */
async function listAvailable(req, res, next) {
  try {
    const rides = await prisma.rideRequest.findMany({
      where: { status: "REQUESTED", assignedRiderId: null },
      orderBy: { createdAt: "asc" },
    });
    res.json({ rides });
  } catch (err) {
    next(err);
  }
}

/** Rides the current rider has accepted (active + history). */
async function listMyJobs(req, res, next) {
  try {
    const rides = await prisma.rideRequest.findMany({
      where: { assignedRiderId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ rides });
  } catch (err) {
    next(err);
  }
}

/**
 * Claims an unassigned ride. The conditional updateMany (status +
 * assignedRiderId both still unset) is the concurrency guard - if two
 * riders tap "accept" on the same request at once, only the first write
 * wins; the second gets count 0 and a clean 409.
 */
async function acceptRide(req, res, next) {
  try {
    const result = await prisma.rideRequest.updateMany({
      where: { id: req.params.id, status: "REQUESTED", assignedRiderId: null },
      data: { assignedRiderId: req.user.id, status: "ACCEPTED" },
    });
    if (result.count === 0) {
      return res.status(409).json({ message: "This ride was already taken" });
    }
    const ride = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    res.json({ ride });
  } catch (err) {
    next(err);
  }
}

async function startRide(req, res, next) {
  try {
    const result = await prisma.rideRequest.updateMany({
      where: { id: req.params.id, assignedRiderId: req.user.id, status: "ACCEPTED" },
      data: { status: "IN_PROGRESS" },
    });
    if (result.count === 0) {
      return res.status(400).json({ message: "Ride is not in a state you can start" });
    }
    const ride = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    res.json({ ride });
  } catch (err) {
    next(err);
  }
}

async function completeRide(req, res, next) {
  try {
    const existing = await prisma.rideRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.assignedRiderId !== req.user.id || existing.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "Ride is not in a state you can complete" });
    }
    const ride = await prisma.rideRequest.update({
      where: { id: req.params.id },
      data: { status: "COMPLETED" },
    });
    if (existing.priceEstimate) {
      const feeConfig = await getModuleFeeConfig("rideshare", DEFAULT_FEE_CONFIG);
      await walletService.credit({
        userId: req.user.id,
        amount: Number(existing.priceEstimate) * (feeConfig.riderSharePercent / 100),
        type: "EARNING",
        purpose: "RIDE_REQUEST",
        purposeId: ride.id,
        description: "Ride earnings",
      });
    }
    res.json({ ride });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMyRides,
  createRide,
  cancelRide,
  listAvailable,
  listMyJobs,
  acceptRide,
  startRide,
  completeRide,
};
