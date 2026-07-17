const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const authRoutes = require("./modules/auth/auth.routes");
const ecommerceRoutes = require("./modules/ecommerce/ecommerce.routes");
const deliveryRoutes = require("./modules/delivery/delivery.routes");
const insuranceRoutes = require("./modules/insurance/insurance.routes");
const restaurantRoutes = require("./modules/restaurant/restaurant.routes");
const rideshareRoutes = require("./modules/rideshare/rideshare.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/ecommerce", ecommerceRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/insurance", insuranceRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/rideshare", rideshareRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
