const crypto = require("crypto");
const { z } = require("zod");
const Anthropic = require("@anthropic-ai/sdk");
const { zodOutputFormat } = require("@anthropic-ai/sdk/helpers/zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const aasClient = require("./aasClient");
const {
  AAS_GENRES,
  AAS_ENERGIES,
  AAS_PERIODICITES,
  AAS_GARANTIE_LABELS,
  TIER_GARANTIES,
  MOTO_TIER_GARANTIES,
} = require("../../constants/aasGuarantees");

// rc.request (mono) needs only puissanceFiscale; rc.moto needs
// cylindre+usage+nombrePlace - neither needs immatriculation/chassis/
// modele/marque/dateMiseCirculation, which only qrcode.request/
// moto.request (issuance) require. Keeping compare/quote lightweight
// mirrors that split (PDF sections 5.1/6.1 vs 5.2/6.2).
const quoteInputSchema = z.object({
  genre: z.string().min(1),
  energie: z.enum(["ESSENCE", "DIESEL"]),
  periodicite: z.enum(["JOUR", "MOIS"]),
  duree: z.number().int().positive(),
  puissanceFiscale: z.union([z.string(), z.number()]).optional(),
  cylindre: z.number().int().min(0).optional(),
  usage: z.enum(["COMMERCIAL", "NON_COMMERCIAL"]).optional(),
  nombrePlace: z.number().int().positive().optional(),
});

const partySchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  cellulaire: z.string().optional(),
  email: z.string().email().optional(),
});

const purchaseSchema = quoteInputSchema.extend({
  tier: z.string().min(1),
  immatriculation: z.string().min(1),
  chassis: z.string().min(1),
  modele: z.string().min(1),
  marque: z.string().min(1),
  dateMiseCirculation: z.string().min(1),
  // nombrePlace is optional at quote time (only rc.moto needs it) but
  // required by both qrcode.request and moto.request at issuance time.
  nombrePlace: z.number().int().positive(),
  valeurNeuve: z.number().positive().optional(),
  valeurActuelle: z.number().positive().optional(),
  typePersonne: z.enum(["PHYSIQUE", "MORALE"]).default("PHYSIQUE"),
  souscripteur: partySchema,
  assure: partySchema,
});

/** Resolves & validates a genre/periodicite/duree combo. Returns {genreEntry, isMoto, tierTable} or a {status, message} error to send as-is. */
function resolveVehicle(input) {
  const genreEntry = AAS_GENRES.find((g) => g.genre === input.genre);
  if (!genreEntry) {
    return { error: { status: 400, message: `Unknown vehicle genre '${input.genre}'.` } };
  }
  if (!genreEntry.supported) {
    const reason = !genreEntry.digitized
      ? "Pool TPV (C4) vehicles are excluded from AAS's digital issuance for now."
      : `the ${genreEntry.family} endpoint family (remorque/bus école) isn't integrated yet - only Mono and deux roues (C5) are.`;
    return {
      error: { status: 400, message: `${genreEntry.description} (${genreEntry.genre}) is not available: ${reason}` },
    };
  }
  const range = AAS_PERIODICITES[input.periodicite];
  if (input.duree < range.min || input.duree > range.max) {
    return {
      error: { status: 400, message: `duree must be between ${range.min} and ${range.max} for periodicite ${input.periodicite}.` },
    };
  }
  const isMoto = genreEntry.family === "moto";
  if (isMoto) {
    if (input.cylindre == null || !input.usage || !input.nombrePlace) {
      return { error: { status: 400, message: "cylindre, usage, and nombrePlace are required for deux roues (C5) vehicles." } };
    }
  } else if (input.puissanceFiscale == null || input.puissanceFiscale === "") {
    return { error: { status: 400, message: "puissanceFiscale is required for this vehicle." } };
  }
  return { genreEntry, isMoto, tierTable: isMoto ? MOTO_TIER_GARANTIES : TIER_GARANTIES };
}

// ---------------- Carte grise photo scan (Claude vision) ----------------
// Reads whatever's legible off a photo of a Senegalese carte grise
// (vehicle registration card) to prefill the vehicle-info step below -
// the user still reviews/edits every field before continuing, so a
// missed or misread field never silently reaches the AAS purchase call.
// No image storage: the photo is sent to Claude and discarded, never
// written to disk/DB - nothing here needed a file-upload pipeline.

const scanRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
});

