import notificationRoutes from "./routes/notification.routes.js";
import savingsRoutes from "./routes/savings.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import budgetRoutes from "./routes/budget.routes.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import reportRoutes from "./routes/report.routes.js";

import { prisma } from "./config/prisma.js";
import debtRoutes from "./routes/debt.routes.js";


const app = express();

app.use(helmet());
app.use("/api/reports", reportRoutes);
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "1mb" }));

// API Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "FinTrack API is running",
    timestamp: new Date().toISOString(),
  });
});

// Database Readiness Check
app.get("/api/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      success: true,
      message: "FinTrack API and database are ready",
      checks: {
        database: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "Database is unavailable",
      checks: {
        database: "disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Authentication Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/savings", savingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/debts", debtRoutes);
export default app;
