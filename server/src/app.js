const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./modules/auth/auth.routes");
const ecommerceRoutes = require("./modules/ecommerce/ecommerce.routes");
const deliveryRoutes = require("./modules/delivery/delivery.routes");
const insuranceRoutes = require("./modules/insurance/insurance.routes");
const aasRoutes = require("./modules/insurance/aas.routes");
const restaurantRoutes = require("./modules/restaurant/restaurant.routes");
const rideshareRoutes = require("./modules/rideshare/rideshare.routes");
const mobileRoutes = require("./modules/mobile/mobile.routes");
const paymentsRoutes = require("./modules/payments/payments.routes");
const walletRoutes = require("./modules/wallet/wallet.routes");
const vendorRoutes = require("./modules/vendor/vendor.routes");
const anandoRoutes = require("./modules/anando/anando.routes");
const notificationsRoutes = require("./modules/notifications/notifications.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { requireModuleEnabled } = require("./middleware/moduleGate");
const { MODULE_KEYS } = require("./constants/modules");
const prisma = require("./lib/prisma");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
// Default 100kb is too small for the carte grise photo scan endpoint
// (base64-encoded phone photos), so every route gets the same raised
// limit rather than special-casing one.
app.use(express.json({ limit: "10mb" }));
// PayDunya's IPN callback is form-encoded, not JSON.
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Public, unauthenticated: lets the web/mobile clients hide a module's nav
// entry when an ADMIN has disabled it (see /admin/modules), without every
// client needing its own admin-authenticated round trip just to know.
app.get("/api/modules/status", async (req, res, next) => {
  try {
    await prisma.moduleConfig.createMany({
      data: MODULE_KEYS.map((m) => ({ key: m.key, label: m.label })),
      skipDuplicates: true,
    });
    const modules = await prisma.moduleConfig.findMany({ select: { key: true, enabled: true } });
    res.json(Object.fromEntries(modules.map((m) => [m.key, m.enabled])));
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/ecommerce", requireModuleEnabled("ecommerce"), ecommerceRoutes);
app.use("/api/delivery", requireModuleEnabled("delivery"), deliveryRoutes);
app.use("/api/insurance/auto", requireModuleEnabled("insurance"), aasRoutes);
app.use("/api/insurance", requireModuleEnabled("insurance"), insuranceRoutes);
app.use("/api/restaurants", requireModuleEnabled("restaurant"), restaurantRoutes);
app.use("/api/rideshare", requireModuleEnabled("rideshare"), rideshareRoutes);
app.use("/api/mobile", requireModuleEnabled("mobile"), mobileRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/wallet", requireModuleEnabled("wallet"), walletRoutes);
app.use("/api/vendor", requireModuleEnabled("vendor"), vendorRoutes);
app.use("/api/anando", requireModuleEnabled("anando"), anandoRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
