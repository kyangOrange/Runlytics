"""
Placeholder training-load (ACWR-style) risk and combined triage severity.

Replace with real acute:chronic workload ratios and validated thresholds when data is available.
"""

from __future__ import annotations

from typing import Any

# Expected JSON keys from POST /session/<id>/training-load
TRAINING_LOAD_KEYS = (
    "days_per_week_typical",
    "volume_this_week_vs_usual",
    "longest_run_vs_recent_max",
    "recent_running_trend",
    "surface_changed",
    "surface_change_types",
)

_TRAINING_VALUE_SETS: dict[str, frozenset[str]] = {
    "days_per_week_typical": frozenset(
        {"d1_2", "d3_4", "d5_6", "every_day", "not_sure"}
    ),
    "volume_this_week_vs_usual": frozenset(
        {
            "less_or_same",
            "bit_more",
            "significantly_more",
            "not_sure",
        }
    ),
    "longest_run_vs_recent_max": frozenset(
        {
            "same_or_shorter",
            "little_longer",
            "significantly_longer",
            "not_sure",
        }
    ),
    "recent_running_trend": frozenset(
        {
            "stable_or_decreasing",
            "gradual_increase",
            "jumped_up",
            "inconsistent",
            "not_sure",
        }
    ),
    "surface_changed": frozenset(
        {
            "no",
            "yes",
            "not_sure",
        }
    ),
    "surface_change_types": frozenset(
        {
            "harder_surfaces",
            "more_uneven",
            "inconsistent_surfaces",
            "",
        }
    ),
}


def validate_training_load_body(data: dict[str, Any]) -> tuple[bool, str]:
    if not isinstance(data, dict):
        return False, "Expected JSON object"
    for key in TRAINING_LOAD_KEYS:
        if key not in data:
            return False, f"Missing field: {key}"
        val = data[key]
        if not isinstance(val, str):
            return False, f"{key} must be a string"
        v = val.strip().lower()

        if key == "surface_change_types":
            # Comma-separated list (multi-select). Empty string is allowed unless surface_changed == yes.
            parts = [p.strip() for p in v.split(",") if p.strip()]
            for p in parts:
                if p not in _TRAINING_VALUE_SETS[key]:
                    return False, f"Invalid value for {key}"
            continue

        if not v:
            return False, f"{key} must be a non-empty string"
        if v not in _TRAINING_VALUE_SETS[key]:
            return False, f"Invalid value for {key}"

    if data.get("surface_changed", "").strip().lower() == "yes":
        parts = [
            p.strip()
            for p in str(data.get("surface_change_types", "")).strip().lower().split(",")
            if p.strip()
        ]
        if not parts:
            return False, "Pick at least one surface change type"
    return True, ""


def placeholder_acwr_risk(answers: dict[str, str]) -> float:
    """
    Synthetic 0-1 load-risk score (not a real ACWR).
    Highest weight on longest-run spike vs recent max (single-session load jump).
    """
    score = 0.18

    days = answers.get("days_per_week_typical", "").lower()
    vol = answers.get("volume_this_week_vs_usual", "").lower()
    longest = answers.get("longest_run_vs_recent_max", "").lower()
    trend = answers.get("recent_running_trend", "").lower()
    surface_changed = answers.get("surface_changed", "").lower()
    surface_types = answers.get("surface_change_types", "").lower()

    # Q1 — baseline frequency (mild contextual nudge)
    if days == "every_day":
        score += 0.04
    elif days == "d5_6":
        score += 0.025
    elif days == "not_sure":
        score += 0.02

    # Q2 — weekly volume vs usual (significantly_more absorbs former “way more” bucket)
    if vol == "less_or_same":
        score -= 0.02
    elif vol == "bit_more":
        score += 0.07
    elif vol == "significantly_more":
        score += 0.18
    elif vol == "not_sure":
        score += 0.02

    # Q3 — single-session spike (strongest driver)
    if longest == "little_longer":
        score += 0.1
    elif longest == "significantly_longer":
        score += 0.28
    elif longest == "not_sure":
        score += 0.03

    # Q4 — recent trend
    if trend == "stable_or_decreasing":
        score -= 0.02
    elif trend == "gradual_increase":
        score += 0.06
    elif trend == "jumped_up":
        score += 0.17
    elif trend == "inconsistent":
        score += 0.09
    elif trend == "not_sure":
        score += 0.02

    # Q5 — surfaces (multi-select details only count if they said "yes")
    if surface_changed == "yes":
        parts = [p.strip() for p in surface_types.split(",") if p.strip()]
        if "harder_surfaces" in parts:
            score += 0.11
        if "more_uneven" in parts:
            score += 0.09
        if "inconsistent_surfaces" in parts:
            score += 0.11
    elif surface_changed == "not_sure":
        score += 0.02

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
