const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { roadDistanceKm } = require("../../utils/distanceMatrix");
const { getModuleFeeConfig, clampFee } = require("../../utils/feeConfig");
const { hasCoordinates } = require("../../utils/geo");

// Falls back to these when an admin hasn't set ModuleConfig("anando").
// feeConfig, or has only set some of these fields (see getModuleFeeConfig).
// Unlike delivery/rideshare, Anando's price is normally driver-set
// (RidePosting.pricePerSeat) rather than platform-computed - this config
// only feeds the optional "suggest a price" quote below and the min/max
// clamp applied to whatever the driver enters in createPosting.
const DEFAULT_FEE_CONFIG = {
  feeType: "PER_KM",
  fixedFee: 1000,
  baseFare: 300,
  ratePerKm: 100,
  minFee: undefined,
  maxFee: undefined,
  // Percent of pricePerSeat credited to the driver when a booking is paid
  // (WALLET immediately, PAYDUNYA once payments.service confirms it); the
  // rest is an implicit platform fee, same accounting as delivery's
  // agentSharePercent / rideshare's riderSharePercent.
  driverSharePercent: 85,
};

async function getAnandoFeeConfig() {
  return getModuleFeeConfig("anando", DEFAULT_FEE_CONFIG);
}

/** Clamps a driver-entered pricePerSeat into the admin's [minFee, maxFee], if set. */
function clampPricePerSeat(pricePerSeat, feeConfig) {
  if (pricePerSeat == null) return pricePerSeat;
  return clampFee(pricePerSeat, feeConfig);
}

/**
 * Distance-based suggested price per seat, for a "Suggest price" action on
 * the posting form - purely advisory, the driver can still enter (or
 * leave blank) whatever they want. Mirrors delivery's computeQuote.
 */
async function suggestPrice({ originLat, originLng, destinationLat, destinationLng }, feeConfig) {
  if (!hasCoordinates(originLat, originLng, destinationLat, destinationLng)) {
    return { distanceKm: null, suggestedPrice: null };
  }
  const distanceKm = await roadDistanceKm(originLat, originLng, destinationLat, destinationLng);
  const raw = feeConfig.feeType === "FIXED" ? feeConfig.fixedFee : feeConfig.baseFare + distanceKm * feeConfig.ratePerKm;
  return { distanceKm, suggestedPrice: Math.round(clampFee(raw, feeConfig)) };
}

/**
 * Credits the driver their share of a paid booking. Called once a booking
 * actually has money behind it - immediately after a successful WALLET
 * debit (bookSeat), or once PayDunya confirms payment
 * (payments.service.js's ANANDO_BOOKING case) - never for CASH, which
 * settles off-platform. No-op if the posting has no listed price (a CASH-
 * only posting can still take a WALLET booking of 0 total, in which case
 * there's nothing to share).
 *
 * Known limitation: if the passenger later cancels a paid booking, they're
 * refunded (see cancelBooking/cancelPosting) but the driver's share paid
 * out here isn't clawed back - the same simplification this app already
 * accepts elsewhere (no reversal ledger for any module's earnings yet).
 */
async function payoutDriverForBooking(bookingId) {
  const booking = await prisma.rideBooking.findUnique({
    where: { id: bookingId },
    include: { posting: true },
  });
  if (!booking || !booking.posting.pricePerSeat) return;

  const feeConfig = await getAnandoFeeConfig();
  const total = Number(booking.posting.pricePerSeat) * booking.seatsBooked;
  const amount = Math.round(total * (feeConfig.driverSharePercent / 100) * 100) / 100;
  if (amount <= 0) return;

  await walletService.credit({
    userId: booking.posting.driverId,
    amount,
    type: "EARNING",
    purpose: "ANANDO_BOOKING",
    purposeId: booking.id,
    description: "Anando driver earnings",
  });
}

module.exports = {
  DEFAULT_FEE_CONFIG,
  getAnandoFeeConfig,
  clampPricePerSeat,
  suggestPrice,
  payoutDriverForBooking,
};
