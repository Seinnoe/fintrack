import type { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { sendPushNotification } from "../services/push.service.js";

const savingsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: z.number().positive().finite(),
  savedAmount: z.number().min(0).finite().optional().default(0),
});

export async function getSavingsGoals(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      count: goals.length,
      goals,
    });
  } catch (error) {
    console.error("Get savings goals error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load savings goals",
    });
  }
}

export async function createSavingsGoal(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = savingsSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid savings goal information",
        errors: result.error.flatten().fieldErrors,
      });
    }

    if (result.data.savedAmount > 0) {
      return res.status(400).json({
        success: false,
        message: "Initial savings must be zero. Use the savings update endpoint to add money.",
      });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.userId,
        ...result.data,
      },
    });
    void sendPushNotification(req.userId, {
  title: "Savings goal created",
  message: `${goal.name} savings goal has been created.`,
  level: "success",
  url: "/",
}).catch(error => {
  console.error("Savings push failed:", error);
});

    return res.status(201).json({
      success: true,
      message: "Savings goal created successfully",
      goal,
    });
  } catch (error) {
    console.error("Create savings goal error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create savings goal",
    });
  }
}

export async function updateSavingsGoal(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const goalId = req.params.id;

    if (typeof goalId !== "string" || !goalId) {
      return res.status(400).json({
        success: false,
        message: "Invalid savings goal ID",
      });
    }

    const result = savingsSchema.partial().safeParse(req.body);

    if (!result.success || Object.keys(result.data ?? {}).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid savings goal information",
        errors: result.success ? undefined : result.error.flatten().fieldErrors,
      });
    }

    const goal = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.savingsGoal.findFirst({
          where: {
            id: goalId,
            userId: req.userId!,
          },
        });

        if (!existing) {
          return null;
        }

        const targetAmount =
          result.data.targetAmount ?? Number(existing.targetAmount);

        const savedAmount =
          result.data.savedAmount ?? Number(existing.savedAmount);

        if (savedAmount > targetAmount) {
          throw new Error("SAVINGS_TARGET_EXCEEDED");
        }

        const previousSaved = Number(existing.savedAmount);
        const additionalSavings = savedAmount - previousSaved;

        // Check available balance on the server before accepting deposits.
        if (additionalSavings > 0) {
          const [income, expenses, allSavings] = await Promise.all([
            tx.transaction.aggregate({
              where: {
                userId: req.userId!,
                type: "income",
              },
              _sum: { amount: true },
            }),
            tx.transaction.aggregate({
              where: {
                userId: req.userId!,
                type: "expense",
              },
              _sum: { amount: true },
            }),
            tx.savingsGoal.aggregate({
              where: {
                userId: req.userId!,
              },
              _sum: { savedAmount: true },
            }),
          ]);

          const availableBalance =
            Number(income._sum.amount ?? 0) -
            Number(expenses._sum.amount ?? 0) -
            Number(allSavings._sum.savedAmount ?? 0);

          if (additionalSavings > availableBalance) {
            throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
          }
        }

        const updateData: {
          name?: string;
          targetAmount?: number;
          savedAmount?: number;
        } = {};

        if (result.data.name !== undefined) {
          updateData.name = result.data.name;
        }

        if (result.data.targetAmount !== undefined) {
          updateData.targetAmount = result.data.targetAmount;
        }

        if (result.data.savedAmount !== undefined) {
          updateData.savedAmount = result.data.savedAmount;
        }

        const updated = await tx.savingsGoal.updateMany({
          where: {
            id: goalId,
            userId: req.userId!,
          },
          data: updateData,
        });

        if (updated.count !== 1) {
          return null;
        }

        return tx.savingsGoal.findFirst({
          where: {
            id: goalId,
            userId: req.userId!,
          },
        });
      },
      {
        isolationLevel: "Serializable",
      }
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Savings goal not found",
      });
    }
    const saved = Number(goal.savedAmount);
const target = Number(goal.targetAmount);

void sendPushNotification(req.userId, {
  title: saved >= target
    ? "Savings goal completed!"
    : "Savings progress updated",
  message: saved >= target
    ? `Congratulations! You completed ${goal.name}.`
    : `${goal.name}: ${saved.toLocaleString()} / ${target.toLocaleString()} MMK`,
  level: "success",
  url: "/",
}).catch(error => {
  console.error("Savings update push failed:", error);
});

    return res.status(200).json({
      success: true,
      message: "Savings goal updated successfully",
      goal,
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SAVINGS_TARGET_EXCEEDED") {
        return res.status(400).json({
          success: false,
          message: "Saved amount cannot exceed target amount",
        });
      }

      if (error.message === "INSUFFICIENT_AVAILABLE_BALANCE") {
        return res.status(400).json({
          success: false,
          message: "Insufficient available balance",
        });
      }

      if ("code" in error && error.code === "P2034") {
        return res.status(409).json({
          success: false,
          message: "A concurrent financial update occurred. Please retry.",
        });
      }
    }

    console.error("Update savings goal error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update savings goal",
    });
  }
}

export async function deleteSavingsGoal(req: AuthRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const goalId = req.params.id;

    if (typeof goalId !== "string" || !goalId) {
      return res.status(400).json({
        success: false,
        message: "Invalid savings goal ID",
      });
    }

    const existing = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        userId: req.userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Savings goal not found",
      });
    }

    await prisma.savingsGoal.delete({
      where: { id: goalId },
    });

    return res.status(200).json({
      success: true,
      message: "Savings goal deleted successfully",
    });
  } catch (error) {
    console.error("Delete savings goal error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to delete savings goal",
    });
  }
}
