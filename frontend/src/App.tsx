import "./App.css";
import { useEffect, useState } from "react";
import Login from "./components/auth/Login";
import type { FormEvent } from "react";

import type {
  Transaction,
  TransactionType,
  Budget,
  SavingsGoal,
  Debt,
  DebtOverview,
  DebtType,
} from "./types";
const API_URL = import.meta.env.VITE_API_URL || "";

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


type Page =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "savings"
  | "analytics"
  | "debts";
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


function getStoredUser() {
  try {
    const raw =
      localStorage.getItem("fintrack_user") ||
      sessionStorage.getItem("fintrack_user");

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function App() {
  const currentUser = getStoredUser();
  const displayName = currentUser?.name || "FinTrack Member";
  const displayEmail = currentUser?.email || "Personal account";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token")
    )
  );

  // Transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getToday);
  const [error, setError] = useState("");

  // Budget state
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetCategory, setBudgetCategory] = useState(categories.expense[0]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetMonth, setBudgetMonth] = useState(getToday().slice(0, 7));

  // Savings state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(loadSavingsGoals);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [savingsError, setSavingsError] = useState("");
  // Debt management state
const [debts, setDebts] = useState<Debt[]>([]);
const [debtTab, setDebtTab] = useState<
  "active" | "completed" | "archived"
>("active");

const [debtOverview, setDebtOverview] =
  useState<DebtOverview>({
    totalBorrowed: 0,
    totalLent: 0,
    remainingBorrowed: 0,
    remainingLent: 0,
  });

