-- CreateTable
CREATE TABLE "BudgetAlertState" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAlertState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetAlertState_budgetId_idx" ON "BudgetAlertState"("budgetId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAlertState_budgetId_threshold_key" ON "BudgetAlertState"("budgetId", "threshold");

-- AddForeignKey
ALTER TABLE "BudgetAlertState" ADD CONSTRAINT "BudgetAlertState_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
