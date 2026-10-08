# retailX (MERN + Tailwind)

A modern point of sale with a sidebar dashboard, sales graph and profit tracking, register, customers, inventory, sales history, refunds and user management.

## Stack
- **Server:** Node, Express, MongoDB (Mongoose), JWT auth, bcrypt
- **Client:** React 18, Vite, React Router, Tailwind CSS v4

## Setup

### 1. API
```bash
cd server
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env  (then set a strong JWT_SECRET)
npm run seed             # creates admin, sample products and sample customers
npm run dev              # http://localhost:5000
```

### 2. Client
```bash
cd client
npm install
npm run dev              # http://localhost:5173 (proxies /api to :5000)
```

Login: `admin@pos.local` / `admin123`. Change it from the Account page (click your name in the sidebar or top right).

## Features
- **Dashboard (admin):** total sales graph (7 / 30 / 90 days), revenue / orders / average order KPIs with change vs the previous period, today's sales, low stock alerts, recent orders, top products and payment split
- **Sidebar layout:** collapsible on desktop, slide-out menu on phones; cashiers only see the pages they can use
- **Register:** product grid, search, categories, cart, discount, tax, cash/card/wallet, printable receipt, optional **customer** on every sale (quick "+ New" customer), and **Hold sale / Resume** for parked carts (kept after a page refresh)
- **Customers:** add, edit, search; each customer shows orders, total spent and last purchase, with a purchase **History** you can open as receipts. Cashiers and admins can add and edit, only admins can delete
- **Profit tracking (admin):** set a cost price per product; sales store cost at the time of sale, and the dashboard shows profit and margin vs the previous period (sales made before cost prices were set count as 0 profit)
- **Barcode scanning:** focus the search box, scan (or type a SKU) and press Enter to add the item
- **Server-side totals** and atomic stock reservation (no overselling)
- **Inventory (admin):** add, edit, delete, search products; cost price and margin; a **reorder level** per product (default 5) drives the low stock highlights and the dashboard alert. Cost prices are never sent to cashiers
- **Sales (admin):** today's orders and revenue, last 100 orders, reopen receipts, **refund** (stock goes back, refunds are excluded from revenue), **Download PDF report** (today / 7 / 30 / 90 days / all: summary, top products, payment split and every order, in retailX colours) and **Export CSV** of up to 5,000 sales (includes customer and profit)
- **Users (admin):** add users, change role, disable/enable, reset password
- **Account:** every user can change their own password (min 8 characters)
- **Toast notifications** and confirmation dialogs instead of browser pop-ups
- **Custom 404 page** for unknown URLs

## Security
- **Passwords:** hashed with bcrypt (cost 12), minimum 8 characters, never returned by the API
- **Brute-force protection:** 8 failed sign-ins for the same email and IP locks that attempt for 15 minutes; the API is also limited to 300 requests per minute per IP
- **Sessions:** 12-hour signed tokens (HS256 only). Changing or resetting a password signs that user out of every other device. Disabling a user cuts them off immediately
- **Idle sign-out:** after 30 minutes without activity the till signs out; expired sessions return to the sign-in screen automatically
- **Default password warning:** the seeded `admin123` password (and any password an admin sets for someone) shows a banner until it is changed
- **Input checks:** every product, user and sale field is validated on the server; unexpected fields are ignored; request bodies are limited to 20 KB
- **Safe errors and headers:** no stack traces or database messages reach the browser; security headers are set on every response
- **Secrets:** `.env` is git-ignored (never commit it); the server refuses to start without `JWT_SECRET`, and in production (`NODE_ENV=production`) also refuses a weak one. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Before going live: use HTTPS, set `NODE_ENV=production`, set `CLIENT_URL` to your real site address, and set `TRUST_PROXY=1` if the API is behind a proxy. Rate-limit counters are kept in memory and reset when the server restarts.

## Config (`server/.env`)
| Key | Meaning |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | long random string |
| `TAX_RATE` | e.g. `0.17` for 17% |
| `REPORT_TIMEZONE` | timezone for the daily chart, e.g. `Asia/Karachi` |
| `USE_GOOGLE_DNS` | `true` if Atlas gives `querySrv ECONNREFUSED` on Windows |

Currency: `CURRENCY` constant in `client/src/api.js`.

## API
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/login | public |
| GET | /api/auth/me | signed in |
| POST | /api/auth/password | signed in |
| GET/POST | /api/auth/users, /api/auth/register | admin |
| PUT | /api/auth/users/:id | admin |
| GET | /api/products | signed in |
| POST/PUT/DELETE | /api/products(/:id) | admin |
| GET/POST/PUT | /api/customers(/:id) | signed in |
| GET | /api/customers/:id/orders | signed in |
| DELETE | /api/customers/:id | admin |
| POST | /api/orders | signed in |
| GET | /api/orders, /api/orders/summary, /api/orders/report | admin |
| POST | /api/orders/:id/refund | admin |

Additional endpoints: `GET /api/orders/dashboard?days=7|30|90` (admin) powers the dashboard; `GET /api/orders?limit=5000` powers the CSV export.
