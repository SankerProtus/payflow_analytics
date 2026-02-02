import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { subscriptionController } from "../controller/subscriptionController.js";

export const subscriptionRoutes = express.Router();

subscriptionRoutes.use(authMiddleware);

// Start a new subscription
subscriptionRoutes.post("/create", subscriptionController.createSubscription);

// Modify an existing subscription
subscriptionRoutes.put("/:subscriptionId/update", subscriptionController.modifySubscription);

// Cancel a subscription
subscriptionRoutes.delete("/:subscriptionId/cancel", subscriptionController.cancelSubscription);

// Pause a subscription
subscriptionRoutes.post("/:subscriptionId/pause", subscriptionController.pauseSubscription);