// A.A.S "Assurance Digitale" (branche AUTOMOBILE) metadata tables.
//
// Everything in this file up to TIER_GARANTIES/MOTO_TIER_GARANTIES is
// transcribed directly from A.A.S's "Description API Assurance Digitale
// A.A.S V.1.1" doc, section 3.3 (pages 6-10) - values, codes and FCFA
// amounts are copied verbatim, not invented. AAS_GENRES additionally
// carries the doc's own warning at the bottom of 3.3.3: "Les véhicules du
// Pool TPV (C4) sont exclus pour le moment de la digitalisation des
// assurances automobiles" - C4 genres are listed for reference but
// EXCLUDED (see AAS_GENRES entries' `digitized: false`) and must not be
// offered for purchase yet.
//
// TIER_GARANTIES / MOTO_TIER_GARANTIES are NOT from AAS - the integration
// notes (see server/docs or the aasClient.js header) explicitly flag
// "which guarantees each tier should carry" as still open/undecided. The
// tiers below are a placeholder business decision so the comparison
// engine has something to quote; revisit with product/underwriting
// before relying on them.

// garanties: base RC (Responsabilité Civile) is implicit and always
// priced/issued - it is never sent as a code. Codes 1-9 are addable on
// top of it.
const AAS_GARANTIES = {
  DEFENSE_RECOURS: 1,
  PERSONNES_TRANSPORTEES: 2,
  BRIS_DE_GLACE: 3,
  AVANCE_RECOURS: 4,
  INCENDIE: 5,
  VOL: 6,
  TIERCE_COLLISION: 7,
  TIERCE_COMPLETE: 8,
  CONDUCTEUR_PASSAGER_MOTO: 9,
};

const AAS_GARANTIE_LABELS = {
  1: "Défense et recours",
  2: "Personnes transportées",
  3: "Bris de glace",
  4: "Avance / Recours",
  5: "Incendie",
  6: "Vol",
  7: "Tierce collision",
  8: "Tierce complète",
  9: "Conducteur et passager (Moto)",
};

// garantiesOptPT - required whenever `garanties` contains code 2
// (PERSONNES_TRANSPORTEES), per the integration notes: sending code 2
// without this is an HTTP 400 UserError even though the PDF marks it
// optional. AAS_GARANTIE_OPT_PT (env or admin Provider config) picks
// which option a purchase actually uses - it's a tariff decision, not a
// technical default, so there is no hardcoded fallback here.
const AAS_GARANTIE_OPT_PT = {
  OPTION_1: 1200,
  OPTION_2: 1500,
  OPTION_3: 2000,
  OPTION_4: 2400,
  OPTION_5: 3000,
};

// garantiesOptAR (code 4, avance sur recours) - capital 300,000 to
// 2,000,000 FCFA in steps of 100,000. Not sold today (integration notes).
const AAS_GARANTIE_OPT_AR = { MIN_CAPITAL: 300000, MAX_CAPITAL: 2000000, STEP: 100000 };

// garantiesOptAS (assistance) - no guarantee code in AAS_GARANTIES maps to
// it. Do not sell until AAS clarifies how assistance is requested
// (integration notes, "Still open").
const AAS_GARANTIE_OPT_AS = {
  OPTION_1: 7500, // PDF prints "75 00 FCFA" - read as 7 500, matching the OPTION_2/3 step pattern
  OPTION_2: 23750,
  OPTION_3: 56250,
};

const AAS_PERIODICITES = {
  JOUR: { min: 1, max: 366 },
  MOIS: { min: 1, max: 12 },
};

