const prisma = require("../lib/prisma");

/**
 * Looks up the admin-configured ServiceFeeConfig row for one specific
 * service, if any - see PUT /api/admin/service-fees. Returns null when
 * nothing's been configured (the common case), which computeFeeAndTax
 * below treats as "no fee, no tax".
 */
async function getServiceFeeConfig(moduleKey, serviceType, serviceId) {
  return prisma.serviceFeeConfig.findUnique({
    where: { moduleKey_serviceType_serviceId: { moduleKey, serviceType, serviceId } },
  });
}

/**
 * Computes the platform fee and TVA to add on top of `baseAmount`, from a
 * ServiceFeeConfig row (or null/undefined, e.g. no row configured yet).
 * Both are computed independently off `baseAmount` - the fee is never
 * taxed and the tax is never fee'd - so the result is easy to reason
 * about and display as a flat two-line breakdown. Rounded to the nearest
 * CFA (2 decimal places, though CFA has no subunit in practice) to match
 * how every other money calculation in this codebase rounds.
 */
function computeFeeAndTax(baseAmount, config) {
  const feeAmount = config?.feeEnabled
    ? round2(
        config.feeType === "FLAT" ? Number(config.feeValue) : baseAmount * (Number(config.feeValue) / 100)
      )
    : 0;
  const taxAmount = config?.taxEnabled ? round2(baseAmount * (Number(config.taxRatePercent) / 100)) : 0;
  return { feeAmount, taxAmount, total: round2(baseAmount + feeAmount + taxAmount) };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

module.exports = { getServiceFeeConfig, computeFeeAndTax };
