const prisma = require("../lib/prisma");

/**
 * Fills {phone}/{code}/{message} placeholders into a string. Applied
 * recursively (renderDeep) so an admin's config object can use them
 * anywhere - a URL, a header value, a JSON/form body field.
 */
function renderTemplate(value, vars) {
  if (typeof value !== "string") return value;
  return value.replace(/\{(phone|code|message)\}/g, (_, key) => vars[key] ?? "");
}

function renderDeep(value, vars) {
  if (value == null) return value;
  if (typeof value === "string") return renderTemplate(value, vars);
  if (Array.isArray(value)) return value.map((v) => renderDeep(v, vars));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, renderDeep(v, vars)]));
  }
  return value;
}

async function getActiveSmsProvider() {
  const preferred = await prisma.provider.findFirst({
    where: { category: "SMS", isActive: true, isDefault: true },
  });
  if (preferred) return preferred;
  return prisma.provider.findFirst({
    where: { category: "SMS", isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Sends an SMS through whatever gateway an admin configured under
 * /admin/providers (category "SMS", isActive true) - this app has no
 * hardcoded SMS vendor integration, since gateways vary too much (auth
 * scheme, GET vs POST, JSON vs form body) to pick one blind without a
 * real API contract to build against. A Provider's `config` instead
 * describes a single generic HTTP request, e.g. for a POST-JSON gateway:
 *
 *   {
 *     "method": "POST",
 *     "url": "https://api.example.com/sms/send",
 *     "headers": { "Authorization": "Bearer sk_live_..." },
 *     "bodyType": "json",
 *     "body": { "to": "{phone}", "text": "{message}", "sender": "OCASS" }
 *   }
 *
 * or for a GET gateway with query params:
 *
 *   {
 *     "method": "GET",
 *     "url": "https://api.example.com/sms",
 *     "params": { "key": "...", "to": "{phone}", "message": "{message}" }
 *   }
 *
 * {phone}, {code}, and {message} are substituted into any string field
 * (url, headers, body, params) before the request is sent.
 */
async function sendSms(phone, message, { code } = {}) {
  const provider = await getActiveSmsProvider();
  if (!provider) {
    console.warn("[sms] No active SMS provider configured under admin > Providers.");
    return { sent: false, reason: "no_provider" };
  }

  const vars = { phone, message, code: code || "" };
  const config = provider.config || {};
  const method = String(config.method || "POST").toUpperCase();
  const headers = renderDeep(config.headers || {}, vars);

  let url = renderTemplate(config.url, vars);
  let body;
  if (method === "GET") {
    const params = new URLSearchParams(renderDeep(config.params || {}, vars));
    const query = params.toString();
    if (query) url = `${url}${url.includes("?") ? "&" : "?"}${query}`;
  } else if (config.bodyType === "form") {
    body = new URLSearchParams(renderDeep(config.body || {}, vars));
    headers["Content-Type"] = headers["Content-Type"] || "application/x-www-form-urlencoded";
  } else {
    body = JSON.stringify(renderDeep(config.body || {}, vars));
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  try {
    const response = await fetch(url, { method, headers, body });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[sms] ${provider.name} responded ${response.status}: ${text.slice(0, 500)}`);
    }
    return { sent: response.ok, status: response.status, providerId: provider.id };
  } catch (err) {
    console.error(`[sms] ${provider.name} request failed:`, err.message);
    return { sent: false, reason: "request_failed", error: err.message };
  }
}

module.exports = { sendSms, getActiveSmsProvider };