const [debtLoading, setDebtLoading] = useState(false);
const [debtError, setDebtError] = useState("");
const [paymentError, setPaymentError] = useState("");
const [debtType, setDebtType] = useState<DebtType>("borrowed");
const [debtPersonName, setDebtPersonName] = useState("");
const [debtPrincipalAmount, setDebtPrincipalAmount] = useState("");
const [debtDescription, setDebtDescription] = useState("");
const [debtStartDate, setDebtStartDate] = useState(getToday());
const [debtDueDate, setDebtDueDate] = useState("");

  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>(loadNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (!settingsOpen || !("serviceWorker" in navigator)) return;

    let active = true;

    navigator.serviceWorker.ready
      .then(registration => registration.pushManager.getSubscription())
      .then(subscription => {
        if (active) setPushEnabled(Boolean(subscription));
      })
      .catch(error => console.error("Push status check failed:", error));

    return () => {
      active = false;
    };
  }, [settingsOpen]);

  async function enablePushNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setToast("Push notifications are not supported by this browser.");
      return;
    }

    if (!window.isSecureContext) {
      setToast("Push notifications require a secure HTTPS connection.");
      return;
    }

    try {
      setPushLoading(true);

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setToast("Please allow notifications in your browser settings.");
        return;
      }

      const token =
        localStorage.getItem("fintrack_token") ||
        sessionStorage.getItem("fintrack_token");

      if (!token) {
        setToast("Please sign in again.");
        return;
      }

      const keyResponse = await fetch(`${API_URL}/api/push/public-key`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const keyData = await keyResponse.json();

      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(keyData.message || "Unable to load push configuration.");
      }

      const registration = await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const padding = "=".repeat((4 - keyData.publicKey.length % 4) % 4);
        const base64 = (keyData.publicKey + padding)
          .replace(/-/g, "+")
          .replace(/_/g, "/");

        const rawKey = Uint8Array.from(
          atob(base64),
          character => character.charCodeAt(0)
        );

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: rawKey,
        });
      }

      const saveResponse = await fetch(`${API_URL}/api/push/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveData.message || "Unable to save subscription.");
      }

      setPushEnabled(true);
      setToast("Push notifications enabled successfully.");
    } catch (error) {
      console.error("Enable push error:", error);
      setToast(
        error instanceof Error
          ? error.message
          : "Unable to enable push notifications."
      );
    } finally {
      setPushLoading(false);
    }
  }

  async function disablePushNotifications() {
    try {
      setPushLoading(true);

      const token =
        localStorage.getItem("fintrack_token") ||
        sessionStorage.getItem("fintrack_token");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        if (token) {
          await fetch(`${API_URL}/api/push/unsubscribe`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          });
        }

        await subscription.unsubscribe();
      }

      setPushEnabled(false);
      setToast("Push notifications disabled.");
    } catch (error) {
      console.error("Disable push error:", error);
      setToast("Unable to disable push notifications.");
    } finally {
      setPushLoading(false);
    }
  }

  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [chartPeriod, setChartPeriod] = useState(6);

  // Load all authenticated user data independently.
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();

    async function loadEndpoint(path: string): Promise<any> {
      const token =
        localStorage.getItem("fintrack_token") ||
        sessionStorage.getItem("fintrack_token");

      if (!token) {
        throw new Error("SESSION_EXPIRED");
      }

      const response = await fetch(`${API_URL}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new Error("SESSION_EXPIRED");
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Unable to load ${path}.`);
      }

      return result;
    }

    async function loadFromDatabase() {
      setError("");

      try {
        // Clear previous account notifications before loading this account.
        setNotifications([]);

        const results = await Promise.allSettled([
  loadEndpoint("/api/transactions"),
  loadEndpoint("/api/savings"),
  loadEndpoint("/api/budgets"),
  loadEndpoint("/api/notifications"),
  loadEndpoint("/api/debts"),
  loadEndpoint("/api/debts/overview"),
]);

        if (controller.signal.aborted) return;

        const errors: string[] = [];

        // Load transactions independently.
        if (results[0].status === "fulfilled") {
          const records = Array.isArray(results[0].value.transactions)
            ? results[0].value.transactions
            : [];

          const normalized: Transaction[] = records.map((item: any) => ({
            id: String(item.id),
            type: item.type,
            amount: Number(item.amount),
            category: item.category,
            description: item.description || "",
            date: String(item.date).slice(0, 10),
            createdAt: item.createdAt,
          }));

          setTransactions(normalized);
        } else {
          errors.push("Transactions: " + results[0].reason.message);
        }

        // Load savings independently.
        if (results[1].status === "fulfilled") {
          const records = Array.isArray(results[1].value.goals)
            ? results[1].value.goals
            : [];

          const normalized: SavingsGoal[] = records.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            targetAmount: Number(item.targetAmount),
            savedAmount: Number(item.savedAmount),
            createdAt: item.createdAt,
          }));

          setSavingsGoals(normalized);
        } else {
          errors.push("Savings: " + results[1].reason.message);
        }

        // Load budgets independently.
        if (results[2].status === "fulfilled") {
          const records = Array.isArray(results[2].value.budgets)
            ? results[2].value.budgets
            : [];

          const normalized: Budget[] = records.map((item: any) => ({
            id: String(item.id),
            category: item.category,
            limitAmount: Number(item.limitAmount),
            month: item.month,
            createdAt: item.createdAt,
          }));

          setBudgets(normalized);
        } else {
          errors.push("Budgets: " + results[2].reason.message);
        }

        // Load notifications belonging to the authenticated account.
        if (results[3].status === "fulfilled") {
          const records = Array.isArray(results[3].value.notifications)
            ? results[3].value.notifications
            : [];

          const normalized: AppNotification[] = records.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            message: item.message,
            createdAt: item.createdAt,
            read: Boolean(item.read),
            level: item.level,
          }));

          setNotifications(normalized);
        } else {
          errors.push("Notifications: " + results[3].reason.message);
        }
        // Load debts
if (results[4].status === "fulfilled") {
  const records = Array.isArray(results[4].value.debts)
    ? results[4].value.debts
    : [];

  const normalized: Debt[] = records.map((item: any) => ({
    id: String(item.id),
    userId: String(item.userId),
    personName: item.personName,
    type: item.type,
    principalAmount: Number(item.principalAmount),
    paidAmount: Number(item.paidAmount),
    description: item.description || "",
    startDate: String(item.startDate).slice(0, 10),
    dueDate: item.dueDate
      ? String(item.dueDate).slice(0, 10)
      : null,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    payments: Array.isArray(item.payments)
      ? item.payments.map((payment: any) => ({
          id: String(payment.id),
          debtId: String(payment.debtId),
          userId: String(payment.userId),
          amount: Number(payment.amount),
          paymentDate: String(payment.paymentDate).slice(0, 10),
          note: payment.note || "",
          createdAt: payment.createdAt,
        }))
      : [],
    remainingAmount: Number(item.remainingAmount),
  }));

  setDebts(normalized);
} else {
  errors.push("Debts: " + String(results[4].reason));
}

if (results[5].status === "fulfilled") {
  setDebtOverview(results[5].value.summary);
} else {
  errors.push("Debt overview: " + String(results[5].reason));
}
// Load debt overview
if (results[5].status === "fulfilled") {
  setDebtOverview(results[5].value.summary);
} else {
  errors.push("Debt overview: " + String(results[5].reason));
}

        if (errors.some(message => message.includes("SESSION_EXPIRED"))) {
          setIsAuthenticated(false);
          localStorage.removeItem("fintrack_token");
          localStorage.removeItem("fintrack_user");
          sessionStorage.removeItem("fintrack_token");
          sessionStorage.removeItem("fintrack_user");
          setTransactions([]);
          setSavingsGoals([]);
          setBudgets([]);
          setNotifications([]);
          setDebts([]);
setDebtOverview({
  totalBorrowed: 0,
  totalLent: 0,
  remainingBorrowed: 0,
  remainingLent: 0,
});
          return;
        }

        if (errors.length > 0) {
          setError(errors.join(" | "));
        }

      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        console.error("Database loading error:", error);

        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to connect to the database."
          );
        }
      }
    }

    void loadFromDatabase();

    return () => controller.abort();
  }, [isAuthenticated]);

  // Persist notification and preference data locally as well.
  useEffect(() => {
    try { localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 50))); }
    catch (error) { console.error("Failed to save notifications:", error); }
  }, [notifications]);

function pushNotification(
  title: string,
  message: string,
  level: AppNotification["level"] = "info"
) {
  const entry: AppNotification = {
    id: crypto.randomUUID(),
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
    level,
  };

  // Show notification immediately
  setNotifications(previous => [entry, ...previous].slice(0, 50));

  setToast(title);
  window.setTimeout(() => setToast(""), 2600);

  // Save notification to backend database
  const token =
    localStorage.getItem("fintrack_token") ||
    sessionStorage.getItem("fintrack_token");

  if (!token) return;

  void (async () => {
    try {
      const response = await fetch(`${API_URL}/api/notifications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          message,
          level,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to save notification."
        );
      }

      // Replace temporary notification with database record
      setNotifications(previous =>
        previous.map(item =>
          item.id === entry.id
            ? {
                ...result.notification,
                read: Boolean(result.notification.read),
              }
            : item
        )
      );
    } catch (error) {
      console.error("Notification save error:", error);
    }
  })();
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
  // Calculate outstanding debt cash impact
