"""
Flask API wrapping BayesianInferenceEngine and QuestionSelector.
"""

from __future__ import annotations

import os
import sqlite3
import uuid
from typing import Any

from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from bayesian_engine import BayesianInferenceEngine
from question_selector import QUESTIONS, QuestionSelector
from scoring import (
    TRAINING_LOAD_KEYS,
    placeholder_acwr_risk,
    triage_from_severity,
    validate_training_load_body,
)

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(_BASE_DIR, os.environ.get("DATABASE_NAME", "runlytics.db"))

SESSIONS: dict[str, dict[str, Any]] = {}

# Maps API test_id -> engine likelihood key (guided clinical-style tests)
DIAGNOSTIC_SYMPTOM_KEYS: dict[str, str] = {
    "positive_hop_test": "positive_hop_test",
    "point_tenderness_palpation": "point_tenderness_palpation",
    "pain_improves_with_warmup": "pain_improves_with_warmup",
}
DIAGNOSTIC_LIKELIHOOD_WEIGHT = 2.0

BIOLOGICAL_SEX_VALUES = frozenset({"female", "male", "other", "prefer_not_say"})
RUNNING_EXPERIENCE_VALUES = frozenset({"beginner", "intermediate", "experienced"})
EQUIPMENT_ACCESS_VALUES = frozenset({"bodyweight", "gym"})

