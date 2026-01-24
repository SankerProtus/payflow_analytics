import express from 'express';
import {authMiddleware} from "../middlewares/authMiddleware.js";
import { webhooksController } from "../controller/webhooksController.js";
export const webhookRoutes = express.Router();

webhookRoutes.post("/webhooks/stripe", authMiddleware, webhooksController.stripe);