const debtBalance = debts.reduce((total, debt) => {
  const remaining =
    Number(debt.principalAmount) - Number(debt.paidAmount);

  return total + (
    debt.type === "borrowed"
      ? remaining
      : -remaining
  );
}, 0);

// Calculate available balance
const totalBalance =
  totalIncome - totalExpenses - totalSaved + debtBalance;

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
  // Previous month calculations
const previousMonthDate = new Date();
previousMonthDate.setDate(1);
previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);

const previousMonth = [
  previousMonthDate.getFullYear(),
  String(previousMonthDate.getMonth() + 1).padStart(2, "0"),
].join("-");

const previousMonthTransactions = transactions.filter(
  (item) => item.date.startsWith(previousMonth)
);



const previousMonthExpenses = previousMonthTransactions
  .filter((item) => item.type === "expense")
  .reduce((sum, item) => sum + item.amount, 0);

const expenseChange =
  previousMonthExpenses > 0
    ? ((monthlyExpenses - previousMonthExpenses) /
        previousMonthExpenses) * 100
    : null;



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
    // Highest spending category
const highestSpendingCategory = categorySpending[0];

// Category breakdown maximum
const categoryTotal = Math.max(
  1,
  ...categorySpending.map((item) => item.total)
);

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

  async function handleAddTransaction(event: FormEvent<HTMLFormElement>) {
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

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          amount: numericAmount,
          category,
          description: description.trim(),
          date,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.transaction) {
        throw new Error(result.message || "Unable to save transaction.");
      }

      const saved = result.transaction;

      const newTransaction: Transaction = {
        id: String(saved.id),
        type: saved.type,
        amount: Number(saved.amount),
        category: saved.category,
        description: saved.description || "",
        date: String(saved.date).slice(0, 10),
        createdAt: saved.createdAt,
      };

      setTransactions(previous => [newTransaction, ...previous]);

      pushNotification(
        "Transaction saved",
        `${type === "income" ? "Income" : "Expense"} of ${formatMoney(numericAmount)} was recorded.`,
        "success"
      );

      if (type === "expense") {
        const matchingBudget = budgets.find(
          item => item.category === category && item.month === date.slice(0, 7)
        );

        if (matchingBudget) {
          const alreadySpent = transactions
            .filter(
              item =>
                item.type === "expense" &&
                item.category === category &&
                item.date.startsWith(matchingBudget.month)
            )
            .reduce((sum, item) => sum + item.amount, 0);

          const percent =
            ((alreadySpent + numericAmount) / matchingBudget.limitAmount) * 100;

          if (percent >= 100) {
            pushNotification(
              "Budget exceeded",
              `${category} spending has reached ${percent.toFixed(0)}% of its limit.`,
              "warning"
            );
          } else if (percent >= 80) {
            pushNotification(
              "Budget warning",
              `${category} spending has reached ${percent.toFixed(0)}% of its limit.`,
              "warning"
            );
          }
        }
      }

      setAmount("");
      setDescription("");
      setDate(getToday());

    } catch (error) {
      console.error("Add transaction error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  function startEditTransaction(item: Transaction) {
    setEditingTransactionId(item.id);
    setType(item.type);
    setAmount(String(item.amount));
    setCategory(item.category);
    setDescription(item.description);
    setDate(item.date);
    setError("");
    setActivePage("transactions");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditTransaction() {
    setEditingTransactionId(null);
    setAmount("");
    setDescription("");
    setDate(getToday());
    setType("expense");
    setCategory(categories.expense[0]);
    setError("");
  }

  async function handleUpdateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);

    if (!editingTransactionId) return;

    if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive MMK amount.");
      return;
    }

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/transactions/${encodeURIComponent(editingTransactionId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type,
            amount: numericAmount,
            category,
            description: description.trim(),
            date,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.transaction) {
        throw new Error(result.message || "Unable to update transaction.");
      }

      const saved = result.transaction;

      const updatedTransaction: Transaction = {
        id: String(saved.id),
        type: saved.type,
        amount: Number(saved.amount),
        category: saved.category,
        description: saved.description || "",
        date: String(saved.date).slice(0, 10),
        createdAt: saved.createdAt,
      };

      setTransactions(previous =>
        previous.map(item =>
          item.id === editingTransactionId ? updatedTransaction : item
        )
      );

      cancelEditTransaction();

      pushNotification(
        "Transaction updated",
        "Your transaction has been updated successfully.",
        "success"
      );

    } catch (error) {
      console.error("Update transaction error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/transactions/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete transaction.");
      }

      setTransactions(previous =>
        previous.filter(item => item.id !== id)
      );

      pushNotification(
        "Transaction deleted",
        "The selected transaction was permanently removed.",
        "success"
      );

    } catch (error) {
      console.error("Delete transaction error:", error);

      pushNotification(
        "Delete failed",
        error instanceof Error
          ? error.message
          : "Unable to connect to the server.",
        "warning"
      );
    }
  }

  // Budget handlers
  async function handleAddBudget() {
    const limit = Number(budgetAmount);

    if (!budgetAmount.trim() || !Number.isSafeInteger(limit) || limit <= 0) {
      window.alert("Enter a valid budget amount.");
      return;
    }

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      window.alert("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/budgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: budgetCategory,
          limitAmount: limit,
          month: budgetMonth,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.budget) {
        throw new Error(result.message || "Unable to save budget.");
      }

      const saved = result.budget;

      const newBudget: Budget = {
        id: String(saved.id),
        category: saved.category,
        limitAmount: Number(saved.limitAmount),
        month: saved.month,
        createdAt: saved.createdAt,
      };

      setBudgets(previous => [
        ...previous.filter(
          item => !(item.category === newBudget.category &&
                    item.month === newBudget.month)
        ),
        newBudget,
      ]);

      pushNotification(
        "Budget saved",
        `${budgetCategory} budget for ${budgetMonth} has been saved.`,
        "success"
      );

      setBudgetAmount("");
    } catch (error) {
      console.error("Add budget error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  async function handleEditBudget(budget: Budget) {
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

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      window.alert("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/budgets/${encodeURIComponent(budget.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            limitAmount: newLimit,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.budget) {
        throw new Error(result.message || "Unable to update budget.");
      }

      const saved = result.budget;

      const updatedBudget: Budget = {
        id: String(saved.id),
        category: saved.category,
        limitAmount: Number(saved.limitAmount),
        month: saved.month,
        createdAt: saved.createdAt,
      };

      setBudgets(previous =>
        previous.map(item =>
          item.id === budget.id ? updatedBudget : item
        )
      );

      pushNotification(
        "Budget updated",
        `${budget.category} budget limit was updated.`,
        "success"
      );
    } catch (error) {
      console.error("Edit budget error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  async function handleDeleteBudget(id: string) {
    if (!window.confirm("Delete this budget?")) return;

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      window.alert("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/budgets/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete budget.");
      }

      setBudgets(previous =>
        previous.filter(item => item.id !== id)
      );

      pushNotification(
        "Budget deleted",
        "The selected budget was permanently removed.",
        "success"
      );
    } catch (error) {
      console.error("Delete budget error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  // Savings handlers
  async function handleAddSavingsGoal() {
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

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      setSavingsError("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/savings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          targetAmount: target,
          savedAmount: 0,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.goal) {
        throw new Error(result.message || "Unable to create savings goal.");
      }

      const saved = result.goal;

      const newGoal: SavingsGoal = {
        id: String(saved.id),
        name: saved.name,
        targetAmount: Number(saved.targetAmount),
        savedAmount: Number(saved.savedAmount),
        createdAt: saved.createdAt,
      };

      setSavingsGoals(previous => [...previous, newGoal]);

      pushNotification(
        "Savings goal created",
        `${name} is ready to track.`,
        "success"
      );

      setGoalName("");
      setGoalTarget("");
    } catch (error) {
      console.error("Create savings goal error:", error);
      setSavingsError(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  async function handleAddSavings(goal: SavingsGoal) {
    const input = window.prompt(`Add savings for ${goal.name} (MMK):`);
    if (input === null) return;

    const savingsAmount = Number(input);

    if (!input.trim() || !Number.isSafeInteger(savingsAmount) || savingsAmount <= 0) {
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

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      window.alert("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/savings/${encodeURIComponent(goal.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            savedAmount: goal.savedAmount + savingsAmount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.goal) {
        throw new Error(result.message || "Unable to add savings.");
      }

      const saved = result.goal;

      const updatedGoal: SavingsGoal = {
        id: String(saved.id),
        name: saved.name,
        targetAmount: Number(saved.targetAmount),
        savedAmount: Number(saved.savedAmount),
        createdAt: saved.createdAt,
      };

      setSavingsGoals(previous =>
        previous.map(item => item.id === goal.id ? updatedGoal : item)
      );

      const newTotal = updatedGoal.savedAmount;

      if (newTotal >= updatedGoal.targetAmount && goal.savedAmount < goal.targetAmount) {
        pushNotification(
          "Savings goal reached",
          `Congratulations! You completed ${goal.name}.`,
          "success"
        );
      } else if (
        newTotal / updatedGoal.targetAmount >= 0.5 &&
        goal.savedAmount / goal.targetAmount < 0.5
      ) {
        pushNotification(
          "Savings milestone",
          `You've reached 50% of ${goal.name}.`,
          "success"
        );
      } else {
        pushNotification(
          "Savings updated",
          `${formatMoney(savingsAmount)} added to ${goal.name}.`,
          "success"
        );
      }
    } catch (error) {
      console.error("Add savings error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  async function handleWithdrawSavings(goal: SavingsGoal) {
    const input = window.prompt(`Withdraw from ${goal.name} (MMK):`);
    if (input === null) return;

    const withdrawalAmount = Number(input);

    if (!input.trim() || !Number.isSafeInteger(withdrawalAmount) || withdrawalAmount <= 0) {
      window.alert("Enter a valid amount.");
      return;
    }

    if (withdrawalAmount > goal.savedAmount) {
      window.alert("Insufficient savings.");
      return;
    }

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      window.alert("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/savings/${encodeURIComponent(goal.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            savedAmount: goal.savedAmount - withdrawalAmount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.goal) {
        throw new Error(result.message || "Unable to withdraw savings.");
      }

      const saved = result.goal;

      const updatedGoal: SavingsGoal = {
        id: String(saved.id),
        name: saved.name,
        targetAmount: Number(saved.targetAmount),
        savedAmount: Number(saved.savedAmount),
        createdAt: saved.createdAt,
      };

      setSavingsGoals(previous =>
        previous.map(item => item.id === goal.id ? updatedGoal : item)
      );

      pushNotification(
        "Savings withdrawn",
        `${formatMoney(withdrawalAmount)} withdrawn from ${goal.name}.`,
        "info"
      );
    } catch (error) {
      console.error("Withdraw savings error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }

  async function handleDeleteSavingsGoal(id: string) {
    if (!window.confirm("Delete this savings goal?")) return;

    const token =
      localStorage.getItem("fintrack_token") ||
      sessionStorage.getItem("fintrack_token");

    if (!token) {
      window.alert("Your session has expired. Please sign in again.");
      setIsAuthenticated(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/savings/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete savings goal.");
      }

      setSavingsGoals(previous =>
        previous.filter(item => item.id !== id)
      );

      pushNotification(
        "Savings goal deleted",
        "The selected savings goal was permanently removed.",
        "success"
      );
    } catch (error) {
      console.error("Delete savings goal error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server."
      );
    }
  }
  async function refreshDebts() {
  const token =
    localStorage.getItem("fintrack_token") ||
    sessionStorage.getItem("fintrack_token");

  if (!token) {
    setDebtError("Session expired. Please sign in again.");
    return;
  }

  setDebtLoading(true);
  setDebtError("");

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const [debtsResponse, overviewResponse] = await Promise.all([
      fetch(`${API_URL}/api/debts`, { headers }),
      fetch(`${API_URL}/api/debts/overview`, { headers }),
    ]);

    const [debtsResult, overviewResult] = await Promise.all([
      debtsResponse.json(),
      overviewResponse.json(),
    ]);

    if (!debtsResponse.ok || !debtsResult.success) {
      throw new Error(debtsResult.message || "Unable to load debts.");
    }

    if (!overviewResponse.ok || !overviewResult.success) {
      throw new Error(overviewResult.message || "Unable to load debt overview.");
    }

    const normalized: Debt[] = debtsResult.debts.map((item: any) => ({
      id: String(item.id),
      userId: String(item.userId),
      personName: item.personName,
      type: item.type,
      principalAmount: Number(item.principalAmount),
      paidAmount: Number(item.paidAmount),
      description: item.description || "",
      startDate: String(item.startDate).slice(0, 10),
      dueDate: item.dueDate
        ? String(item.dueDate).slice(0, 10)
        : null,
      status: item.status,
      archivedAt: item.archivedAt
  ? String(item.archivedAt)
  : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payments: (item.payments || []).map((payment: any) => ({
        id: String(payment.id),
        debtId: String(payment.debtId),
        userId: String(payment.userId),
        amount: Number(payment.amount),
        paymentDate: String(payment.paymentDate).slice(0, 10),
        note: payment.note || "",
        createdAt: payment.createdAt,
      })),
      remainingAmount: Number(item.remainingAmount),
    }));

    setDebts(normalized);
    setDebtOverview(overviewResult.summary);

  } catch (error) {
    setDebtError(
      error instanceof Error
        ? error.message
        : "Unable to load debt information."
    );
  } finally {
    setDebtLoading(false);
  }
}
const activeDebts = debts.filter(
  debt => debt.status !== "paid" && !debt.archivedAt
);

const completedDebts = debts.filter(
  debt => debt.status === "paid" && !debt.archivedAt
);

const archivedDebts = debts.filter(
  debt => Boolean(debt.archivedAt)
);

const visibleDebts =
  debtTab === "active"
    ? activeDebts
    : debtTab === "completed"
      ? completedDebts
      : archivedDebts;
async function handleCreateDebt(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setDebtError("");

  const numericAmount = Number(debtPrincipalAmount);
  console.log("DEBT AMOUNT DEBUG:", {
  inputValue: debtPrincipalAmount,
  numericAmount,
  expectedAmount: 80000,
});

  if (!debtPersonName.trim()) {
    setDebtError("Please enter the person's name.");
    return;
  }

  if (!Number.isSafeInteger(numericAmount) || numericAmount <= 0) {
    setDebtError("Enter a valid debt amount.");
    return;
  }

  const token =
    localStorage.getItem("fintrack_token") ||
    sessionStorage.getItem("fintrack_token");

  if (!token) {
    setDebtError("Please sign in again.");
    return;
  }

  setDebtLoading(true);
  try {
    const requestBody = {
      type: debtType,
      personName: debtPersonName.trim(),
      principalAmount: numericAmount,
      description: debtDescription.trim(),
      startDate: debtStartDate,
      dueDate: debtDueDate || null,
    };

    console.log("DEBT REQUEST DEBUG:", {
      inputValue: debtPrincipalAmount,
      numericAmount,
      requestBody,
    });

    const response = await fetch(`${API_URL}/api/debts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to create debt.");
    }

    setDebtPersonName("");
    setDebtPrincipalAmount("");
    setDebtDescription("");
    setDebtStartDate(getToday());
    setDebtDueDate("");

    await refreshDebts();

    pushNotification(
      "Debt created",
      "Your debt record has been saved successfully.",
      "success"
    );

  } catch (error) {
    setDebtError(
      error instanceof Error ? error.message : "Unable to create debt."
    );
    setDebtLoading(false);
  }
}
 async function handleAddDebtPayment(
  event: FormEvent<HTMLFormElement>,
  debtId: string
) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const paymentAmount = Number(formData.get("paymentAmount"));
  const paymentDate = String(formData.get("paymentDate") || "");
  const note = String(formData.get("paymentNote") || "");

  setPaymentError("");

  if (!Number.isSafeInteger(paymentAmount) || paymentAmount <= 0) {
    setPaymentError("Enter a valid payment amount.");
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
    setPaymentError("Enter a valid payment date.");
    return;
  }

  const token =
    localStorage.getItem("fintrack_token") ||
    sessionStorage.getItem("fintrack_token");

  if (!token) {
    setPaymentError("Please sign in again.");
    return;
  }

  setDebtLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/api/debts/${encodeURIComponent(debtId)}/payments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: paymentAmount,
          paymentDate,
          note,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to record payment."
      );
    }

    await refreshDebts();

    form.reset();

    setPaymentError("");

    pushNotification(
      "Payment recorded",
      "Your payment has been saved successfully.",
      "success"
    );

  } catch (error) {
    setPaymentError(
      error instanceof Error
        ? error.message
        : "Unable to record payment."
    );
  } finally {
    setDebtLoading(false);
  }
}
async function updateDebtArchive(
  debtId: string,
  action: "archive" | "restore"
) {
  const token =
    localStorage.getItem("fintrack_token") ||
    sessionStorage.getItem("fintrack_token");

  if (!token) {
    setDebtError("Please sign in again.");
    return;
  }

  setDebtLoading(true);
  setDebtError("");

  try {
    const response = await fetch(
      `${API_URL}/api/debts/${encodeURIComponent(debtId)}/${action}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to update debt.");
    }

    await refreshDebts();

    pushNotification(
      action === "archive" ? "Debt archived" : "Debt restored",
      action === "archive"
        ? "Completed debt moved to archive."
        : "Debt restored successfully.",
      "success"
    );
  } catch (error) {
    setDebtError(
      error instanceof Error ? error.message : "Unable to update debt."
    );
  } finally {
    setDebtLoading(false);
  }
}

  const pageTitles: Record<
    Page,
    { eyebrow: string; title: string; description: string }
  > = {
    debts: {
  eyebrow: "DEBT MANAGEMENT",
  title: "Debt Management",
  description: "Manage money you owe and money owed to you.",
},
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


  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

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
          <button
  title="Debt Management"
  aria-label="Debt Management"
  className={
    activePage === "debts"
      ? "nav-item active"
      : "nav-item"
  }
  onClick={() => setActivePage("debts")}
>
  <span className="nav-icon">⇄</span>
</button>
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
              <span className="profile-avatar">{avatarLetter}</span>
              <span className="profile-copy"><strong>{displayName}</strong><small>{displayEmail}</small></span>
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

        {profileOpen && <div className="floating-panel profile-panel" role="menu"><div className="profile-menu-heading"><span className="profile-avatar">{avatarLetter}</span><div><strong>{displayName}</strong><small>{displayEmail}</small></div></div><button type="button" onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}>⚙ Account preferences</button><button type="button" onClick={() => { setProfileOpen(false); exportBackup(); }}>↓ Export data backup</button><button type="button" onClick={() => {
  localStorage.removeItem("fintrack_token");
  localStorage.removeItem("fintrack_user");
  sessionStorage.removeItem("fintrack_token");
  sessionStorage.removeItem("fintrack_user");
  setProfileOpen(false);
  setIsAuthenticated(false);
}}>↪ Sign out</button></div>}

        {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="floating-panel-head"><div><span className="eyebrow">PREFERENCES</span><h2 id="settings-title">FinTrack settings</h2><small>Manage alerts and your local data.</small></div><button type="button" className="panel-close" onClick={() => setSettingsOpen(false)}>×</button></div><div className="settings-option"><div><strong>In-app notifications</strong><p>Budget warnings, saved transactions and savings milestones appear in your FinTrack notification center.</p></div><span className="settings-enabled">Always on</span></div>

<div className="settings-option">
  <div>
    <strong>Push notifications</strong>
    <p>Receive FinTrack alerts on your iPhone Lock Screen and Notification Center.</p>
    <small>
      {pushEnabled ? "Push notifications are enabled." : "Get alerts even when FinTrack is closed."}
    </small>
  </div>
  <button
    type="button"
    className="secondary-button"
    disabled={pushLoading}
    onClick={pushEnabled ? disablePushNotifications : enablePushNotifications}
  >
    {pushLoading ? "Please wait..." : pushEnabled ? "Disable" : "Enable"}
  </button>
</div>
<div className="settings-actions"><button type="button" className="secondary-button" onClick={exportBackup}>Export backup</button><label className="secondary-button import-button">Import backup<input type="file" accept="application/json,.json" onChange={event => { importBackup(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div><p className="settings-note">Your data is currently stored in this browser on this device. Account sync and cloud backup are not enabled yet.</p></section></div>}

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
                {/* Monthly Financial Summary */}
<article className="surface-card monthly-summary-card">

  <div className="section-heading">
    <div>
      <span className="eyebrow">MONTHLY OVERVIEW</span>
      <h2>Financial Summary</h2>
      <p>
        {new Date(`${currentMonth}-01T00:00:00`)
          .toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
      </p>
    </div>
  </div>

  <div className="monthly-summary-grid">

    <div className="monthly-summary-item">
      <span>Monthly Income</span>
      <strong className="amount-positive">
        {formatMoney(monthlyIncome)}
      </strong>
    </div>

    <div className="monthly-summary-item">
      <span>Monthly Expenses</span>
      <strong className="amount-negative">
        {formatMoney(monthlyExpenses)}
      </strong>
    </div>

    <div className="monthly-summary-item">
      <span>Remaining Balance</span>
      <strong className={monthlyNet >= 0
        ? "amount-positive"
        : "amount-negative"
      }>
        {formatMoney(monthlyNet)}
      </strong>
    </div>

    <div className="monthly-summary-item">
      <span>Highest Spending</span>
      <strong>
        {highestSpendingCategory
          ? highestSpendingCategory.category
          : "No expenses"}
      </strong>
      <small>
        {highestSpendingCategory
          ? formatMoney(highestSpendingCategory.total)
          : ""}
      </small>
    </div>

  </div>

  <div className="monthly-comparison">
    <div>
      <span className="eyebrow">PREVIOUS MONTH COMPARISON</span>
      <p>
        Last month expenses:
        <strong>{formatMoney(previousMonthExpenses)}</strong>
      </p>
    </div>

    {expenseChange !== null ? (
      <span className={
        expenseChange > 0
          ? "comparison-badge danger"
          : expenseChange < 0
            ? "comparison-badge good"
            : "comparison-badge"
      }>
        {expenseChange > 0 ? "↑ " : expenseChange < 0 ? "↓ " : ""}
        {Math.abs(expenseChange).toFixed(1)}%
      </span>
    ) : (
      <span className="comparison-badge">
        No previous data
      </span>
    )}
  </div>

  <div className="category-breakdown">
    <h3>Spending by Category</h3>

    {categorySpending.length === 0 ? (
      <p className="empty-state">
        No expenses recorded this month.
      </p>
    ) : (
      categorySpending.map((item) => (
        <div className="category-breakdown-item" key={item.category}>

          <div className="category-breakdown-head">
            <strong>{item.category}</strong>
            <span>{formatMoney(item.total)}</span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(item.total / categoryTotal) * 100}%`,
              }}
            />
          </div>

        </div>
      ))
    )}
  </div>

</article>

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
                    <h2>{editingTransactionId ? "Edit transaction" : "Add transaction"}</h2>
                    <p>Record money coming in or going out.</p>
                  </div>
                </div>

                <form onSubmit={editingTransactionId ? handleUpdateTransaction : handleAddTransaction}>
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
                    {editingTransactionId ? "Save changes" : "Save transaction"}
                  </button>
                  {editingTransactionId && (
                    <button
                      type="button"
                      className="secondary-button full-width"
                      onClick={cancelEditTransaction}
                    >
                      Cancel edit
                    </button>
                  )}
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
                            className="text-button"
                            type="button"
                            onClick={() => startEditTransaction(item)}
                          >
                            Edit
                          </button>
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
          {activePage === "debts" && (
  <section className="debt-page">

    {/* Overview */}
    <section className="metric-grid">

      <article className="metric-card metric-card-expense">
        <span className="metric-label">TOTAL BORROWED</span>
        <strong>{formatMoney(debtOverview.totalBorrowed)}</strong>
        <small>Money you owe</small>
      </article>

      <article className="metric-card metric-card-income">
        <span className="metric-label">TOTAL LENT</span>
        <strong>{formatMoney(debtOverview.totalLent)}</strong>
        <small>Money owed to you</small>
      </article>

      <article className="metric-card metric-card-expense">
        <span className="metric-label">REMAINING DEBT</span>
        <strong>{formatMoney(debtOverview.remainingBorrowed)}</strong>
        <small>Still to repay</small>
      </article>

      <article className="metric-card metric-card-savings">
        <span className="metric-label">EXPECTED TO RECEIVE</span>
        <strong>{formatMoney(debtOverview.remainingLent)}</strong>
        <small>Still to collect</small>
      </article>

    </section>

    {/* Create Debt */}
    <article className="surface-card form-card">

      <div className="section-heading">
        <div>
          <h2>Add new debt</h2>
          <p>Record borrowed or lent money.</p>
        </div>
      </div>

      <form onSubmit={handleCreateDebt}>

        <div className="form-group">
          <label>Debt type</label>

          <select
            value={debtType}
            onChange={event =>
              setDebtType(event.target.value as DebtType)
            }
          >
            <option value="borrowed">I borrowed money</option>
            <option value="lent">I lent money</option>
          </select>
        </div>

        <div className="form-group">
          <label>Person name</label>

          <input
            type="text"
            required
            maxLength={100}
            value={debtPersonName}
            onChange={event =>
              setDebtPersonName(event.target.value)
            }
            placeholder="Enter person's name"
          />
        </div>

        <div className="form-group">
          <label>Principal amount (MMK)</label>

          <input
            type="number"
            min="1"
            step="1"
            required
            value={debtPrincipalAmount}
            onChange={event =>
              setDebtPrincipalAmount(event.target.value)
            }
            placeholder="e.g. 100000"
          />
        </div>

        <div className="form-group">
          <label>Start date</label>

          <input
            type="date"
            required
            value={debtStartDate}
            onChange={event =>
              setDebtStartDate(event.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label>Due date (Optional)</label>

          <input
            type="date"
            min={debtStartDate}
            value={debtDueDate}
            onChange={event =>
              setDebtDueDate(event.target.value)
            }
          />
        </div>

        <div className="form-group">
          <label>Description</label>

          <input
            type="text"
            maxLength={200}
            value={debtDescription}
            onChange={event =>
              setDebtDescription(event.target.value)
            }
            placeholder="Optional note"
          />
        </div>

        {debtError && (
          <p className="error-message" role="alert">
            {debtError}
          </p>
        )}

        <button
          type="submit"
          className="primary-button full-width"
          disabled={debtLoading}
        >
          {debtLoading ? "Saving..." : "Create debt"}
        </button>

      </form>
    </article>

    {/* Debt List */}
    <div className="section-heading section-heading-spaced">
      <div>
        <div className="section-heading section-heading-spaced">
  <div>
    <h2>Debt records</h2>
    <p>Manage your borrowed and lent money.</p>
  </div>

  <span className="count-pill">
    {visibleDebts.length} records
  </span>
</div>

<div className="debt-tabs">
  <button
    type="button"
    className={debtTab === "active" ? "active" : ""}
    onClick={() => setDebtTab("active")}
  >
    Active ({activeDebts.length})
  </button>

  <button
    type="button"
    className={debtTab === "completed" ? "active" : ""}
    onClick={() => setDebtTab("completed")}
  >
    Completed ({completedDebts.length})
  </button>

  <button
    type="button"
    className={debtTab === "archived" ? "active" : ""}
    onClick={() => setDebtTab("archived")}
  >
    Archived ({archivedDebts.length})
  </button>
</div>
        <p>Manage your borrowed and lent money.</p>
      </div>

      <span className="count-pill">
        {debts.length} records
      </span>
    </div>

    {debtLoading && (
      <p>Loading debt information...</p>
    )}

    {!debtLoading && visibleDebts.length === 0 && (
      <article className="surface-card empty-state">
        <strong>No debt records yet</strong>
        <p>Create your first debt record to get started.</p>
      </article>
    )}

    <section className="budget-grid">

      {visibleDebts.map(debt => (


        <article className="surface-card budget-card" key={debt.id}>

          <div className="budget-card-head">
            <div>
              <span className="eyebrow">
                {debt.type === "borrowed" ? "BORROWED" : "LENT"}
              </span>

              <h3>{debt.personName}</h3>
            </div>

            <span className={
              debt.status === "paid"
                ? "status-tag good"
                : debt.status === "partial"
                  ? "status-tag warning"
                  : "status-tag neutral"
            }>
              {debt.status.toUpperCase()}
            </span>
          </div>

          <div className="budget-numbers">
            <strong>{formatMoney(debt.remainingAmount)}</strong>
            <span>Remaining</span>
          </div>

          <p>
            Principal: {formatMoney(debt.principalAmount)}
          </p>

          <p>
            Paid: {formatMoney(debt.paidAmount)}
          </p>

          <p>
            Start date: {debt.startDate}
          </p>

          {debt.dueDate && (
            <p>Due date: {debt.dueDate}</p>
          )}

          {debt.description && (
            <p>{debt.description}</p>
          )}

          {/* Payment form */}
          {debt.status !== "paid" && (

            <form
              onSubmit={event =>
                handleAddDebtPayment(event, debt.id)
              }
            >

              <div className="form-group">
                <label>Payment amount (MMK)</label>

                <input
                  name="paymentAmount"
                  type="number"
                  min="1"
                  max={debt.remainingAmount}
                  step="1"
                  required
                  placeholder="Enter amount"
                />
              </div>

              <div className="form-group">
                <label>Payment date</label>

                <input
                  name="paymentDate"
                  type="date"
                  defaultValue={getToday()}
                  required
                />
              </div>

              <div className="form-group">
                <label>Note</label>

                <input
                  name="paymentNote"
                  type="text"
                  maxLength={200}
                  placeholder="Optional payment note"
                />
              </div>
              {paymentError && (
  <p className="error-message" role="alert">
    {paymentError}
  </p>
)}

              <button
                type="submit"
                className="primary-button compact"
                disabled={debtLoading}
              >
                Record payment
              </button>

            </form>

          )}
          {debt.status === "paid" && !debt.archivedAt && (
  <button
    type="button"
    className="danger-link"
    disabled={debtLoading}
    onClick={() => updateDebtArchive(debt.id, "archive")}
  >
    Archive Debt
  </button>
)}

{debt.archivedAt && (
  <button
    type="button"
    className="primary-button compact"
    disabled={debtLoading}
    onClick={() => updateDebtArchive(debt.id, "restore")}
  >
    Restore Debt
  </button>
)}

          {/* Payment history */}
          <div className="section-heading section-heading-spaced">
            <h3>Payment history</h3>
          </div>

          {debt.payments.length === 0 ? (
            <p>No payments recorded.</p>
          ) : (
            <div className="compact-list">
              {debt.payments.map(payment => (
                <div className="compact-row" key={payment.id}>
                  <div className="compact-info">
                    <strong>
                      {formatMoney(payment.amount)}
                    </strong>
                    <small>{payment.paymentDate}</small>
                    {payment.note && (
                      <small>{payment.note}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </article>

      ))}

    </section>

  </section>
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