_DEFAULT_CORS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "http://127.0.0.1:4173",
    "http://localhost:4173",
]


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if not raw:
        return list(_DEFAULT_CORS)
    return [o.strip() for o in raw.split(",") if o.strip()]


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            )
            """
        )
        _migrate_users_columns(conn)
        conn.commit()


def _migrate_users_columns(conn: sqlite3.Connection) -> None:
    cur = conn.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cur.fetchall()}
    additions = [
        ("display_name", "TEXT"),
        ("age", "INTEGER"),
        ("biological_sex", "TEXT"),
        ("prior_injury_same_area", "INTEGER"),
        ("equipment_bodyweight_only", "INTEGER"),
        ("running_experience", "TEXT"),
    ]
    for col, col_type in additions:
        if col not in existing:
            conn.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")


def _row_get(row: sqlite3.Row, key: str, default: Any = None) -> Any:
    try:
        return row[key]
    except (KeyError, IndexError):
        return default


def _row_to_profile_for_engine(row: sqlite3.Row) -> dict[str, Any]:
    """Subset of profile used for prior adjustment."""
    if row is None:
        return {}
    inj = _row_get(row, "prior_injury_same_area")
    return {
        "biological_sex": _row_get(row, "biological_sex"),
        "age": _row_get(row, "age"),
        "prior_injury_same_area": bool(inj) if inj is not None else False,
        "running_experience": _row_get(row, "running_experience"),
    }


def _equipment_access_public(eq: Any) -> str | None:
    if eq is None:
        return None
    return "bodyweight" if bool(eq) else "gym"


def _row_to_profile_public(row: sqlite3.Row) -> dict[str, Any] | None:
    if row is None:
        return None
    inj = _row_get(row, "prior_injury_same_area")
    eq = _row_get(row, "equipment_bodyweight_only")
    return {
        "user_id": row["id"],
        "email": row["email"],
        "display_name": _row_get(row, "display_name"),
        "age": _row_get(row, "age"),
        "biological_sex": _row_get(row, "biological_sex"),
        "prior_injury_same_area": bool(inj) if inj is not None else None,
        "equipment_bodyweight_only": bool(eq) if eq is not None else None,
        "equipment_access": _equipment_access_public(eq),
        "running_experience": _row_get(row, "running_experience"),
    }


def _probabilities_payload(engine: BayesianInferenceEngine) -> dict[str, float]:
    return dict(engine.probabilities)


def _question_by_symptom(symptom: str) -> dict[str, Any] | None:
    for q in QUESTIONS:
        if q.get("symptom") == symptom:
            return q
    return None


def create_app() -> Flask:
    app = Flask(__name__)
    # Set SECRET_KEY in your host’s environment (Render / Railway / etc.); never commit it.
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-only-not-for-public-deploy")
    CORS(
        app,
        resources={r"/*": {"origins": _cors_origins()}},
        supports_credentials=True,
    )

    @app.get("/health")
    def health():
        """Lightweight check for uptime monitors (Render, etc.)."""
        return jsonify({"status": "ok"})

    @app.post("/auth/signup")
    def signup():
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Expected JSON body"}), 400
        required = (
            "email",
            "password",
            "display_name",
            "age",
            "biological_sex",
            "prior_injury_same_area",
            "equipment_access",
            "running_experience",
        )
        missing = [k for k in required if k not in data]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        email = data["email"]
        password = data["password"]
        display_name = data["display_name"]
        age = data["age"]
        biological_sex = data["biological_sex"]
        prior_injury = data["prior_injury_same_area"]
        equipment_access = data["equipment_access"]
        running_experience = data["running_experience"]

        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify({"error": "email and password must be strings"}), 400
        if not isinstance(display_name, str):
            return jsonify({"error": "display_name must be a string"}), 400
        email = email.strip().lower()
        display_name = display_name.strip()
        if not email or not password:
            return jsonify({"error": "email and password cannot be empty"}), 400
        if not display_name:
            return jsonify({"error": "display_name cannot be empty"}), 400

        try:
            age_int = int(age)
        except (TypeError, ValueError):
            return jsonify({"error": "age must be an integer"}), 400
        if age_int < 5 or age_int > 120:
            return jsonify({"error": "age must be between 5 and 120"}), 400

        if not isinstance(biological_sex, str):
            return jsonify({"error": "biological_sex must be a string"}), 400
        biological_sex = biological_sex.strip().lower()
        if biological_sex not in BIOLOGICAL_SEX_VALUES:
            return jsonify(
                {
                    "error": "biological_sex must be one of: female, male, other, prefer_not_say",
                }
            ), 400

        if not isinstance(prior_injury, bool):
            return jsonify({"error": "prior_injury_same_area must be a boolean"}), 400
        if not isinstance(equipment_access, str):
            return jsonify({"error": "equipment_access must be a string"}), 400
        equipment_access = equipment_access.strip().lower()
        if equipment_access not in EQUIPMENT_ACCESS_VALUES:
            return jsonify({"error": "equipment_access must be bodyweight or gym"}), 400
        equipment_bw = equipment_access == "bodyweight"

        if not isinstance(running_experience, str):
            return jsonify({"error": "running_experience must be a string"}), 400
        running_experience = running_experience.strip().lower()
        if running_experience not in RUNNING_EXPERIENCE_VALUES:
            return jsonify(
                {
                    "error": "running_experience must be one of: beginner, intermediate, experienced",
                }
            ), 400

        password_hash = generate_password_hash(password)
        try:
            with get_db() as conn:
                cur = conn.execute(
                    """
                    INSERT INTO users (
                        email, password_hash, display_name, age, biological_sex,
                        prior_injury_same_area, equipment_bodyweight_only, running_experience
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        email,
                        password_hash,
                        display_name,
                        age_int,
                        biological_sex,
                        1 if prior_injury else 0,
                        1 if equipment_bw else 0,
                        running_experience,
                    ),
                )
                user_id = cur.lastrowid
                conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "Email already registered"}), 400

        return jsonify(
            {
                "user_id": user_id,
                "message": "Account created successfully",
            }
        )

    @app.post("/auth/login")
    def login():
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Expected JSON body"}), 400
        if "email" not in data or "password" not in data:
            return jsonify({"error": "Missing email or password"}), 400
        email = data["email"]
        password = data["password"]
        if not isinstance(email, str) or not isinstance(password, str):
            return jsonify({"error": "email and password must be strings"}), 400
        email = email.strip().lower()

        with get_db() as conn:
            row = conn.execute(
                "SELECT id, password_hash FROM users WHERE email = ?",
                (email,),
            ).fetchone()

        if row is None or not check_password_hash(row["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        return jsonify(
            {
                "user_id": row["id"],
                "message": "Login successful",
            }
        )

    @app.get("/user/<int:user_id>/profile")
    def user_profile(user_id: int):
        with get_db() as conn:
            row = conn.execute(
                """
                SELECT id, email, display_name, age, biological_sex,
                       prior_injury_same_area, equipment_bodyweight_only, running_experience
                FROM users WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return jsonify({"error": "User not found"}), 404
        profile = _row_to_profile_public(row)
        return jsonify(profile)

    @app.patch("/user/<int:user_id>/profile")
    def user_profile_patch(user_id: int):
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Expected JSON body"}), 400

        allowed = {
            "display_name",
            "age",
            "biological_sex",
            "prior_injury_same_area",
            "equipment_bodyweight_only",
            "equipment_access",
            "running_experience",
        }
        if not isinstance(data, dict) or not any(k in data for k in allowed):
            return jsonify(
                {"error": "Provide at least one of: display_name, age, biological_sex, "
                "prior_injury_same_area, equipment_bodyweight_only, equipment_access, "
                "running_experience"}
            ), 400

        with get_db() as conn:
            row = conn.execute(
                """
                SELECT id, email, display_name, age, biological_sex,
                       prior_injury_same_area, equipment_bodyweight_only, running_experience
                FROM users WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
            if row is None:
                return jsonify({"error": "User not found"}), 404

            sets: list[str] = []
            values: list[Any] = []

            if "display_name" in data:
                dn = data["display_name"]
                if not isinstance(dn, str) or not dn.strip():
                    return jsonify({"error": "display_name must be a non-empty string"}), 400
                sets.append("display_name = ?")
                values.append(dn.strip())

            if "age" in data:
                try:
                    age_int = int(data["age"])
                except (TypeError, ValueError):
                    return jsonify({"error": "age must be an integer"}), 400
                if age_int < 5 or age_int > 120:
                    return jsonify({"error": "age must be between 5 and 120"}), 400
                sets.append("age = ?")
                values.append(age_int)

            if "biological_sex" in data:
                sex = data["biological_sex"]
                if not isinstance(sex, str):
                    return jsonify({"error": "biological_sex must be a string"}), 400
                sex = sex.strip().lower()
                if sex not in BIOLOGICAL_SEX_VALUES:
                    return jsonify(
                        {
                            "error": "biological_sex must be one of: female, male, other, prefer_not_say",
                        }
                    ), 400
                sets.append("biological_sex = ?")
                values.append(sex)

            if "prior_injury_same_area" in data:
                if not isinstance(data["prior_injury_same_area"], bool):
                    return jsonify({"error": "prior_injury_same_area must be a boolean"}), 400
                sets.append("prior_injury_same_area = ?")
                values.append(1 if data["prior_injury_same_area"] else 0)

            if "equipment_bodyweight_only" in data:
                if not isinstance(data["equipment_bodyweight_only"], bool):
                    return jsonify({"error": "equipment_bodyweight_only must be a boolean"}), 400
                sets.append("equipment_bodyweight_only = ?")
                values.append(1 if data["equipment_bodyweight_only"] else 0)

            if "equipment_access" in data:
                ea = data["equipment_access"]
                if not isinstance(ea, str):
                    return jsonify({"error": "equipment_access must be a string"}), 400
                ea = ea.strip().lower()
                if ea not in EQUIPMENT_ACCESS_VALUES:
                    return jsonify({"error": "equipment_access must be bodyweight or gym"}), 400
                sets.append("equipment_bodyweight_only = ?")
                values.append(1 if ea == "bodyweight" else 0)

            if "running_experience" in data:
                rx = data["running_experience"]
                if not isinstance(rx, str):
                    return jsonify({"error": "running_experience must be a string"}), 400
                rx = rx.strip().lower()
                if rx not in RUNNING_EXPERIENCE_VALUES:
                    return jsonify(
                        {
                            "error": "running_experience must be one of: beginner, intermediate, experienced",
                        }
                    ), 400
                sets.append("running_experience = ?")
                values.append(rx)

            if not sets:
                return jsonify({"error": "No valid fields to update"}), 400

            values.append(user_id)
            conn.execute(
                f"UPDATE users SET {', '.join(sets)} WHERE id = ?",
                values,
            )
            conn.commit()

            row = conn.execute(
                """
                SELECT id, email, display_name, age, biological_sex,
                       prior_injury_same_area, equipment_bodyweight_only, running_experience
                FROM users WHERE id = ?
                """,
                (user_id,),
            ).fetchone()

        return jsonify(_row_to_profile_public(row))

    @app.post("/session/new")
    def session_new():
        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Expected JSON body"}), 400
        if "user_id" not in data:
            return jsonify({"error": "Missing user_id"}), 400

        raw_uid = data["user_id"]
        try:
            user_id = int(raw_uid)
        except (TypeError, ValueError):
            return jsonify({"error": "user_id must be an integer"}), 400

        with get_db() as conn:
            row = conn.execute(
                """
                SELECT id, email, display_name, age, biological_sex,
                       prior_injury_same_area, equipment_bodyweight_only, running_experience
                FROM users WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return jsonify({"error": "User not found"}), 404

        profile_engine = _row_to_profile_for_engine(row)
        engine = BayesianInferenceEngine(verbose=False, profile=profile_engine)
        selector = QuestionSelector(engine, QUESTIONS)
        session_id = str(uuid.uuid4())
        SESSIONS[session_id] = {
            "user_id": user_id,
            "engine": engine,
            "selector": selector,
            "acwr_risk_score": None,
            "training_load_submitted": False,
        }

        return jsonify(
            {
                "session_id": session_id,
                "probabilities": _probabilities_payload(engine),
            }
        )

    @app.get("/session/<session_id>/next-question")
    def next_question(session_id: str):
        rec = SESSIONS.get(session_id)
        if rec is None:
            return jsonify({"error": "Session not found"}), 404
        if not rec.get("training_load_submitted"):
            return jsonify({"error": "Submit training load (POST .../training-load) first"}), 400

        selector: QuestionSelector = rec["selector"]
        engine: BayesianInferenceEngine = rec["engine"]
        probs = _probabilities_payload(engine)

        if selector.should_stop():
            return jsonify({"complete": True, "probabilities": probs})

        q = selector.get_next_question()
        if q is None:
            return jsonify({"complete": True, "probabilities": probs})

        out: dict[str, Any] = {
            "complete": False,
            "text": q["text"],
            "symptom": q["symptom"],
            "probabilities": probs,
        }
        if q.get("why_ask"):
            out["why_ask"] = q["why_ask"]
        return jsonify(out)

    @app.post("/session/<session_id>/answer")
    def session_answer(session_id: str):
        rec = SESSIONS.get(session_id)
        if rec is None:
            return jsonify({"error": "Session not found"}), 404

        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Expected JSON body"}), 400
        if "symptom" not in data or "answer" not in data:
            return jsonify({"error": "Missing symptom or answer"}), 400

        symptom = data["symptom"]
        answer = data["answer"]
        if not isinstance(symptom, str) or not symptom:
            return jsonify({"error": "symptom must be a non-empty string"}), 400
        if not isinstance(answer, bool):
            return jsonify({"error": "answer must be a boolean"}), 400

        question = _question_by_symptom(symptom)
        if question is None:
            return jsonify({"error": "Unknown symptom"}), 400
        if not rec.get("training_load_submitted"):
            return jsonify({"error": "Submit training load first"}), 400

        selector: QuestionSelector = rec["selector"]
        engine: BayesianInferenceEngine = rec["engine"]
        selector.ask_question(question, answer)

        complete = selector.should_stop()
        return jsonify(
            {
                "probabilities": _probabilities_payload(engine),
                "complete": complete,
            }
        )

    @app.post("/session/<session_id>/training-load")
    def session_training_load(session_id: str):
        rec = SESSIONS.get(session_id)
        if rec is None:
            return jsonify({"error": "Session not found"}), 404
        if rec.get("training_load_submitted"):
            return jsonify({"error": "Training load already submitted for this session"}), 400

        data = request.get_json(silent=True)
        ok, err = validate_training_load_body(data or {})
        if not ok:
            return jsonify({"error": err}), 400

        answers_norm = {k: str(data[k]).strip().lower() for k in TRAINING_LOAD_KEYS}
        risk = placeholder_acwr_risk(answers_norm)

        engine: BayesianInferenceEngine = rec["engine"]
        engine.apply_acwr_risk_to_priors(risk)
        rec["acwr_risk_score"] = risk
        rec["training_load_submitted"] = True

        return jsonify(
            {
                "acwr_risk_score": risk,
                "probabilities": _probabilities_payload(engine),
            }
        )

    @app.post("/session/<session_id>/diagnostic")
    def session_diagnostic(session_id: str):
        rec = SESSIONS.get(session_id)
        if rec is None:
            return jsonify({"error": "Session not found"}), 404

        data = request.get_json(silent=True)
        if data is None:
            return jsonify({"error": "Expected JSON body"}), 400
        if "test_id" not in data or "positive" not in data:
            return jsonify({"error": "Missing test_id or positive"}), 400

        test_id = data["test_id"]
        positive = data["positive"]
        if not isinstance(test_id, str) or not test_id.strip():
            return jsonify({"error": "test_id must be a non-empty string"}), 400
        if not isinstance(positive, bool):
            return jsonify({"error": "positive must be a boolean"}), 400

        tid = test_id.strip()
        symptom_key = DIAGNOSTIC_SYMPTOM_KEYS.get(tid)
        if symptom_key is None:
            return jsonify({"error": "Unknown test_id"}), 400

        engine: BayesianInferenceEngine = rec["engine"]
        engine.apply_observation_weighted(
            symptom_key,
            positive,
            DIAGNOSTIC_LIKELIHOOD_WEIGHT,
        )

        return jsonify({"probabilities": _probabilities_payload(engine)})

    @app.get("/session/<session_id>/triage")
    def session_triage(session_id: str):
        rec = SESSIONS.get(session_id)
        if rec is None:
            return jsonify({"error": "Session not found"}), 404

        engine: BayesianInferenceEngine = rec["engine"]
        probabilities = _probabilities_payload(engine)
        acwr = rec.get("acwr_risk_score")
        triage = triage_from_severity(probabilities, acwr if isinstance(acwr, (int, float)) else None)

        return jsonify(
            {
                "probabilities": probabilities,
                **triage,
            }
        )

    init_db()
    return app


app = create_app()


if __name__ == "__main__":
    _debug = os.environ.get("FLASK_DEBUG", "1").lower() not in ("0", "false", "no")
    _port = int(os.environ.get("PORT", "5000"))
    _host = os.environ.get("HOST", "127.0.0.1")
    app.run(debug=_debug, host=_host, port=_port)
