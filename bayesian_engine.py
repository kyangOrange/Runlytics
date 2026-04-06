from typing import Any

from prior_modifiers import priors_from_profile

# P(observed choice | condition) for multi-option symptom questions (keys = API option ids).
CATEGORICAL_LIKELIHOODS: dict[str, dict[str, dict[str, float]]] = {
    "warmup_response": {
        "improves": {"shin_splints": 0.75, "stress_fracture": 0.2},
        "stays_same": {"shin_splints": 0.4, "stress_fracture": 0.4},
        "worsens": {"shin_splints": 0.3, "stress_fracture": 0.7},
        "not_sure": {"shin_splints": 0.5, "stress_fracture": 0.5},
    },
    "delayed_pain": {
        "yes": {"shin_splints": 0.3, "stress_fracture": 0.7},
        "no": {"shin_splints": 0.6, "stress_fracture": 0.3},
        "not_sure": {"shin_splints": 0.5, "stress_fracture": 0.5},
    },
    "pain_at_rest": {
        "only_activity": {"shin_splints": 0.7, "stress_fracture": 0.3},
        "sometimes_rest": {"shin_splints": 0.4, "stress_fracture": 0.6},
        "constant_rest": {"shin_splints": 0.2, "stress_fracture": 0.8},
        "not_sure": {"shin_splints": 0.5, "stress_fracture": 0.5},
    },
}


class BayesianInferenceEngine:
    EXPERIENCE_MULTIPLIERS = {
        "beginner": {
            "shin_splints": 1.3,
            "stress_fracture": 1.4,
        },
        "intermediate": {
            "shin_splints": 1.0,
            "stress_fracture": 1.0,
        },
        "experienced": {
            "shin_splints": 0.8,
            "stress_fracture": 0.85,
        },
    }

    def __init__(self, verbose: bool = True, profile: dict[str, Any] | None = None):
        self.verbose = verbose
        self.probabilities = dict(priors_from_profile(profile))
        exp = profile.get("running_experience") if profile else None
        self.apply_experience_prior(exp)

        # Binary guided diagnostics only — P(positive finding | condition)
        self.likelihoods = {
            "shin_splints": {
                "positive_hop_test": 0.1,
                "point_tenderness_palpation": 0.3,
                "pain_improves_with_warmup": 0.7,
            },
            "stress_fracture": {
                "positive_hop_test": 0.9,
                "point_tenderness_palpation": 0.85,
                "pain_improves_with_warmup": 0.15,
            },
        }

        if self.verbose:
            self._print_distribution()

    def apply_experience_prior(self, experience_level: str | None) -> None:
        """Scale condition priors by running-experience tier, then renormalize."""
        if not experience_level or not isinstance(experience_level, str):
            return
        level = experience_level.strip().lower()
        multipliers = self.EXPERIENCE_MULTIPLIERS.get(level)
        if not multipliers:
            return
        for condition in self.probabilities:
            if condition in multipliers:
                self.probabilities[condition] *= multipliers[condition]
        self._normalize()

    def update(self, symptom: str) -> None:
        for condition, prior in list(self.probabilities.items()):
            likelihood = self._get_likelihood(condition, symptom)
            self.probabilities[condition] = likelihood * prior

        self._normalize()
        self._print_distribution(symptom=symptom)

    def apply_acwr_risk_to_priors(self, risk: float) -> None:
        """Placeholder: nudge probabilities using synthetic load risk in [0, 1]."""
        r = max(0.0, min(1.0, float(risk)))
        if "stress_fracture" in self.probabilities:
            self.probabilities["stress_fracture"] *= 1.0 + 0.28 * r
        if "shin_splints" in self.probabilities:
            self.probabilities["shin_splints"] *= 1.0 + 0.12 * r
        self._normalize()

    def apply_observation_weighted(
        self, symptom: str, positive: bool, weight: float = 1.0
    ) -> None:
        """Bayesian update for binary diagnostic observations."""
        w = max(0.0, float(weight))
        for condition in list(self.probabilities.keys()):
            L = self._get_likelihood(condition, symptom)
            mult = L if positive else (1.0 - L)
            mult = max(mult, 1e-9)
            self.probabilities[condition] *= mult**w
        self._normalize()
        self._print_distribution(symptom=symptom)

    def categorical_likelihood(self, condition: str, symptom: str, choice: str) -> float:
        table = CATEGORICAL_LIKELIHOODS.get(symptom)
        if not table:
            return 0.5
        row = table.get(choice)
        if not row:
            return 0.5
        return float(row.get(condition, 0.5))

    def apply_categorical_observation(self, symptom: str, choice: str) -> None:
        """Update P(condition) given a categorical answer: P(c|o) ∝ P(o|c) P(c)."""
        for condition in list(self.probabilities.keys()):
            L = self.categorical_likelihood(condition, symptom, choice)
            self.probabilities[condition] *= max(L, 1e-9)
        self._normalize()
        self._print_distribution(symptom=f"{symptom}:{choice}")

    def _get_likelihood(self, condition: str, symptom: str) -> float:
        if condition not in self.likelihoods:
            return 0.5
        return float(self.likelihoods[condition].get(symptom, 0.5))

    def _normalize(self) -> None:
        total = sum(self.probabilities.values())
        if total <= 0:
            n = len(self.probabilities) or 1
            for k in self.probabilities:
                self.probabilities[k] = 1.0 / n
            return
        for k in self.probabilities:
            self.probabilities[k] /= total

    def _print_distribution(self, symptom: str | None = None) -> None:
        if not self.verbose:
            return
        if symptom is None:
            print("Current probabilities:")
        else:
            print(f"After observing symptom '{symptom}':")
        for condition, prob in sorted(self.probabilities.items(), key=lambda x: x[1], reverse=True):
            print(f"  {condition}: {prob:.4f}")
        print()


if __name__ == "__main__":
    engine = BayesianInferenceEngine()
    engine.apply_categorical_observation("warmup_response", "improves")
    engine.apply_categorical_observation("delayed_pain", "yes")
