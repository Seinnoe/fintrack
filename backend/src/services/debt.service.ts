
import { prisma } from "../config/prisma.js";

export async function createDebtPayment(
  userId: string,
  debtId: string,
  amount: number,
  paymentDate: Date,
  note = ""
) {
  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findFirst({
      where: {
        id: debtId,
        userId,
      },
    });

    if (!debt) {
      throw new Error("DEBT_NOT_FOUND");
    }

    const remaining =
      Number(debt.principalAmount) - Number(debt.paidAmount);

    if (amount <= 0 || amount > remaining) {
      throw new Error("INVALID_PAYMENT_AMOUNT");
    }

    const newPaidAmount = Number(debt.paidAmount) + amount;

    const status =
      newPaidAmount >= Number(debt.principalAmount)
        ? "paid"
        : "partial";

    const payment = await tx.debtPayment.create({
      data: {
        debtId,
        userId,
        amount,
        paymentDate,
        note,
      },
    });

    const updatedDebt = await tx.debt.update({
      where: { id: debtId },
      data: {
        paidAmount: newPaidAmount,
        status,
      },
    });

    return {
      payment,
      debt: updatedDebt,
      remainingAmount:
        Number(updatedDebt.principalAmount) -
        Number(updatedDebt.paidAmount),
    };
  });
}

export async function getDebtSummary(userId: string) {
  const debts = await prisma.debt.findMany({
    where: { userId },
  });

  const summary = {
    totalBorrowed: 0,
    totalLent: 0,
    remainingBorrowed: 0,
    remainingLent: 0,
  };

  for (const debt of debts) {
    const remaining =
      Number(debt.principalAmount) - Number(debt.paidAmount);

    if (debt.type === "borrowed") {
      summary.totalBorrowed += Number(debt.principalAmount);
      summary.remainingBorrowed += remaining;
    } else {
      summary.totalLent += Number(debt.principalAmount);
      summary.remainingLent += remaining;
    }
  }

  return summary;
}
