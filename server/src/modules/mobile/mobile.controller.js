const { z } = require("zod");
const crypto = require("crypto");
const prisma = require("../../lib/prisma");

function generateReference() {
  return `TOP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

async function listServices(req, res, next) {
  try {
    const { type, billCategory } = req.query;
    const services = await prisma.mobileService.findMany({
      where: {
        isActive: true,
        ...(type ? { type: String(type).toUpperCase() } : {}),
        ...(billCategory ? { billCategory: String(billCategory).toUpperCase() } : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json({ services });
  } catch (err) {
    next(err);
  }
}

async function detectOperator(req, res, next) {
  try {
    const phone = String(req.query.phone || "").replace(/[^0-9]/g, "");
    // Match against the last-entered national number, not any country-code
    // prefix. Senegalese mobile numbers are 9 digits (e.g. 771234567, no
    // leading 0 in the formal national format, though a habitual leading 0
    // is common) - taking suffixes of the typed digits handles a bare
    // 9-digit number, a habitual leading-0 10-digit number, and a full
    // +221-prefixed number the same way, since the real prefix is always
    // in the last 9 digits.
    const candidates = [phone.slice(-9), phone.slice(-8), phone];
    const operators = await prisma.mobileService.findMany({
      where: { type: "AIRTIME", isActive: true },
    });
    const match = operators.find((op) =>
      op.phonePrefixes.some((prefix) => candidates.some((c) => c.startsWith(prefix)))
    );
    res.json({ service: match || null });
  } catch (err) {
    next(err);
  }
}

const topupSchema = z.object({
  serviceId: z.string().uuid(),
  phoneNumber: z.string().min(6),
  amount: z.number().positive(),
});

async function createTopup(req, res, next) {
  try {
    const { serviceId, phoneNumber, amount } = topupSchema.parse(req.body);
    const service = await prisma.mobileService.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive || service.type === "BILL") {
      return res.status(400).json({ message: "Invalid top-up service" });
    }
    if (service.minAmount && amount < Number(service.minAmount)) {
      return res.status(400).json({ message: `Minimum top-up is ${service.minAmount}` });
    }
    if (service.maxAmount && amount > Number(service.maxAmount)) {
      return res.status(400).json({ message: `Maximum top-up is ${service.maxAmount}` });
    }

    const transaction = await prisma.mobileTransaction.create({
      data: {
        userId: req.user.id,
        serviceId,
        type: service.type,
        phoneNumber,
        amount,
        status: "SUCCESS",
        reference: generateReference(),
      },
      include: { service: true },
    });
    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
}

const billPaymentSchema = z.object({
  serviceId: z.string().uuid(),
  accountNumber: z.string().min(2),
  amount: z.number().positive(),
});

async function createBillPayment(req, res, next) {
  try {
    const { serviceId, accountNumber, amount } = billPaymentSchema.parse(req.body);
    const service = await prisma.mobileService.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive || service.type !== "BILL") {
      return res.status(400).json({ message: "Invalid biller" });
    }
    if (service.minAmount && amount < Number(service.minAmount)) {
      return res.status(400).json({ message: `Minimum payment is ${service.minAmount}` });
    }
    if (service.maxAmount && amount > Number(service.maxAmount)) {
      return res.status(400).json({ message: `Maximum payment is ${service.maxAmount}` });
    }

    const transaction = await prisma.mobileTransaction.create({
      data: {
        userId: req.user.id,
        serviceId,
        type: "BILL",
        accountNumber,
        amount,
        status: "SUCCESS",
        reference: generateReference(),
      },
      include: { service: true },
    });
    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
}

async function listMyTransactions(req, res, next) {
  try {
    const transactions = await prisma.mobileTransaction.findMany({
      where: { userId: req.user.id },
      include: { service: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listServices,
  detectOperator,
  createTopup,
  createBillPayment,
  listMyTransactions,
};
