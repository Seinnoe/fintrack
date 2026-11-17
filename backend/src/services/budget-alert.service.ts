import { prisma } from "../config/prisma.js";
import { sendPushNotification } from "./push.service.js";

const ALERT_THRESHOLDS = [50, 80, 100, 101] as const;

export async function checkBudgetAlerts(
  userId: string,
  category: string,
  month: string
) {
  const startDate = new Date(`${month}-01T00:00:00.000Z`);

  const endDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + 1,
      1
    )
  );

  await prisma.$transaction(async (tx) => {
    const budget = await tx.budget.findUnique({
      where: {
        userId_category_month: {
          userId,
          category,
          month,
        },
      },
    });

    if (!budget) return;

    const aggregate = await tx.transaction.aggregate({
      where: {
        userId,
        category,
        type: "expense",
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const spent = Number(aggregate._sum.amount ?? 0);
    const limit = Number(budget.limitAmount);
    const percentage = (spent / limit) * 100;

    for (const threshold of ALERT_THRESHOLDS) {
      const reached =
        threshold === 101
          ? percentage > 100
          : percentage >= threshold;

      await tx.budgetAlertState.upsert({
        where: {
          budgetId_threshold: {
            budgetId: budget.id,
            threshold,
          },
        },
        create: {
          budgetId: budget.id,
          threshold,
          active: false,
        },
        update: {},
      });

      if (!reached) {
        await tx.budgetAlertState.updateMany({
          where: {
            budgetId: budget.id,
            threshold,
            active: true,
          },
          data: {
            active: false,
          },
        });

        continue;
      }

      const changed = await tx.budgetAlertState.updateMany({
        where: {
          budgetId: budget.id,
          threshold,
          active: false,
        },
        data: {
          active: true,
        },
      });

      if (changed.count !== 1) continue;

      const isOverspending = threshold === 101;

      const title =
        threshold === 50
          ? "Budget halfway reached"
          : threshold === 80
            ? "Budget warning"
            : threshold === 100
              ? "Budget limit reached"
              : "Budget exceeded";

      const message =
        threshold === 50
          ? `${category} has used 50% of its monthly budget.`
          : threshold === 80
            ? `${category} has used 80% of its monthly budget.`
            : threshold === 100
              ? `${category} has reached its monthly budget limit.`
              : `${category} has exceeded its monthly budget by ${Math.round(spent - limit)} MMK.`;

      await tx.notification.create({
        data: {
          userId,
          title,
          message,
          level:
            threshold === 50
              ? "info"
              : "warning",
        },
      });
      await sendPushNotification(userId, {
  title,
  message,
  level: threshold === 50 ? "info" : "warning",
  url: "/",
});

      console.log(
        `Budget alert created: ${category} (${threshold}%)`,
        { userId, month, isOverspending }
      );
    }
  });
}
