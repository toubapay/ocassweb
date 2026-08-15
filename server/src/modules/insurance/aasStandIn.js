/**
 * Local stand-in for A.A.S's sandbox, for testing aasClient.js.
 *
 * There is no network egress to AAS's real sandbox
 * (kiiraytest.lasecu-assurances.sn) from this environment - the
 * integration notes say as much and prescribe exactly this: build and
 * test against a local stand-in taught each live behaviour as it was
 * discovered, not the real API. This module IS that stand-in. It is not
 * part of the product - it exists only so aasClient.js can be exercised
 * end to end (see scripts/run-aas-standin.js and the task #119 test run).
 *
 * Reproduces the confirmed request/response shapes from the full PDF
 * spec (sections 4/5/6) plus the sandbox-reality corrections from the
 * integration notes where the two disagree:
 *  - stock.qr is POST with {"code":"1000"}, not GET/no-body (doc says GET).
 *  - garanties code 2 (personnes transportées) requires garantiesOptPT,
 *    else HTTP 400 UserError (doc doesn't mark it required; live API does).
 *  - souscripteur.email and vehicule.chassis/immatriculation are read
 *    unconditionally - a missing KEY (not just an empty one) throws the
 *    exact {"error":"KeyError","error_descrip":"'<field>'"} shape quoted
 *    in the notes, even though the doc marks these fields conditional.
 *  - qrcode.request/moto.request responses are flat (no `data` wrapper)
 *    and have no attestationNumber - contrary to the doc's own response
 *    table, which nests the result under `data` and lists attestationNumber.
 *  - mono.request does not exist (404, the exact message AAS returns).
 *  - referenceTrxPartner must be unique, including across failed attempts.
 *  - qrcode.mono.cancel takes query params (referenceTrxPartner, methode,
 *    motif), confirmed by the doc's own Query Params table.
 */

const express = require("express");
const crypto = require("crypto");

const MOTO_GENRES = ["2RCYC", "2RSCO", "2RMOT", "2RSID"];

