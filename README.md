# AURA Gourmet Pro | Production Food Ordering Web Application

A full-stack, production-grade food ordering platform engineered with **React (Vite) + Tailwind CSS**, **Node.js (Express)** REST API, **Supabase PostgreSQL & Auth (Row Level Security)**, and **Google Sheets** as an operational secondary data replica.

Designed for live academic evaluations and production deployment on **Vercel** and **Render**.

---

## 1. System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Customer / Admin                     │
│                (Desktop, Tablet, Mobile)               │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           Frontend Client (React 19 + Vite)            │
│   • Tailwind CSS + Lucide Icons + React Router         │
│   • Responsive Glassmorphism & Micro-animations        │
│   • Supabase Auth (Email OTP / Magic Link)             │
│   • Cart State + Live Stepper Order Tracking           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│             Backend API (Node.js + Express)            │
│   • Tamper-proof pricing & authoritative totals        │
│   • Server-side RBAC (Customer vs Admin privileges)    │
│   • Centralized error handling & Helmet protection     │
│   • Health check endpoint (`/api/health`)              │
└───────────────┬────────────────────────────┬───────────┘
                │                            │
   Authoritative│(ACID)                      │Async Webhook
   PostgreSQL   │                            │(Secondary Replica)
                ▼                            ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│     Supabase PostgreSQL       │ │      Google Spreadsheets      │
│ • Profiles & Auth User Triggers│ │ • Google Apps Script Webhook  │
│ • Foods & Categories Catalog  │ │ • Tabs: Customers, Orders,    │
│ • Orders & Order Items        │ │   Order_Items, Sync_Logs      │
│ • Row Level Security (RLS)    │ │ • Idempotent by Record ID     │
└───────────────────────────────┘ └───────────────────────────────┘
```

---

## 2. Key Features

### Customer Experience
- **Gourmet Landing Page**: Hero banner with live culinary recommendations, category pills, search bar, and multi-parameter sorting (Price, Rating, Name).
- **Mouth-Watering Catalog**: Interactive dish cards with ratings, preparation time, tags, calories, and sold-out indicators.
- **Detailed Dish Modal**: Full ingredient breakdowns, calorie counts, and quantity selector.
- **Persistent Slide-over Cart**: Real-time tax computation (8.25%), free delivery incentive progress bar (orders over $50), item removal, and subtotal.
- **Seamless Checkout**: Address capture, delivery driver instructions, and simulated payment methods (Demo Card, Instant UPI/QR, Cash on Delivery).
- **Unique Order Confirmation**: Deterministic, human-readable order references (e.g., `ORD-20261023-1984`).
- **Live 5-Stage Order Tracking**: Visual progress stepper (`Pending` → `Confirmed` → `Preparing` → `Out for Delivery` → `Delivered`).
- **Customer Account & History**: View past orders, track active meals, and edit saved delivery profile info.

### Administrative Command Center (`/admin`)
- **Strict Role-Based Access Control**: Server-side JWT and profile role verification (`role === 'admin'`). Client-supplied roles are never trusted.
- **Executive KPI Cards**: Real-time metrics for Total Revenue, Total Orders, Active Kitchen Orders, Menu Dish count, and Customers.
- **Live Order Management**: Filter orders by status or search by customer name/email. Instant status update dropdown automatically notifies Google Sheets.
- **Menu Catalog Management**: Add new dishes, edit descriptions and prices, upload/update image URLs, and instant 1-click availability toggling (Sold Out / Available).
- **Google Sheets Secondary Sync Panel**: View last sync status, inspect sync audit logs, and trigger manual batch resynchronization of unsynced records.
- **Customer Directory**: Inspect registered customers, contact numbers, addresses, and order volume.

### Security & Data Integrity
- **Tamper-Proof Pricing**: Food unit prices and grand totals are calculated authoritatively on the server from the database. Client attempts to modify prices or totals are rejected.
- **PostgreSQL Row Level Security (RLS)**: Customers can only access their own orders and profile. Only admins can mutate the food catalog or update order statuses.
- **Idempotent Webhooks**: Repeated order sync calls will update existing rows in Google Sheets rather than creating duplicate entries.
- **Demo Mode Helper**: Includes 1-Click quick switches (`Demo Customer` and `Executive Chef Admin`) allowing academic evaluators to test all flows without waiting for external SMTP email delivery.

---

## 3. Repository Structure

```
d:/CEO_AI_PRO/
├── client/                     # React + Vite Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Footer, FoodCard, FoodModal, CartDrawer, AuthModal
│   │   ├── context/            # AuthContext (Supabase OTP), CartContext (localStorage)
│   │   ├── pages/              # Home, Checkout, Confirmation, Tracking, MyOrders, Admin
│   │   └── services/           # api.js, supabase.js
│   ├── package.json
│   └── tailwind.config.js
├── server/                     # Express Backend REST API
│   ├── src/
│   │   ├── config/             # env.js configuration loader
│   │   ├── middleware/         # auth.js (JWT & Admin guard), validation.js
│   │   ├── routes/             # health.js, foods.js, orders.js, admin.js, auth.js
│   │   ├── services/           # supabase.js, sheetsService.js, mockStore.js
│   │   └── index.js            # Express app entrypoint
│   ├── tests/                  # Automated backend security and pricing tests
│   └── package.json
├── supabase/
│   └── migrations/             # SQL Migrations
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── 003_seed_data.sql
│       └── 004_storage_and_admin_helpers.sql
├── google-apps-script/
│   ├── Code.gs                 # Webhook handler script for Google Sheets
│   └── README.md               # Step-by-step Google Sheets setup guide
├── package.json                # Root package.json with unified dev/test scripts
└── README.md                   # Complete documentation
```

---

## 4. Local Quick Start

### Prerequisites
- Node.js v18+ (tested on Node v22.20.0)
- npm v9+

### Installation

1. Clone or navigate to the repository:
   ```bash
   cd d:/CEO_AI_PRO
   ```

2. Install all dependencies for both client and server:
   ```bash
   npm run install:all
   ```

3. Start the Backend API (runs on `http://localhost:5001`):
   ```bash
   npm run server:dev
   ```

