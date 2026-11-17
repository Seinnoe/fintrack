import { sendPushNotification } from "../services/push.service.js";
import type { Response } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { checkBudgetAlerts } from "../services/budget-alert.service.js";

// Refresh budget alerts safely
async function refreshBudgetAlerts(
  userId: string,
  category: string,
  date: Date
): Promise<void> {
  const month = date.toISOString().slice(0, 7);

  try {
    await checkBudgetAlerts(userId, category, month);
  } catch (error) {
    console.error("Budget alert refresh failed:", error);
  }
}

// Refresh all affected budgets after transaction update
async function refreshAffectedBudgets(
  userId: string,
  items: Array<{
    type: string;
    category: string;
    date: Date;
  }>
): Promise<void> {
  const affected = new Map<
    string,
    { category: string; date: Date }
  >();

  for (const item of items) {
    if (item.type !== "expense") continue;

    const month = item.date.toISOString().slice(0, 7);
    const key = `${item.category}-${month}`;

    affected.set(key, {
      category: item.category,
      date: item.date,
    });
  }

  for (const item of affected.values()) {
    await refreshBudgetAlerts(
      userId,
      item.category,
      item.date
    );
  }
}

// Transaction validation
const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().finite(),
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(200).optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// Validate date
function parseTransactionDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

// GET: Get all transactions for logged-in user
export async function getTransactions(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" },
      ],
    });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load transactions",
    });
  }
}

// POST: Create transaction
export async function createTransaction(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = transactionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const {
      type,
      amount,
      category,
      description,
      date,
    } = result.data;

    const transactionDate = parseTransactionDate(date);

    if (!transactionDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date",
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.userId,
        type,
        amount,
        category,
        description,
        date: transactionDate,
      },
    });

    // Check budget after creating an expense
    if (transaction.type === "expense") {
      await refreshBudgetAlerts(
        req.userId,
        transaction.category,
        transaction.date
      );
    }
    // Send push notification for new transaction
void sendPushNotification(req.userId, {
  title: transaction.type === "income"
    ? "Income recorded"
    : "Expense recorded",
  message: `${transaction.category}: ${Number(transaction.amount).toLocaleString()} MMK`,
  level: "success",
  url: "/",
}).catch(error => {
  console.error("Transaction push notification failed:", error);
});

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create transaction",
    });
  }
}

// PUT: Update transaction
export async function updateTransaction(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const transactionId = req.params.id;

    if (typeof transactionId !== "string" || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const result = transactionSchema.partial().safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const data = result.data;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required",
      });
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const updateData: {
      type?: "income" | "expense";
      amount?: number;
      category?: string;
      description?: string;
      date?: Date;
    } = {};

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    if (data.amount !== undefined) {
      updateData.amount = data.amount;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.date !== undefined) {
      const transactionDate = parseTransactionDate(data.date);

      if (!transactionDate) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction date",
        });
      }

      updateData.date = transactionDate;
    }

    const transaction = await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: updateData,
    });
    void sendPushNotification(req.userId, {
  title: "Transaction updated",
  message: `${transaction.category}: ${Number(transaction.amount).toLocaleString()} MMK`,
  level: "info",
  url: "/",
}).catch(error => {
  console.error("Transaction update push failed:", error);
});
    // Refresh alerts for the previous expense category/month.
if (existing.type === "expense") {
  await refreshBudgetAlerts(
    req.userId,
    existing.category,
    existing.date
  );
}

// Refresh alerts for the new expense category/month
// if the transaction changed its category or month.
const oldMonth = existing.date.toISOString().slice(0, 7);
const newMonth = transaction.date.toISOString().slice(0, 7);

const needsNewRefresh =
  transaction.type === "expense" &&
  (
    existing.type !== "expense" ||
    existing.category !== transaction.category ||
    oldMonth !== newMonth
  );

if (needsNewRefresh) {
  await refreshBudgetAlerts(
    req.userId,
    transaction.category,
    transaction.date
  );
}

    // Recalculate both old and new budgets when necessary
    await refreshAffectedBudgets(req.userId, [
      {
        type: existing.type,
        category: existing.category,
        date: existing.date,
      },
      {
        type: transaction.type,
        category: transaction.category,
        date: transaction.date,
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    console.error("Update transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update transaction",
    });
  }
}

// DELETE: Delete transaction
export async function deleteTransaction(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const transactionId = req.params.id;

    if (typeof transactionId !== "string" || !transactionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    await prisma.transaction.delete({
      where: {
        id: transactionId,
      },
    });
    // Refresh budget alerts after deleting an expense.
if (existing.type === "expense") {
  await refreshBudgetAlerts(
    req.userId,
    existing.category,
    existing.date
  );
}

    // Recalculate budget after deleting an expense
    if (existing.type === "expense") {
      await refreshBudgetAlerts(
        req.userId,
        existing.category,
        existing.date
      );
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete transaction",
    });
  }
}
