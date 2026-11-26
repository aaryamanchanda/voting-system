# Online Voting System (Node.js & pnpm)

A modern, secure web application for digital voting and live election monitoring, managed with **pnpm** and built with **Node.js, Express, and EJS**.

---

## 🌟 Features

- **pnpm Package Manager**: Fast, disk-efficient package management.
- **Voter Registration & Authentication**: Secure sign-up and login with password hashing powered by `bcryptjs`.
- **Digital Ballot**: Modern, responsive election cards for **Party A**, **Party B**, and **Party C**.
- **Fraud Prevention**: Strict one-vote-per-voter policy. Users cannot cast duplicate votes.
- **Real-Time Live Results**:
  - Interactive vote distribution doughnut chart with **Chart.js**.
  - Dynamic percentage breakdown and progress bars.
  - Auto-polling `/api/results` endpoint that updates results live without manual page reloads.
- **Session Management**: Secure cookie-based sessions with `express-session`.
- **Persistent Storage**: Lightweight, zero-config JSON database (`data/database.json`) with safe atomic writes.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start the Server
```bash
pnpm start
```

Or for live auto-reloading during development:
```bash
pnpm run dev
```

### 3. Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## 🧪 Testing

Run the automated test suite:
```bash
pnpm test
```

---

## 📁 Project Structure

```
├── server.js              # Express web server & routes
├── db.js                  # Persistent database manager & models
├── package.json           # Node project manifest and scripts
├── pnpm-lock.yaml         # Locked dependency versions
├── test.js                # Automated test suite
├── data/
│   └── database.json      # Persistent database storage
├── views/                 # EJS templates
│   ├── partials/
│   │   ├── header.ejs     # Responsive navbar, user session badge, flash alerts
│   │   └── footer.ejs     # Footer template
│   ├── index.ejs          # Landing page with stats and process overview
│   ├── register.ejs       # Voter registration form
│   ├── login.ejs          # Voter authentication form
│   ├── vote.ejs           # Ballot interface with party options
│   └── results.ejs        # Live results dashboard with Chart.js
└── public/
    └── css/
        └── style.css      # Modern responsive styling
```
