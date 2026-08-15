/**
 * A.A.S "Assurance Digitale" API client (branche AUTOMOBILE, vehicules
 * "Mono" + deux roues C5).
 *
 * Source material:
 *  - "Description API Assurance Digitale A.A.S V.1.1" (the vendor PDF, 63
 *    pages) - auth, base URL, all of section 3.3's metadata tables (see
 *    aasGuarantees.js), stock.qr (section 4), and the full field-level
 *    request/response specs for rc.request/qrcode.request/qrcode.mono.cancel
 *    (section 5) and rc.moto/moto.request (section 6). Flotte/Bus
 *    Ecole/Garage (sections 7-10) are out of scope - only Mono and deux
 *    roues (C5) are sold here.
 *  - Hand-written integration notes from a prior real build of this same
 *    integration, documenting where the PDF is wrong vs. how the live
 *    sandbox actually behaves. Treated as authoritative over the PDF
 *    wherever they conflict - every such point is cited by comment below.
 *    Two confirmed conflicts: stock.qr is POST-with-body in the sandbox
 *    (PDF says GET/no-body), and qrcode.request's/moto.request's success
 *    response is flat on the envelope in the sandbox (the PDF's own
 *    response table nests it under `data`, including a nonexistent
 *    `attestationNumber` field - the notes say only `linkAttestation`
 *    exists, unnested).
 *
 * Two internal PDF inconsistencies worth flagging (not notes-vs-PDF, PDF
 * vs itself): rc.moto's Méthode is printed as GET despite documenting a
 * JSON Request Body (mirrors the stock.qr GET/POST error - implemented as
 * POST here); and the `usage` value spelling differs between section
 * 3.3.6 ("commerciale"/"non_commerciale") and section 6.1's rc.moto
 * request-param table ("COMMERCIAL"/"NON_COMMERCIAL") - this client sends
 * the section 6.1 spelling since that's the literal request-body spec for
 * the call actually being made.
 */

const prisma = require("../../lib/prisma");
const { AAS_GARANTIES } = require("../../constants/aasGuarantees");

const DEFAULT_TIMEOUT_MS = 15000;

class AasError extends Error {
  constructor(message, { code, status, response } = {}) {
    super(message);
    this.name = "AasError";
    this.code = code || "AAS_ERROR";
    this.status = status;
    this.response = response;
  }
}

