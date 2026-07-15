# ⚡ ColdSwift — Automated HR Recruiter Campaign Engine

**ColdSwift** is a premium, full-stack recruitment outreach platform designed to streamline and automate job application cold emailing to HR coordinators. It extracts recruiter lists from unstructured PDFs, runs domain checks to prevent bounce-backs, and dispatches personalized emails with staggered rate-limiting to bypass spam filters.

![Uploading image.png…]()


---

## 🚀 Core Features

* 📄 **PDF Recruiter List Parser**: Upload unstructured contact lists (`hr_list.pdf`). The system automatically extracts names, email addresses, and target company names using node heuristic rules.
* 📎 **Resume Auto-Attachment**: Upload your CV (`resume.pdf`) once, and the engine attaches it to every personalized outreach email dynamically.
* 🎯 **Dynamic Variable Placeholders**: Auto-resolves variables like `{name}` and `{company}` dynamically inside custom subjects and HTML email bodies for authentic personalization.
* 🛡️ **MX & Domain Verification**: Performs DNS MX lookup checks on every target email domain before sending to eliminate bounce-backs and protect sender score.
* ⏱️ **Staggered Rate-Limiting**: Configure customized delay gaps (in seconds) between emails to prevent triggers on Gmail/Outlook volume thresholds.
* 📊 **Real-time Analytics Dashboard**: View live progression counters (Sent, Pending, Failed, Invalid), browse logs in a scrollable console, and inspect the parsed contacts list.
* 💎 **Premium Glassmorphic UI**: High-end modern dark mode user interface featuring smooth CSS page-fade transitions, responsive segmented tab switchers, and a clean card-based workspace layout.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite), Vanilla CSS (Custom HSL theme tokens, Glassmorphism, Micro-animations), Google Fonts (`Outfit`, `VT323`).
* **Backend**: Node.js, Express, Nodemailer (SMTP mail dispatcher), DNS Promises API (MX validation), PDF-Parse (OCR extraction).
* **Package Management**: Clean build configurations, with unused dependencies pruned (e.g. `@google/generative-ai` and `imapflow` completely removed for performance).

---

## 📂 Project Architecture

```text
ColdSwift/
├── backend/
│   ├── email-template.js     # Professional styled HTML recruiter email template
│   ├── hr-campaign.js        # Core logic: PDF parsing, domain checks, sending loops
│   ├── server.js             # Express API endpoints & static serving fallback
│   ├── package.json          # Node dependencies (express, nodemailer, pdf-parse)
│   └── .env                  # Private SMTP keys & credentials
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main React Dashboard UI & state management
│   │   ├── index.css         # Styling system, variables, page animations
│   │   └── main.jsx          # React mount entry
│   ├── dist/                 # Production compiled frontend bundle
│   ├── package.json          # Vite dependencies
│   └── vite.config.js        # Build configuration
└── .gitignore                # Restricts nodes, builds, and sensitive files
```

---

## 💻 Local Setup Guide

### 1. Configure Backend Credentials
Create a `.env` file in the `backend` folder:

```env
PORT=5000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SENDER_EMAIL=your_email@gmail.com
```

### 2. Run Development Servers
Start both servers locally:

```bash
# In the backend directory
npm run dev

# In the frontend directory
npm run dev
```


* **Framework**: `Vite`
* **Environment Variable**: Add `VITE_API_BASE_URL` pointing to your live Render backend endpoint (e.g., `https://coldswift-backend.onrender.com/api`).
* Vercel will build the React app and automatically query the live cloud API server.