const CarteGriseSchema = z.object({
  immatriculation: z.string().nullable().describe("Plate/registration number as printed"),
  chassis: z.string().nullable().describe("Châssis / VIN number"),
  marque: z.string().nullable().describe("Vehicle make/brand, e.g. Toyota"),
  modele: z.string().nullable().describe("Vehicle model, e.g. Corolla"),
  dateMiseCirculation: z
    .string()
    .nullable()
    .describe("Date of first registration (mise en circulation), as ISO 8601 YYYY-MM-DD"),
  puissanceFiscale: z.string().nullable().describe("Fiscal power in CV (chevaux fiscaux), digits only"),
  nombrePlace: z.number().int().positive().nullable().describe("Number of seats"),
  energie: z.enum(["ESSENCE", "DIESEL"]).nullable().describe("Fuel type, only if unambiguous"),
  titulaireNom: z.string().nullable().describe("Cardholder's last name (nom)"),
  titulairePrenom: z.string().nullable().describe("Cardholder's first name (prénom)"),
  isLegibleCarteGrise: z
    .boolean()
    .describe("false if this photo doesn't look like a legible Senegalese carte grise at all"),
});

let anthropicClient;
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

/**
 * POST /api/insurance/auto/carte-grise/scan - extracts vehicle-info
 * fields from a carte grise photo via Claude's vision + structured
 * outputs, for the "take a photo" step to prefill the next step with.
 * Every extracted field is nullable - the model is told to return null
 * rather than guess, and the frontend must let the user edit whatever
 * comes back (including everything, if scanning is unconfigured).
 */
async function scanCarteGrise(req, res, next) {
  try {
    const { imageBase64, mediaType } = scanRequestSchema.parse(req.body);
    const client = getAnthropicClient();
    if (!client) {
      return res.status(503).json({
        message: "Carte grise scanning isn't configured. Enter the vehicle details manually.",
        code: "OCR_NOT_CONFIGURED",
      });
    }

    // Callers may hand over a data: URL (canvas.toDataURL / <input
    // type=file> readers commonly produce one) - strip the prefix rather
    // than rejecting it, same tolerance AddressAutocompleteField extends
    // to free-typed text with no coordinates.
    const data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    let response;
    try {
      response = await client.messages.parse({
        model: "claude-opus-5",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data } },
              {
                type: "text",
                text: "This is a photo of a Senegalese vehicle registration card (carte grise). Extract the fields defined by the schema. If a field is not legible or not present on the card, return null for it rather than guessing.",
              },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(CarteGriseSchema) },
      });
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        return res.status(502).json({ message: "Could not analyze this photo right now. Please try again.", code: "OCR_PROVIDER_ERROR" });
      }
      throw err;
    }

    if (!response.parsed_output || !response.parsed_output.isLegibleCarteGrise) {
      return res.status(422).json({
        message: "Could not read this photo clearly. Try a clearer photo or enter the details manually.",
        code: "OCR_UNREADABLE",
      });
    }

    res.json({ extracted: response.parsed_output });
  } catch (err) {
    next(err);
  }
}

/** GET /api/insurance/auto/metadata - drives the frontend's vehicle form + tier picker. */
async function getMetadata(req, res) {
  res.json({
    genres: AAS_GENRES,
    energies: AAS_ENERGIES,
    periodicites: AAS_PERIODICITES,
    garantieLabels: AAS_GARANTIE_LABELS,
    tiers: TIER_GARANTIES,
    motoTiers: MOTO_TIER_GARANTIES,
  });
}

/** POST /api/insurance/auto/compare - live multi-tier AAS quote, no payment/state change. */
async function compareAutoQuotes(req, res, next) {
  try {
    const input = quoteInputSchema.parse(req.body);
    const resolved = resolveVehicle(input);
    if (resolved.error) return res.status(resolved.error.status).json({ message: resolved.error.message });
    const { isMoto, tierTable } = resolved;

    let creds;
    try {
      creds = await aasClient.resolveCredentials();
    } catch (err) {
      return res.status(503).json({ message: err.message, code: err.code });
    }

    const quoteFn = isMoto ? aasClient.quoteMoto : aasClient.quoteMono;
    const baseParams = isMoto
      ? { cylindre: input.cylindre, duree: input.duree, periodicite: input.periodicite, genre: input.genre, energie: input.energie, usage: input.usage, nombrePlace: input.nombrePlace }
      : { puissanceFiscale: input.puissanceFiscale, duree: input.duree, periodicite: input.periodicite, genre: input.genre, energie: input.energie };

    const results = await Promise.all(
      Object.entries(tierTable).map(async ([tier, garanties]) => {
        try {
          const { premium } = await quoteFn(
            { ...baseParams, garanties, garantieOptPT: garanties.includes(2) ? creds.garantieOptPT : undefined },
            creds
          );
          return { tier, garanties, premium, available: true };
        } catch (err) {
          return { tier, garanties, available: false, message: err.message, code: err.code };
        }
      })
    );

    // Never fall back to a local estimate - if AAS can't price any tier
    // for this vehicle, say so rather than inventing a number.
    if (!results.some((r) => r.available)) {
      return res.status(502).json({ message: "AAS could not price this vehicle right now.", results });
    }

    res.json({ companyCode: "AAS", vehicleType: isMoto ? "moto" : "mono", genre: input.genre, results });
  } catch (err) {
    next(err);
  }
}

