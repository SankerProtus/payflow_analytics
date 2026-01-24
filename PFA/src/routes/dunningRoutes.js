import express from 'express';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { dunningController } from "../controller/dunningController.js";

export const dunningRoutes = express.Router();

// All routes require authentication
dunningRoutes.use(authMiddleware);

// Dunning routes
dunningRoutes.get("/", dunningController.getDunning);

