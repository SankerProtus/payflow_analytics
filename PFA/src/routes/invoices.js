import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { getInvoices } from "../controllers/invoiceController.js";
export const invoiceRoutes = express.Router();

invoiceRoutes.use(authMiddleware);
// Retrieve invoices for a specific customer
invoiceRoutes.get("/:customerId", getInvoices);

// Retry failed invoice payment
invoiceRoutes.post("/:invoiceId/retry", retryInvoicePayment);

