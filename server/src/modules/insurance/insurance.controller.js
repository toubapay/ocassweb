const { z } = require("zod");
const prisma = require("../../lib/prisma");

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

async function subscribe(req, res, next) {
  try {
    const { planId } = subscribeSchema.parse(req.body);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const policy = await prisma.insurancePolicy.create({
      data: { userId: req.user.id, planId, status: "PENDING", startDate, endDate },
      include: { plan: true },
    });
    res.status(201).json({ policy });
  } catch (err) {
    next(err);
  }
}

module.exports = { listPlans, listMyPolicies, subscribe };
