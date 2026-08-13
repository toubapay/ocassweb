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
  packageNote: z.string().optional(),
});

// Falls back to these when an admin hasn't set ModuleConfig("delivery").
// feeConfig, or has only set some of these fields (see getModuleFeeConfig).
const DEFAULT_FEE_CONFIG = {
  baseFare: 500,
  ratePerKm: 300,
  // Percent of the fare credited to the delivery agent on completion; the
  // rest is an implicit platform fee (not tracked as its own ledger yet).
  agentSharePercent: 80,
};

/**
 * Real distance-based pricing when both pickup and dropoff coordinates are
 * available (e.g. from the browser's Geolocation API - there's no
 * geocoding in this app, so a typed address alone never has coordinates).
 * Falls back to a flat-ish random estimate otherwise, so the flow still
 * works without location permission.
 */
function estimatePrice({ pickupLat, pickupLng, dropoffLat, dropoffLng }, feeConfig) {
  if (hasCoordinates(pickupLat, pickupLng, dropoffLat, dropoffLng)) {
    const km = haversineDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    return Math.round(feeConfig.baseFare + km * feeConfig.ratePerKm);
  }
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
    const feeConfig = await getModuleFeeConfig("delivery", DEFAULT_FEE_CONFIG);
    const request = await prisma.deliveryRequest.create({
      data: { ...data, userId: req.user.id, priceEstimate: estimatePrice(data, feeConfig) },
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

/** Unassigned, still-open requests any delivery agent can pick up. */
async function listAvailable(req, res, next) {
  try {
    const requests = await prisma.deliveryRequest.findMany({
      where: { status: "REQUESTED", assignedAgentId: null },
      orderBy: { createdAt: "asc" },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

/** Requests the current agent has accepted (active + history). */
async function listMyJobs(req, res, next) {
  try {
    const requests = await prisma.deliveryRequest.findMany({
      where: { assignedAgentId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

/**
 * Claims an unassigned request. The conditional updateMany (status +
 * assignedAgentId both still unset) is the concurrency guard - if two
 * agents tap "accept" on the same job at once, only the first write wins;
 * the second gets count 0 and a clean 409 instead of silently overwriting
 * the first agent's claim.
 */
async function acceptRequest(req, res, next) {
  try {
    const result = await prisma.deliveryRequest.updateMany({
      where: { id: req.params.id, status: "REQUESTED", assignedAgentId: null },
      data: { assignedAgentId: req.user.id, status: "ACCEPTED" },
    });
    if (result.count === 0) {
      return res.status(409).json({ message: "This job was already taken" });
    }
    const request = await prisma.deliveryRequest.findUnique({ where: { id: req.params.id } });
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

async function markPickedUp(req, res, next) {
  try {
    const result = await prisma.deliveryRequest.updateMany({
      where: { id: req.params.id, assignedAgentId: req.user.id, status: "ACCEPTED" },
      data: { status: "PICKED_UP" },
    });
    if (result.count === 0) {
      return res.status(400).json({ message: "Job is not in a state you can mark picked up" });
    }
    const request = await prisma.deliveryRequest.findUnique({ where: { id: req.params.id } });
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

async function markDelivered(req, res, next) {
  try {
    const existing = await prisma.deliveryRequest.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.assignedAgentId !== req.user.id || existing.status !== "PICKED_UP") {
      return res.status(400).json({ message: "Job is not in a state you can mark delivered" });
    }
    const request = await prisma.deliveryRequest.update({
      where: { id: req.params.id },
      data: { status: "DELIVERED" },
    });
    if (existing.priceEstimate) {
      const feeConfig = await getModuleFeeConfig("delivery", DEFAULT_FEE_CONFIG);
      await walletService.credit({
        userId: req.user.id,
        amount: Number(existing.priceEstimate) * (feeConfig.agentSharePercent / 100),
        type: "EARNING",
        purpose: "DELIVERY_REQUEST",
        purposeId: request.id,
        description: "Delivery earnings",
      });
    }
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMyRequests,
  createRequest,
  cancelRequest,
  listAvailable,
  listMyJobs,
  acceptRequest,
  markPickedUp,
  markDelivered,
};
