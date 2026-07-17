const prisma = require("../lib/prisma");

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createOtp(phone) {
  const ttlMinutes = Number(process.env.OTP_TTL_MINUTES || 5);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  // In dev mode there is no SMS provider wired up, so the code is logged
  // server-side and echoed back in the API response for testing.
  const devMode = process.env.OTP_DEV_MODE === "true";
  if (devMode) {
    console.log(`[OTP] ${phone} -> ${code} (expires in ${ttlMinutes}m)`);
  } else {
    // TODO: integrate an SMS provider (e.g. Twilio) here for production.
    console.warn("[OTP] OTP_DEV_MODE is off but no SMS provider is configured.");
  }

  return { code, expiresAt, devMode };
}

async function verifyOtp(phone, code) {
  const otp = await prisma.otpCode.findFirst({
    where: { phone, code, consumed: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return { valid: false, reason: "invalid_code" };
  if (otp.expiresAt < new Date()) return { valid: false, reason: "expired" };

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumed: true },
  });

  return { valid: true };
}

module.exports = { createOtp, verifyOtp };
