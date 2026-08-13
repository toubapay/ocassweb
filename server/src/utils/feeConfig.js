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

module.exports = { getModuleFeeConfig };