// genre - full table from 3.3.3. `digitized: false` marks the C4 (TPV)
// pool the doc says is excluded from digitalization for now; the
// comparison engine must not quote/sell these genres yet.
//
// `family` (attached below, not per-row) says which AAS endpoint group a
// genre is priced/issued through: "mono" (rc.request/qrcode.request,
// section 5 - covers every category here except C5/REMORQUE/BUS_ECOLE,
// since those aren't separate APIs, just genre values within Mono),
// "moto" (rc.moto/moto.request, section 6, C5 only), "remorque" (section
// 5.4/5.5) and "busEcole" (section 8). Only "mono" and "moto" are
// implemented in aasClient.js - REMORQUE and BUS_ECOLE need their own
// dedicated endpoints this build doesn't have, so the comparison engine
// must not quote/sell those genres either, same as the C4 exclusion.
const RAW_AAS_GENRES = [
  { category: "C1", genre: "VP", description: "Véhicule Particulier", digitized: true },
  { category: "C2", genre: "TPC", description: "Véhicules utilitaires à carrosserie Tourisme (ex: Break…)", digitized: true },
  { category: "C2", genre: "TPC3T500", description: "Véhicules utilitaires autres carrosseries jusqu'à 3T 500", digitized: true },
  { category: "C2", genre: "TPC3T500P", description: "Véhicules utilitaires autres carrosseries au-delà de 3T 500", digitized: true },
  { category: "C3", genre: "TPM3T500", description: "Véhicules transports publics de marchandises jusqu'à 3T 500", digitized: true },
  { category: "C3", genre: "TPM3T500P", description: "Véhicules transports publics de marchandises au-delà de 3T 500", digitized: true },
  { category: "C4", genre: "TPV8", description: "Véhicules utilisés pour transports de personnes à titre onéreux 8 places au plus", digitized: false },
  { category: "C4", genre: "TPV9", description: "Véhicules utilisés pour transports de personnes à titre onéreux 9 places et plus", digitized: false },
  { category: "C5", genre: "2RCYC", description: "Véhicules motorisés à deux roues ou trois roues - Cyclomoteurs", digitized: true },
  { category: "C5", genre: "2RSCO", description: "Véhicules motorisés à deux roues ou trois roues - Scooters et vélomoteurs jusqu'à 125 cm3", digitized: true },
  { category: "C5", genre: "2RMOT", description: "Véhicules motorisés à deux roues ou trois roues - Motocyclettes et scooters de plus de 125 cm3", digitized: true },
  { category: "C5", genre: "2RSID", description: "Véhicules motorisés à deux roues ou trois roues - Side-cars (toutes cylindrées)", digitized: true },
  { category: "C6", genre: "C6-WG-4R", description: "Garage Véhicule à 04 roues", digitized: true },
  { category: "C6", genre: "C6-WG-ATELIER-AUTRE", description: "Garage Véhicule à 02 ou 03 roues pour atelier autre", digitized: true },
  { category: "C7", genre: "C7-AE-SC-VTSDC_2R", description: "Side-cars Sans Double Commande", digitized: true },
  { category: "C7", genre: "C7-AE-VTADC", description: "Véhicule de Tourisme Avec Double Commande", digitized: true },
  { category: "C7", genre: "C7-AE-VTADC_TPC", description: "Véhicule des catégories 2, 3 Avec Double Commande", digitized: true },
  { category: "C7", genre: "C7-AE-VTSDC", description: "Véhicule de Tourisme Sans Double Commande", digitized: true },
  { category: "C7", genre: "C7-AE-VTSDC_TPC", description: "Véhicule des catégories 2, 3 Sans Double Commande", digitized: true },
  { category: "C8", genre: "C8-VLSC", description: "Véhicule de Location Sans Chauffeur", digitized: true },
  { category: "C8", genre: "C8-VLSC_TPC", description: "Véhicule de Location Sans Chauffeur TPC", digitized: true },
  { category: "C8", genre: "C8-VLSC_TPM3T500", description: "Véhicule de Location Sans Chauffeur TPM moins de 3T500", digitized: true },
  { category: "C8", genre: "C8-VLSC_TPM3T500P", description: "Véhicule de Location Sans Chauffeur TPM plus de 3T500", digitized: true },
  { category: "C9", genre: "C9-EMC-EXCLUSION", description: "Engins Mobiles de Chantier avec exclusions des accidents", digitized: true },
  { category: "C9", genre: "C9-EMC-EXTENSION", description: "Engins Mobiles de Chantier avec extension des accidents", digitized: true },
  { category: "C10", genre: "C10-VS-EMC", description: "Engins mobiles de chantiers - Tracteurs forestiers (avec ou sans chenilles) ne circulant pas sur la route", digitized: true },
  { category: "C10", genre: "C10-VS-EMC_TPC3T500", description: "Engins mobiles de chantiers - Tracteurs forestiers (avec ou sans chenilles) ne circulant pas sur la route de moins de 3T500", digitized: true },
  { category: "C10", genre: "C10-VS-EMC_TPC3T500P", description: "Engins mobiles de chantiers - Tracteurs forestiers (avec ou sans chenilles) ne circulant pas sur la route de plus de 3T500", digitized: true },
  { category: "C10", genre: "C10-VS-TAR", description: "Tracteurs agricoles et routiers (avec ou sans chenilles)", digitized: true },
  { category: "C10", genre: "C10-VS-TAR_TPC3T500", description: "Tracteurs agricoles et routiers (avec ou sans chenilles) de moins de 3T500", digitized: true },
  { category: "C10", genre: "C10-VS-TAR_TPC3T500P", description: "Tracteurs agricoles et routiers (avec ou sans chenilles) de plus de 3T500", digitized: true },
  { category: "C10", genre: "C10-VS-VACFF", description: "Voitures d'ambulances, corbillards et fourgons funéraires", digitized: true },
  { category: "C10", genre: "C10-VS-VAME", description: "Véhicules automobiles à moteur électrique", digitized: true },
  { category: "C10", genre: "C10-VS-VCP", description: "Véhicules des collectivités publiques", digitized: true },
  { category: "C10", genre: "C10-VS-VCP_TPC3T500", description: "Véhicules des collectivités publiques de moins de 3T500", digitized: true },
  { category: "C10", genre: "C10-VS-VCP_TPC3T500P", description: "Véhicules des collectivités publiques de plus de 3T500", digitized: true },
  { category: "BUS_ECOLE", genre: "BE-VTA", description: "Véhicule de Transport dans des autocars", digitized: true },
  { category: "BUS_ECOLE", genre: "BE-VTCATP", description: "Transport dans des camions aménagés pour le transport de personnes", digitized: true },
  { category: "REMORQUE", genre: "REMORQUE", description: "Remorque", digitized: true },
];

