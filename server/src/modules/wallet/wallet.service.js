const prisma = require("../../lib/prisma");

async function getOrCreateWallet(userId) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  // Race-safe: two concurrent first-touches both try to create, the loser's
  // unique constraint on userId fails and falls back to a plain read.
  try {
    return await prisma.wallet.create({ data: { userId } });
  } catch (err) {
    if (err.code === "P2002") {
      return prisma.wallet.findUniqueOrThrow({ where: { userId } });
    }
    throw err;
  }
}

/** Adds funds. Used for topups and refunds. */
async function credit({ userId, amount, type = "TOPUP", purpose, purposeId, description }) {
  if (amount <= 0) throw new Error("Credit amount must be positive");
  const wallet = await getOrCreateWallet(userId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        direction: "CREDIT",
        amount,
        balanceAfter: updated.balance,
        purpose,
        purposeId,
        description,
      },
    });
    return updated;
  });
}

class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance");
    this.code = "INSUFFICIENT_BALANCE";
  }
}

/**
 * Removes funds. Used for wallet-as-payment-method purchases. Atomic
 * against concurrent debits: the conditional `updateMany` (balance >=
 * amount) only touches a row if the balance check still holds at write
 * time, so two simultaneous debits can't both succeed against a balance
 * that only covers one of them.
 */
async function debit({ userId, amount, type = "PAYMENT", purpose, purposeId, description }) {
  if (amount <= 0) throw new Error("Debit amount must be positive");
  const wallet = await getOrCreateWallet(userId);

  return prisma.$transaction(async (tx) => {
    const result = await tx.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new InsufficientBalanceError();
    }
    const updated = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        direction: "DEBIT",
        amount,
        balanceAfter: updated.balance,
        purpose,
        purposeId,
        description,
      },
    });
    return updated;
  });
}

async function listTransactions(userId) {
  const wallet = await getOrCreateWallet(userId);
  return prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
  });
}

module.exports = { getOrCreateWallet, credit, debit, listTransactions, InsufficientBalanceError };
