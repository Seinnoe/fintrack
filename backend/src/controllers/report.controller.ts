
import type { Response } from "express";
import { z } from "zod";

import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export async function getMonthlySummary(
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

    const result = monthSchema.safeParse(req.query.month);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "A valid month is required (YYYY-MM)",
      });
    }

    const month = result.data;

    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));

    const startDate = new Date(
      Date.UTC(year, monthNumber - 1, 1)
    );

    const endDate = new Date(
      Date.UTC(year, monthNumber, 1)
    );

    const previousStart = new Date(
      Date.UTC(year, monthNumber - 2, 1)
    );

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: previousStart,
          lt: endDate,
        },
      },
      select: {
        type: true,
        amount: true,
        category: true,
        date: true,
      },
    });

    const currentTransactions = transactions.filter(
      item => item.date >= startDate && item.date < endDate
    );

    const previousTransactions = transactions.filter(
      item => item.date >= previousStart && item.date < startDate
    );

    function calculateSummary(items: typeof transactions) {
      let income = 0;
      let expense = 0;

      const categories: Record<string, number> = {};

      for (const item of items) {
        const amount = Number(item.amount);

        if (item.type === "income") {
          income += amount;
        } else {
          expense += amount;

          categories[item.category] =
            (categories[item.category] || 0) + amount;
        }
      }

      const breakdown = Object.entries(categories)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: expense > 0
            ? Number(((amount / expense) * 100).toFixed(2))
            : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        income,
        expense,
        balance: income - expense,
        highestSpendingCategory: breakdown[0] || null,
        categoryBreakdown: breakdown,
        transactionCount: items.length,
      };
    }

    const current = calculateSummary(currentTransactions);
    const previous = calculateSummary(previousTransactions);

    const expenseChange =
      previous.expense > 0
        ? Number(
            (
              ((current.expense - previous.expense) /
                previous.expense) * 100
            ).toFixed(2)
          )
        : null;

    return res.status(200).json({
      success: true,
      month,
      summary: {
        ...current,
        previousMonth: {
          income: previous.income,
          expense: previous.expense,
          balance: previous.balance,
        },
        expenseChangePercentage: expenseChange,
        spendingIncreased: current.expense > previous.expense,
      },
    });
  } catch (error) {
    console.error("Monthly summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate monthly summary",
    });
  }
}
