FinTrack – Personal Finance Tracker
Overview
FinTrack is a full-stack personal finance management application
designed to help users organize and monitor their financial activities
in one place.

Built with React, TypeScript, Node.js, Express, Prisma ORM, and
PostgreSQL, FinTrack provides tools for tracking income and expenses,
managing budgets, monitoring savings goals, and handling personal debts.

The application also supports Progressive Web App (PWA) installation and
browser push notifications.
Live Application
- Frontend: https://fintrack-frontend-wdf4.onrender.com/
- Backend: https://fintrack-backend-uce2.onrender.com/
- Source Code: FinTrack on
  GitHub
Key Features
  Feature                             Description
  Dashboard                           View financial summaries and trends

  Transactions                        Record, edit, and manage income and
expenses

  Budget Management                   Create monthly budgets and monitor
spending

  Budget Alerts                       Receive alerts at budget thresholds
and when budgets are exceeded

  Savings Goals                       Set savings targets and track
progress

  Debt Management                     Track borrowed and lent money,
payments, and remaining balances

  Analytics                           Review financial activity and
spending patterns

  Notifications                       Receive in-app and browser push
notifications

  Authentication                      JWT-based user authentication

  Data Backup                         Export and restore financial
records
PWA Support                         Install the application on
supported devices
Technology Stack
Frontend
- React
- TypeScript
- Vite
- CSS
- Progressive Web App (PWA)
- Service Workers
- Web Push API
Backend
- Node.js
- Express.js
- TypeScript
- Prisma ORM
- JWT Authentication
- Zod Validation
- Web Push
Database
- PostgreSQL
- Neon Database
Development & Deployment
- Git
- GitHub
- Render
- Docker and Docker Compose (where configured)
System Architecture
                  USER
                    |
                    v
           React + TypeScript
                Frontend
                    |
                 REST API
                    |
                    v
            Node.js + Express
                 Backend
                    |
                    v
                Prisma ORM
                    |
                    v
               PostgreSQL
                (Neon DB)

          Push Notifications
                    |
                    v
              Web Push API

             Deployment
                    |
                    v
                  Render
Project Structure
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
└── README.md
Getting Started
Prerequisites
- Node.js
- npm
- PostgreSQL or a Neon Database account
- Git
1. Clone the Repository
git clone https://github.com/hsumyatnoe2092/fintrack.git
cd fintrack
2. Install Dependencies
Backend:
cd backend
npm install
Frontend: Open another terminal from the project root:
cd frontend
npm install
3. Configure Environment Variables
Create the required environment files.

Backend --- backend/.env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_random_secret
FRONTEND_URL=http://localhost:5173

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
Frontend --- frontend/.env
VITE_API_URL=http://localhost:YOUR_BACKEND_PORT
For the deployed application, use:
VITE_API_URL=https://fintrack-backend-uce2.onrender.com
Replace placeholder values with your own configuration. Never commit
.env files, database credentials, JWT secrets, or private VAPID keys.
4. Database Setup
From the backend directory:
npx prisma migrate deploy
npx prisma generate
Make sure your PostgreSQL database is configured before running
migrations.
5. Run the Application
Backend:
cd backend
npm run dev
Frontend: In a separate terminal:
cd frontend
npm run dev
Open the frontend development URL shown in your terminal (commonly
http://localhost:5173).
6. Docker
If using the configured Docker Compose setup, run from the project root:
docker compose up --build -d
Push Notification Setup
FinTrack uses the Web Push API with VAPID authentication.
1. Configure the VAPID public key, private key, and subject on the
   backend.
2. Configure the frontend API URL.
3. Register the Service Worker.
4. Allow notification permissions in the browser.
5. Subscribe the device to push notifications.
Push notifications require HTTPS in production and compatible browser
and device support.
CI/CD and Deployment
FinTrack is deployed using Render, with PostgreSQL hosted on Neon.

  Component        Platform
  Frontend         Render
Backend          Render
Database         Neon PostgreSQL
Source Control   GitHub
Progressive Web App (PWA)
FinTrack supports installation as a Progressive Web App.
iOS Installation
1. Open FinTrack in Safari.
2. Tap the Share button.
3. Select Add to Home Screen.
4. Tap Add.
Android Installation
1. Open FinTrack in a supported browser.
2. Select Install App or Add to Home Screen.
3. Complete the installation.
Push Notifications
FinTrack uses Service Workers and the Web Push API to deliver browser
push notifications.

Notification availability depends on browser support, device settings,
permissions, and installation requirements.
Security
Security measures include:
- Password hashing.
- JWT-based authentication.
- Environment-based secret management.
- Request validation using Zod.
- User-specific data access controls.
- Protected API routes.
- Excluding API and financial data responses from Service Worker
  caching.
Future Improvements
- Automated backend testing.
- Expanded financial reporting.
- Enhanced offline functionality.
- Automated database backups.
- Monitoring and logging improvements.
Author
Hsu Myat Noe
- GitHub: hsumyatnoe2092
- Project Repository:
  FinTrack
FinTrack --- Take Control of Your Finances.