function familyForCategory(category) {
  if (category === "C5") return "moto";
  if (category === "REMORQUE") return "remorque";
  if (category === "BUS_ECOLE") return "busEcole";
  return "mono";
}

// `supported` is true only for the "mono"/"moto" families this build
// actually implements - see the header comment above. The comparison
// engine (aas.controller.js) must refuse REMORQUE/BUS_ECOLE genres the
// same way it already refuses undigitized (C4) ones.
const AAS_GENRES = RAW_AAS_GENRES.map((g) => {
  const family = familyForCategory(g.category);
  return { ...g, family, supported: g.digitized && (family === "mono" || family === "moto") };
});

const AAS_ENERGIES = ["ESSENCE", "DIESEL"];

const AAS_TYPE_PERSONNES = ["PHYSIQUE", "MORALE"];

// usage - C5 (deux roues) only.
const AAS_USAGES_C5 = ["commerciale", "non_commerciale"];

// --- Placeholder business decision (see file header) ---
// Which guarantee codes a "tier" name buys, for four-wheel (rc.request /
// qrcode.request) genres. RC is always included implicitly. Purely
// additive: a tier is exactly "RC + these codes", nothing removed.
const TIER_GARANTIES = {
  RC_SEULE: [],
  VOL_INCENDIE: [AAS_GARANTIES.VOL, AAS_GARANTIES.INCENDIE],
  TOUS_RISQUES: [
    AAS_GARANTIES.VOL,
    AAS_GARANTIES.INCENDIE,
    AAS_GARANTIES.BRIS_DE_GLACE,
    AAS_GARANTIES.TIERCE_COLLISION,
    AAS_GARANTIES.TIERCE_COMPLETE,
  ],
};

// Same idea for two-wheelers (rc.moto / moto.request, genre category C5).
const MOTO_TIER_GARANTIES = {
  RC_SEULE: [],
  CONDUCTEUR_PASSAGER: [AAS_GARANTIES.CONDUCTEUR_PASSAGER_MOTO],
  TOUS_RISQUES_MOTO: [AAS_GARANTIES.CONDUCTEUR_PASSAGER_MOTO, AAS_GARANTIES.VOL, AAS_GARANTIES.DEFENSE_RECOURS],
};

module.exports = {
  AAS_GARANTIES,
  AAS_GARANTIE_LABELS,
  AAS_GARANTIE_OPT_PT,
  AAS_GARANTIE_OPT_AR,
  AAS_GARANTIE_OPT_AS,
  AAS_PERIODICITES,
  AAS_GENRES,
  AAS_ENERGIES,
  AAS_TYPE_PERSONNES,
  AAS_USAGES_C5,
  TIER_GARANTIES,
  MOTO_TIER_GARANTIES,
};
