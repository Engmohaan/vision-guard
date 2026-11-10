# Vision Guard — Full Platform

Thesis demo platform for: "Person Detection and Face Recognition in Dusty,
Low-Light, and Crowded Somali Environments Using Deep Learning."

- **Frontend**: React (Vite) + Tailwind + react-router-dom + recharts. Port 5173.
- **Backend**: FastAPI + OpenCV + your trained YOLOv8 (Stage 3) and ArcFace
  (Stage 5) models + SQLite (history, users). Port 8000.

## Quick start

Terminal 1:
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows; use source venv/bin/activate elsewhere
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 2:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` — this is the public landing page. Click
**Login / Sign Up** to reach the app.

Before running, copy your trained weights and embeddings into
`backend/models_data/` — see `backend/README.md` for exact paths and folder layout.

**Default admin account** (seeded automatically on first run):
```
username: admin
password: admin123
```
Change this from the Profile page immediately after your first login.

## What's included

- **Public landing page** (`/`) — navbar, hero, features grid, "How It Works"
  workflow steps, FAQ accordion, contact section, footer. Matches the reference
  layout you shared (teal accent, clean light/dark theme).
- **Auth** — register/login (JWT), persisted session, protected routes.
- **Role-based access control** — `admin` and `user` roles. Admins can view
  every account and promote/demote roles (`/app/users`), and are the only ones
  who can clear the history log. Regular users get full use of detection,
  history, and reports.
- **Dashboard** (`/app`) — upload image/video, live webcam stream, real-time
  detection/recognition visualization.
- **History** (`/app/history`) — searchable, filterable log of every
  recognition event (SQLite-backed).
- **Reports** (`/app/reports`) — charts: daily activity trend, verified vs
  unrecognized breakdown, events by media source, top identities.
- **Profile** (`/app/profile`) — update name/email, change password.

## Pipeline summary

1. **YOLOv8** (`best.pt`, Stage 3) detects people in the frame — drawn as thin
   gray corner brackets.
2. **SCRFD** (bundled in `insightface`) detects faces + 5 landmarks.
3. Faces are aligned + cropped to 112×112 and passed through **ArcFace**
   (`w600k_r50`, Stage 5) to get a 512-d embedding.
4. The embedding is compared via cosine similarity against your trained
   identity database (`train_embeddings.npy` / `train_labels.npy`). Above the
   threshold (default `0.75`) → emerald "Verified: Name" bracket + thumbnail.
   Below → muted gray "Unrecognized" bracket.
5. Every recognition event is written to SQLite and surfaced in History and
   Reports.
