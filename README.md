<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:ffe14d,50:ffd60a,100:ffb800&height=260&section=header&text=retailX&fontSize=84&fontColor=0a0a0a&fontAlignY=38&animation=fadeIn&desc=Modern%20point%20of%20sale%20%C2%B7%20Inventory%20%C2%B7%20Customers%20%C2%B7%20Profit%20reports&descSize=20&descAlignY=60&descColor=0a0a0a" alt="retailX" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/MongoDB-0a0a0a?style=for-the-badge&logo=mongodb&logoColor=ffd60a" alt="MongoDB">
  <img src="https://img.shields.io/badge/Express-0a0a0a?style=for-the-badge&logo=express&logoColor=ffd60a" alt="Express">
  <img src="https://img.shields.io/badge/React-0a0a0a?style=for-the-badge&logo=react&logoColor=ffd60a" alt="React">
  <img src="https://img.shields.io/badge/Node.js-0a0a0a?style=for-the-badge&logo=nodedotjs&logoColor=ffd60a" alt="Node.js">
  <img src="https://img.shields.io/badge/Tailwind-0a0a0a?style=for-the-badge&logo=tailwindcss&logoColor=ffd60a" alt="Tailwind CSS">
</p>

<p align="center">
  <b>A fast, modern point of sale for small shops and cafes.</b><br>
  Register, inventory, customers, refunds, profit tracking and PDF reports in one clean app.
</p>

---

## Highlights

| | |
|---|---|
| **Register** | Product grid, search, categories, discount, tax, cash / card / wallet, printable receipts |
| **Barcode ready** | Scan or type a SKU and press Enter to add the item |
| **Hold and resume** | Park a cart while you serve someone else, even across a page refresh |
| **Customers** | Attach a customer to any sale, see orders, total spent and full purchase history |
| **Profit tracking** | Cost price per product, profit and margin on the dashboard, compared with the previous period |
| **Dashboard** | Sales graph (7 / 30 / 90 days), KPIs, top products, payment split, low stock alerts |
| **Inventory** | Add, edit and search products, with per-product reorder levels |
| **Sales and refunds** | Reopen receipts, refund in one click (stock goes back, revenue is corrected) |
| **Reports** | **Download PDF report** or **Export CSV** (today, 7, 30, 90 days or all sales) |
| **Users and roles** | Admin and cashier roles, disable users, reset passwords |

## Tech stack

- **Server:** Node.js, Express, MongoDB (Mongoose), JWT auth, bcrypt
- **Client:** React 18, Vite, React Router, Tailwind CSS v4, jsPDF

## Quick start

You need Node.js 18+ and a running MongoDB (local or Atlas).

**1. API**
```bash
cd server
npm install
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
# edit .env and set a strong JWT_SECRET
npm run seed             # creates the admin user, sample products and customers
npm run dev              # http://localhost:5000
```

**2. Client** (in a second terminal)
```bash
cd client
npm install
npm run dev              # http://localhost:5173 (proxies /api to :5000)
```

**Demo login:** `admin@pos.local` / `admin123`. The app asks you to change this password after first sign-in.

## Roles

| | Admin | Cashier |
|---|:--:|:--:|
| Register, hold and resume sales | yes | yes |
| Add and edit customers | yes | yes |
| Delete customers | yes | no |
| Dashboard, inventory, sales, refunds, reports | yes | no |
| See product cost prices | yes | no |
| Manage users | yes | no |

## Configuration (`server/.env`)

| Key | Meaning |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TAX_RATE` | For example `0.17` for 17% |
| `REPORT_TIMEZONE` | Timezone for the daily chart, for example `Asia/Karachi` |
| `CLIENT_URL` | Allowed client origin (CORS) |
| `USE_GOOGLE_DNS` | Set `true` if Atlas gives `querySrv ECONNREFUSED` on Windows |

Currency is the `CURRENCY` constant in `client/src/api.js`.

## Project structure

```
retailx/
├── client/          React app (Vite + Tailwind)
│   └── src/
│       ├── pages/        Dashboard, POS, Inventory, Sales, Customers, Users, Account
│       ├── components/   Layout, UI helpers, charts
│       └── pdfReport.js  PDF sales report
└── server/          Express API
    ├── models/      User, Product, Order, Customer
    ├── routes/      auth, products, orders, customers
    └── middleware/  auth, rate limiting
```

## API

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/login` | public |
| GET | `/api/auth/me` | signed in |
| POST | `/api/auth/password` | signed in |
| GET / POST / PUT | `/api/auth/users`, `/api/auth/register` | admin |
| GET | `/api/products` | signed in |
| POST / PUT / DELETE | `/api/products(/:id)` | admin |
| GET / POST / PUT | `/api/customers(/:id)` | signed in |
| GET | `/api/customers/:id/orders` | signed in |
| DELETE | `/api/customers/:id` | admin |
| POST | `/api/orders` | signed in |
| GET | `/api/orders`, `/api/orders/summary`, `/api/orders/dashboard`, `/api/orders/report` | admin |
| POST | `/api/orders/:id/refund` | admin |

## Security

- Passwords hashed with bcrypt (cost 12), minimum 8 characters, never returned by the API
- Login lockout after repeated failures; API rate limit of 300 requests per minute per IP
- 12-hour signed tokens (HS256). Changing a password signs the user out everywhere; disabling a user cuts access immediately
- Idle sign-out after 30 minutes at the till
- Server-side validation on every field, request size limits, security headers, and no stack traces in responses
- Totals and prices are always computed on the server, and stock is reserved atomically, so there is no overselling
- Cost prices are never sent to cashier accounts
- `.env` is git-ignored. The server refuses to start without `JWT_SECRET`, and in production it also refuses a weak one

Before going live: use HTTPS, set `NODE_ENV=production`, set `CLIENT_URL` to your real site, and set `TRUST_PROXY=1` behind a reverse proxy.

## Useful scripts

```bash
npm run seed                          # server: admin user, sample products and customers
npm run reset-sales -- --yes          # server: delete all sales (add --restock to return stock)
```

<p align="center">Built by <a href="https://github.com/Atibayounus">Atiba</a></p>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:ffb800,50:ffd60a,100:ffe14d&height=120&section=footer" alt="" width="100%">
</p>