async function getActiveAasProvider() {
  const preferred = await prisma.provider.findFirst({
    where: { category: "INSURANCE_AAS", isActive: true, isDefault: true },
  });
  if (preferred) return preferred;
  return prisma.provider.findFirst({
    where: { category: "INSURANCE_AAS", isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Admin console config (Provider category INSURANCE_AAS) wins over env
 * vars, per the integration notes ("Credentials can also come from the
 * admin console... which wins over the environment").
 */
async function resolveCredentials() {
  const provider = await getActiveAasProvider();
  const config = provider?.config || {};

  const partner = config.partner || process.env.AAS_PARTNER;
  const accessToken = config.accessToken || process.env.AAS_ACCESS_TOKEN;
  const police = config.police ?? process.env.AAS_POLICE ?? "";
  const baseUrl = String(config.baseUrl || process.env.AAS_BASE_URL || "").replace(/\/+$/, "");
  const username = config.username || process.env.AAS_USERNAME || "token";
  const timeoutMs = Number(config.timeoutMs || process.env.AAS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  // A tariff decision, not a technical default - see aasGuarantees.js.
  const garantieOptPT = config.garantieOptPT || process.env.AAS_GARANTIE_OPT_PT || null;

  const missing = [];
  if (!partner) missing.push("partner");
  if (!accessToken) missing.push("accessToken");
  if (!baseUrl) missing.push("baseUrl");
  if (missing.length) {
    throw new AasError(
      `AAS is not configured (missing: ${missing.join(", ")}). Set it under admin > Providers ` +
        `(category INSURANCE_AAS) or the AAS_PARTNER/AAS_ACCESS_TOKEN/AAS_BASE_URL env vars.`,
      { code: "NOT_CONFIGURED" }
    );
  }

  return { partner, accessToken, police, baseUrl, username, timeoutMs, garantieOptPT, providerId: provider?.id || null };
}

/**
 * Low-level request. Path pattern per doc section 3.2/4: {baseUrl}/api/v1/{partner}/{path}.
 */
async function callAas(path, { method = "POST", body, params, creds }) {
  let url = `${creds.baseUrl}/api/v1/${encodeURIComponent(creds.partner)}/${path}`;
  if (params) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (query) url += `?${query}`;
  }
  const auth = Buffer.from(`${creds.username}:${creds.accessToken}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), creds.timeoutMs || DEFAULT_TIMEOUT_MS);

  let res;
  let text;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: method === "GET" || body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    text = await res.text();
  } catch (err) {
    throw new AasError(`AAS request to ${path} failed: ${err.message}`, { code: "NETWORK_ERROR" });
  } finally {
    clearTimeout(timeout);
  }

  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new AasError(`AAS returned a non-JSON response from ${path} (HTTP ${res.status})`, {
      code: "BAD_RESPONSE",
      status: res.status,
      response: text.slice(0, 500),
    });
  }

  // Doc section 3.1: HTTP 2xx AND operationStatus === "SUCCESS" are both
  // required - any other operationStatus value is a failure even on 200.
  if (!res.ok || payload.operationStatus !== "SUCCESS") {
    throw new AasError(payload.operationMessage || payload.error_descrip || `AAS ${path} failed (HTTP ${res.status})`, {
      code: payload.error || payload.operationStatus || "AAS_ERROR",
      status: res.status,
      response: payload,
    });
  }

  return payload;
}

/**
 * stock.qr - current virtual QR code stock. Sandbox reality (integration
 * notes) is POST with body {"code":"1000"}; the doc says GET with no
 * body. POST-with-body is what's actually implemented here.
 */
async function checkStock(creds) {
  const payload = await callAas("stock.qr", { method: "POST", body: { code: "1000" }, creds });
  const stock = typeof payload.data === "number" ? payload.data : Number(payload.data);
  return Number.isFinite(stock) ? stock : 0;
}

/**
 * "Never sell what cannot be issued": call before taking any payment, on
 * every purchase path (wallet, and any future PayDunya path).
 */
async function assertCanIssue(creds) {
  const stock = await checkStock(creds);
  if (!stock || stock <= 0) {
    throw new AasError("AAS has no QR code stock available right now - cannot issue an attestation.", { code: "NO_STOCK" });
  }
  return stock;
}

/**
 * garantiesOptPT is required whenever code 2 (personnes transportées) is
 * requested, else AAS answers HTTP 400 UserError - the doc's own request
 * tables don't mark it required, but the live API does not treat it as
 * optional (integration notes). Codes 4 (avance/recours -> garantiesOptAR)
 * and the assistance option (garantiesOptAS) are deliberately never wired
 * in here: 4 isn't sold yet and no guarantee code maps to assistance at
 * all (notes, "Still open").
 */
function buildGarantiesPayload({ garanties = [], garantieOptPT }) {
  const body = { garanties };
  if (garanties.includes(AAS_GARANTIES.PERSONNES_TRANSPORTEES)) {
    if (!garantieOptPT) {
      throw new AasError(
        "garantiesOptPT is required whenever guarantee code 2 (personnes transportées) is requested.",
        { code: "MISSING_GARANTIE_OPT_PT" }
      );
    }
    body.garantiesOptPT = garantieOptPT;
  }
  return body;
}

function toAasDate(date) {
  return (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);
}

/** dateEffet + duree/periodicite -> dateExpiration, needed by moto.request (unlike qrcode.request, AAS computes this itself for Mono). */
function computeExpiration(dateEffet, periodicite, duree) {
  const d = dateEffet instanceof Date ? new Date(dateEffet) : new Date(dateEffet);
  if (periodicite === "JOUR") {
    d.setDate(d.getDate() + Number(duree));
  } else {
    d.setMonth(d.getMonth() + Number(duree));
  }
  return toAasDate(d);
}

/**
 * "Optional means may-be-empty, not may-be-omitted" (integration notes).
 * souscripteur.email and vehicule.{chassis,immatriculation} are confirmed
 * by the notes as unconditionally-read keys despite the doc not marking
 * them required - fill exactly those with "" when absent. Everything else
 * the caller supplies passes through unchanged.
 */
function withDefaults(obj, defaults) {
  const result = { ...(obj || {}) };
  for (const [key, value] of Object.entries(defaults)) {
    if (result[key] === undefined || result[key] === null) result[key] = value;
  }
  return result;
}

/** rc.request (section 5.1) - flat params only, no souscripteur/assure/vehicule. */
async function quoteMono({ puissanceFiscale, duree, periodicite, genre, energie, valeurNeuve, valeurActuelle, garanties, garantieOptPT }, creds) {
  const body = {
    ...buildGarantiesPayload({ garanties, garantieOptPT }),
    puissanceFiscale: String(puissanceFiscale),
    duree: String(duree),
    periodicite,
    genre,
    energie,
    ...(valeurNeuve != null ? { valeurNeuve } : {}),
    ...(valeurActuelle != null ? { valeurActuelle } : {}),
  };
  const payload = await callAas("rc.request", { body, creds });
  // Confirmed by section 5.1's response table: `data` is the bare Prime
  // Net RC number, with PrimeRC/PrimeTotale/etc. as sibling fields on the
  // envelope - not a guess, unlike the premium-shape handling this file
  // used to need before the full spec was available.
  const premium = typeof payload.data === "number" ? payload.data : Number(payload.data);
  if (!Number.isFinite(premium)) {
    throw new AasError("AAS's rc.request response did not include a numeric premium.", { code: "UNKNOWN_QUOTE_SHAPE", response: payload });
  }
  return { premium, raw: payload };
}

/**
 * Issuance response fields are on the envelope itself in the sandbox, not
 * nested under `data` as the doc's own response table claims (integration
 * notes). Read `payload.data` only when it IS an object; otherwise read
 * the envelope directly - do not simplify this back to `payload.data`,
 * see the notes' warning about that exact bug. `attestationNumber` is
 * listed in the doc but does not exist in the live response; only
 * `linkAttestation` does, and it ends in the number.
 */
function mapAttestation(payload) {
  const src = payload && typeof payload.data === "object" && payload.data !== null ? payload.data : payload;
  const linkAttestation = src?.linkAttestation;
  if (!linkAttestation) {
    throw new AasError("AAS's issuance response has no linkAttestation - refusing to treat this as a real attestation.", {
      code: "NO_ATTESTATION_LINK",
      response: payload,
    });
  }
  return { linkAttestation, raw: payload };
}

/**
 * A retry must carry a fresh referenceTrxPartner or AAS rejects it with
 * "La reference doit être unique" - even a failed attempt consumes the
 * reference. Call with the base reference and InsuranceAutoPolicy's
 * current fulfillmentAttempts count (0 on the first try).
 */
function buildRetryReference(baseReference, attemptNumber) {
  return attemptNumber > 0 ? `${baseReference}-R${attemptNumber}` : baseReference;
}

/**
 * qrcode.request (section 5.2) - buy the attestation, burning one QR from
 * stock. Call assertCanIssue() before ever taking payment for this.
 * `responsabiliteCivile` is the priced RC amount from quoteMono's
 * `premium` - AAS re-validates it rather than trusting a stale number.
 */
async function issueMono(
  { responsabiliteCivile, dateEffet, duree, periodicite, typePersonne, souscripteur, assure, vehicule, garanties, garantieOptPT, referenceTrxPartner },
  creds
) {
  const body = {
    ...buildGarantiesPayload({ garanties, garantieOptPT }),
    responsabiliteCivile,
    dateEffet: toAasDate(dateEffet),
    duree: String(duree),
    periodicite,
    police: creds.police || "",
    typePersonne,
    souscripteur: withDefaults(souscripteur, { email: "" }),
    assure: withDefaults(assure, {}),
    vehicule: withDefaults(vehicule, { chassis: "", immatriculation: "" }),
    referenceTrxPartner,
  };
  const payload = await callAas("qrcode.request", { body, creds });
  return mapAttestation(payload);
}

/** rc.moto (section 6.1) - price a two-wheel (C5) risk. */
async function quoteMoto({ cylindre, duree, periodicite, genre, energie, usage, nombrePlace, garanties, garantieOptPT }, creds) {
  const body = {
    ...buildGarantiesPayload({ garanties, garantieOptPT }),
    cylindre,
    duree: String(duree),
    periodicite,
    genre,
    energie,
    usage,
    nombrePlace: String(nombrePlace),
  };
  const payload = await callAas("rc.moto", { body, creds });
  const premium = typeof payload.data === "number" ? payload.data : Number(payload.data);
  if (!Number.isFinite(premium)) {
    throw new AasError("AAS's rc.moto response did not include a numeric premium.", { code: "UNKNOWN_QUOTE_SHAPE", response: payload });
  }
  return { premium, raw: payload };
}

/**
 * moto.request (section 6.2). Unlike qrcode.request, AAS does NOT
 * auto-compute dateExpiration for deux roues - it's a required input
 * here, derived from dateEffet + duree/periodicite. `usage` lives inside
 * `vehicule` for this call (it's a flat top-level param for rc.moto
 * instead) - two different shapes for the same concept, both taken
 * directly from the doc's own request-body tables for each endpoint.
 */
async function issueMoto(
  { responsabiliteCivile, dateEffet, duree, periodicite, typePersonne, souscripteur, assure, vehicule, usage, garanties, garantieOptPT, referenceTrxPartner },
  creds
) {
  const body = {
    ...buildGarantiesPayload({ garanties, garantieOptPT }),
    responsabiliteCivile,
    dateEffet: toAasDate(dateEffet),
    dateExpiration: computeExpiration(dateEffet, periodicite, duree),
    duree: String(duree),
    periodicite,
    police: creds.police || "",
    typePersonne,
    souscripteur: withDefaults(souscripteur, { email: "" }),
    assure: withDefaults(assure, {}),
    vehicule: withDefaults({ ...vehicule, usage }, { chassis: "", immatriculation: "" }),
    referenceTrxPartner,
  };
  const payload = await callAas("moto.request", { body, creds });
  return mapAttestation(payload);
}

/**
 * qrcode.mono.cancel (section 5.3) - query params, not a JSON body:
 * referenceTrxPartner, methode (ANNULER|RESILIER|SUSPENDRE), optional
 * motif. `methode` defaults to RESILIER (résiliation of an in-force
 * policy) since that's the semantics of a customer cancelling an ACTIVE
 * attestation - ANNULER/SUSPENDRE are for other lifecycle events this
 * app doesn't drive. Confirmed from the doc's own Query Params table;
 * still not exercised against the live API (integration notes).
 */
async function cancelMono({ referenceTrxPartner, methode = "RESILIER", motif }, creds) {
  const payload = await callAas("qrcode.mono.cancel", { method: "POST", params: { referenceTrxPartner, methode, motif }, creds });
  return payload;
}

module.exports = {
  AasError,
  resolveCredentials,
  assertCanIssue,
  checkStock,
  quoteMono,
  issueMono,
  quoteMoto,
  issueMoto,
  cancelMono,
  buildRetryReference,
  toAasDate,
};
