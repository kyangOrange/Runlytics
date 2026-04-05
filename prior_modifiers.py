"""
Map user profile fields to initial condition priors (before any symptom updates).

Heuristic weights — tune with clinical input. Literature-informed placeholders:
- Female runners: higher relative tibial stress injury burden in epidemiology.
- Adolescent + female: additional stress-fracture risk signal.
- Prior injury same area: elevated recurrence for both shin pain syndromes.
"""

from __future__ import annotations

from typing import Any

BASE_SHIN = 0.7
BASE_STRESS = 0.3


def priors_from_profile(profile: dict[str, Any] | None) -> dict[str, float]:
    """
    Returns normalized P(shin_splints), P(stress_fracture).
    Name / email / equipment do not affect priors (equipment is for UI/calendar only).
    """
    shin = BASE_SHIN
    stress = BASE_STRESS

    if not profile:
        return {"shin_splints": shin, "stress_fracture": stress}

    sex = (profile.get("biological_sex") or "").strip().lower()
    age = profile.get("age")
    if age is not None:
        try:
            age = int(age)
        except (TypeError, ValueError):
            age = None

    stress_mult = 1.0
    shin_mult = 1.0

    if sex == "female":
        stress_mult *= 1.22
    elif sex == "male":
        stress_mult *= 0.94

    if age is not None:
        if age <= 17 and sex == "female":
            stress_mult *= 1.14
        if age >= 65:
            stress_mult *= 1.06

    if profile.get("prior_injury_same_area"):
        stress_mult *= 1.12
        shin_mult *= 1.08

    shin *= shin_mult
    stress *= stress_mult
    total = shin + stress
    if total <= 0:
        return {"shin_splints": 0.5, "stress_fracture": 0.5}
    return {
        "shin_splints": shin / total,
        "stress_fracture": stress / total,
    }
