# FinTrack – Personal Finance Tracker

A modern Personal Finance Management Application built to help users track income, expenses, budgets, savings, and debts in one place.

FinTrack provides a clean dashboard, financial insights, and Progressive Web App (PWA) support with push notifications to help users stay informed about their financial activities.

## ✨ Features

### 📊 Dashboard
- View total balance, income, expenses, and savings.
- Visualize monthly financial activity.
- Monitor financial performance through charts and summaries.

### 💸 Transaction Management
- Add, edit, and delete income and expense transactions.
- Organize transactions by category.
- Track transaction history.

### 🎯 Budget Management
- Create and manage monthly budgets.
- Monitor spending against budget limits.
- Receive budget alerts at 50%, 80%, and 100%.
- Get notified when spending exceeds the budget.

### 💰 Savings Goals
- Create personal savings goals.
- Set target amounts.
- Track savings progress.
- Manage savings contributions.

### 🤝 Debt Management
- Track borrowed and lent money.
- Record debt payments.
- Monitor remaining balances.
- Archive completed debts.

### 🔔 Notifications
- In-app notification center.
- Web Push Notifications.
- Budget alerts and financial activity notifications.
- Receive notifications even when the application is in the background, subject to browser and device support.

### 📱 Progressive Web App (PWA)
- Installable on supported devices.
- Home Screen support.
- Service Worker integration.
- Offline app-shell caching.
- Push notification support.

### 📦 Data Management
- Export financial data backups.
- Import previously exported backups.

## 🛠️ Tech Stack

**Frontend**
- React
- TypeScript
- Vite
- CSS
- Progressive Web App (PWA)

**Backend**
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- Web Push

**Database**
- PostgreSQL
- Neon Database

**Deployment**
- Render
- GitHub

## 📁 Project Structure

```text
fintrack/
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   ├── sw.js
│   │   └── manifest.webmanifest
│   └── src/
│       ├── components/
│       ├── App.tsx
│       ├── App.css
│       └── main.tsx
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── app.ts
│       └── server.ts
│
└── README.md
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/hsumyatnoe2092/fintrack.git

cd fintrack
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Install Backend Dependencies

```bash
cd ../backend
npm install
```

### 4. Configure Environment Variables

Create the required environment files using the following variables.

**Backend environment (`backend/.env` or the environment configuration used by your deployment):**

```env
DATABASE_URL=your_postgresql_database_url

FRONTEND_URL=your_frontend_url

VAPID_PUBLIC_KEY=your_vapid_public_key

VAPID_PRIVATE_KEY=your_vapid_private_key

VAPID_SUBJECT=mailto:your-email@example.com
```

**Frontend environment (`frontend/.env`):**

```env
VITE_API_URL=your_backend_api_url
```

Never commit real credentials, database passwords, or private keys to GitHub.

### 5. Set Up the Database

```bash
cd backend

npx prisma migrate deploy

npx prisma generate
```

Make sure your PostgreSQL database is configured before running migrations.

### 6. Run the Backend

```bash
cd backend

npm run dev
```

### 7. Run the Frontend

Open another terminal:

```bash
cd frontend

npm run dev
```

The frontend development server will provide a local URL in the terminal.

## 🔔 Push Notification Setup

FinTrack uses Web Push technology with VAPID authentication.

To enable push notifications:

1. Configure VAPID public and private keys.
2. Configure the VAPID subject.
3. Register the Service Worker.
4. Allow notification permissions in the browser.
5. Subscribe the device to push notifications.

Push notifications require HTTPS in production and browser/device support.

## 🌐 Live Demo

Frontend: https://fintrack-frontend-wdf4.onrender.com/

Backend: Deployed separately on Render.

## 🔒 Security

- Environment variables are excluded from version control.
- API endpoints use authentication middleware.
- Financial records are associated with individual user accounts.
- Push subscriptions are associated with authenticated users.
- API responses containing private financial data are excluded from Service Worker caching.

## 👩‍💻 Author

**Hsu Myat Noe**

GitHub: https://github.com/hsumyatnoe2092

## 📄 License

This project is currently provided for educational and portfolio purposes.

---

**FinTrack – Take Control of Your Finances.**
