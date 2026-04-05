# Runlytics

Running-injury triage MVP: a **Flask** API with a **Bayesian** inference engine and **React** (Vite) frontend. Users sign up, run a short symptom questionnaire, and get a probability-weighted triage summary.

**Congressional App Challenge:** submit your **demo video** plus this **full source code** (e.g. [GitHub](https://github.com/kyangOrange/Runlytics)). For the demo, use a **public URL** from the cloud deploy below—judges should not need your laptop.

## Stack

- **Backend:** Python 3, Flask, SQLite (`users`), in-memory diagnostic sessions, `flask-cors`, `gunicorn` for production
- **Frontend:** React 18, React Router, plain CSS
- **Core logic:** `bayesian_engine.py`, `question_selector.py` (information-gain–style question ordering)

---

## Put it on the internet (safely — without exposing your computer)

**Do not** open your home router, forward ports, or run `HOST=0.0.0.0` on your Mac to “show the world.” That exposes **your network** and is unnecessary. Instead:

1. Host the **API** on a cloud app platform (e.g. **Render**).
2. Host the **frontend** on a static host (e.g. **Vercel**).
3. Your PC only runs **Git push**; the public only talks to **HTTPS URLs** on those services.

### A) Deploy the API (Render)

1. Push this repo to GitHub (already set up for [kyangOrange/Runlytics](https://github.com/kyangOrange/Runlytics)).
2. Sign up at [render.com](https://render.com) → **New** → **Blueprint**.
3. Connect the repo and apply `render.yaml` (or create a **Web Service** manually: root = repo root, build `pip install -r requirements.txt`, start `gunicorn -w 2 -b 0.0.0.0:$PORT app:app`).
4. In the service **Environment** tab, set:
   - **`CORS_ORIGINS`** — after you have a frontend URL (step B), set it to that origin only, e.g. `https://your-project.vercel.app` (no trailing slash). You can add `http://localhost:5173` too for local dev, comma-separated.
   - **`FLASK_DEBUG`** = `0` (already in `render.yaml`).
   - **`SECRET_KEY`** — Render can generate this via the blueprint; or paste a long random string yourself. **Never commit it to Git.**
5. Wait for deploy and copy the API URL, e.g. `https://runlytics-api.onrender.com`.
6. Optional: open `https://…/health` — should return `{"status":"ok"}`.

**Free tier:** the service may **sleep** after idle time; the first request after sleep can be slow—fine for a demo, mention it in your video if needed.

### B) Deploy the frontend (Vercel)

1. Sign up at [vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework: **Vite**. Build: `npm run build`, output: `dist` (defaults are usually correct).
4. **Environment variables** (must be set **before** the production build completes):
   - **`VITE_API_URL`** = your Render API URL, e.g. `https://runlytics-api.onrender.com` (no trailing slash).
5. Deploy. Use the **https://….vercel.app** URL as your public demo link.
6. Go back to Render and set **`CORS_ORIGINS`** to that exact Vercel origin if you have not already.

`frontend/vercel.json` adds SPA routing so React Router paths (e.g. `/login`) work on refresh.

### C) What you submit (CAC-style)

| Deliverable | Suggestion |
|-------------|------------|
| **Demo** | Screen recording: sign up → run test → results; say the **public URL** aloud or show it on screen. |
| **Code** | This repository (judges clone or browse on GitHub). |
| **Privacy** | Use **fake emails** in the demo; remind viewers the app is **educational**, not medical advice. |

---

## Local development

### 1. API

```bash
cd Runlytics
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

If `python` is overridden by Conda and errors (e.g. missing Homebrew Python), run the app with the venv interpreter explicitly:

```bash
./.venv/bin/python app.py
```

Default: **http://127.0.0.1:5000** (debug on locally unless `FLASK_DEBUG=0`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** (or the URL Vite prints).

Optional: copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` if the API is not on `http://127.0.0.1:5000`.

### 3. CORS (local)

The API allows `http://localhost:5173` and `http://127.0.0.1:5173` by default. For other origins, set `CORS_ORIGINS` (comma-separated) when running Flask.

---

## Environment variables (API)

| Variable | Purpose |
|----------|---------|
| `SECRET_KEY` | Flask signing key — **required** for any public deploy; set in the host dashboard, never in Git. |
| `CORS_ORIGINS` | Comma-separated **exact** frontend origins (your `https://….vercel.app`). If unset, local Vite defaults are used. |
| `PORT` | Listen port (Render sets this automatically). |
| `HOST` | For `python app.py` only (default `127.0.0.1`). |
| `FLASK_DEBUG` | Use `0` on the internet. |
| `DATABASE_NAME` | SQLite filename under the app directory (default `runlytics.db`). |

---

## Production notes

- **`Procfile`** / **`gunicorn`**: used by Render and similar hosts.
- **`runtime.txt`**: Python **3.12.8** for broad host compatibility (you can use 3.14 locally).
- **Sessions** are **in-memory** → restarts or multiple workers can drop active tests; **SQLite** on free hosts is often **ephemeral**. Acceptable for a student demo; document for judges.

---

## API (MVP routes)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check for monitors |
| `POST` | `/auth/signup` | Body: `{ "email", "password" }` |
| `POST` | `/auth/login` | Body: `{ "email", "password" }` |
| `POST` | `/session/new` | Body: `{ "user_id" }` |
| `GET` | `/session/<id>/next-question` | Next question or `{ "complete": true }` |
| `POST` | `/session/<id>/answer` | Body: `{ "symptom", "answer" }` (boolean) |
| `GET` | `/session/<id>/triage` | Probabilities + triage text |

---

## Disclaimer

This tool is for **education / prototyping** (including student competitions), not a substitute for professional medical diagnosis or treatment.

## License

Add a license if you plan to open-source the project formally.
