// One-off admin account creation/reset - creates a new ADMIN user with
// email+password login (POST /auth/admin/login), or resets the password
// on an existing one if that email already exists.
//
// Usage (Render dashboard > your backend service > Shell tab, so
// DATABASE_URL is already the live one from that service's environment -
// no .env file needed there):
//   node scripts/create-admin.js <email> <password>
//
// Example:
//   node scripts/create-admin.js admin@gmail.com saynabou
//
// Safe to re-run: if the email already belongs to a non-admin user, this
// promotes it to ADMIN and sets the given password rather than erroring;
// if it's already an admin, this just resets the password.

require("dotenv").config();
const prisma = require("../src/lib/prisma");
const { hashPassword } = require("../src/utils/password");

const [, , email, password] = process.argv;

async function main() {
  if (!email || !password) {
    console.error("Usage: node scripts/create-admin.js <email> <password>");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Password must be at least 6 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN", active: true },
    create: { email, passwordHash, role: "ADMIN", name: "Admin" },
  });

  console.log(`Admin ready: ${user.email} (id: ${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