/**
 * Runs one issuance attempt (or retry) against AAS and settles the policy
 * row accordingly. Never returns a policy marked ACTIVE without a real
 * linkAttestation - the AAS call either produces one or this records a
 * FAILED policy and refunds `premium` back to the wallet.
 */
async function attemptIssuance(policy, creds, issuanceParams, isMoto, premium) {
  const referenceBase = `AAS-${policy.id.slice(0, 8).toUpperCase()}`;
  // Retry-safe: a fresh reference per attempt, or AAS rejects it outright
  // with "La reference doit être unique" - even a failed attempt consumes
  // the one it used.
  const referenceTrxPartner = aasClient.buildRetryReference(referenceBase, policy.fulfillmentAttempts);
  const issueFn = isMoto ? aasClient.issueMoto : aasClient.issueMono;
  const requestSnapshot = { ...issuanceParams, referenceTrxPartner };

  try {
    const { linkAttestation, raw } = await issueFn({ ...issuanceParams, referenceTrxPartner }, creds);
    return await prisma.insuranceAutoPolicy.update({
      where: { id: policy.id },
      data: {
        status: "ACTIVE",
        linkAttestation,
        referenceTrxPartner,
        premiumCharged: premium,
        fulfillmentAttempts: { increment: 1 },
        fulfillmentError: null,
        fulfillmentErrorCode: null,
        requestSnapshot,
        responseSnapshot: raw,
      },
    });
  } catch (err) {
    // A failed issuance records why - both what AAS said and what we sent
    // it - so "AAS refused the payload" and "we never sent the field"
    // stay distinguishable later.
    await walletService.credit({
      userId: policy.userId,
      amount: premium,
      type: "REFUND",
      purpose: "INSURANCE_AUTO_POLICY",
      purposeId: policy.id,
      description: `Refund - AAS could not issue attestation for policy #${policy.id.slice(0, 8)}`,
    });
    return prisma.insuranceAutoPolicy.update({
      where: { id: policy.id },
      data: {
        status: "FAILED",
        referenceTrxPartner,
        fulfillmentAttempts: { increment: 1 },
        fulfillmentError: err.message,
        fulfillmentErrorCode: err.code || null,
        requestSnapshot,
        responseSnapshot: err.response ?? null,
      },
    });
  }
}

function buildIssuanceParams({ input, garanties, garantieOptPT, souscripteur, assure, isMoto, responsabiliteCivile, referenceTrxPartner }) {
  const vehicule = isMoto
    ? {
        cylindre: input.cylindre,
        dateMiseCirculation: input.dateMiseCirculation,
        nombrePlace: input.nombrePlace,
        immatriculation: input.immatriculation,
        energie: input.energie,
        genre: input.genre,
        modele: input.modele,
        marque: input.marque,
      }
    : {
        puissanceFiscale: input.puissanceFiscale,
        dateMiseCirculation: input.dateMiseCirculation,
        nombrePlace: input.nombrePlace,
        immatriculation: input.immatriculation,
        energie: input.energie,
        genre: input.genre,
        modele: input.modele,
        marque: input.marque,
        chassis: input.chassis,
        ...(input.valeurNeuve != null ? { valeurNeuve: input.valeurNeuve } : {}),
        ...(input.valeurActuelle != null ? { valeurActuelle: input.valeurActuelle } : {}),
      };
  return {
    responsabiliteCivile,
    dateEffet: new Date(),
    duree: input.duree,
    periodicite: input.periodicite,
    typePersonne: input.typePersonne,
    souscripteur,
    assure,
    vehicule,
    usage: isMoto ? input.usage : undefined,
    garanties,
    garantieOptPT,
    referenceTrxPartner,
  };
}