4. In a separate terminal, start the Frontend (runs on `http://localhost:5173`):
   ```bash
   npm run client:dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Automated Tests & Build Verification

Run the comprehensive automated test suite (verifies health checks, tamper-proof pricing calculations, validation guards, and admin authorization):

```bash
npm run server:test
```

Run the frontend production build:

```bash
npm run client:build
```

---

## 6. Supabase Database & Auth Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open your project's **SQL Editor** in the Supabase Dashboard.
3. Run the migrations in sequence:
   - Execute `supabase/migrations/001_initial_schema.sql` (Creates tables, indexes, updated_at triggers, and auth user profile hooks).
   - Execute `supabase/migrations/002_rls_policies.sql` (Enables Row Level Security on all tables and creates authorization rules).
   - Execute `supabase/migrations/003_seed_data.sql` (Populates 6 categories and 10+ gourmet dishes with Unsplash photography).
   - Execute `supabase/migrations/004_storage_and_admin_helpers.sql` (Creates `food-images` public storage bucket and admin promotion helper).

4. **Promoting an Admin**:
   After creating a user via Supabase Auth (or email OTP), run this in Supabase SQL Editor:
   ```sql
   SELECT public.set_admin_role_by_email('your-admin-email@example.com');
   ```

---

## 7. Google Sheets Secondary Integration Setup

1. Create a new Google Spreadsheet: **"Food Ordering Platform Records"**.
2. Go to **Extensions** > **Apps Script**.
3. Replace the script editor code with `google-apps-script/Code.gs`.
4. Run `initializeSheets()` once to auto-create the 4 colored sheets:
   - `Customers`
   - `Orders`
   - `Order_Items`
   - `Sync_Logs`
5. In **Project Settings** > **Script Properties**, add:
   - Property: `WEBHOOK_SECRET`
   - Value: `<your-random-token>` (e.g., `sec_food_998877665544`)
6. Click **Deploy** > **New Deployment** > **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Copy the Web App URL and add it to your server `.env`:
   ```env
   GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/AKfyc.../exec"
   GOOGLE_SHEETS_SECRET="sec_food_998877665544"
   ```

---

## 8. Production Deployment Guide

### A. Deploy Backend to Render

1. Create a new **Web Service** on [Render](https://render.com) connected to your GitHub repository.
2. Configure settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Add Environment Variables on Render:
   ```env
   NODE_ENV=production
   PORT=10000
   CLIENT_URL=https://your-frontend.vercel.app
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
   GOOGLE_SHEETS_SECRET=sec_food_998877665544
   APP_DELIVERY_FEE=4.99
   APP_TAX_RATE=0.0825
   ```

### B. Deploy Frontend to Vercel

1. Create a new Project on [Vercel](https://vercel.com) pointing to the repository.
2. Configure settings:
   - **Root Directory**: `client`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variables on Vercel:
   ```env
   VITE_API_BASE_URL=https://your-backend.onrender.com/api
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

---

## 9. Academic Evaluation & Demo Mode

For evaluators reviewing this application locally or in a sandbox:
- Use the **1-Click Customer** button in the top announcement bar to test regular customer ordering, cart checkout, and tracking.
- Use the **1-Click Admin** button to test administrative catalog editing, status updates, and Google Sheets sync logs.
- If real Supabase and Google Sheets credentials are provided in `.env`, the system automatically interacts with the live cloud services. If omitted, the server seamlessly provides fallback data so tests and reviews never fail!
