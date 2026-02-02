import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { paymentMethodController } from "../controller/paymentMethodController.js";

export const paymentMethodRoutes = express.Router();

paymentMethodRoutes.use(authMiddleware);

// Save a new payment method
paymentMethodRoutes.post("/attach", paymentMethodController.savePaymentMethod);

// Detach an existing payment method
paymentMethodRoutes.post("/:paymentMethodId/detach", paymentMethodController.detachPaymentMethod);