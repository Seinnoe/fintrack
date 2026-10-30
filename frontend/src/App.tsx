
import { useEffect, useState } from "react";
import type {
  Transaction,
  TransactionType,
} from "./types";
import "./App.css";

const STORAGE_KEY = "fintrack_transactions_v1";

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

function App() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(loadTransactions);

  const [type, setType] =
    useState<TransactionType>("expense");

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getToday);
  const [error, setError] = useState("");

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
