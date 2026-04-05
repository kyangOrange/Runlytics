from typing import Any

from prior_modifiers import priors_from_profile


class BayesianInferenceEngine:
    def __init__(self, verbose: bool = True, profile: dict[str, Any] | None = None):
        self.verbose = verbose
        # Priors: P(condition), optionally adjusted from user profile before symptoms
        self.probabilities = dict(priors_from_profile(profile))

        # Likelihoods: P(symptom | condition)
        # Placeholder values — tune/replace with real estimates later.
        self.likelihoods = {
            "shin_splints": {
                "pain_on_inner_shin": 0.7,
                "pain_worse_with_running": 0.8,
                "point_tenderness": 0.4,
                "pain_at_rest": 0.2,
                "swelling": 0.3,
                "positive_hop_test": 0.1,
            },
            "stress_fracture": {
                "pain_on_inner_shin": 0.4,
                "pain_worse_with_running": 0.7,
                "point_tenderness": 0.8,
                "pain_at_rest": 0.6,
                "swelling": 0.4,
                "positive_hop_test": 0.9,
            },
        }

        self._normalize()
        if self.verbose:
            self._print_distribution()

    def update(self, symptom: str) -> None:
        """
        Update P(condition) given an observed symptom using Bayes rule:
          P(c | s) ∝ P(s | c) * P(c)
        """
        for condition, prior in list(self.probabilities.items()):
            likelihood = self._get_likelihood(condition, symptom)
            self.probabilities[condition] = likelihood * prior

        self._normalize()
        self._print_distribution(symptom=symptom)

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
    engine.update("pain_worse_with_running")
    engine.update("point_tenderness")
    engine.update("pain_at_rest")
    engine.update("positive_hop_test")
