const { z } = require("zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { hasCoordinates } = require("../../utils/geo");
const { roadDistanceKm } = require("../../utils/distanceMatrix");
const { getModuleFeeConfig, clampFee } = require("../../utils/feeConfig");

const createSchema = z.object({
  // Optional - falls back to the requester's own name/phone at creation
  // time (see createRequest) when sending on their own behalf.
  senderName: z.string().min(2).optional(),
  senderPhone: z.string().min(6).optional(),
  pickupAddress: z.string().min(3),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  // Required - unlike the sender, there's no account to fall back to for
  // whoever's on the other end of the handoff.
  receiverName: z.string().min(2),
  receiverPhone: z.string().min(6),
  dropoffAddress: z.string().min(3),
  dropoffLat: z.number().optional(),
  dropoffLng: z.number().optional(),
  packageNote: z.string().optional(),
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const feeQuoteSchema = z.object({
  pickupLat: z.coerce.number(),
  pickupLng: z.coerce.number(),
  dropoffLat: z.coerce.number(),
  dropoffLng: z.coerce.number(),
});

// Falls back to these when an admin hasn't set ModuleConfig("delivery").
// feeConfig, or has only set some of these fields (see getModuleFeeConfig).
const DEFAULT_FEE_CONFIG = {
  // FIXED: every delivery costs fixedFee regardless of distance. PER_KM:
  // baseFare + distanceKm * ratePerKm. Admin-selectable (admin > Modules).
  feeType: "PER_KM",
  fixedFee: 1500,
  baseFare: 500,
  ratePerKm: 300,
  // Optional clamp applied to the computed price either way - undefined
  // means "no bound on this side" (see clampFee).
  minFee: undefined,
  maxFee: undefined,
  // Percent of the fare credited to the delivery agent on completion; the
  // rest is an implicit platform fee (not tracked as its own ledger yet).
  agentSharePercent: 80,
};

function priceForDistance(distanceKm, feeConfig) {
  const raw =
    feeConfig.feeType === "FIXED" ? feeConfig.fixedFee : feeConfig.baseFare + distanceKm * feeConfig.ratePerKm;
  return Math.round(clampFee(raw, feeConfig));
}

/**
 * Real distance-based pricing when both pickup and dropoff coordinates are
 * available - from the browser's Geolocation API, or from a real Places
 * suggestion picked in AddressAutocompleteField.js, which resolves to a
 * geocoded lat/lng client-side before the request ever reaches here (this
 * backend never geocodes an address itself). Falls back to a flat-ish
 * random estimate (and no distance) otherwise, so the flow still works
 * without location permission. roadDistanceKm() uses Google's Distance
 * Matrix API when GOOGLE_MAPS_SERVER_KEY is configured, falling back to
 * Haversine straight-line distance itself on any failure.
 */
async function computeQuote({ pickupLat, pickupLng, dropoffLat, dropoffLng }, feeConfig) {
  if (hasCoordinates(pickupLat, pickupLng, dropoffLat, dropoffLng)) {
    const distanceKm = await roadDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
    return { distanceKm, priceEstimate: priceForDistance(distanceKm, feeConfig) };
  }
  return { distanceKm: null, priceEstimate: 1500 + Math.round(Math.random() * 2000) };
}

/**
 * Live distance + price preview for the request form, called as soon as
 * both pickup and dropoff have real coordinates (a picked Places
 * suggestion or "use my location") - lets the customer see cost before
 * submitting, rather than only finding out after creating the request.
 * Public (no requireAuth) so a guest can preview before logging in, same
 * as mobile's GET /mobile/fee-quote.
 */
async function getFeeQuote(req, res, next) {
  try {
    const data = feeQuoteSchema.parse(req.query);
    const feeConfig = await getModuleFeeConfig("delivery", DEFAULT_FEE_CONFIG);
    const quote = await computeQuote(data, feeConfig);
    res.json(quote);
  } catch (err) {
    next(err);
  }
}

async function listMyRequests(req, res, next) {
  try {
    const requests = await prisma.deliveryRequest.findMany({
      where: { userId: req.user.id },
      include: { assignedAgent: { select: { id: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

/** Single request, for the customer-facing live tracking page to poll. */
async function getRequest(req, res, next) {
  try {
    const request = await prisma.deliveryRequest.findUnique({
      where: { id: req.params.id },
      include: { assignedAgent: { select: { id: true, name: true, phone: true } } },
    });
    if (!request || request.userId !== req.user.id) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

async function createRequest(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const feeConfig = await getModuleFeeConfig("delivery", DEFAULT_FEE_CONFIG);
    const quote = await computeQuote(data, feeConfig);
    const request = await prisma.deliveryRequest.create({
      data: {
        ...data,
        // Sending on your own behalf: default sender contact to the
        // requester's own account rather than requiring them to retype it.
        senderName: data.senderName || req.user.name || undefined,
        senderPhone: data.senderPhone || req.user.phone,
        userId: req.user.id,
        distanceKm: quote.distanceKm,
        priceEstimate: quote.priceEstimate,
      },
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
// Sender/receiver phone numbers are withheld until an agent actually
// accepts a job - browsing the open job board shouldn't expose contact
// details for people who haven't agreed to anything yet. Names stay
// visible (useful context for deciding whether to accept); listMyJobs
// below returns full rows once the agent has committed.
const AVAILABLE_JOB_FIELDS = {
  id: true,
  senderName: true,
  pickupAddress: true,
  pickupLat: true,
  pickupLng: true,
  receiverName: true,
  dropoffAddress: true,
  dropoffLat: true,
  dropoffLng: true,
  packageNote: true,
  priceEstimate: true,
  status: true,
  createdAt: true,
};

async function listAvailable(req, res, next) {
  try {
    const requests = await prisma.deliveryRequest.findMany({
      where: { status: "REQUESTED", assignedAgentId: null },
      select: AVAILABLE_JOB_FIELDS,
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
 * the first agent's claim. The self-request check above it is a separate,
 * non-racy guard (ownership never changes after creation, unlike the
 * accept race) - without it, a user who is both a customer and a
 * DELIVERY_AGENT could accept and "fulfill" their own request.
 */
async function acceptRequest(req, res, next) {
  try {
    const existing = await prisma.deliveryRequest.findUnique({ where: { id: req.params.id } });
    if (existing?.userId === req.user.id) {
      return res.status(400).json({ message: "You can't accept your own delivery request" });
    }
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
    // If this delivery job came from a restaurant order (see
    // dispatchForDelivery in restaurant/orders.controller.js), the agent
    // confirming the handoff here is also what makes that order DELIVERED -
    // it's never set any other way, so "delivered" always reflects a real
    // completed dropoff, not just the restaurant marking it ready.
    await prisma.restaurantOrder.updateMany({
      where: { deliveryRequestId: request.id },
      data: { status: "DELIVERED" },
    });
    res.json({ request });
  } catch (err) {
    next(err);
  }
}

/**
 * Agent's live GPS ping while a job is in progress - powers the customer's
 * tracking map (see getRequest above). Restricted to ACCEPTED/PICKED_UP so
 * a finished or cancelled job stops accepting updates, but the last known
 * position is left in place rather than cleared (see schema.prisma).
 */
async function updateLocation(req, res, next) {
  try {
    const { lat, lng } = locationSchema.parse(req.body);
    const result = await prisma.deliveryRequest.updateMany({
      where: {
        id: req.params.id,
        assignedAgentId: req.user.id,
        status: { in: ["ACCEPTED", "PICKED_UP"] },
      },
      data: { agentLat: lat, agentLng: lng, agentLocationAt: new Date() },
    });
    if (result.count === 0) {
      return res.status(400).json({ message: "Job is not active for location updates" });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMyRequests,
  getRequest,
  createRequest,
  cancelRequest,
  getFeeQuote,
  listAvailable,
  listMyJobs,
  acceptRequest,
  markPickedUp,
  markDelivered,
  updateLocation,
};
