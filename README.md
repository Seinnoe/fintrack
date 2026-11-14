# FinTrack — Personal Finance Management

A full-stack personal finance management application built with React, TypeScript, Node.js, Express, and PostgreSQL.

FinTrack helps users manage their income, expenses, budgets, savings goals, and debts through a responsive web application with Progressive Web App (PWA) support.

## Features

- **Dashboard:** View financial summaries and trends.
- **Transactions:** Track income and expenses.
- **Budget Management:** Create and monitor monthly budgets.
- **Savings Goals:** Set and track savings targets.
- **Debt Management:** Manage borrowed and lent money.
- **Notifications:** Receive in-app financial alerts.
- **Analytics:** Review financial activity.
- **Authentication:** Secure account authentication with JWT.
- **PWA Support:** Install FinTrack on supported mobile devices.
- **Data Backup:** Export and restore financial records.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- CSS
- Progressive Web App (PWA)

### Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT Authentication
- Zod Validation

### Database
- PostgreSQL
- Neon Database

### DevOps & Deployment
- Docker
- Docker Compose
- GitHub Actions (CI)
- Render
- GitHub

## Architecture

```text
              Users
                |
                v
       React + TypeScript
          (Frontend)
                |
             REST API
                |
                v
       Node.js + Express
           (Backend)
                |
           Prisma ORM
                |
                v
          PostgreSQL
           (Neon DB)

DevOps:
GitHub → GitHub Actions → Build
                         |
                         v
                       Render

Containerization:
Docker + Docker Compose
```

## Project Structure

```text
fintrack/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   └── manifest.webmanifest
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm
- Docker and Docker Compose
- PostgreSQL (or Neon Database)

### 1. Clone the Repository

```bash
git clone https://github.com/hsumyatnoe2092/fintrack.git

cd fintrack
```

### 2. Configure Environment Variables

Create a root `.env` file.

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_random_secret
FRONTEND_URL=http://localhost:5173

POSTGRES_USER=fintrack_user
POSTGRES_PASSWORD=your_local_database_password
POSTGRES_DB=fintrack
POSTGRES_PORT=5432
```

Never commit your `.env` file or expose production credentials.

### 3. Install Dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd ../backend
npm install
```

### 4. Start the Development Servers

Backend:

```bash
cd backend
npm run dev
```

Frontend (in another terminal):

```bash
cd frontend
npm run dev
```

### 5. Run with Docker Compose

From the project root, configure the required environment variables and run:

```bash
docker compose up --build -d
```

## CI/CD

FinTrack uses GitHub Actions to automate:

- Frontend dependency installation and build.
- Backend dependency installation.
- Prisma Client generation.
- Backend TypeScript build validation.

The workflow runs on pushes to `main` and feature branches, and on pull requests targeting `main`.

## Deployment

- **Frontend:** Render
- **Backend:** Render
- **Database:** Neon PostgreSQL
- **Source Control:** GitHub

## PWA Installation

FinTrack supports installation as a Progressive Web App on compatible devices.

On iPhone:
1. Open the FinTrack website in Safari.
2. Tap the Share button.
3. Select Add to Home Screen.
4. Tap Add.

On Android:
1. Open the FinTrack website in a supported browser.
2. Select Install App or Add to Home Screen.

## Security

- Password hashing.
- JWT-based authentication.
- Environment-based secret configuration.
- Request validation with Zod.
- User-specific data access controls.

Security-sensitive configuration must be stored in environment variables and never committed to Git.

## Future Improvements

- Automated backend tests.
- Comprehensive security testing.
- Database backup automation.
- Monitoring and logging.
- Improved offline capabilities.
- Automated deployment pipeline enhancements.

## Author

**Hsu Myat Noe**

GitHub: https://github.com/hsumyatnoe2092

---

*FinTrack — Take control of your finances.*