import type { Response } from "express";
import { z } from "zod";
import { checkBudgetAlerts } from "../services/budget-alert.service.js";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const budgetSchema = z.object({
  category: z.string().trim().min(1).max(100),
  limitAmount: z.number().positive().finite(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

const updateSchema = budgetSchema.partial();

export async function getBudgets(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: req.userId },
      orderBy: [{ month: "desc" }, { category: "asc" }],
    });

    return res.status(200).json({
      success: true,
      count: budgets.length,
      budgets,
    });
  } catch (error) {
    console.error("Get budgets error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load budgets",
    });
  }
}

export async function createBudget(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = budgetSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const { category, limitAmount, month } = result.data;

    const budget = await prisma.budget.upsert({
      where: {
        userId_category_month: {
          userId: req.userId,
          category,
          month,
        },
      },
      create: {
        userId: req.userId,
        category,
        limitAmount,
        month,
      },
      update: {
        limitAmount,
      },
    });
        // Check existing expenses and generate budget alerts.
    try {
      await checkBudgetAlerts(
        req.userId,
        category,
        month
      );
    } catch (error) {
      console.error("Budget alert check failed:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Budget saved successfully",
      budget,
    });
  } catch (error) {
    console.error("Create budget error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to save budget",
    });
  }
}

export async function updateBudget(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const budgetId = req.params.id;

    if (typeof budgetId !== "string" || !budgetId) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const result = updateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    if (Object.keys(result.data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }

    const existing = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const updateData: {
      category?: string;
      limitAmount?: number;
      month?: string;
    } = {};

    if (result.data.category !== undefined) {
      updateData.category = result.data.category;
    }

    if (result.data.limitAmount !== undefined) {
      updateData.limitAmount = result.data.limitAmount;
    }

    if (result.data.month !== undefined) {
      updateData.month = result.data.month;
    }

    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Budget updated successfully",
      budget,
    });
  } catch (error) {
    console.error("Update budget error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update budget",
    });
  }
}

export async function deleteBudget(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const budgetId = req.params.id;

    if (typeof budgetId !== "string" || !budgetId) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const existing = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    await prisma.budget.delete({
      where: { id: budgetId },
    });

    return res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Delete budget error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete budget",
    });
  }
}
