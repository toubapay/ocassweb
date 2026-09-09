const { z } = require("zod");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");

const subscribeSchema = z.object({ planId: z.string().uuid() });

async function listPlans(req, res, next) {
  try {
    const { category } = req.query;
    const plans = await prisma.insurancePlan.findMany({
      where: category ? { category: String(category).toUpperCase() } : undefined,
      orderBy: { premiumMonthly: "asc" },
    });
    res.json({ plans });
  } catch (err) {
    next(err);
  }
}

async function listMyPolicies(req, res, next) {
  try {
    const policies = await prisma.insurancePolicy.findMany({
      where: { userId: req.user.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ policies });
  } catch (err) {
    next(err);
  }
}

/**
 * Charges one month's premium from the wallet up front and activates the
 * policy immediately on success - mirrors the AAS auto-insurance purchase
 * flow (aas.controller.js's purchaseAutoPolicy): create the record first,
 * debit the wallet, then roll the record back if the debit fails so a
 * PENDING policy never lingers unpaid.
 */
async function subscribe(req, res, next) {
  try {
    const { planId } = subscribeSchema.parse(req.body);
    const plan = await prisma.insurancePlan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const policy = await prisma.insurancePolicy.create({
      data: { userId: req.user.id, planId, status: "PENDING", startDate, endDate },
      include: { plan: true },
    });

    try {
      await walletService.debit({
        userId: req.user.id,
        amount: plan.premiumMonthly,
        purpose: "INSURANCE_POLICY",
        purposeId: policy.id,
        description: `${plan.name} - first month's premium`,
      });
    } catch (debitErr) {
      await prisma.insurancePolicy.delete({ where: { id: policy.id } });
      if (debitErr instanceof walletService.InsufficientBalanceError) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
    }

    const activePolicy = await prisma.insurancePolicy.update({
      where: { id: policy.id },
      data: { status: "ACTIVE" },
      include: { plan: true },
    });
    res.status(201).json({ policy: activePolicy });
  } catch (err) {
    next(err);
  }
}

async function cancelPolicy(req, res, next) {
  try {
    const existing = await prisma.insurancePolicy.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({ message: "Policy not found" });
    }
    if (!["PENDING", "ACTIVE"].includes(existing.status)) {
      return res.status(400).json({ message: `Cannot cancel a policy that is ${existing.status}` });
    }
    const policy = await prisma.insurancePolicy.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED" },
      include: { plan: true },
    });
    res.json({ policy });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPlans, listMyPolicies, subscribe, cancelPolicy };
