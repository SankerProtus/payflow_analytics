import express from 'express';
import { webhooksController } from "../controller/webhooksController.js";
export const webhookRoutes = express.Router();
webhookRoutes.use(express.raw({ type: 'application/json' }));

webhookRoutes.post("/stripe", webhooksController.stripeWebhookHandler);
