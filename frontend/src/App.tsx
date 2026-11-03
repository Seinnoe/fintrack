import { useEffect, useState } from "react";
import type { FormEvent } from "react";

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
const NOTIFICATIONS_STORAGE_KEY = "fintrack_notifications_v1";

type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  level: "success" | "warning" | "info";
};

const categories = {
  income: ["Salary", "Freelance", "Gift", "Other Income"],
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

type Page = "dashboard" | "transactions" | "budgets" | "savings" | "analytics";

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
  if (typeof value !== "object" || value === null) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    (item.type === "income" || item.type === "expense") &&
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

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is AppNotification =>
      typeof item?.id === "string" && typeof item?.title === "string" &&
      typeof item?.message === "string" && typeof item?.createdAt === "string" &&
      typeof item?.read === "boolean" &&
      (item?.level === "success" || item?.level === "warning" || item?.level === "info")
    ).slice(0, 50);
  } catch { return []; }
}


function loadTransactions(): Transaction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isTransaction)) {
      return parsed;
    }

    console.warn("Invalid FinTrack saved transaction data");
    return [];
  } catch (error) {
    console.error("Failed to load transactions:", error);
    return [];
  }
}

function loadBudgets(): Budget[] {
  try {
    const saved = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is Budget => {
      if (typeof item !== "object" || item === null) return false;

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
    const saved = localStorage.getItem(SAVINGS_STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavingsGoal => {
      if (typeof item !== "object" || item === null) return false;

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
  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>(loadTransactions);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getToday);
  const [error, setError] = useState("");

  // Budget state
  const [budgets, setBudgets] = useState<Budget[]>(loadBudgets);
  const [budgetCategory, setBudgetCategory] = useState(categories.expense[0]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMonth, setBudgetMonth] = useState(getToday().slice(0, 7));

  // Savings state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(loadSavingsGoals);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [savingsError, setSavingsError] = useState("");

  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [chartPeriod, setChartPeriod] = useState(6);

  // Persist notification and preference data locally as well.
  useEffect(() => {
    try { localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50))); }
    catch (error) { console.error("Failed to save notifications:", error); }
  }, [notifications]);

  function pushNotification(title: string, message: string, level: AppNotification["level"] = "info") {
    const entry: AppNotification = {
      id: crypto.randomUUID(), title, message, createdAt: new Date().toISOString(), read: false, level,
    };
    setNotifications(previous => [entry, ...previous].slice(0, 50));
    setToast(title);
    window.setTimeout(() => setToast(""), 2600);
  }


  function exportBackup() {
    const backup = {
      app: "FinTrack", version: 1, exportedAt: new Date().toISOString(),
      transactions, budgets, savingsGoals, notifications,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `fintrack-backup-${getToday()}.json`;
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    pushNotification("Backup exported", "Your FinTrack data has been downloaded.", "success");
  }

  function importBackup(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.budgets) || !Array.isArray(parsed.savingsGoals)) {
          throw new Error("This file is not a valid FinTrack backup.");
        }
        if (!parsed.transactions.every(isTransaction)) throw new Error("The backup contains invalid transaction records.");
        const validBudgets = parsed.budgets.every((item: any) => item && typeof item.id === "string" && typeof item.category === "string" && Number.isSafeInteger(item.limitAmount) && item.limitAmount > 0 && typeof item.month === "string" && /^\d{4}-\d{2}$/.test(item.month));
        const validGoals = parsed.savingsGoals.every((item: any) => item && typeof item.id === "string" && typeof item.name === "string" && Number.isSafeInteger(item.targetAmount) && item.targetAmount > 0 && Number.isSafeInteger(item.savedAmount) && item.savedAmount >= 0);
        if (!validBudgets || !validGoals) throw new Error("The backup contains invalid budget or savings records.");
        setTransactions(parsed.transactions as Transaction[]);
        setBudgets(parsed.budgets as Budget[]);
        setSavingsGoals(parsed.savingsGoals as SavingsGoal[]);
        if (Array.isArray(parsed.notifications)) setNotifications(parsed.notifications.filter((item: any) => item && typeof item.id === "string" && typeof item.title === "string" && typeof item.message === "string" && typeof item.createdAt === "string" && typeof item.read === "boolean" && ["success", "warning", "info"].includes(item.level)).slice(0, 50) as AppNotification[]);
        pushNotification("Backup restored", "Your FinTrack records have been imported.", "success");
      } catch (error) {
        pushNotification("Import failed", error instanceof Error ? error.message : "Could not read this backup file.", "warning");
      }
    };
    reader.readAsText(file);
  }

  function markAllNotificationsRead() {
    setNotifications(previous => previous.map(item => ({ ...item, read: true })));
  }

  // Persist all user data locally
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error("Failed to save transactions:", error);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
    } catch (error) {
      console.error("Failed to save budgets:", error);
    }
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVINGS_STORAGE_KEY, JSON.stringify(savingsGoals));
    } catch (error) {
      console.error("Failed to save savings:", error);
    }
  }, [savingsGoals]);

  // Totals and available balance
  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const totalSaved = savingsGoals.reduce(
    (sum, goal) => sum + goal.savedAmount,
    0
  );

  // Savings are set aside from the available balance, not counted as expenses.
  const totalBalance = totalIncome - totalExpenses - totalSaved;

  const sortedTransactions = [...transactions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt)
  );

  // Analytics calculations
  const currentMonth = getToday().slice(0, 7);

  const monthlyTransactions = transactions.filter((item) =>
    item.date.startsWith(currentMonth)
  );

  const monthlyIncome = monthlyTransactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const monthlyNet = monthlyIncome - monthlyExpenses;

  const categorySpending = Object.entries(
    monthlyTransactions
      .filter((item) => item.type === "expense")
      .reduce<Record<string, number>>((result, item) => {
        result[item.category] = (result[item.category] || 0) + item.amount;
        return result;
      }, {})
  )
    .map(([categoryName, total]) => ({
      category: categoryName,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const monthlyTrend = Array.from({ length: chartPeriod }, (_, index) => {
    const monthDate = new Date();
    monthDate.setDate(1);
    monthDate.setMonth(monthDate.getMonth() - (chartPeriod - 1 - index));

    const month = [
      monthDate.getFullYear(),
      String(monthDate.getMonth() + 1).padStart(2, "0"),
    ].join("-");

    const monthTransactions = transactions.filter((item) =>
      item.date.startsWith(month)
    );

    return {
      month,
      label: monthDate.toLocaleDateString("en-US", { month: "short" }),
      income: monthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + item.amount, 0),
      expenses: monthTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + item.amount, 0),
    };
  });

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyTrend.flatMap((item) => [item.income, item.expenses])
  );

  const totalSavingsTarget = savingsGoals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0
  );

  const savingsProgress =
    totalSavingsTarget > 0 ? (totalSaved / totalSavingsTarget) * 100 : 0;

  // Transaction handlers
  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategory(categories[newType][0]);
    setError("");
  }

  function handleAddTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);

    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
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

    setTransactions((previous) => [newTransaction, ...previous]);
    pushNotification("Transaction saved", `${type === "income" ? "Income" : "Expense"} of ${formatMoney(numericAmount)} was recorded.`, "success");
    if (type === "expense") {
      const matchingBudget = budgets.find(item => item.category === category && item.month === date.slice(0, 7));
      if (matchingBudget) {
        const alreadySpent = transactions.filter(item => item.type === "expense" && item.category === category && item.date.startsWith(matchingBudget.month)).reduce((sum, item) => sum + item.amount, 0);
        const percent = ((alreadySpent + numericAmount) / matchingBudget.limitAmount) * 100;
        if (percent >= 100) pushNotification("Budget exceeded", `${category} spending has reached ${percent.toFixed(0)}% of its limit.`, "warning");
        else if (percent >= 80) pushNotification("Budget warning", `${category} spending has reached ${percent.toFixed(0)}% of its limit.`, "warning");
      }
    }
    setAmount("");
    setDescription("");
    setDate(getToday());
  }

  function handleDeleteTransaction(id: string) {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    setTransactions((previous) =>
      previous.filter((item) => item.id !== id)
    );
    pushNotification("Transaction deleted", "The selected transaction was removed.", "info");
  }

  // Budget handlers
  function handleAddBudget() {
    const limit = Number(budgetAmount);

    if (!budgetAmount.trim() || !Number.isSafeInteger(limit) || limit <= 0) {
      window.alert("Enter a valid budget amount.");
      return;
    }

    const existing = budgets.find(
      (item) =>
        item.category === budgetCategory && item.month === budgetMonth
    );

    if (existing) {
      setBudgets((previous) =>
        previous.map((item) =>
          item.id === existing.id ? { ...item, limitAmount: limit } : item
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

      setBudgets((previous) => [...previous, newBudget]);
    }

    pushNotification("Budget saved", `${budgetCategory} budget for ${budgetMonth} has been saved.`, "success");
    setBudgetAmount("");
  }

  function handleEditBudget(budget: Budget) {
    const input = window.prompt(
      "Enter new budget limit:",
      String(budget.limitAmount)
    );

    if (input === null) return;

    const newLimit = Number(input);

    if (!input.trim() || !Number.isSafeInteger(newLimit) || newLimit <= 0) {
      window.alert("Enter a valid amount.");
      return;
    }

    setBudgets((previous) =>
      previous.map((item) =>
        item.id === budget.id ? { ...item, limitAmount: newLimit } : item
      )
    );
    pushNotification("Budget updated", `${budget.category} budget limit was updated.`, "success");
  }

  function handleDeleteBudget(id: string) {
    if (!window.confirm("Delete this budget?")) return;

    setBudgets((previous) =>
      previous.filter((item) => item.id !== id)
    );
    pushNotification("Budget deleted", "The selected budget was removed.", "info");
  }

  // Savings handlers
  function handleAddSavingsGoal() {
    setSavingsError("");

    const name = goalName.trim();
    const target = Number(goalTarget);

    if (!name) {
      setSavingsError("Enter a goal name.");
      return;
    }

    if (!goalTarget.trim() || !Number.isSafeInteger(target) || target <= 0) {
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

    setSavingsGoals((previous) => [...previous, newGoal]);
    pushNotification("Savings goal created", `${name} is ready to track.`, "success");
    setGoalName("");
    setGoalTarget("");
  }

  function handleAddSavings(goal: SavingsGoal) {
    const input = window.prompt(`Add savings for ${goal.name} (MMK):`);
    if (input === null) return;

    const savingsAmount = Number(input);

    if (
      !input.trim() ||
      !Number.isSafeInteger(savingsAmount) ||
      savingsAmount <= 0
    ) {
      window.alert("Enter a valid amount.");
      return;
    }

    if (!Number.isSafeInteger(goal.savedAmount + savingsAmount)) {
      window.alert("Amount is too large.");
      return;
    }

    if (savingsAmount > totalBalance) {
      window.alert(
        `Insufficient available balance. You can save up to ${formatMoney(
          Math.max(totalBalance, 0)
        )}.`
      );
      return;
    }

    setSavingsGoals((previous) =>
      previous.map((item) =>
        item.id === goal.id
          ? { ...item, savedAmount: item.savedAmount + savingsAmount }
          : item
      )
    );
    const newTotal = goal.savedAmount + savingsAmount;
    if (newTotal >= goal.targetAmount && goal.savedAmount < goal.targetAmount) {
      pushNotification("Savings goal reached", `Congratulations! You completed ${goal.name}.`, "success");
    } else if (newTotal / goal.targetAmount >= 0.5 && goal.savedAmount / goal.targetAmount < 0.5) {
      pushNotification("Savings milestone", `You've reached 50% of ${goal.name}.`, "success");
    } else {
      pushNotification("Savings updated", `${formatMoney(savingsAmount)} added to ${goal.name}.`, "success");
    }
  }

  function handleWithdrawSavings(goal: SavingsGoal) {
    const input = window.prompt(`Withdraw from ${goal.name} (MMK):`);
    if (input === null) return;

    const withdrawalAmount = Number(input);

    if (
      !input.trim() ||
      !Number.isSafeInteger(withdrawalAmount) ||
      withdrawalAmount <= 0
    ) {
      window.alert("Enter a valid amount.");
      return;
    }

    if (withdrawalAmount > goal.savedAmount) {
      window.alert("Insufficient savings.");
      return;
    }

    setSavingsGoals((previous) =>
      previous.map((item) =>
        item.id === goal.id
          ? { ...item, savedAmount: item.savedAmount - withdrawalAmount }
          : item
      )
    );
    pushNotification("Savings withdrawn", `${formatMoney(withdrawalAmount)} withdrawn from ${goal.name}.`, "info");
  }

  function handleDeleteSavingsGoal(id: string) {
    if (!window.confirm("Delete this savings goal?")) return;

    setSavingsGoals((previous) =>
      previous.filter((item) => item.id !== id)
    );
    pushNotification("Savings goal deleted", "The selected savings goal was removed.", "info");
  }

  const pageTitles: Record<
    Page,
    { eyebrow: string; title: string; description: string }
  > = {
    dashboard: {
      eyebrow: "OVERVIEW",
      title: "Good to see you again",
      description: "Here is what is happening with your money.",
    },
    transactions: {
      eyebrow: "ACTIVITY",
      title: "Transactions",
      description: "Review and record your income and expenses.",
    },
    budgets: {
      eyebrow: "SPENDING PLAN",
      title: "Budgets",
      description: "Set limits and stay in control of your monthly spending.",
    },
    savings: {
      eyebrow: "YOUR GOALS",
      title: "Savings goals",
      description: "Build healthy habits, one contribution at a time.",
    },
    analytics: {
      eyebrow: "INSIGHTS",
      title: "Financial analytics",
      description: "Understand your cash flow and spending patterns.",
    },
  };

  const filteredTransactions = sortedTransactions.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return `${item.category} ${item.description} ${item.type} ${item.date} ${item.amount}`
      .toLowerCase()
      .includes(query);
  });
  const recentTransactions = filteredTransactions.slice(0, 5);

  return (
    <div className="app-shell fintrack-theme">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          aria-label="FinTrack home"
          onClick={(event) => {
            event.preventDefault();
            setActivePage("dashboard");
          }}
        >
          <span className="brand-mark">F</span>
          <span className="brand-copy">
            <strong>FinTrack</strong>
            <small>PERSONAL FINANCE</small>
          </span>
        </a>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button title="Overview" aria-label="Overview" className={activePage === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setActivePage("dashboard")}><span className="nav-icon">⌂</span></button>
          <button title="Transactions" aria-label="Transactions" className={activePage === "transactions" ? "nav-item active" : "nav-item"} onClick={() => setActivePage("transactions")}><span className="nav-icon">⇄</span></button>
          <button title="Budgets" aria-label="Budgets" className={activePage === "budgets" ? "nav-item active" : "nav-item"} onClick={() => setActivePage("budgets")}><span className="nav-icon">▦</span></button>
          <button title="Savings goals" aria-label="Savings goals" className={activePage === "savings" ? "nav-item active" : "nav-item"} onClick={() => setActivePage("savings")}><span className="nav-icon">◇</span></button>
          <button title="Analytics" aria-label="Analytics" className={activePage === "analytics" ? "nav-item active" : "nav-item"} onClick={() => setActivePage("analytics")}><span className="nav-icon">▥</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <button className="nav-item sidebar-bottom-icon" title="Settings" aria-label="Open settings" type="button" onClick={() => setSettingsOpen(true)}><span className="nav-icon">⚙</span></button>
        <div className="sidebar-meta">FT <span>·</span> 2026</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-search">
            <span className="search-icon">⌕</span>
            <input
              type="search"
              aria-label="Search transactions"
              placeholder="Search transactions, categories..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="topbar-right">
            <button className="topbar-action" type="button" onClick={() => setActivePage("transactions")} title="Add transaction" aria-label="Add transaction">＋</button>
            <button className="topbar-action notification-trigger" type="button" onClick={() => { setNotificationOpen(value => !value); setProfileOpen(false); }} title="Notifications" aria-label="Open notifications">♧{notifications.some(item => !item.read) && <i className="notification-count">{notifications.filter(item => !item.read).length}</i>}</button>
            <button className="profile-trigger" type="button" onClick={() => { setProfileOpen(value => !value); setNotificationOpen(false); }} aria-label="Open profile menu">
              <span className="profile-avatar">F</span>
              <span className="profile-copy"><strong>FinTrack Member</strong><small>Personal account</small></span>
              <span className="profile-chevron">⌄</span>
            </button>
          </div>
        </header>

        {notificationOpen && <div className="floating-panel notification-panel" role="dialog" aria-label="Notifications">
          <div className="floating-panel-head"><div><strong>Notifications</strong><small>{notifications.filter(item => !item.read).length} unread</small></div><button type="button" className="panel-close" onClick={() => setNotificationOpen(false)}>×</button></div>
          <div className="notification-items">
            {notifications.length === 0 ? <div className="panel-empty">You're all caught up. New finance alerts will appear here.</div> : notifications.map(item => <div className={`notification-item ${item.read ? "is-read" : ""}`} key={item.id}><span className={`notification-mark ${item.level}`}>{item.level === "warning" ? "!" : item.level === "success" ? "✓" : "i"}</span><div><strong>{item.title}</strong><p>{item.message}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>)}
          </div>
          <div className="notification-panel-footer"><button type="button" className="text-button" onClick={markAllNotificationsRead}>Mark all as read</button><button type="button" className="text-button" onClick={() => setNotifications([])}>Clear all</button></div>
        </div>}

        {profileOpen && <div className="floating-panel profile-panel" role="menu"><div className="profile-menu-heading"><span className="profile-avatar">F</span><div><strong>FinTrack Member</strong><small>Local personal account</small></div></div><button type="button" onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}>⚙ Account preferences</button><button type="button" onClick={() => { setProfileOpen(false); exportBackup(); }}>↓ Export data backup</button><button type="button" onClick={() => { setProfileOpen(false); pushNotification("Account system", "Login and registration will be added in a later phase.", "info"); }}>＋ Account system (coming later)</button></div>}

        {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="floating-panel-head"><div><span className="eyebrow">PREFERENCES</span><h2 id="settings-title">FinTrack settings</h2><small>Manage alerts and your local data.</small></div><button type="button" className="panel-close" onClick={() => setSettingsOpen(false)}>×</button></div><div className="settings-option"><div><strong>In-app notifications</strong><p>Budget warnings, saved transactions and savings milestones appear in your FinTrack notification center.</p></div><span className="settings-enabled">Always on</span></div><div className="settings-actions"><button type="button" className="secondary-button" onClick={exportBackup}>Export backup</button><label className="secondary-button import-button">Import backup<input type="file" accept="application/json,.json" onChange={event => { importBackup(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div><p className="settings-note">Your data is currently stored in this browser on this device. Account sync and cloud backup are not enabled yet.</p></section></div>}

        {toast && <div className="fintrack-toast" role="status"><span>✓</span>{toast}</div>}

        <div className="page-content" key={activePage}>
          {activePage !== "dashboard" && <div className="page-heading">
            <div>
              <span className="eyebrow">{pageTitles[activePage].eyebrow}</span>
              <h1>{pageTitles[activePage].title}</h1>
              <p>{pageTitles[activePage].description}</p>
            </div>
            <div className="date-chip">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>}

          {activePage === "dashboard" && (
            <section className="fin-dashboard">
              <div className="dashboard-main-column">
                <article className="balance-chart-card">
                  <div className="balance-chart-head">
                    <div>
                      <span className="eyebrow">YOUR FINANCES</span>
                      <h1>Total Balance</h1>
                      <div className="balance-number">{formatMoney(totalBalance)}</div>
                      <span className="balance-note"><i className="status-dot" /> Available after expenses and savings</span>
                    </div>
                    <div className="period-switch" aria-label="Chart period">{[{ label: "1 year", value: 12 }, { label: "6 months", value: 6 }, { label: "3 months", value: 3 }, { label: "1 month", value: 1 }].map(option => <button type="button" key={option.value} className={chartPeriod === option.value ? "period-active" : ""} onClick={() => setChartPeriod(option.value)}>{option.label}</button>)}</div>
                  </div>
                  <div className="balance-chart">
                    <div className="chart-axis"><span>MMK</span><span>500K</span><span>250K</span><span>0</span></div>
                    <div className="chart-bars">
                      {monthlyTrend.map((item) => {
                        const incomeHeight = Math.max(item.income > 0 ? 5 : 0, (item.income / maxMonthlyValue) * 145);
                        const expenseHeight = Math.max(item.expenses > 0 ? 5 : 0, (item.expenses / maxMonthlyValue) * 145);
                        return <div className="chart-month" key={item.month}>
                          <div className="chart-bar-pair">
                            <span className="chart-bar income-chart-bar" style={{ height: `${incomeHeight}px` }} title={`Income: ${formatMoney(item.income)}`} />
                            <span className="chart-bar expense-chart-bar" style={{ height: `${expenseHeight}px` }} title={`Expenses: ${formatMoney(item.expenses)}`} />
                          </div>
                          <small>{item.label}</small>
                        </div>;
                      })}
                    </div>
                  </div>
                  <div className="chart-card-footer">
                    <div className="chart-legend"><span><i className="legend-income" />Income</span><span><i className="legend-expense" />Expenses</span></div>
                    <button className="text-button" onClick={() => setActivePage("analytics")}>View analytics ↗</button>
                  </div>
                </article>

                <div className="dashboard-metrics-row">
                  <article className="metric-card metric-card-income"><div className="metric-top"><span className="metric-icon income-icon">↙</span><span className="metric-label">TOTAL INCOME</span></div><strong>{formatMoney(totalIncome)}</strong><small>All recorded income</small></article>
                  <article className="metric-card metric-card-expense"><div className="metric-top"><span className="metric-icon expense-icon">↗</span><span className="metric-label">TOTAL EXPENSES</span></div><strong>{formatMoney(totalExpenses)}</strong><small>All recorded expenses</small></article>
                  <article className="metric-card metric-card-savings"><div className="metric-top"><span className="metric-icon savings-icon">◇</span><span className="metric-label">TOTAL SAVED</span></div><strong>{formatMoney(totalSaved)}</strong><small>Across your savings goals</small></article>
                </div>

                <article className="surface-card investment-card">
                  <div className="section-heading"><div><span className="eyebrow">CASH FLOW OVERVIEW</span><h2>Income & expenses</h2><p>Monthly activity over the last six months</p></div><button className="text-button" onClick={() => setActivePage("analytics")}>Details ↗</button></div>
                  <div className="investment-bars">{monthlyTrend.map((item) => <div className="investment-month" key={item.month}><div className="investment-pair"><span className="investment-income" style={{height: `${Math.max(item.income ? 8 : 2, item.income / maxMonthlyValue * 118)}px`}} /><span className="investment-expense" style={{height: `${Math.max(item.expenses ? 8 : 2, item.expenses / maxMonthlyValue * 118)}px`}} /></div><small>{item.label}</small></div>)}</div>
                </article>
              </div>

              <aside className="dashboard-side-column">
                <article className="my-card-panel">
                  <div className="section-heading"><div><h2>My cards</h2><p>Your available balance</p></div><button type="button" className="card-chip" title="Virtual card details" aria-label="Virtual card details" onClick={() => pushNotification("Virtual card", "This is a visual FinTrack balance card, not a real bank card.", "info")}>✦</button></div>
                  <div className="virtual-card"><div className="virtual-card-top"><span>FINTRACK</span><span>◉</span></div><div className="virtual-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; 2026</div><div className="virtual-card-bottom"><div><small>CARD HOLDER</small><strong>FINTRACK MEMBER</strong></div><strong className="card-brand">VISA</strong></div></div>
                  <div className="my-card-balance"><div><small>AVAILABLE BALANCE</small><strong>{formatMoney(totalBalance)}</strong></div><span className="card-status">ACTIVE</span></div>
                  <button className="gold-outline-button" onClick={() => setActivePage("transactions")}>＋ Add transaction</button>
                </article>

                <article className="surface-card recent-card dashboard-recent-card">
                  <div className="section-heading"><div><h2>Recent transactions</h2><p>Your latest activity</p></div><button className="text-button" onClick={() => setActivePage("transactions")}>View all ↗</button></div>
                  {recentTransactions.length === 0 ? <div className="empty-state"><strong>No activity yet</strong><p>Your transactions will appear here.</p><button className="primary-button compact" onClick={() => setActivePage("transactions")}>Add a transaction</button></div> : <div className="compact-list">{recentTransactions.map((item) => <div className="compact-row" key={item.id}><span className={item.type === "income" ? "transaction-symbol positive" : "transaction-symbol negative"}>{item.type === "income" ? "↓" : "↑"}</span><div className="compact-info"><strong>{item.category}</strong><small>{item.description || item.date}</small></div><strong className={item.type === "income" ? "amount-positive" : "amount-negative"}>{item.type === "income" ? "+" : "−"}{formatMoney(item.amount)}</strong></div>)}</div>}
                </article>

                <article className="savings-promo-card"><span className="promo-sparkle">✦</span><span className="eyebrow">A LITTLE PROGRESS, EVERY DAY</span><h2>Make room for what matters.</h2><p>Small, consistent steps can bring your savings goals closer.</p><button onClick={() => setActivePage("savings")}>Explore savings goals <span>↗</span></button></article>
              </aside>
            </section>
          )}

          {activePage === "transactions" && (
            <section className="two-column-layout">
              <article className="surface-card form-card">
                <div className="section-heading">
                  <div>
                    <h2>Add transaction</h2>
                    <p>Record money coming in or going out.</p>
                  </div>
                </div>

                <form onSubmit={handleAddTransaction}>
                  <div className="form-group">
                    <label htmlFor="type">Transaction type</label>
                    <select
                      id="type"
                      value={type}
                      onChange={(event) =>
                        handleTypeChange(event.target.value as TransactionType)
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
                      onChange={(event) => setAmount(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="category">Category</label>
                    <select
                      id="category"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                    >
                      {categories[type].map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="description">
                      Description <span className="optional-label">Optional</span>
                    </label>
                    <input
                      id="description"
                      type="text"
                      maxLength={200}
                      placeholder="Add a note"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <input
                      id="date"
                      type="date"
                      required
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </div>

                  {error && <p className="error-message" role="alert">{error}</p>}
                  <button type="submit" className="primary-button full-width">
                    Save transaction
                  </button>
                </form>
              </article>

              <article className="surface-card history-card">
                <div className="section-heading">
                  <div>
                    <h2>Transaction history</h2>
                    <p>{filteredTransactions.length} matching records</p>
                  </div>
                  <span className="count-pill">{filteredTransactions.length}</span>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="empty-state">
                    <strong>No transactions found</strong>
                    <p>Add your first income or expense to get started.</p>
                  </div>
                ) : (
                  <div className="history-list">
                    {filteredTransactions.map((item) => (
                      <div className="history-row" key={item.id}>
                        <span
                          className={
                            item.type === "income"
                              ? "transaction-symbol positive"
                              : "transaction-symbol negative"
                          }
                        >
                          {item.type === "income" ? "↓" : "↑"}
                        </span>
                        <div className="history-info">
                          <strong>{item.category}</strong>
                          <small>
                            {item.description || "No description"} · {item.date}
                          </small>
                        </div>
                        <div className="history-amount">
                          <strong
                            className={
                              item.type === "income"
                                ? "amount-positive"
                                : "amount-negative"
                            }
                          >
                            {item.type === "income" ? "+" : "−"}
                            {formatMoney(item.amount)}
                          </strong>
                          <button
                            className="danger-link"
                            type="button"
                            onClick={() => handleDeleteTransaction(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          )}

          {activePage === "budgets" && (
            <>
              <article className="surface-card form-card budget-form-card">
                <div className="section-heading">
                  <div>
                    <h2>Create a monthly budget</h2>
                    <p>Choose a category and set a spending limit.</p>
                  </div>
                </div>

                <form
                  className="inline-form"
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
                      onChange={(event) => setBudgetCategory(event.target.value)}
                    >
                      {categories.expense.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="budget-amount">Monthly limit (MMK)</label>
                    <input
                      id="budget-amount"
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="e.g. 200000"
                      value={budgetAmount}
                      onChange={(event) => setBudgetAmount(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="budget-month">Month</label>
                    <input
                      id="budget-month"
                      type="month"
                      required
                      value={budgetMonth}
                      onChange={(event) => setBudgetMonth(event.target.value)}
                    />
                  </div>

                  <button type="submit" className="primary-button">
                    Save budget
                  </button>
                </form>
              </article>

              <div className="section-heading section-heading-spaced">
                <div>
                  <h2>Your budgets</h2>
                  <p>Track actual spending against your limits.</p>
                </div>
                <span className="count-pill">{budgets.length} budgets</span>
              </div>

              {budgets.length === 0 ? (
                <div className="surface-card empty-state">
                  <strong>No budgets set up yet</strong>
                  <p>Create a monthly budget to start managing your spending.</p>
                </div>
              ) : (
                <section className="budget-grid">
                  {budgets.map((budget) => {
                    const spent = transactions
                      .filter(
                        (item) =>
                          item.type === "expense" &&
                          item.category === budget.category &&
                          item.date.startsWith(budget.month)
                      )
                      .reduce((sum, item) => sum + item.amount, 0);

                    const percentage = (spent / budget.limitAmount) * 100;
                    const remaining = budget.limitAmount - spent;

                    return (
                      <article className="surface-card budget-card" key={budget.id}>
                        <div className="budget-card-head">
                          <div>
                            <span className="eyebrow">{budget.month}</span>
                            <h3>{budget.category}</h3>
                          </div>
                          <span
                            className={
                              percentage >= 100
                                ? "status-tag danger"
                                : percentage >= 80
                                  ? "status-tag warning"
                                  : "status-tag good"
                            }
                          >
                            {percentage >= 100
                              ? "Over budget"
                              : percentage >= 80
                                ? "Near limit"
                                : "On track"}
                          </span>
                        </div>

                        <div className="budget-numbers">
                          <strong>{formatMoney(spent)}</strong>
                          <span>of {formatMoney(budget.limitAmount)}</span>
                        </div>

                        <div className="progress-track">
                          <div
                            className={
                              percentage >= 100
                                ? "progress-fill over"
                                : "progress-fill"
                            }
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>

                        <div className="budget-foot">
                          <span>{percentage.toFixed(0)}% used</span>
                          <strong>
                            {remaining >= 0
                              ? `${formatMoney(remaining)} left`
                              : `${formatMoney(Math.abs(remaining))} over`}
                          </strong>
                        </div>

                        <div className="card-actions">
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => handleEditBudget(budget)}
                          >
                            Edit limit
                          </button>
                          <button
                            className="danger-link"
                            type="button"
                            onClick={() => handleDeleteBudget(budget.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}

          {activePage === "savings" && (
            <>
              <article className="surface-card savings-summary">
                <div>
                  <span className="eyebrow">TOTAL SAVED</span>
                  <h2>{formatMoney(totalSaved)}</h2>
                  <p>Out of {formatMoney(totalSavingsTarget)} across all goals</p>
                </div>
                <div className="savings-total-progress">
                  <div className="progress-track">
                    <div
                      className="progress-fill savings-progress"
                      style={{ width: `${Math.min(savingsProgress, 100)}%` }}
                    />
                  </div>
                  <strong>{savingsProgress.toFixed(1)}% funded</strong>
                </div>
              </article>

              <article className="surface-card form-card">
                <div className="section-heading">
                  <div>
                    <h2>Create a savings goal</h2>
                    <p>Give your next milestone a name and a target.</p>
                  </div>
                </div>

                <form
                  className="inline-form savings-create-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAddSavingsGoal();
                  }}
                >
                  <div className="form-group">
                    <label htmlFor="goal-name">Goal name</label>
                    <input
                      id="goal-name"
                      type="text"
                      required
                      maxLength={100}
                      placeholder="e.g. Emergency fund"
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="goal-target">Target amount (MMK)</label>
                    <input
                      id="goal-target"
                      type="number"
                      min="1"
                      step="1"
                      required
                      placeholder="e.g. 1000000"
                      value={goalTarget}
                      onChange={(event) => setGoalTarget(event.target.value)}
                    />
                  </div>

                  <button type="submit" className="primary-button">
                    Create goal
                  </button>
                </form>

                {savingsError && (
                  <p className="error-message" role="alert">{savingsError}</p>
                )}
              </article>

              <div className="section-heading section-heading-spaced">
                <div>
                  <h2>Your savings goals</h2>
                  <p>Keep your progress moving forward.</p>
                </div>
                <span className="count-pill">{savingsGoals.length} goals</span>
              </div>

              {savingsGoals.length === 0 ? (
                <div className="surface-card empty-state">
                  <strong>No savings goals yet</strong>
                  <p>Create your first goal to start building your savings.</p>
                </div>
              ) : (
                <section className="savings-grid">
                  {savingsGoals.map((goal) => {
                    const percentage = (goal.savedAmount / goal.targetAmount) * 100;
                    const remaining = Math.max(
                      goal.targetAmount - goal.savedAmount,
                      0
                    );
                    const completed = goal.savedAmount >= goal.targetAmount;

                    return (
                      <article className="surface-card goal-card" key={goal.id}>
                        <div className="goal-card-head">
                          <div className="goal-symbol">◇</div>
                          <span
                            className={
                              completed
                                ? "status-tag good"
                                : "status-tag neutral"
                            }
                          >
                            {completed ? "Completed" : "In progress"}
                          </span>
                        </div>

                        <h3>{goal.name}</h3>

                        <div className="goal-amount">
                          <strong>{formatMoney(goal.savedAmount)}</strong>
                          <span>of {formatMoney(goal.targetAmount)}</span>
                        </div>

                        <div className="progress-track">
                          <div
                            className="progress-fill savings-progress"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>

                        <div className="budget-foot">
                          <span>{percentage.toFixed(1)}% saved</span>
                          <strong>
                            {completed
                              ? "Goal reached"
                              : `${formatMoney(remaining)} to go`}
                          </strong>
                        </div>

                        <div className="card-actions">
                          <button
                            className="primary-button compact"
                            type="button"
                            onClick={() => handleAddSavings(goal)}
                          >
                            Add funds
                          </button>
                          <button
                            className="secondary-button"
                            type="button"
                            disabled={goal.savedAmount === 0}
                            onClick={() => handleWithdrawSavings(goal)}
                          >
                            Withdraw
                          </button>
                          <button
                            className="danger-link"
                            type="button"
                            onClick={() => handleDeleteSavingsGoal(goal.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}

          {activePage === "analytics" && (
            <>
              <section className="metric-grid analytics-metrics">
                <article className="metric-card metric-card-income">
                  <div className="metric-top">
                    <span className="metric-icon income-icon">↙</span>
                    <span className="metric-label">MONTHLY INCOME</span>
                  </div>
                  <strong className="metric-value metric-value-income">
                    {formatMoney(monthlyIncome)}
                  </strong>
                  <small>{currentMonth}</small>
                </article>

                <article className="metric-card metric-card-expense">
                  <div className="metric-top">
                    <span className="metric-icon expense-icon">↗</span>
                    <span className="metric-label">MONTHLY EXPENSES</span>
                  </div>
                  <strong className="metric-value metric-value-expense">
                    {formatMoney(monthlyExpenses)}
                  </strong>
                  <small>{currentMonth}</small>
                </article>

                <article className="metric-card metric-card-savings">
                  <div className="metric-top">
                    <span className="metric-icon savings-icon">◈</span>
                    <span className="metric-label">MONTHLY NET</span>
                  </div>
                  <strong
                    className={
                      monthlyNet >= 0
                        ? "metric-value metric-value-income"
                        : "metric-value metric-value-expense"
                    }
                  >
                    {formatMoney(monthlyNet)}
                  </strong>
                  <small>Income minus expenses</small>
                </article>
              </section>

              <article className="surface-card chart-card analytics-chart-card">
                <div className="section-heading">
                  <div>
                    <h2>Income vs. expenses</h2>
                    <p>Monthly comparison for the last six months</p>
                  </div>
                </div>

                <div className="bar-chart large-chart">
                  {monthlyTrend.map((item) => (
                    <div className="bar-month" key={item.month}>
                      <div className="bar-pair">
                        <span
                          className="bar income-bar"
                          style={{
                            height: `${Math.max(
                              item.income > 0 ? 4 : 0,
                              (item.income / maxMonthlyValue) * 190
                            )}px`,
                          }}
                          title={`Income: ${formatMoney(item.income)}`}
                        />
                        <span
                          className="bar expense-bar"
                          style={{
                            height: `${Math.max(
                              item.expenses > 0 ? 4 : 0,
                              (item.expenses / maxMonthlyValue) * 190
                            )}px`,
                          }}
                          title={`Expenses: ${formatMoney(item.expenses)}`}
                        />
                      </div>
                      <small>{item.label}</small>
                    </div>
                  ))}
                </div>

                <div className="chart-legend">
                  <span><i className="legend-income" />Income</span>
                  <span><i className="legend-expense" />Expenses</span>
                </div>
              </article>

              <article className="surface-card category-card">
                <div className="section-heading">
                  <div>
                    <h2>Spending by category</h2>
                    <p>How this month's expenses are distributed</p>
                  </div>
                </div>

                {categorySpending.length === 0 ? (
                  <div className="empty-state">
                    <strong>No expenses this month</strong>
                    <p>Category insights will appear when you record expenses.</p>
                  </div>
                ) : (
                  <div className="category-list">
                    {categorySpending.map((item) => {
                      const percentage =
                        monthlyExpenses > 0
                          ? (item.total / monthlyExpenses) * 100
                          : 0;

                      return (
                        <div className="category-item" key={item.category}>
                          <div className="category-line">
                            <strong>{item.category}</strong>
                            <span>
                              {formatMoney(item.total)}{" "}
                              <small>{percentage.toFixed(1)}%</small>
                            </span>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </>
          )}

          <footer className="app-footer">
            FinTrack <span>·</span> Personal finance, made clearer.
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
