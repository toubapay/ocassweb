const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { createOtp, verifyOtp } = require("../../utils/otp");
const { signToken } = require("../../utils/jwt");

const requestOtpSchema = z.object({
  phone: z.string().min(6, "Enter a valid phone number"),
});

const verifyOtpSchema = z.object({
  phone: z.string().min(6),
  code: z.string().length(6),
  name: z.string().optional(),
});

async function requestOtp(req, res, next) {
  try {
    const { phone } = requestOtpSchema.parse(req.body);
    const { code, devMode } = await createOtp(phone);
    res.json({
      message: "OTP sent",
      // Only echoed back when OTP_DEV_MODE=true, so the flow is testable
      // without a live SMS provider. Never sent in production mode.
      ...(devMode ? { devCode: code } : {}),
    });
  } catch (err) {
    next(err);
  }
}

async function verifyOtpAndLogin(req, res, next) {
  try {
    const { phone, code, name } = verifyOtpSchema.parse(req.body);
    const result = await verifyOtp(phone, code);
    if (!result.valid) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({ data: { phone, name } });
    }

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { requestOtp, verifyOtpAndLogin, me };
