
import { useEffect, useState } from "react";

import type {
  Transaction,
  TransactionType,
  Budget,
  SavingsGoal,
} from "./types";

import "./App.css";

const STORAGE_KEY = "fintrack_transactions_v1";
const BUDGET_STORAGE_KEY = "fintrack_budgets_v1";
const SAVINGS_STORAGE_KEY = "fintrack_savings_v1";


const categories = {
  income: [
    "Salary",
    "Freelance",
    "Gift",
    "Other Income",
  ],
  expense: [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Health",
    "Education",
    "Other Expense",
  ],
};

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString("en-US")} MMK`;
}

function isTransaction(value: unknown): value is Transaction {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    (item.type === "income" ||
      item.type === "expense") &&
    typeof item.amount === "number" &&
    Number.isSafeInteger(item.amount) &&
    item.amount > 0 &&
    typeof item.category === "string" &&
    typeof item.description === "string" &&
    typeof item.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
    typeof item.createdAt === "string"
  );
}

function loadTransactions(): Transaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (
      Array.isArray(parsed) &&
      parsed.every(isTransaction)
    ) {
      return parsed;
    }

    console.warn("Invalid FinTrack saved data");
    return [];
  } catch (error) {
    console.error("Failed to load transactions:", error);
    return [];
  }
}

function loadBudgets(): Budget[] {
  try {
    const saved = localStorage.getItem(
      BUDGET_STORAGE_KEY
    );

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is Budget => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return false;
      }

      const budget = item as Record<string, unknown>;

      return (
        typeof budget.id === "string" &&
        typeof budget.category === "string" &&
        typeof budget.limitAmount === "number" &&
        Number.isSafeInteger(budget.limitAmount) &&
        budget.limitAmount > 0 &&
        typeof budget.month === "string" &&
        /^\d{4}-\d{2}$/.test(budget.month)
      );
    });
  } catch (error) {
    console.error("Failed to load budgets:", error);
    return [];
  }
}

function loadSavingsGoals(): SavingsGoal[] {
  try {
    const saved = localStorage.getItem(
      SAVINGS_STORAGE_KEY
    );

    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavingsGoal => {
      if (
        typeof item !== "object" ||
        item === null
      ) {
        return false;
      }

      const goal = item as Record<string, unknown>;

      return (
        typeof goal.id === "string" &&
        typeof goal.name === "string" &&
        typeof goal.targetAmount === "number" &&
        Number.isSafeInteger(goal.targetAmount) &&
        goal.targetAmount > 0 &&
        typeof goal.savedAmount === "number" &&
        Number.isSafeInteger(goal.savedAmount) &&
        goal.savedAmount >= 0 &&
        typeof goal.createdAt === "string"
      );
    });
  } catch (error) {
    console.error("Failed to load savings:", error);
    return [];
  }
}

function App() {
  // Transaction States
  const [transactions, setTransactions] =
    useState<Transaction[]>(loadTransactions);

  const [type, setType] =
    useState<TransactionType>("expense");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getToday);
  const [error, setError] = useState("");

  // Budget States
const [budgets, setBudgets] =
  useState<Budget[]>(loadBudgets);

const [budgetCategory, setBudgetCategory] =
  useState(categories.expense[0]);

const [budgetAmount, setBudgetAmount] = useState("");

const [budgetMonth, setBudgetMonth] =
  useState(getToday().slice(0, 7));

// Savings States
const [savingsGoals, setSavingsGoals] =
  useState<SavingsGoal[]>(loadSavingsGoals);

const [goalName, setGoalName] = useState("");

const [goalTarget, setGoalTarget] = useState("");

const [savingsError, setSavingsError] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error("Failed to save transactions:", error);
    }
  }, [transactions]);
  useEffect(() => {
  try {
    localStorage.setItem(
      BUDGET_STORAGE_KEY,
      JSON.stringify(budgets)
    );
  } catch (error) {
    console.error("Failed to save budgets:", error);
  }
}, [budgets]);

// Save Savings Goals
useEffect(() => {
  try {
    localStorage.setItem(
      SAVINGS_STORAGE_KEY,
      JSON.stringify(savingsGoals)
    );
  } catch (error) {
    console.error("Failed to save savings:", error);
  }
}, [savingsGoals]);


  // Calculate totals from transaction data
  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalBalance = totalIncome - totalExpenses;

  // Sort newest transactions first
  const sortedTransactions = [...transactions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt)
  );

  // Analytics Dashboard Calculations

  const currentMonth = getToday().slice(0, 7);

  const monthlyTransactions = transactions.filter(
    (item) => item.date.startsWith(currentMonth)
  );

  const monthlyIncome = monthlyTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyNet = monthlyIncome - monthlyExpenses;

  // Category-wise expense analysis
  const categorySpending = Object.entries(
    monthlyTransactions
      .filter((item) => item.type === "expense")
      .reduce<Record<string, number>>((result, item) => {
        result[item.category] =
          (result[item.category] || 0) + item.amount;

        return result;
      }, {})
  )
    .map(([category, total]) => ({
      category,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // Last 6 months comparison
  const monthlyTrend = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));

      const month = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
      ].join("-");

      const monthTransactions = transactions.filter(
        (item) => item.date.startsWith(month)
      );

      return {
        month,
        label: date.toLocaleDateString("en-US", {
          month: "short",
        }),
        income: monthTransactions
          .filter((item) => item.type === "income")
          .reduce((sum, item) => sum + item.amount, 0),
        expenses: monthTransactions
          .filter((item) => item.type === "expense")
          .reduce((sum, item) => sum + item.amount, 0),
      };
    }
  );

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyTrend.flatMap((item) => [
      item.income,
      item.expenses,
    ])
  );

  // Savings overview
  const totalSaved = savingsGoals.reduce(
    (sum, goal) => sum + goal.savedAmount,
    0
  );

  const totalSavingsTarget = savingsGoals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0
  );

  const savingsProgress =
    totalSavingsTarget > 0
      ? (totalSaved / totalSavingsTarget) * 100
      : 0;


  function handleTypeChange(
    newType: TransactionType
  ) {
    setType(newType);
    setCategory(categories[newType][0]);
    setError("");
  }

  function handleAddTransaction(
    event: React.SubmitEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);

    if (
      !Number.isSafeInteger(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Please enter a valid positive MMK amount.");
      return;
    }

    if (!category || !date) {
      setError("Please fill in all required fields.");
      return;
    }

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type,
      amount: numericAmount,
      category,
      description: description.trim(),
      date,
      createdAt: new Date().toISOString(),
    };

    setTransactions((previous) => [
      newTransaction,
      ...previous,
    ]);

    setAmount("");
    setDescription("");
    setDate(getToday());
  }

  function handleDeleteTransaction(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) return;

    setTransactions((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

function handleAddBudget() {
  const limit = Number(budgetAmount);

  if (
    !budgetAmount.trim() ||
    !Number.isSafeInteger(limit) ||
    limit <= 0
  ) {
    window.alert("Enter a valid budget amount.");
    return;
  }

  const existing = budgets.find(
    (item) =>
      item.category === budgetCategory &&
      item.month === budgetMonth
  );

  if (existing) {
    setBudgets((previous) =>
      previous.map((item) =>
        item.id === existing.id
          ? { ...item, limitAmount: limit }
          : item
      )
    );
  } else {
    const newBudget: Budget = {
      id: crypto.randomUUID(),
      category: budgetCategory,
      limitAmount: limit,
      month: budgetMonth,
      createdAt: new Date().toISOString(),
    };

    setBudgets((previous) => [
      ...previous,
      newBudget,
    ]);
  }

  setBudgetAmount("");
}

function handleEditBudget(budget: Budget) {
  const input = window.prompt(
    "Enter new budget limit:",
    String(budget.limitAmount)
  );

  if (input === null) return;

  const amount = Number(input);

  if (
    !input.trim() ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    window.alert("Enter a valid amount.");
    return;
  }

  setBudgets((previous) =>
    previous.map((item) =>
      item.id === budget.id
        ? { ...item, limitAmount: amount }
        : item
    )
  );
}

function handleDeleteBudget(id: string) {
  if (!window.confirm("Delete this budget?")) return;

  setBudgets((previous) =>
    previous.filter((item) => item.id !== id)
  );
}

function handleAddSavingsGoal() {
  setSavingsError("");

  const name = goalName.trim();
  const target = Number(goalTarget);

  if (!name) {
    setSavingsError("Enter a goal name.");
    return;
  }

  if (
    !goalTarget.trim() ||
    !Number.isSafeInteger(target) ||
    target <= 0
  ) {
    setSavingsError("Enter a valid target amount.");
    return;
  }

  const newGoal: SavingsGoal = {
    id: crypto.randomUUID(),
    name,
    targetAmount: target,
    savedAmount: 0,
    createdAt: new Date().toISOString(),
  };

  setSavingsGoals((previous) => [
    ...previous,
    newGoal,
  ]);

  setGoalName("");
  setGoalTarget("");
}

function handleAddSavings(goal: SavingsGoal) {
  const input = window.prompt(
    `Add savings for ${goal.name} (MMK):`
  );

  if (input === null) return;

  const amount = Number(input);

  if (
    !input.trim() ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    window.alert("Enter a valid amount.");
    return;
  }

  if (
    !Number.isSafeInteger(goal.savedAmount + amount)
  ) {
    window.alert("Amount is too large.");
    return;
  }

  setSavingsGoals((previous) =>
    previous.map((item) =>
      item.id === goal.id
        ? {
            ...item,
            savedAmount: item.savedAmount + amount,
          }
        : item
    )
  );
}

function handleWithdrawSavings(goal: SavingsGoal) {
  const input = window.prompt(
    `Withdraw from ${goal.name} (MMK):`
  );

  if (input === null) return;

  const amount = Number(input);

  if (
    !input.trim() ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    window.alert("Enter a valid amount.");
    return;
  }

  if (amount > goal.savedAmount) {
    window.alert("Insufficient savings.");
    return;
  }

  setSavingsGoals((previous) =>
    previous.map((item) =>
      item.id === goal.id
        ? {
            ...item,
            savedAmount: item.savedAmount - amount,
          }
        : item
    )
  );
}

function handleDeleteSavingsGoal(id: string) {
  if (!window.confirm("Delete this savings goal?")) {
    return;
  }

  setSavingsGoals((previous) =>
    previous.filter((item) => item.id !== id)
  );
}



  return (
    <main className="dashboard">
      <header className="page-header">
        <div>
          <h1>FinTrack 💰</h1>
          <p>Smart Personal Finance Manager</p>
        </div>
        <span className="version-label">Step 2</span>
      </header>

      <section className="balance-card">
        <p>Total Balance</p>
        <h2>{formatMoney(totalBalance)}</h2>
        <span>Your current financial overview</span>
      </section>

      <section className="summary">
        <div className="card">
          <h3>Total Income</h3>
          <p className="income">
            {formatMoney(totalIncome)}
          </p>
        </div>

        <div className="card">
          <h3>Total Expenses</h3>
          <p className="expense">
            {formatMoney(totalExpenses)}
          </p>
        </div>
      </section>

{/* Monthly Budget Planner */}
<section className="panel budget-panel">
  <h2>Monthly Budget Planner</h2>
  <p className="panel-description">
    Set a spending limit for each category.
  </p>

  <form
    onSubmit={(event) => {
      event.preventDefault();
      handleAddBudget();
    }}
  >
    <div className="form-group">
      <label htmlFor="budget-category">Category</label>
      <select
        id="budget-category"
        value={budgetCategory}
        onChange={(event) =>
          setBudgetCategory(event.target.value)
        }
      >
        {categories.expense.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </div>

    <div className="form-group">
      <label htmlFor="budget-amount">
        Monthly Limit (MMK)
      </label>
      <input
        id="budget-amount"
        type="number"
        min="1"
        step="1"
        required
        value={budgetAmount}
        onChange={(event) =>
          setBudgetAmount(event.target.value)
        }
      />
    </div>

    <div className="form-group">
      <label htmlFor="budget-month">Month</label>
      <input
        id="budget-month"
        type="month"
        required
        value={budgetMonth}
        onChange={(event) =>
          setBudgetMonth(event.target.value)
        }
      />
    </div>

    <button type="submit" className="add-button">
      + Save Budget
    </button>
  </form>
</section>

{/* Saved Budgets */}
<section className="panel budget-results">
  <h2>My Monthly Budgets</h2>

  {budgets.length === 0 ? (
    <p>No budgets created yet.</p>
  ) : (
    budgets.map((budget) => {
      const spent = transactions
        .filter(
          (item) =>
            item.type === "expense" &&
            item.category === budget.category &&
            item.date.startsWith(budget.month)
        )
        .reduce((sum, item) => sum + item.amount, 0);

      const percentage =
        (spent / budget.limitAmount) * 100;

      const remaining = budget.limitAmount - spent;

      return (
        <div className="budget-item" key={budget.id}>
          <h3>{budget.category} — {budget.month}</h3>

          <p>
            {formatMoney(spent)} / {formatMoney(budget.limitAmount)}
          </p>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(percentage, 100)}%`,
                background:
                  percentage >= 100
                    ? "#dc2626"
                    : percentage >= 80
                    ? "#f59e0b"
                    : "#4f46e5",
              }}
            />
          </div>

          <p>
            {percentage.toFixed(1)}% used —{" "}
            {remaining >= 0
              ? `${formatMoney(remaining)} left`
              : `${formatMoney(Math.abs(remaining))} over budget`}
          </p>

          <button
            type="button"
            onClick={() => handleEditBudget(budget)}
          >
            Edit Budget
          </button>

          <button
            type="button"
            onClick={() => handleDeleteBudget(budget.id)}
          >
            Delete Budget
          </button>
        </div>
      );
    })
  )}