function createAasStandIn({ accessToken = "test-access-token", username = "token", initialStock = 50 } = {}) {
  const app = express();
  app.use(express.json());

  let qrStock = initialStock;
  const usedReferences = new Set();
  const attestations = new Map(); // referenceTrxPartner -> { linkAttestation, cancelled }

  function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const [scheme, encoded] = header.split(" ");
    if (scheme !== "Basic" || !encoded) {
      return res.status(401).json({ operationStatus: "ERROR", operationMessage: "Unauthorized" });
    }
    const [user, pass] = Buffer.from(encoded, "base64").toString("utf8").split(":");
    if (user !== username || pass !== accessToken) {
      return res.status(401).json({ operationStatus: "ERROR", operationMessage: "Unauthorized" });
    }
    next();
  }

  function keyError(field) {
    return { error: "KeyError", error_descrip: `'${field}'` };
  }

  function userError(message) {
    return { error: "UserError", error_descrip: message };
  }

  function missingRequired(body, keys) {
    return keys.find((key) => body[key] === undefined || body[key] === null || body[key] === "");
  }

  // Mirrors "optional means may-be-empty, not may-be-omitted": checks the
  // key exists on the object at all, regardless of its value.
  function keyMissing(obj, keys) {
    return keys.find((key) => !obj || !(key in obj));
  }

  function validateGaranties(body, res) {
    const garanties = Array.isArray(body.garanties) ? body.garanties : [];
    if (garanties.includes(2) && !body.garantiesOptPT) {
      res.status(400).json(userError("garantiesOptPT est requis lorsque la garantie 2 est demandée."));
      return false;
    }
    return true;
  }

  // Deterministic so tests can assert on it; not a claim about AAS's real
  // rating formula.
  function fakePremium(body) {
    const base = 14500;
    const perGarantie = 2500;
    const perMonth = body.periodicite === "MOIS" ? 800 : 30;
    return base + (Array.isArray(body.garanties) ? body.garanties.length : 0) * perGarantie + (Number(body.duree) || 0) * perMonth;
  }

  function issue(req, res) {
    const missingKey = keyMissing(req.body.souscripteur, ["email"]) ? "email" : keyMissing(req.body.vehicule, ["chassis", "immatriculation"]);
    if (missingKey) return res.status(400).json(keyError(missingKey));
    if (!validateGaranties(req.body, res)) return;

    const reference = req.body.referenceTrxPartner;
    if (!reference) return res.status(400).json(userError("referenceTrxPartner is required."));
    if (usedReferences.has(reference)) return res.status(400).json(userError("La reference doit être unique."));
    if (qrStock <= 0) return res.status(400).json(userError("Stock de QR code insuffisant."));

    usedReferences.add(reference);
    qrStock -= 1;
    const linkAttestation = `https://manager.lasecu-assurances.sn/attestations/AAS-STANDIN-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    attestations.set(reference, { linkAttestation, cancelled: false });
    // Flat envelope on purpose - no `data` wrapper, per the notes.
    res.status(200).json({
      operationStatus: "SUCCESS",
      operationMessage: "Opération effectuée avec succès.",
      linkAttestation,
      referenceTrxPartner: reference,
    });
  }

  app.use("/api/v1/:partner", requireAuth);

  app.post("/api/v1/:partner/stock.qr", (req, res) => {
    res.json({ operationStatus: "SUCCESS", operationMessage: "Opération effectuée avec succès.", data: qrStock });
  });

  // rc.request (section 5.1) - flat params, no souscripteur/vehicule.
  app.post("/api/v1/:partner/rc.request", (req, res) => {
    const missing = missingRequired(req.body, ["puissanceFiscale", "duree", "periodicite", "genre", "energie"]);
    if (missing) return res.status(400).json(userError(`Merci de renseigner ${missing}.`));
    if (!validateGaranties(req.body, res)) return;
    res.json({
      code: 2000,
      operationStatus: "SUCCESS",
      operationMessage: "Opération effectuée avec succès.",
      data: fakePremium(req.body),
    });
  });

  // qrcode.request (section 5.2).
  app.post("/api/v1/:partner/qrcode.request", (req, res) => {
    const missing = missingRequired(req.body, ["responsabiliteCivile", "dateEffet", "duree", "periodicite", "typePersonne"]);
    if (missing) return res.status(400).json(userError(`Merci de renseigner ${missing}.`));
    const vehiculeMissing = missingRequired(req.body.vehicule || {}, ["puissanceFiscale", "dateMiseCirculation", "nombrePlace", "genre", "energie", "modele", "marque"]);
    if (vehiculeMissing) return res.status(400).json(userError(`Merci de renseigner vehicule.${vehiculeMissing}.`));
    issue(req, res);
  });

  // rc.moto (section 6.1) - doc prints Méthode GET despite a JSON body;
  // implemented as POST, same inconsistency pattern as stock.qr.
  app.post("/api/v1/:partner/rc.moto", (req, res) => {
    const missing = missingRequired(req.body, ["cylindre", "duree", "periodicite", "genre", "energie", "usage", "nombrePlace"]);
    if (missing) return res.status(400).json(userError(`Merci de renseigner ${missing}.`));
    if (!MOTO_GENRES.includes(req.body.genre)) {
      return res.status(400).json(userError(`genre '${req.body.genre}' is not a deux-roues (C5) genre.`));
    }
    if (!validateGaranties(req.body, res)) return;
    res.json({
      code: 2000,
      operationStatus: "SUCCESS",
      operationMessage: "Opération effectuée avec succès.",
      data: fakePremium(req.body),
    });
  });

  // moto.request (section 6.2) - vehicule has no chassis field at all per
  // the doc; only immatriculation is unconditionally-read here.
  app.post("/api/v1/:partner/moto.request", (req, res) => {
    const missing = missingRequired(req.body, ["responsabiliteCivile", "dateEffet", "dateExpiration", "duree", "periodicite", "typePersonne"]);
    if (missing) return res.status(400).json(userError(`Merci de renseigner ${missing}.`));
    const vehiculeMissing = missingRequired(req.body.vehicule || {}, ["cylindre", "dateMiseCirculation", "nombrePlace", "genre", "energie", "modele", "marque"]);
    if (vehiculeMissing) return res.status(400).json(userError(`Merci de renseigner vehicule.${vehiculeMissing}.`));
    if (!MOTO_GENRES.includes(req.body.vehicule?.genre)) {
      return res.status(400).json(userError(`genre '${req.body.vehicule?.genre}' is not a deux-roues (C5) genre.`));
    }
    const missingSouscripteurKey = keyMissing(req.body.souscripteur, ["email"]);
    if (missingSouscripteurKey) return res.status(400).json(keyError(missingSouscripteurKey));
    const missingVehiculeKey = keyMissing(req.body.vehicule, ["immatriculation"]);
    if (missingVehiculeKey) return res.status(400).json(keyError(missingVehiculeKey));
    if (!validateGaranties(req.body, res)) return;

    const reference = req.body.referenceTrxPartner;
    if (!reference) return res.status(400).json(userError("referenceTrxPartner is required."));
    if (usedReferences.has(reference)) return res.status(400).json(userError("La reference doit être unique."));
    if (qrStock <= 0) return res.status(400).json(userError("Stock de QR code insuffisant."));
    usedReferences.add(reference);
    qrStock -= 1;
    const linkAttestation = `https://manager.lasecu-assurances.sn/attestations/AAS-STANDIN-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    attestations.set(reference, { linkAttestation, cancelled: false });
    res.status(200).json({
      operationStatus: "SUCCESS",
      operationMessage: "Opération effectuée avec succès.",
      linkAttestation,
      referenceTrxPartner: reference,
    });
  });

  // Confirmed by the notes: this path does not exist on the real API.
  app.post("/api/v1/:partner/mono.request", (req, res) => {
    res.status(404).json({ error: "NotFound", error_descrip: "The requested canned context is not configured on this model" });
  });

  // qrcode.mono.cancel (section 5.3) - Query Params per the doc.
  app.post("/api/v1/:partner/qrcode.mono.cancel", (req, res) => {
    const { referenceTrxPartner, methode } = req.query;
    if (!referenceTrxPartner || !["ANNULER", "RESILIER", "SUSPENDRE"].includes(methode)) {
      return res.status(400).json(userError("referenceTrxPartner and a valid methode are required."));
    }
    const entry = attestations.get(referenceTrxPartner);
    if (!entry) return res.status(400).json(userError("Unknown referenceTrxPartner."));
    if (entry.cancelled) return res.status(400).json(userError("Attestation already cancelled."));
    entry.cancelled = true;
    res.json({ operationStatus: "SUCCESS", operationMessage: "Opération effectuée avec succès." });
  });

  // Test-only inspection/reset endpoints - not part of AAS's API, kept
  // under a path AAS would never define so there's no collision risk.
  app.get("/__standin/state", (req, res) => {
    res.json({ qrStock, usedReferences: [...usedReferences], attestations: Object.fromEntries(attestations) });
  });
  app.post("/__standin/reset", (req, res) => {
    const requested = Number(req.body?.qrStock);
    qrStock = Number.isFinite(requested) ? requested : initialStock;
    usedReferences.clear();
    attestations.clear();
    res.json({ ok: true, qrStock });
  });

  return app;
}

module.exports = { createAasStandIn };
