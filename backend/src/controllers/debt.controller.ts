import { sendPushNotification } from "../services/push.service.js";
import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createDebtPayment,
  getDebtSummary,
} from "../services/debt.service.js";

const debtSchema = z.object({
  type: z.enum(["borrowed", "lent"]),
  personName: z.string().trim().min(1).max(100),
  principalAmount: z.number().positive().finite(),
  description: z.string().trim().max(200).optional().default(""),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive().finite(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).optional().default(""),
});

function parseDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) return null;
  return date;
}

export async function getDebts(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const debts = await prisma.debt.findMany({
      where: { userId: req.userId },
      include: { payments: { orderBy: { paymentDate: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      count: debts.length,
      debts: debts.map((debt) => ({
        ...debt,
        remainingAmount: Number(debt.principalAmount) - Number(debt.paidAmount),
      })),
    });
  } catch (error) {
    console.error("Get debts error:", error);
    return res.status(500).json({ success: false, message: "Unable to load debts" });
  }
}

export async function createDebt(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const result = debtSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid debt information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const data = result.data;
    const startDate = parseDate(data.startDate);
    const dueDate = data.dueDate ? parseDate(data.dueDate) : null;

    if (!startDate || (data.dueDate && !dueDate)) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    if (dueDate && dueDate < startDate) {
      return res.status(400).json({ success: false, message: "Due date cannot be before start date" });
    }
    console.log("BEFORE PRISMA:", {
  received: req.body.principalAmount,
  validated: data.principalAmount,
});

    const debt = await prisma.debt.create({
      data: {
        userId: req.userId,
        type: data.type,
        personName: data.personName,
        principalAmount: data.principalAmount,
        description: data.description,
        startDate,
        dueDate,
      },
    });
    void sendPushNotification(req.userId, {
  title: "Debt record created",
  message: `${debt.personName}: ${Number(debt.principalAmount).toLocaleString()} MMK`,
  level: "info",
  url: "/",
}).catch(error => {
  console.error("Debt push failed:", error);
});
    console.log("AFTER PRISMA:", {
  saved: debt.principalAmount.toString(),
});

    return res.status(201).json({
      success: true,
      message: "Debt created successfully",
      debt,
    });
  } catch (error) {
    console.error("Create debt error:", error);
    return res.status(500).json({ success: false, message: "Unable to create debt" });
  }
}

export async function addDebtPayment(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const debtId = req.params.id;
    if (typeof debtId !== "string" || !debtId) {
      return res.status(400).json({ success: false, message: "Invalid debt ID" });
    }

    const result = paymentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const paymentDate = parseDate(result.data.paymentDate);
    if (!paymentDate) {
      return res.status(400).json({ success: false, message: "Invalid payment date" });
    }

    const payment = await createDebtPayment(
      req.userId,
      debtId,
      result.data.amount,
      paymentDate,
      result.data.note
    );
    void sendPushNotification(req.userId, {
  title: "Debt payment recorded",
  message: `${result.data.amount.toLocaleString()} MMK payment recorded successfully.`,
  level: "success",
  url: "/",
}).catch(error => {
  console.error("Debt payment push failed:", error);
});

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      ...payment,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DEBT_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Debt not found" });
    }
    if (error instanceof Error && error.message === "INVALID_PAYMENT_AMOUNT") {
      return res.status(400).json({ success: false, message: "Payment exceeds remaining debt" });
    }
    console.error("Add debt payment error:", error);
    return res.status(500).json({ success: false, message: "Unable to record payment" });
  }
}
export async function archiveDebt(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const id = req.params.id;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        success: false,
        message: "Invalid debt ID",
      });
    }

    const result = await prisma.debt.updateMany({
      where: {
        id,
        userId: req.userId,
        status: "paid",
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    if (result.count === 0) {
      return res.status(400).json({
        success: false,
        message: "Only completed debts can be archived",
      });
    }

    return res.json({
      success: true,
      message: "Debt archived successfully",
    });
  } catch (error) {
    console.error("Archive debt error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to archive debt",
    });
  }
}
export async function restoreDebt(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const id = req.params.id;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        success: false,
        message: "Invalid debt ID",
      });
    }

    const result = await prisma.debt.updateMany({
      where: {
        id,
        userId: req.userId,
        archivedAt: { not: null },
      },
      data: {
        archivedAt: null,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        message: "Archived debt not found",
      });
    }

    return res.json({
      success: true,
      message: "Debt restored successfully",
    });
  } catch (error) {
    console.error("Restore debt error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to restore debt",
    });
  }
}

export async function getDebtOverview(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const summary = await getDebtSummary(req.userId);
    return res.json({ success: true, summary });
  } catch (error) {
    console.error("Debt overview error:", error);
    return res.status(500).json({ success: false, message: "Unable to load debt overview" });
  }
}
