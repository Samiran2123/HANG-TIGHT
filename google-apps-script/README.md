# Google Sheets Secondary Integration Guide

This application synchronizes customer profile updates, orders, and order status transitions to a Google Spreadsheet using a Google Apps Script Webhook.

> **Architecture Principle**: Supabase PostgreSQL is the authoritative, primary ACID database. Google Sheets serves as a secondary, human-auditable replica for operations, business intelligence, and real-time order monitoring.

---

## 1. Quick Setup (5 Minutes)

1. Open [Google Sheets](https://sheets.new) and create a new sheet: **"Food Ordering Platform Records"**.
2. In the top menu, go to **Extensions** > **Apps Script**.
3. Delete any default code in `Code.gs` and paste the contents of `google-apps-script/Code.gs`.
4. Run the function `initializeSheets` by selecting it in the toolbar dropdown and clicking **Run**. (Grant the requested permissions).
   - This creates 4 formatted, colored tabs:
     - `Customers`
     - `Orders`
     - `Order_Items`
     - `Sync_Logs`
5. Configure the Secret Token:
   - Click the gear icon (**Project Settings**) on the left sidebar.
   - Scroll to **Script Properties** and click **Add script property**.
   - **Property**: `WEBHOOK_SECRET`
   - **Value**: Generate a strong secret (e.g. `sec_food_998877665544`)
   - Click **Save script properties**.
6. Deploy the Web App:
   - Click the blue **Deploy** button > **New deployment**.
   - Select type: **Web app** (gear icon).
   - Description: `Production Webhook v1`
   - Execute as: **Me (your Google account)**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (`https://script.google.com/macros/s/.../exec`).

7. Add to your Backend Environment:
   In `server/.env`:
   ```env
   GOOGLE_SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/AKfyc.../exec"
   GOOGLE_SHEETS_SECRET="sec_food_998877665544"
   ```

---

## 2. Spreadsheets Schema & Tabs

### Tab: `Customers`
| Column | Description |
|---|---|
| User ID | Supabase Auth UUID (`profiles.id`) |
| Email | Customer email |
| Full Name | Customer name |
| Phone | Contact phone number |
| Role | Customer or Admin |
| Delivery Address | Default delivery address |
| Registered At | Initial creation timestamp |
| Last Synced At | Timestamp of last sync update |

### Tab: `Orders`
| Column | Description |
|---|---|
| Order ID | Supabase Order UUID |
| Order Number | Human-readable order identifier (e.g., `ORD-20261023-9821`) |
| Customer Email | Contact email |
| Customer Name | Customer full name |
| Customer Phone | Delivery phone number |
| Status | `pending`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled` |
| Payment Status | `pending`, `paid`, `demo_paid`, `cod` |
| Payment Method | `cod`, `card_demo`, `upi_demo` |
| Subtotal | Sum of validated item prices |
| Tax | Calculated sales tax |
| Delivery Fee | Flat or distance delivery charge |
| Total Amount | Authoritative total computed on backend |
| Items Summary | Human-readable comma-delimited list (e.g., `2x Truffle Smash, 1x Gelato`) |
| Delivery Address | Street, suite, city, postal code |
| Created At | Order placement timestamp |
| Last Synced At | Timestamp of last status change or sync |

### Tab: `Order_Items`
Provides granular line-item records with foreign key linkage to `Order ID` and `Order Number`.

### Tab: `Sync_Logs`
Stores every sync attempt, event type (`SYNC_ORDER`, `SYNC_CUSTOMER`, `UPDATE_STATUS`), outcome (`SUCCESS`, `UPDATED`, `FAILED`), and audit message.
