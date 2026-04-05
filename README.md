# Runlytics

Running-injury triage MVP: a **Flask** API with a **Bayesian** inference engine and **React** (Vite) frontend. Users sign up, run a short symptom questionnaire, and get a probability-weighted triage summary.

## Stack

- **Backend:** Python 3, Flask, SQLite (`users`), in-memory diagnostic sessions, `flask-cors`, optional `gunicorn` for production
- **Frontend:** React 18, React Router, plain CSS
- **Core logic:** `bayesian_engine.py`, `question_selector.py` (information-gain–style question ordering)

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

Default: **http://127.0.0.1:5000** (debug on unless `FLASK_DEBUG=0`).

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

## Environment variables (API)

| Variable | Purpose |
|----------|---------|
| `CORS_ORIGINS` | Comma-separated frontend origins (production). If unset, local Vite defaults are used. |
| `PORT` | Listen port (default `5000`). |
| `HOST` | Bind address for `python app.py` (default `127.0.0.1`; use `0.0.0.0` only when you intend to expose the dev server). |
| `FLASK_DEBUG` | `0` / `false` to turn off Flask debug. |
| `DATABASE_NAME` | SQLite filename under the app directory (default `runlytics.db`). |

## Production

- Serve the API with **gunicorn**, e.g. `gunicorn -w 2 -b 0.0.0.0:$PORT app:app` (see `Procfile`).
- Build the frontend: `cd frontend && npm run build`; deploy the `dist/` output to a static host.
- Set **`VITE_API_URL`** at **build time** to your public API URL.
- Set **`CORS_ORIGINS`** on the server to your exact frontend origin(s).

**Note:** Sessions live in memory and SQLite on a single file; for serious production you would add persistent session storage and often a managed database.

## API (MVP routes)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/signup` | Body: `{ "email", "password" }` |
| `POST` | `/auth/login` | Body: `{ "email", "password" }` |
| `POST` | `/session/new` | Body: `{ "user_id" }` |
| `GET` | `/session/<id>/next-question` | Next question or `{ "complete": true }` |
| `POST` | `/session/<id>/answer` | Body: `{ "symptom", "answer" }` (boolean) |
| `GET` | `/session/<id>/triage` | Probabilities + triage text |

## Disclaimer

This tool is for **education / prototyping**, not a substitute for professional medical diagnosis or treatment.

## License

Add a license if you plan to open-source the project formally.
