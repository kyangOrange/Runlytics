"""
Selects the next diagnostic question by maximizing expected information gain
(reduction in entropy over conditions).
"""

from __future__ import annotations

import math
from typing import Any

from bayesian_engine import BayesianInferenceEngine


def _entropy(probabilities: dict[str, float]) -> float:
    """Shannon entropy (base 2) over condition probabilities."""
    h = 0.0
    for p in probabilities.values():
        if p > 0.0:
            h -= p * math.log2(p)
    return h


def _normalize(probabilities: dict[str, float]) -> None:
    total = sum(probabilities.values())
    if total <= 0.0:
        n = len(probabilities) or 1
        for k in probabilities:
            probabilities[k] = 1.0 / n
        return
    for k in probabilities:
        probabilities[k] /= total


def _copy_probs(engine: BayesianInferenceEngine) -> dict[str, float]:
    return dict(engine.probabilities)


def _likelihood(engine: BayesianInferenceEngine, condition: str, symptom: str) -> float:
    return float(engine._get_likelihood(condition, symptom))


def _condition_specificity(
    engine: BayesianInferenceEngine,
    leading_condition: str,
    symptom: str,
) -> float:
    """
    Likelihood ratio: P(symptom | leading) vs the mean of P(symptom | c) over all other c.
    """
    l_lead = _likelihood(engine, leading_condition, symptom)
    others = [c for c in engine.probabilities if c != leading_condition]
    if not others:
        return 1.0
    avg_other = sum(_likelihood(engine, c, symptom) for c in others) / len(others)
    eps = 1e-9
    return l_lead / max(avg_other, eps)


def _posterior_after_answer(
    engine: BayesianInferenceEngine,
    base: dict[str, float],
    symptom: str,
    answer: bool,
) -> dict[str, float]:
    out: dict[str, float] = {}
    for condition, prior in base.items():
        L = _likelihood(engine, condition, symptom)
        mult = L if answer else (1.0 - L)
        out[condition] = mult * prior
    _normalize(out)
    return out


class QuestionSelector:
    def __init__(
        self,
        engine: BayesianInferenceEngine,
        questions: list[dict[str, Any]],
        confidence_threshold: float = 0.9,
    ):
        self.engine = engine
        self.questions = questions
        self.confidence_threshold = confidence_threshold
        self._asked: set[str] = set()

    BOOST_WEIGHT = 0.3

    def _symptom_key(self, question: dict[str, Any]) -> str:
        return str(question["symptom"])

    def _is_stopped(self) -> bool:
        if any(p >= self.confidence_threshold for p in self.engine.probabilities.values()):
            return True
        if len(self._asked) >= 4 and max(self.engine.probabilities.values()) > 0.75:
            return True
        if len(self._asked) >= 7:
            return True
        if len(self._asked) >= len(self.questions):
            return True
        return False

    def should_stop(self) -> bool:
        return self._is_stopped()

    def expected_entropy_after_question(self, question: dict[str, Any]) -> tuple[float, float]:
        """
        Returns (expected_entropy_after_asking, information_gain).
        Information gain = H(current) - E[H after answer].
        """
        symptom = self._symptom_key(question)
        base = _copy_probs(self.engine)
        h_now = _entropy(base)

        # P(Yes) = sum_c P(Yes|c) P(c)
        p_yes = 0.0
        for condition, prior in base.items():
            p_yes += _likelihood(self.engine, condition, symptom) * prior
        p_yes = min(1.0, max(0.0, p_yes))
        p_no = 1.0 - p_yes

        post_yes = _posterior_after_answer(self.engine, base, symptom, True)
        post_no = _posterior_after_answer(self.engine, base, symptom, False)
        h_yes = _entropy(post_yes)
        h_no = _entropy(post_no)

        expected_h = p_yes * h_yes + p_no * h_no
        ig = h_now - expected_h
        return expected_h, ig

    def get_next_question(self) -> dict[str, Any] | None:
        if self._is_stopped():
            return None

        candidates = [
            q
            for q in self.questions
            if self._symptom_key(q) not in self._asked
        ]
        if not candidates:
            return None

        leading = max(self.engine.probabilities.items(), key=lambda kv: kv[1])[0]

        best: dict[str, Any] | None = None
        best_score = float("-inf")

        for q in candidates:
            _, ig = self.expected_entropy_after_question(q)
            symptom = self._symptom_key(q)
            condition_specificity = _condition_specificity(
                self.engine, leading, symptom
            )#this is the condition specificity score
            final_score = ig + (self.BOOST_WEIGHT * condition_specificity)
            if final_score > best_score:
                best_score = final_score
                best = q

        return best

    def ask_question(self, question: dict[str, Any], answer: bool) -> None:
        symptom = self._symptom_key(question)
        self._asked.add(symptom)

        for condition in list(self.engine.probabilities.keys()):
            L = _likelihood(self.engine, condition, symptom)
            mult = L if answer else (1.0 - L)
            self.engine.probabilities[condition] *= mult

        self.engine._normalize()
        self.engine._print_distribution(symptom=symptom)


QUESTIONS = [
    {
        "text": (
            "Does the pain improve after the first 10–15 minutes of running "
            "(once you've warmed up), or does it worsen?"
        ),
        "why_ask": (
            "Some injuries feel better once warmed up — others get worse with more running. "
            "This is one of the most important signals we use."
        ),
        "symptom": "pain_worse_with_running",
    },
    {
        "text": "Is the pain present at rest or only during activity?",
        "why_ask": (
            "Pain that affects you when you're not running is a warning sign that this may be "
            "more serious than a running-only issue."
        ),
        "symptom": "pain_at_rest",
    },
]


if __name__ == "__main__":
    eng = BayesianInferenceEngine()
    selector = QuestionSelector(eng, QUESTIONS)

    while not selector.should_stop():
        q = selector.get_next_question()
        if q is None:
            break
        print(f"Next question (by information gain): {q['text']}")
        # Demo: alternate yes/no — replace with real user input in the app
        demo_answer = True
        selector.ask_question(q, demo_answer)
