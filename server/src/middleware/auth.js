const { verifyToken } = require("../utils/jwt");
const prisma = require("../lib/prisma");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ message: "Invalid session" });
    if (!user.active) {
      return res.status(403).json({ message: "This account has been suspended" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Gates a route to one or more roles. Must run after requireAuth. req.user
 * is re-fetched from the DB on every request (not decoded from the JWT), so
 * a role change via PATCH /api/auth/role takes effect on the next request -
 * no re-login needed.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized for this action" });
    }
    next();
  };
}

/**
 * Ownership-based gate for a vendor's own store routes (GET/PATCH /store,
 * products, orders) - stronger and more durable than gating on the
 * self-serve `role === "VENDOR"` toggle (PATCH /auth/role), since a store
 * doesn't stop being owned by its creator just because they later flip
 * their role to e.g. DELIVERY_AGENT to also pick up delivery jobs. Must
 * run after requireAuth. Not used for POST /store itself - creating a
 * store is how a user becomes an owner in the first place, so it can't be
 * gated on already owning one (createStore self-guards against duplicates).
 */
async function requireStoreOwner(req, res, next) {
  const store = await prisma.store.findUnique({ where: { ownerId: req.user.id } });
  if (!store) {
    return res.status(403).json({ message: "Not authorized for this action" });
  }
  next();
}

/** Same rationale as requireStoreOwner, for a restaurant owner's /owner/* routes. */
async function requireRestaurantOwner(req, res, next) {
  const restaurant = await prisma.restaurant.findUnique({ where: { ownerId: req.user.id } });
  if (!restaurant) {
    return res.status(403).json({ message: "Not authorized for this action" });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireStoreOwner, requireRestaurantOwner };
