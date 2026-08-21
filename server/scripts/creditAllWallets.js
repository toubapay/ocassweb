// One-off promotional wallet credit: adds a fixed amount to every active
// user's wallet.
//
// Usage (Render dashboard > your backend service > Shell tab, so
// DATABASE_URL is already the live one from that service's environment -
// no .env file needed there):
//   node scripts/creditAllWallets.js            # dry run - lists what
//                                                # would happen, no writes
//   node scripts/creditAllWallets.js --confirm   # actually credits wallets
//
// Safe to re-run: each credit is tagged with PROMO_PURPOSE below, and a
// user already carrying that tag is skipped rather than credited twice -
// so an interrupted run (crash, Shell tab closed mid-run) can just be
// re-run with --confirm and it'll only finish the users it didn't reach.
//
// Adjust AMOUNT / PROMO_PURPOSE / the `where` filter below before running -
// defaults to every active user regardless of role (customers, vendors,
// delivery agents, admins, ...). Narrow the filter first if that's wider
// than intended (e.g. add `role: "CUSTOMER"` to exclude staff/admin
// accounts).

require("dotenv").config();
const prisma = require("../src/lib/prisma");
const walletService = require("../src/modules/wallet/wallet.service");

const AMOUNT = 50000;
// Unique per promo run - change this if you ever run a second, different
// promotional credit, so idempotency-checking doesn't confuse the two.
const PROMO_PURPOSE = "PROMO_CREDIT_2026_08";
const DESCRIPTION = "Promotional wallet credit";

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, phone: true },
  });

  console.log(`Active users found: ${users.length}`);
  console.log(`Amount per user: ${AMOUNT} CFA`);
  console.log(`Total if every user is newly credited: ${users.length * AMOUNT} CFA`);
  console.log(`Purpose tag: ${PROMO_PURPOSE}`);

  if (!CONFIRM) {
    console.log("\nDRY RUN - no wallets were touched. Re-run with --confirm to actually credit them.");
    await prisma.$disconnect();
    return;
  }

  let credited = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const wallet = await walletService.getOrCreateWallet(user.id);
      const alreadyCredited = await prisma.walletTransaction.findFirst({
        where: { walletId: wallet.id, purpose: PROMO_PURPOSE },
      });
      if (alreadyCredited) {
        skipped++;
        continue;
      }

      await walletService.credit({
        userId: user.id,
        amount: AMOUNT,
        type: "ADJUSTMENT",
        purpose: PROMO_PURPOSE,
        description: DESCRIPTION,
      });
      credited++;
      if (credited % 50 === 0) console.log(`... ${credited} credited so far`);
    } catch (err) {
      failed++;
      console.error(`Failed for user ${user.id} (${user.phone}):`, err.message);
    }
  }

  console.log(`\nDone. Credited: ${credited}, already-credited/skipped: ${skipped}, failed: ${failed}.`);
  console.log(`Total newly credited: ${credited * AMOUNT} CFA`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