/** POST /api/insurance/auto/policies - quote, pay from wallet, issue. */
async function purchaseAutoPolicy(req, res, next) {
  try {
    const input = purchaseSchema.parse(req.body);
    const resolved = resolveVehicle(input);
    if (resolved.error) return res.status(resolved.error.status).json({ message: resolved.error.message });
    const { isMoto, tierTable } = resolved;

    const garanties = tierTable[input.tier];
    if (!garanties) {
      return res.status(400).json({ message: `Unknown tier '${input.tier}' for this vehicle type.` });
    }

    let creds;
    try {
      creds = await aasClient.resolveCredentials();
    } catch (err) {
      return res.status(503).json({ message: err.message, code: err.code });
    }

    // Never sell what cannot be issued: probe stock before any money moves.
    try {
      await aasClient.assertCanIssue(creds);
    } catch (err) {
      return res.status(502).json({ message: err.message, code: err.code });
    }

    const garantieOptPT = garanties.includes(2) ? creds.garantieOptPT : undefined;
    const souscripteur = { ...input.souscripteur, email: input.souscripteur.email || req.user.email || "" };
    const assure = input.assure;

    // Re-price server-side right before charging - never trust a
    // client-supplied number for what actually gets debited.
    let premium;
    try {
      const quoteFn = isMoto ? aasClient.quoteMoto : aasClient.quoteMono;
      const quoteParams = isMoto
        ? { cylindre: input.cylindre, duree: input.duree, periodicite: input.periodicite, genre: input.genre, energie: input.energie, usage: input.usage, nombrePlace: input.nombrePlace }
        : { puissanceFiscale: input.puissanceFiscale, duree: input.duree, periodicite: input.periodicite, genre: input.genre, energie: input.energie };
      ({ premium } = await quoteFn({ ...quoteParams, garanties, garantieOptPT }, creds));
    } catch (err) {
      return res.status(502).json({ message: err.message, code: err.code });
    }

    const id = crypto.randomUUID();
    const referenceBase = `AAS-${id.slice(0, 8).toUpperCase()}`;
    const policy = await prisma.insuranceAutoPolicy.create({
      data: {
        id,
        userId: req.user.id,
        tier: input.tier,
        genre: input.genre,
        energie: input.energie,
        immatriculation: input.immatriculation,
        chassis: input.chassis,
        puissanceFiscale: isMoto ? null : String(input.puissanceFiscale),
        cylindre: isMoto ? input.cylindre : null,
        nombrePlace: input.nombrePlace,
        dateMiseCirculation: new Date(input.dateMiseCirculation),
        modele: input.modele,
        marque: input.marque,
        valeurNeuve: input.valeurNeuve ?? null,
        valeurActuelle: input.valeurActuelle ?? null,
        usage: isMoto ? input.usage : null,
        typePersonne: input.typePersonne,
        souscripteur,
        assure,
        garanties,
        garantiesOptPT: garantieOptPT || null,
        periodicite: input.periodicite,
        duree: input.duree,
        premiumEstimate: premium,
        referenceTrxPartner: referenceBase,
      },
    });

    try {
      await walletService.debit({
        userId: req.user.id,
        amount: premium,
        purpose: "INSURANCE_AUTO_POLICY",
        purposeId: policy.id,
        description: `AAS auto insurance (${input.tier}) - ${input.immatriculation}`,
      });
    } catch (debitErr) {
      await prisma.insuranceAutoPolicy.delete({ where: { id: policy.id } });
      if (debitErr instanceof walletService.InsufficientBalanceError) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
    }

    await prisma.insuranceAutoPolicy.update({ where: { id: policy.id }, data: { status: "ISSUING" } });

    const issuanceParams = buildIssuanceParams({
      input,
      garanties,
      garantieOptPT,
      souscripteur,
      assure,
      isMoto,
      responsabiliteCivile: premium,
    });
    const finalPolicy = await attemptIssuance(policy, creds, issuanceParams, isMoto, premium);

    if (finalPolicy.status === "FAILED") {
      return res
        .status(502)
        .json({ policy: finalPolicy, message: "AAS could not issue the attestation. Your payment has been refunded." });
    }
    res.status(201).json({ policy: finalPolicy });
  } catch (err) {
    next(err);
  }
}

