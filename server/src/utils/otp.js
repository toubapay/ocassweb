const prisma = require("../lib/prisma");
const { sendSms } = require("./smsGateway");

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function createOtp(phone) {
  const ttlMinutes = Number(process.env.OTP_TTL_MINUTES || 5);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.otpCode.create({ data: { phone, code, expiresAt } });

  // In dev mode there is no SMS send at all - the code is logged
  // server-side and echoed back in the API response for testing. In
  // production it goes out through whatever gateway an admin configured
  // under /admin/providers (see smsGateway.js) - there's no SMS vendor
  // hardcoded here, since gateways (ProMobile or otherwise) each have
  // their own API contract that only the admin adding one actually knows.
  const devMode = process.env.OTP_DEV_MODE === "true";
  if (devMode) {
    console.log(`[OTP] ${phone} -> ${code} (expires in ${ttlMinutes}m)`);
  } else {
    const message = `Your Ocass verification code is ${code}. It expires in ${ttlMinutes} minutes.`;
    const result = await sendSms(phone, message, { code });
    if (!result.sent) {
      console.warn(`[OTP] SMS send to ${phone} failed: ${result.reason || result.status}`);
    }
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
