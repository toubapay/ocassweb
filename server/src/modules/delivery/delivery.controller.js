const { z } = require("zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { haversineDistanceKm, hasCoordinates } = require("../../utils/geo");

const createSchema = z.object({
  pickupAddress: z.string().min(3),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  dropoffAddress: z.string().min(3),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  packageNote: z.string().optional(),
});

const BASE_FARE = 500;
const RATE_PER_KM = 300;
// Share of the fare credited to the delivery agent on completion; the rest
// is an implicit platform fee (not tracked as its own ledger anywhere yet).
const AGENT_SHARE = 0.8;

/**
 * Real distance-based pricing when both pickup and dropoff coordinates are
 * available (e.g. from the browser's Geolocation API - there's no
 * geocoding in this app, so a typed address alone never has coordinates).
 * Falls back to the original flat-ish random estimate otherwise, so the
 * flow still works without location permission.
 */
function estimatePrice({ pickupLat, pickupLng, dropoffLat, dropoffLng }) {
  if (hasCoordinates(pickupLat, pickupLng, dropoffLat, dropoffLng)) {
    const km = haversineDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    return Math.round(BASE_FARE + km * RATE_PER_KM);
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
    const request = await prisma.deliveryRequest.create({
      data: { ...data, userId: req.user.id, priceEstimate: estimatePrice(data) },
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
      await walletService.credit({
        userId: req.user.id,
        amount: Number(existing.priceEstimate) * AGENT_SHARE,
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
