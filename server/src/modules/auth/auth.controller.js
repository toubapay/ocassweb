const { z } = require("zod");
const prisma = require("../../lib/prisma");
const { createOtp, verifyOtp } = require("../../utils/otp");
const { signToken } = require("../../utils/jwt");
const { verifyPassword } = require("../../utils/password");

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

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * The admin console's own login (email + password), entirely separate from
 * the customer phone/OTP flow above. Deliberately requires role === "ADMIN"
 * on top of a matching password - a passwordHash existing on some other
 * account (there isn't a self-service way to set one) still couldn't be
 * used to bypass OTP for a non-admin account.
 */
async function adminLogin(req, res, next) {
  try {
    const { email, password } = adminLoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || user.role !== "ADMIN") {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.active) {
      return res.status(403).json({ message: "This account has been suspended" });
    }
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

const SELF_SERVICE_ROLES = ["CUSTOMER", "DELIVERY_AGENT", "RIDER", "VENDOR", "RESTAURANT_OWNER"];
const updateRoleSchema = z.object({
  role: z.enum(SELF_SERVICE_ROLES),
});

/**
 * Lets a user opt themselves into gig work (delivery agent / rider) or
 * selling (vendor / restaurant owner), or back out to plain customer - no
 * verification/approval flow for any of these yet, this is a self-serve
 * MVP toggle. ADMIN is intentionally excluded: that implies a real
 * onboarding process this app doesn't have.
 */
async function updateRole(req, res, next) {
  try {
    const { role } = updateRoleSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.user.id }, data: { role } });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { requestOtp, verifyOtpAndLogin, me, updateRole, adminLogin };
