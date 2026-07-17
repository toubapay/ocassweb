const { syncPaymentStatus } = require("./payments.service");

/**
 * PayDunya's server-to-server callback. Sent as form-encoded data with a
 * `data` field holding a JSON string (per their published docs) - this
 * parsing is the least-verified part of the integration since it couldn't
 * be exercised against a real IPN call from this environment. If PayDunya
 * sends a different shape, log req.body here first to see what actually
 * arrived, then adjust the token extraction below.
 */
async function ipn(req, res, next) {
  try {
    let token = req.body?.token;
    if (!token && typeof req.body?.data === "string") {
      try {
        token = JSON.parse(req.body.data)?.invoice?.token;
      } catch {
        // fall through - token stays undefined, handled below
      }
    }
    if (!token && req.body?.data?.invoice?.token) {
      token = req.body.data.invoice.token;
    }

    if (!token) {
      return res.status(400).json({ message: "Missing invoice token in IPN payload" });
    }

    await syncPaymentStatus(token);
    // PayDunya expects a 200 response to consider the IPN delivered.
    res.status(200).send("OK");
  } catch (err) {
    next(err);
  }
}

/** Polled by the frontend's return-URL page after the customer comes back from checkout. */
async function getStatus(req, res, next) {
  try {
    const payment = await syncPaymentStatus(req.params.token);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
}

module.exports = { ipn, getStatus };
