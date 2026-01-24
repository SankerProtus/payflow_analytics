import express from "express";
import {authMiddleware} from "../middlewares/authMiddleware.js";
import {customerController} from "../controller/customerController.js";

export const customerRoutes = express.Router();

// All routes require authentication
customerRoutes.use(authMiddleware);

// Customer CRUD operations
customerRoutes.get("/", customerController.getCustomers);
customerRoutes.get("/:id", customerController.getById);
customerRoutes.get("/:id/timeline", customerController.getTimeline);
customerRoutes.get("/:id/statistics", customerController.getStatistics);
customerRoutes.post("/", customerController.create);

