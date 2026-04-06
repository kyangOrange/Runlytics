"""
Placeholder training-load (ACWR-style) risk and combined triage severity.

Replace with real acute:chronic workload ratios and validated thresholds when data is available.
"""

from __future__ import annotations

from typing import Any

# Expected JSON keys from POST /session/<id>/training-load
TRAINING_LOAD_KEYS = (
    "weekly_volume_trend",
    "volume_last_7_vs_usual",
    "hard_sessions_last_week",
    "sudden_training_change",
)

_TRAINING_VALUE_SETS: dict[str, frozenset[str]] = {
    "weekly_volume_trend": frozenset({"decreasing", "stable", "increasing"}),
    "volume_last_7_vs_usual": frozenset({"less", "same", "more", "much_more"}),
    "hard_sessions_last_week": frozenset({"0", "1", "2", "3_plus"}),
    "sudden_training_change": frozenset({"no", "yes"}),
}


def validate_training_load_body(data: dict[str, Any]) -> tuple[bool, str]:
    if not isinstance(data, dict):
        return False, "Expected JSON object"
    for key in TRAINING_LOAD_KEYS:
        if key not in data:
            return False, f"Missing field: {key}"
        val = data[key]
        if not isinstance(val, str) or not val.strip():
            return False, f"{key} must be a non-empty string"
        v = val.strip().lower()
        if v not in _TRAINING_VALUE_SETS[key]:
            return False, f"Invalid value for {key}"
    return True, ""


def placeholder_acwr_risk(answers: dict[str, str]) -> float:
    """
    Synthetic 0-1 load-risk score (not a real ACWR).
    Higher = more concern from training-load pattern alone.
    """
    score = 0.22
    trend = answers.get("weekly_volume_trend", "").lower()
    vol7 = answers.get("volume_last_7_vs_usual", "").lower()
    hard = answers.get("hard_sessions_last_week", "").lower()
    sudden = answers.get("sudden_training_change", "").lower()

    if trend == "increasing":
        score += 0.12
    if vol7 in ("more", "much_more"):
        score += 0.14 if vol7 == "more" else 0.22
    if hard == "2":
        score += 0.08
    if hard == "3_plus":
        score += 0.16
    if sudden == "yes":
        score += 0.14

    return max(0.0, min(1.0, score))


def combined_severity_score(leading_posterior: float, acwr_risk: float | None) -> float:
    """Blend condition posterior for the lead hypothesis with load risk (placeholder weights)."""
    acwr = 0.28 if acwr_risk is None else max(0.0, min(1.0, acwr_risk))
    return 0.62 * leading_posterior + 0.38 * acwr


def triage_from_severity(
    probabilities: dict[str, float],
    acwr_risk: float | None,
) -> dict[str, Any]:
    """
    Map combined severity to the same tier fields as before, plus explicit scores for the client.
    """
    if not probabilities:
        return {
            "leading_condition": None,
            "leading_probability": 0.0,
            "posterior_leading_probability": 0.0,
            "acwr_risk_score": acwr_risk,
            "severity_score": 0.0,
            "confidence_tier": "low",
            "recommendation": "Low confidence — insufficient data; triage uncertain.",
        }

    leading, p = max(probabilities.items(), key=lambda kv: kv[1])
    severity = combined_severity_score(p, acwr_risk)

    if severity > 0.74:
        tier = "high"
        recommendation = (
            f"High concern (placeholder severity score {severity:.2f}): leading hypothesis is "
            f"{leading} (posterior {p:.0%}). Load risk index "
            f"{(acwr_risk if acwr_risk is not None else 0.0):.2f}. Seek appropriate care if "
            "symptoms worsen."
        )
    elif severity >= 0.52:
        tier = "moderate"
        recommendation = (
            f"Moderate concern (severity {severity:.2f}): {leading} leads at {p:.0%}. "
            "Consider follow-up and monitoring."
        )
    else:
        tier = "low"
        recommendation = (
            f"Lower concern (severity {severity:.2f}) — leading hypothesis {leading} at {p:.0%}; "
            "further assessment may still be appropriate."
        )

    return {
        "leading_condition": leading,
        "leading_probability": p,
        "posterior_leading_probability": p,
        "acwr_risk_score": acwr_risk,
        "severity_score": severity,
        "confidence_tier": tier,
        "recommendation": recommendation,
    }