/** POST /api/insurance/auto/policies/:id/retry - re-attempt a FAILED, never-issued policy. */
async function retryAutoPolicy(req, res, next) {
  try {
    const existing = await prisma.insuranceAutoPolicy.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Policy not found" });
    }
    // Retrying is refused once a real attestation exists - that's what
    // stops a second one being bought for the same order.
    if (existing.status !== "FAILED" || existing.linkAttestation) {
      return res.status(400).json({ message: "Only a failed, unissued policy can be retried." });
    }

    let creds;
    try {
      creds = await aasClient.resolveCredentials();
    } catch (err) {
      return res.status(503).json({ message: err.message, code: err.code });
    }
    try {
      await aasClient.assertCanIssue(creds);
    } catch (err) {
      return res.status(502).json({ message: err.message, code: err.code });
    }

    const genreEntry = AAS_GENRES.find((g) => g.genre === existing.genre);
    const isMoto = genreEntry?.family === "moto";
    const garantieOptPT = existing.garantiesOptPT || undefined;

    let premium;
    try {
      const quoteFn = isMoto ? aasClient.quoteMoto : aasClient.quoteMono;
      const quoteParams = isMoto
        ? { cylindre: existing.cylindre, duree: existing.duree, periodicite: existing.periodicite, genre: existing.genre, energie: existing.energie, usage: existing.usage, nombrePlace: existing.nombrePlace }
        : { puissanceFiscale: existing.puissanceFiscale, duree: existing.duree, periodicite: existing.periodicite, genre: existing.genre, energie: existing.energie };
      ({ premium } = await quoteFn({ ...quoteParams, garanties: existing.garanties, garantieOptPT }, creds));
    } catch (err) {
      return res.status(502).json({ message: err.message, code: err.code });
    }

    try {
      await walletService.debit({
        userId: req.user.id,
        amount: premium,
        purpose: "INSURANCE_AUTO_POLICY",
        purposeId: existing.id,
        description: `AAS auto insurance retry (${existing.tier}) - ${existing.immatriculation}`,
      });
    } catch (debitErr) {
      if (debitErr instanceof walletService.InsufficientBalanceError) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
    }

    await prisma.insuranceAutoPolicy.update({ where: { id: existing.id }, data: { status: "ISSUING", premiumEstimate: premium } });

    const issuanceParams = buildIssuanceParams({
      input: {
        ...existing,
        dateMiseCirculation: existing.dateMiseCirculation.toISOString().slice(0, 10),
      },
      garanties: existing.garanties,
      garantieOptPT,
      souscripteur: existing.souscripteur,
      assure: existing.assure,
      isMoto,
      responsabiliteCivile: premium,
    });
    const finalPolicy = await attemptIssuance(existing, creds, issuanceParams, isMoto, premium);
    if (finalPolicy.status === "FAILED") {
      return res
        .status(502)
        .json({ policy: finalPolicy, message: "AAS could not issue the attestation. Your payment has been refunded." });
    }
    res.json({ policy: finalPolicy });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/insurance/auto/policies/:id/cancel - qrcode.mono.cancel.
 * Confirmed query-param shape (referenceTrxPartner, methode, motif) from
 * the doc's own section 5.3, though never exercised against the live API
 * (integration notes). Only marks the policy CANCELLED once AAS itself
 * confirms - same "don't misrepresent state" principle as never marking
 * ACTIVE without a real attestation.
 */
async function cancelAutoPolicy(req, res, next) {
  try {
    const existing = await prisma.insuranceAutoPolicy.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Policy not found" });
    }
    if (existing.status !== "ACTIVE" || !existing.linkAttestation) {
      return res.status(400).json({ message: `Cannot cancel a policy that is ${existing.status}` });
    }

    let creds;
    try {
      creds = await aasClient.resolveCredentials();
    } catch (err) {
      return res.status(503).json({ message: err.message, code: err.code });
    }

    try {
      await aasClient.cancelMono({ referenceTrxPartner: existing.referenceTrxPartner, motif: "Annulation demandée par le client" }, creds);
    } catch (err) {
      return res.status(502).json({ message: err.message, code: err.code });
    }

    const policy = await prisma.insuranceAutoPolicy.update({ where: { id: existing.id }, data: { status: "CANCELLED" } });
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}

async function listAutoPolicies(req, res, next) {
  try {
    const policies = await prisma.insuranceAutoPolicy.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ policies });
  } catch (err) {
    next(err);
  }
}

async function getAutoPolicy(req, res, next) {
  try {
    const policy = await prisma.insuranceAutoPolicy.findUnique({ where: { id: req.params.id } });
    if (!policy || policy.userId !== req.user.id) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  scanCarteGrise,
  getMetadata,
  compareAutoQuotes,
  purchaseAutoPolicy,
  retryAutoPolicy,
  cancelAutoPolicy,
  listAutoPolicies,
  getAutoPolicy,
};
