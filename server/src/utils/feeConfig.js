const prisma = require("../lib/prisma");

/**
 * Merges a module's admin-configured feeConfig (see ModuleConfig, set via
 * PATCH /api/admin/modules/:key) over hard-coded defaults. Missing/partial
 * feeConfig (including a fresh database that's never had an admin touch
 * this module) falls back to `defaults` field-by-field, so the app keeps
 * working with sane pricing even before an admin configures anything.
 */
async function getModuleFeeConfig(key, defaults) {
  const config = await prisma.moduleConfig.findUnique({ where: { key } });
  return { ...defaults, ...(config?.feeConfig || {}) };
}

/**
 * Clamps a computed fee into an admin-configured [minFee, maxFee] range -
 * either bound is optional (missing/non-numeric = no clamp on that side),
 * so a module with only a max cap (or none at all) behaves the same as
 * before this existed.
 */
function clampFee(value, { minFee, maxFee } = {}) {
  let clamped = value;
  if (typeof minFee === "number" && Number.isFinite(minFee) && clamped < minFee) {
    clamped = minFee;
  }
  if (typeof maxFee === "number" && Number.isFinite(maxFee) && clamped > maxFee) {
    clamped = maxFee;
  }
  return clamped;
}

module.exports = { getModuleFeeConfig, clampFee };
