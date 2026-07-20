const { z } = require("zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const paymentsService = require("../payments/payments.service");
const notificationsService = require("../notifications/notifications.service");

const DRIVER_SELECT = { id: true, name: true, phone: true };

const createPostingSchema = z.object({
  originAddress: z.string().min(3),
  originLat: z.number().optional(),
  originLng: z.number().optional(),
  destinationAddress: z.string().min(3),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  isInstant: z.boolean().default(false),
  // Required unless isInstant - validated by hand below since its
  // presence depends on another field (zod's .refine runs after this
  // parse, which is fine, but a plain check reads clearer here).
  departureAt: z.string().datetime().optional(),
  seatsTotal: z.number().int().min(1).max(8),
  pricePerSeat: z.number().positive().nullable().optional(),
  note: z.string().max(300).optional(),
});

async function createPosting(req, res, next) {
  try {
    const data = createPostingSchema.parse(req.body);

    let departureAt;
    if (data.isInstant) {
      // BlaBlaCar-style "instant" availability: the driver is leaving
      // right now, not at a pre-chosen future time.
      departureAt = new Date();
    } else {
      if (!data.departureAt) {
        return res
          .status(400)
          .json({ message: "Choose a departure time, or mark this ride as instant" });
      }
      departureAt = new Date(data.departureAt);
      if (departureAt.getTime() < Date.now()) {
        return res.status(400).json({ message: "Departure time must be in the future" });
      }
    }

    const posting = await prisma.ridePosting.create({
      data: {
        driverId: req.user.id,
        originAddress: data.originAddress,
        originLat: data.originLat,
        originLng: data.originLng,
        destinationAddress: data.destinationAddress,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        departureAt,
        isInstant: data.isInstant,
        seatsTotal: data.seatsTotal,
        seatsAvailable: data.seatsTotal,
        pricePerSeat: data.pricePerSeat ?? null,
        note: data.note,
      },
    });
    res.status(201).json({ posting });
  } catch (err) {
    next(err);
  }
}

/** Open postings with seats left, excluding the caller's own - browsing
 * your own listing has nowhere useful to go since you can't book it. */
async function listAvailable(req, res, next) {
  try {
    const postings = await prisma.ridePosting.findMany({
      where: { status: "OPEN", seatsAvailable: { gt: 0 }, driverId: { not: req.user.id } },
      include: { driver: { select: DRIVER_SELECT } },
      orderBy: [{ isInstant: "desc" }, { departureAt: "asc" }],
    });
    res.json({ postings });
  } catch (err) {
    next(err);
  }
}

async function listMyPostings(req, res, next) {
  try {
    const postings = await prisma.ridePosting.findMany({
      where: { driverId: req.user.id },
      include: {
        bookings: {
          where: { status: "CONFIRMED" },
          include: { passenger: { select: DRIVER_SELECT } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ postings });
  } catch (err) {
    next(err);
  }
}

async function listMyBookings(req, res, next) {
  try {
    const bookings = await prisma.rideBooking.findMany({
      where: { passengerId: req.user.id },
      include: { posting: { include: { driver: { select: DRIVER_SELECT } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

const bookSeatSchema = z.object({
  seatsBooked: z.number().int().min(1).max(8).default(1),
  paymentMethod: z.enum(["CASH", "WALLET", "PAYDUNYA"]).default("CASH"),
});

/**
 * Claims seats on a posting. The concurrency guard is a conditional
 * `updateMany` decrementing seatsAvailable only if it's still >= what's
 * being claimed - the same shape as acceptDeliveryJob/acceptRide's
 * single-winner guard, just with a range check instead of an equality
 * check, since more than one booking can each partially succeed against
 * the same posting.
 */
async function bookSeat(req, res, next) {
  try {
    const { seatsBooked, paymentMethod } = bookSeatSchema.parse(req.body);
    const posting = await prisma.ridePosting.findUnique({ where: { id: req.params.id } });
    if (!posting) return res.status(404).json({ message: "Ride not found" });
    if (posting.driverId === req.user.id) {
      return res.status(400).json({ message: "You can't book a seat on your own ride" });
    }
    if (!posting.pricePerSeat && paymentMethod !== "CASH") {
      return res.status(400).json({ message: "This ride has no listed price - book with cash" });
    }

    const claim = await prisma.ridePosting.updateMany({
      where: { id: posting.id, status: "OPEN", seatsAvailable: { gte: seatsBooked } },
      data: { seatsAvailable: { decrement: seatsBooked } },
    });
    if (claim.count === 0) {
      return res.status(409).json({ message: "Not enough seats available" });
    }
    // Flip to FULL only if that claim used the last seats, and only from
    // OPEN - guarded so it can't resurrect a posting the driver cancelled
    // in the same instant.
    await prisma.ridePosting.updateMany({
      where: { id: posting.id, status: "OPEN", seatsAvailable: 0 },
      data: { status: "FULL" },
    });

    const total = posting.pricePerSeat ? Number(posting.pricePerSeat) * seatsBooked : 0;
    const booking = await prisma.rideBooking.create({
      data: { postingId: posting.id, passengerId: req.user.id, seatsBooked, paymentMethod },
    });

    // Seats were already claimed above - if payment now fails, give them
    // back rather than leaving a phantom hold, same rollback discipline as
    // ecommerce/wallet checkout elsewhere in this app.
    async function releaseSeats() {
      await prisma.ridePosting.updateMany({
        where: { id: posting.id, status: "FULL" },
        data: { status: "OPEN" },
      });
      await prisma.ridePosting.update({
        where: { id: posting.id },
        data: { seatsAvailable: { increment: seatsBooked } },
      });
      await prisma.rideBooking.delete({ where: { id: booking.id } });
    }

    let paymentUrl = null;
    if (paymentMethod === "WALLET" && total > 0) {
      try {
        await walletService.debit({
          userId: req.user.id,
          amount: total,
          purpose: "ANANDO_BOOKING",
          purposeId: booking.id,
          description: `Anando: ${posting.originAddress} → ${posting.destinationAddress}`,
        });
        await prisma.rideBooking.update({ where: { id: booking.id }, data: { paid: true } });
      } catch (debitErr) {
        await releaseSeats();
        if (debitErr instanceof walletService.InsufficientBalanceError) {
          return res.status(400).json({ message: "Insufficient wallet balance" });
        }
        return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
      }
    } else if (paymentMethod === "PAYDUNYA" && total > 0) {
      try {
        const payment = await paymentsService.initiatePayment({
          userId: req.user.id,
          amount: total,
          purpose: "ANANDO_BOOKING",
          purposeId: booking.id,
          description: `Anando: ${posting.originAddress} → ${posting.destinationAddress}`,
        });
        paymentUrl = payment.checkoutUrl;
      } catch (paymentErr) {
        await releaseSeats();
        return res.status(502).json({ message: "Could not start payment. Please try again." });
      }
    }

    notificationsService
      .notify({
        userId: posting.driverId,
        type: "ANANDO_NEW_BOOKING",
        title: "Nouvelle réservation Anando",
        body: `${req.user.name || req.user.phone} a réservé ${seatsBooked} place(s) sur votre trajet.`,
        data: { postingId: posting.id, bookingId: booking.id },
      })
      .catch(() => {});

    const full = await prisma.rideBooking.findUnique({ where: { id: booking.id } });
    res.status(201).json({ booking: full, paymentUrl });
  } catch (err) {
    next(err);
  }
}

async function cancelBooking(req, res, next) {
  try {
    const booking = await prisma.rideBooking.findUnique({
      where: { id: req.params.id },
      include: { posting: true },
    });
    if (!booking || booking.passengerId !== req.user.id) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({ message: `Cannot cancel a booking that is ${booking.status}` });
    }

    await prisma.$transaction([
      prisma.rideBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED" } }),
      prisma.ridePosting.update({
        where: { id: booking.postingId },
        data: { seatsAvailable: { increment: booking.seatsBooked } },
      }),
    ]);
    // Re-open the posting if it had filled up - guarded so it can't
    // resurrect a posting the driver separately cancelled.
    await prisma.ridePosting.updateMany({
      where: { id: booking.postingId, status: "FULL" },
      data: { status: "OPEN" },
    });

    if (booking.paymentMethod === "WALLET" && booking.paid && booking.posting.pricePerSeat) {
      await walletService.credit({
        userId: req.user.id,
        amount: Number(booking.posting.pricePerSeat) * booking.seatsBooked,
        type: "REFUND",
        purpose: "ANANDO_BOOKING",
        purposeId: booking.id,
        description: "Anando booking refund",
      });
    }

    notificationsService
      .notify({
        userId: booking.posting.driverId,
        type: "ANANDO_BOOKING_CANCELLED",
        title: "Réservation annulée",
        body: "Un passager a annulé sa réservation sur votre trajet Anando.",
        data: { postingId: booking.postingId, bookingId: booking.id },
      })
      .catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function cancelPosting(req, res, next) {
  try {
    const posting = await prisma.ridePosting.findUnique({
      where: { id: req.params.id },
      include: { bookings: { where: { status: "CONFIRMED" } } },
    });
    if (!posting || posting.driverId !== req.user.id) {
      return res.status(404).json({ message: "Ride not found" });
    }
    if (posting.status === "CANCELLED" || posting.status === "DEPARTED") {
      return res.status(400).json({ message: `Cannot cancel a ride that is ${posting.status}` });
    }

    await prisma.$transaction([
      prisma.ridePosting.update({ where: { id: posting.id }, data: { status: "CANCELLED" } }),
      prisma.rideBooking.updateMany({
        where: { postingId: posting.id, status: "CONFIRMED" },
        data: { status: "CANCELLED" },
      }),
    ]);

    for (const booking of posting.bookings) {
      if (booking.paymentMethod === "WALLET" && booking.paid && posting.pricePerSeat) {
        await walletService.credit({
          userId: booking.passengerId,
          amount: Number(posting.pricePerSeat) * booking.seatsBooked,
          type: "REFUND",
          purpose: "ANANDO_BOOKING",
          purposeId: booking.id,
          description: "Anando ride cancelled by driver",
        });
      }
      notificationsService
        .notify({
          userId: booking.passengerId,
          type: "ANANDO_POSTING_CANCELLED",
          title: "Trajet annulé",
          body: "Le conducteur a annulé ce trajet Anando.",
          data: { postingId: posting.id },
        })
        .catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function departPosting(req, res, next) {
  try {
    const result = await prisma.ridePosting.updateMany({
      where: { id: req.params.id, driverId: req.user.id, status: { in: ["OPEN", "FULL"] } },
      data: { status: "DEPARTED" },
    });
    if (result.count === 0) {
      return res.status(400).json({ message: "Ride is not in a state you can mark as departed" });
    }
    const posting = await prisma.ridePosting.findUnique({ where: { id: req.params.id } });
    res.json({ posting });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPosting,
  listAvailable,
  listMyPostings,
  listMyBookings,
  bookSeat,
  cancelBooking,
  cancelPosting,
  departPosting,
};
