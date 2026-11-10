# Vision Guard — Frontend (React + Vite + Tailwind + react-router-dom)

Full app: public landing page, JWT auth, role-protected dashboard, history,
reports (charts), and profile management.

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). The backend must be
running on `http://localhost:8000` (see `backend/README.md`) — CORS is already
configured on the backend to allow this origin.

## Routes

| Path | Access | Page |
|---|---|---|
| `/` | public | Landing page |
| `/login`, `/register` | public | Auth forms |
| `/app` | logged in | Dashboard (upload/webcam + detection viewport) |
| `/app/history` | logged in | Detection history table |
| `/app/reports` | logged in | Charts & aggregate analytics |
| `/app/profile` | logged in | Update profile / change password |
| `/app/users` | **admin only** | Manage accounts & roles |

## Structure

```
src/
  api.js                     # backend fetch helpers (all authenticated via JWT)
  App.jsx                    # route table
  main.jsx                   # ThemeProvider + BrowserRouter + AuthProvider
  index.css                  # Tailwind + light/dark CSS variable tokens
  context/
    ThemeContext.jsx          # dark/light toggle, persisted to localStorage
    AuthContext.jsx           # login/register/logout, JWT storage, current user
  components/
    RequireAuth.jsx           # route guard - redirects to /login if not signed in
    RequireAdmin.jsx          # route guard - redirects to /app if not an admin
    AppLayout.jsx              # sidebar + <Outlet /> shell for all /app/* routes
    Sidebar.jsx                # app nav (Dashboard/History/Reports/Profile/Users), theme toggle, logout
    ControlPanel.jsx           # upload controls used by the Dashboard page
    MediaViewport.jsx          # rounded card viewport + image/video/webcam display
    ResultsPanel.jsx           # verified identities list + detection counts
    HistoryPanel.jsx           # detection history table with filters + stats
    landing/
      Navbar.jsx, Hero.jsx, Features.jsx, HowItWorks.jsx, FAQ.jsx, Contact.jsx, Footer.jsx
  pages/
    LandingPage.jsx, LoginPage.jsx, RegisterPage.jsx
    DashboardPage.jsx, HistoryPage.jsx, ReportsPage.jsx, ProfilePage.jsx, AdminUsersPage.jsx
```

## Design notes

Clean, modern SaaS look (light-first with a full dark mode): rounded-2xl cards,
soft shadows, a single teal accent color, Inter throughout with IBM Plex Mono
reserved for numeric readouts (confidence scores, counts). Toggle dark/light
from the sun/moon icon in the navbar (landing page) or sidebar (app) — the
preference persists across reloads via `localStorage`.