</section>


{/* Savings Goals */}
<section className="panel savings-panel">
  <h2>My Savings Goals</h2>
  <p className="panel-description">
    Create and manage your savings goals.
  </p>

  <form
    onSubmit={(event) => {
      event.preventDefault();
      handleAddSavingsGoal();
    }}
  >
    <div className="form-group">
      <label htmlFor="goal-name">Goal Name</label>
      <input
        id="goal-name"
        type="text"
        required
        maxLength={100}
        placeholder="e.g. New Laptop"
        value={goalName}
        onChange={(event) =>
          setGoalName(event.target.value)
        }
      />
    </div>

    <div className="form-group">
      <label htmlFor="goal-target">
        Target Amount (MMK)
      </label>
      <input
        id="goal-target"
        type="number"
        min="1"
        required
        value={goalTarget}
        onChange={(event) =>
          setGoalTarget(event.target.value)
        }
      />
    </div>

    {savingsError && (
      <p className="error-message" role="alert">
        {savingsError}
      </p>
    )}

    <button type="submit" className="add-button">
      + Create Savings Goal
    </button>
  </form>

  <div className="savings-list">
    {savingsGoals.length === 0 ? (
      <div className="empty-state">
        <p>No savings goals yet.</p>
        <span>Create your first savings goal.</span>
      </div>
    ) : (
      savingsGoals.map((goal) => {
        const percentage =
          (goal.savedAmount / goal.targetAmount) * 100;

        const remaining = Math.max(
          goal.targetAmount - goal.savedAmount,
          0
        );

        const completed =
          goal.savedAmount >= goal.targetAmount;

        return (
          <div className="savings-item" key={goal.id}>
            <div className="savings-heading">
              <h3>{goal.name}</h3>
              <span>
                {completed ? "Completed" : "In Progress"}
              </span>
            </div>

            <p className="savings-amount">
              {formatMoney(goal.savedAmount)}
              {" / "}
              {formatMoney(goal.targetAmount)}
            </p>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                }}
              />
            </div>

            <div className="savings-details">
              <span>{percentage.toFixed(1)}% saved</span>
              <span>
                {completed
                  ? "Goal achieved!"
                  : `${formatMoney(remaining)} left`}
              </span>
            </div>

            <div className="savings-actions">
              <button
                type="button"
                onClick={() => handleAddSavings(goal)}
              >
                + Add Savings
              </button>

              <button
                type="button"
                disabled={goal.savedAmount === 0}
                onClick={() => handleWithdrawSavings(goal)}
              >
                Withdraw
              </button>

              <button
                type="button"
                onClick={() => handleDeleteSavingsGoal(goal.id)}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
</section>

      {/* Analytics Dashboard */}
      <section className="panel analytics-panel">
        <h2>Financial Analytics</h2>
        <p className="panel-description">
          Your financial performance for {currentMonth}.
        </p>

        {/* Monthly Summary */}
        <div className="analytics-summary">
          <div className="analytics-card">
            <span>Monthly Income</span>
            <strong className="income">
              {formatMoney(monthlyIncome)}
            </strong>
          </div>

          <div className="analytics-card">
            <span>Monthly Expenses</span>
            <strong className="expense">
              {formatMoney(monthlyExpenses)}
            </strong>
          </div>

          <div className="analytics-card">
            <span>Monthly Net</span>
            <strong
              className={
                monthlyNet >= 0 ? "income" : "expense"
              }
            >
              {formatMoney(monthlyNet)}
            </strong>
          </div>
        </div>

        {/* Income vs Expense Chart */}
        <div className="analytics-section">
          <h3>Income vs Expenses</h3>

          <div className="monthly-chart">
            {monthlyTrend.map((item) => (
              <div
                className="chart-month"
                key={item.month}
              >
                <div className="chart-bars">
                  <div
                    className="chart-bar income-bar"
                    style={{
                      height: `${Math.max(
                        item.income > 0 ? 3 : 0,
                        (item.income / maxMonthlyValue) * 160
                      )}px`,
                    }}
                    title={`Income: ${formatMoney(item.income)}`}
                  />

                  <div
                    className="chart-bar expense-bar"
                    style={{
                      height: `${Math.max(
                        item.expenses > 0 ? 3 : 0,
                        (item.expenses / maxMonthlyValue) * 160
                      )}px`,
                    }}
                    title={`Expenses: ${formatMoney(item.expenses)}`}
                  />
                </div>

                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="chart-legend">
            <span>
              <i className="legend-income" />
              Income
            </span>

            <span>
              <i className="legend-expense" />
              Expenses
            </span>
          </div>
        </div>

        {/* Category Spending */}
        <div className="analytics-section">
          <h3>Spending by Category</h3>

          {categorySpending.length === 0 ? (
            <div className="empty-state">
              <p>No expenses this month.</p>
              <span>
                Add expenses to see your category analysis.
              </span>
            </div>
          ) : (
            <div className="category-analysis">
              {categorySpending.map((item) => {
                const percentage =
                  monthlyExpenses > 0
                    ? (item.total / monthlyExpenses) * 100
                    : 0;

                return (
                  <div
                    className="category-row"
                    key={item.category}
                  >
                    <div className="category-info">
                      <strong>{item.category}</strong>
                      <span>
                        {formatMoney(item.total)}
                      </span>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill category-fill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>

                    <small>
                      {percentage.toFixed(1)}%
                    </small>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Savings Overview */}
        <div className="analytics-section">
          <h3>Savings Overview</h3>

          <div className="analytics-card">
            <span>Total Saved</span>
            <strong>
              {formatMoney(totalSaved)}
            </strong>

            <p>
              Target: {formatMoney(totalSavingsTarget)}
            </p>

            <div className="progress-track">
              <div
                className="progress-fill savings-fill"
                style={{
                  width: `${Math.min(
                    savingsProgress,
                    100
                  )}%`,
                }}
              />
            </div>

            <small>
              {savingsProgress.toFixed(1)}% of total goals
            </small>
          </div>
        </div>
      </section>

{/* Transaction Management */}
 <section className="content-grid">
        <div className="panel">
          <h2>Add Transaction</h2>
          <p className="panel-description">
            Record your income and expenses.
          </p>

          <form onSubmit={handleAddTransaction}>
            <div className="form-group">
              <label htmlFor="type">Transaction Type</label>

              <select
                id="type"
                value={type}
                onChange={(event) =>
                  handleTypeChange(
                    event.target.value as TransactionType
                  )
                }
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (MMK)</label>

              <input
                id="amount"
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 15000"
                value={amount}
                onChange={(event) =>
                  setAmount(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>

              <select
                id="category"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                {categories[type].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="description">
                Description (Optional)
              </label>

              <input
                id="description"
                type="text"
                maxLength={200}
                placeholder="What was this for?"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="date">Date</label>

              <input
                id="date"
                type="date"
                required
                value={date}
                onChange={(event) =>
                  setDate(event.target.value)
                }
              />
            </div>

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="add-button">
              + Add Transaction
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="history-heading">
            <div>
              <h2>Transaction History</h2>
              <p className="panel-description">
                Your recorded transactions
              </p>
            </div>

            <span className="count-badge">
              {transactions.length}
            </span>
          </div>

          {sortedTransactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions yet.</p>
              <span>
                Add your first income or expense.
              </span>
            </div>
          ) : (
            <div className="transaction-list">
              {sortedTransactions.map((item) => (
                <div
                  className="transaction-item"
                  key={item.id}
                >
                  <div className="transaction-info">
                    <strong>{item.category}</strong>

                    <span>
                      {item.description || "No description"}
                    </span>

                    <small>{item.date}</small>
                  </div>

                  <div className="transaction-actions">
                    <strong
                      className={
                        item.type === "income"
                          ? "income"
                          : "expense"
                      }
                    >
                      {item.type === "income" ? "+" : "-"}
                      {formatMoney(item.amount)}
                    </strong>

                    <button
                      type="button"
                      className="delete-button"
                      aria-label={`Delete ${item.category} transaction`}
                      onClick={() =>
                        handleDeleteTransaction(item.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        FinTrack © {new Date().getFullYear()}
        {" "}— Smart Personal Finance Manager
      </footer>
    </main>
  );
}

export default App;
