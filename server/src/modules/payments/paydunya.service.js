/**
 * Thin wrapper around PayDunya's Checkout Invoice API (hosted checkout +
 * server-to-server confirmation). Written from PayDunya's published API
 * shape - paydunya.com and developers.paydunya.com are both unreachable
 * from the environment this was written in, so none of this has been
 * exercised against a live PayDunya account. Verify against a real
 * sandbox account before relying on it; see server/.env.example for the
 * four keys this needs.
 *
 * Docs (for whoever tests this next): https://developers.paydunya.com/
 */

const BASE_URLS = {
  live: "https://app.paydunya.com/api/v1",
  test: "https://app.paydunya.com/sandbox-api/v1",
};

function baseUrl() {
  const mode = process.env.PAYDUNYA_MODE === "live" ? "live" : "test";
  return BASE_URLS[mode];
}

function authHeaders() {
  const required = [
    "PAYDUNYA_MASTER_KEY",
    "PAYDUNYA_PRIVATE_KEY",
    "PAYDUNYA_PUBLIC_KEY",
    "PAYDUNYA_TOKEN",
  ];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing PayDunya credentials in env: ${missing.join(", ")}`);
  }
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY,
    "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY,
    "PAYDUNYA-PUBLIC-KEY": process.env.PAYDUNYA_PUBLIC_KEY,
    "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN,
  };
}

/**
 * Creates a hosted checkout invoice and returns its token + the URL to
 * redirect the customer's browser to.
 *
 * @param {object} params
 * @param {number} params.amount - total amount in XOF (whole units, no decimals)
 * @param {string} params.description
 * @param {Record<string, string>} [params.customData] - echoed back on confirm/IPN
 */
async function createInvoice({ amount, description, customData = {} }) {
  const frontendUrl = process.env.APP_FRONTEND_URL || "http://localhost:3000";
  const backendUrl = process.env.APP_BASE_URL || "http://localhost:5000";

  const res = await fetch(`${baseUrl()}/checkout-invoice/create`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      invoice: {
        total_amount: Math.round(amount),
        description,
      },
      store: {
        name: "Ocass",
      },
      actions: {
        cancel_url: `${frontendUrl}/payments/cancel`,
        return_url: `${frontendUrl}/payments/return`,
        callback_url: `${backendUrl}/api/payments/paydunya/ipn`,
      },
      custom_data: customData,
    }),
  });

  const data = await parseJsonResponse(res);
  if (data.response_code !== "00" || !data.token) {
    const err = new Error(data.response_text || "PayDunya invoice creation failed");
    err.paydunyaResponse = data;
    throw err;
  }

  return {
    token: data.token,
    checkoutUrl: `https://paydunya.com/checkout/invoice/${data.token}`,
  };
}

/**
 * PayDunya is expected to always respond with JSON, but a network edge (a
 * proxy block, an outage, a misrouted request) can return HTML/plaintext
 * instead. Surface that as a clear "gateway unreachable" error rather than
 * letting `res.json()` throw an opaque SyntaxError deep in a JSON parser.
 */
async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error(`PayDunya returned a non-JSON response (HTTP ${res.status})`);
    err.paydunyaRawResponse = text.slice(0, 500);
    throw err;
  }
}

/**
 * Authoritative status check - always call this before trusting an IPN
 * payload or a customer's return-URL visit, per PayDunya's own guidance
 * (the IPN body/return-URL query params are not to be trusted on their own).
 * Expected `status` values: "completed" | "pending" | "cancelled".
 */
async function confirmInvoice(token) {
  const res = await fetch(`${baseUrl()}/checkout-invoice/confirm/${token}`, {
    method: "GET",
    headers: authHeaders(),
  });
  return parseJsonResponse(res);
}

module.exports = { createInvoice, confirmInvoice };
