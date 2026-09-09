const { Router } = require("express");
const { requireAuth } = require("../../middleware/auth");
const {
  createPosting,
  getFeeQuote,
  listAvailable,
  listMyPostings,
  listMyBookings,
  bookSeat,
  cancelBooking,
  cancelPosting,
  departPosting,
  getPosting,
  updateLocation,
} = require("./anando.controller");

const router = Router();
router.use(requireAuth);

router.get("/postings/available", listAvailable);
router.get("/postings/mine", listMyPostings);
router.get("/postings/:id", getPosting);
router.get("/fee-quote", getFeeQuote);
router.post("/postings", createPosting);
router.patch("/postings/:id/cancel", cancelPosting);
router.post("/postings/:id/depart", departPosting);
router.post("/postings/:id/book", bookSeat);
router.patch("/postings/:id/location", updateLocation);

router.get("/bookings/mine", listMyBookings);
router.patch("/bookings/:id/cancel", cancelBooking);

module.exports = router;
