const { z } = require("zod");
const crypto = require("crypto");
const prisma = require("../../lib/prisma");
const walletService = require("../wallet/wallet.service");
const { getServiceFeeConfig, computeFeeAndTax } = require("../../utils/serviceFee");

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

/** GET /mobile/forfaits?serviceId= - the named bundle catalog for one AIRTIME service. */
async function listForfaits(req, res, next) {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      return res.status(400).json({ message: "serviceId is required" });
    }
    const forfaits = await prisma.mobileForfait.findMany({
      where: { serviceId: String(serviceId), isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { price: "asc" }],
    });
    res.json({ forfaits });
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

const feeQuoteSchema = z
  .object({
    serviceId: z.string().uuid().optional(),
    forfaitId: z.string().uuid().optional(),
    amount: z.coerce.number().positive().optional(),
  })
  .refine((data) => data.forfaitId || (data.serviceId && data.amount), {
    message: "Provide either forfaitId, or serviceId and amount",
  });

/**
 * GET /mobile/fee-quote - lets the client show the real total (base amount
 * + admin-configured fee + TVA) before the customer confirms a purchase,
 * without actually charging anything. Same fee resolution as createTopup/
 * createBillPayment below, so the confirm screen never shows a number
 * different from what actually gets charged.
 */
async function getFeeQuote(req, res, next) {
  try {
    const data = feeQuoteSchema.parse(req.query);
    let baseAmount;
    let serviceType;
    let serviceId;

    if (data.forfaitId) {
      const forfait = await prisma.mobileForfait.findUnique({ where: { id: data.forfaitId } });
      if (!forfait || !forfait.isActive) {
        return res.status(404).json({ message: "Forfait not found" });
      }
      baseAmount = Number(forfait.price);
      serviceType = "MobileForfait";
      serviceId = forfait.id;
    } else {
      const service = await prisma.mobileService.findUnique({ where: { id: data.serviceId } });
      if (!service || !service.isActive) {
        return res.status(404).json({ message: "Service not found" });
      }
      baseAmount = data.amount;
      serviceType = "MobileService";
      serviceId = service.id;
    }

    const feeConfig = await getServiceFeeConfig("mobile", serviceType, serviceId);
    const { feeAmount, taxAmount, total } = computeFeeAndTax(baseAmount, feeConfig);
    res.json({ subtotal: baseAmount, feeAmount, taxAmount, total });
  } catch (err) {
    next(err);
  }
}

const topupSchema = z
  .object({
    serviceId: z.string().uuid().optional(),
    forfaitId: z.string().uuid().optional(),
    phoneNumber: z.string().min(6),
    amount: z.number().positive().optional(),
  })
  .refine((data) => data.forfaitId || (data.serviceId && data.amount), {
    message: "Provide either forfaitId, or serviceId and amount",
  });

async function createTopup(req, res, next) {
  try {
    const data = topupSchema.parse(req.body);

    let service;
    let forfait = null;
    let amount;

    if (data.forfaitId) {
      forfait = await prisma.mobileForfait.findUnique({
        where: { id: data.forfaitId },
        include: { service: true },
      });
      if (!forfait || !forfait.isActive) {
        return res.status(404).json({ message: "Forfait not found" });
      }
      service = forfait.service;
      // The forfait's own price is what gets charged - a client-supplied
      // amount is never trusted here even if one were sent alongside it.
      amount = Number(forfait.price);
    } else {
      service = await prisma.mobileService.findUnique({ where: { id: data.serviceId } });
      amount = data.amount;
    }

    if (!service || !service.isActive || service.type !== "AIRTIME") {
      return res.status(400).json({ message: "Invalid top-up service" });
    }
    if (!forfait) {
      if (service.minAmount && amount < Number(service.minAmount)) {
        return res.status(400).json({ message: `Minimum top-up is ${service.minAmount}` });
      }
      if (service.maxAmount && amount > Number(service.maxAmount)) {
        return res.status(400).json({ message: `Maximum top-up is ${service.maxAmount}` });
      }
    }

    // A forfait's fee/tax is configured against the forfait itself, not
    // its parent service, so a bundle can be priced differently from a
    // plain custom-amount top-up on the same operator.
    const feeConfig = await getServiceFeeConfig(
      "mobile",
      forfait ? "MobileForfait" : "MobileService",
      forfait ? forfait.id : service.id
    );
    const { feeAmount, taxAmount, total: chargeAmount } = computeFeeAndTax(amount, feeConfig);

    // Created PENDING first so the wallet debit below has a purposeId to
    // record against; deleted again if the debit fails before any money
    // actually moves (mirrors restaurant/insurance's checkout pattern).
    const transaction = await prisma.mobileTransaction.create({
      data: {
        userId: req.user.id,
        serviceId: service.id,
        forfaitId: forfait?.id || null,
        type: "AIRTIME",
        phoneNumber: data.phoneNumber,
        amount,
        feeAmount,
        taxAmount,
        status: "PENDING",
        reference: generateReference(),
      },
    });

    try {
      await walletService.debit({
        userId: req.user.id,
        amount: chargeAmount,
        purpose: "MOBILE_TOPUP",
        purposeId: transaction.id,
        description: forfait ? `${service.name} - ${forfait.name}` : `${service.name} top-up`,
      });
    } catch (debitErr) {
      await prisma.mobileTransaction.delete({ where: { id: transaction.id } });
      if (debitErr instanceof walletService.InsufficientBalanceError) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
    }

    const finalTransaction = await prisma.mobileTransaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESS" },
      include: { service: true, forfait: true },
    });
    res.status(201).json({ transaction: finalTransaction });
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

    const feeConfig = await getServiceFeeConfig("mobile", "MobileService", service.id);
    const { feeAmount, taxAmount, total: chargeAmount } = computeFeeAndTax(amount, feeConfig);

    const transaction = await prisma.mobileTransaction.create({
      data: {
        userId: req.user.id,
        serviceId,
        type: "BILL",
        accountNumber,
        amount,
        feeAmount,
        taxAmount,
        status: "PENDING",
        reference: generateReference(),
      },
    });

    try {
      await walletService.debit({
        userId: req.user.id,
        amount: chargeAmount,
        purpose: "MOBILE_BILL",
        purposeId: transaction.id,
        description: `${service.name} bill payment`,
      });
    } catch (debitErr) {
      await prisma.mobileTransaction.delete({ where: { id: transaction.id } });
      if (debitErr instanceof walletService.InsufficientBalanceError) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }
      return res.status(502).json({ message: "Could not complete wallet payment. Please try again." });
    }

    const finalTransaction = await prisma.mobileTransaction.update({
      where: { id: transaction.id },
      data: { status: "SUCCESS" },
      include: { service: true },
    });
    res.status(201).json({ transaction: finalTransaction });
  } catch (err) {
    next(err);
  }
}

async function listMyTransactions(req, res, next) {
  try {
    const transactions = await prisma.mobileTransaction.findMany({
      where: { userId: req.user.id },
      include: { service: true, forfait: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listServices,
  listForfaits,
  detectOperator,
  getFeeQuote,
  createTopup,
  createBillPayment,
  listMyTransactions,
};
