# ⚡ ColdSwift — Automated HR Recruiter Campaign Engine

![ColdSwift Banner](frontend/public/hero.png)

**ColdSwift** is a premium, full-stack recruitment outreach platform designed to streamline and automate job application cold emailing to HR coordinators. It extracts recruiter lists from unstructured PDFs, runs domain checks to prevent bounce-backs, and dispatches personalized emails with staggered rate-limiting to bypass spam filters.


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

## 💻 Local Setup Guide

Follow these steps to run the application on your local machine:

### 1. Install Dependencies
Navigate into both frontend and backend directories and install the required npm packages:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Backend SMTP Credentials
Create a file named `.env` in the `backend` folder and populate it with your email configurations:

```env
PORT=5000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SENDER_EMAIL=your_email@gmail.com
```

### 3. Run Development Servers
Launch the servers for both components:

```bash
# Start backend server (inside backend folder)
cd backend
npm run dev

# Start frontend server (inside frontend folder)
cd ../frontend
npm run dev
```

Open `http://localhost:5173` in your browser to start running recruiter campaigns locally!
