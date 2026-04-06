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


def _posterior_after_categorical(
    engine: BayesianInferenceEngine,
    base: dict[str, float],
    symptom: str,
    choice: str,
) -> dict[str, float]:
    out: dict[str, float] = {}
    for condition, prior in base.items():
        L = engine.categorical_likelihood(condition, symptom, choice)
        out[condition] = max(L, 1e-9) * prior
    _normalize(out)
    return out


def _condition_specificity(
    engine: BayesianInferenceEngine,
    leading_condition: str,
    symptom: str,
) -> float:
    l_lead = _likelihood(engine, leading_condition, symptom)
    others = [c for c in engine.probabilities if c != leading_condition]
    if not others:
        return 1.0
    avg_other = sum(_likelihood(engine, c, symptom) for c in others) / len(others)
    eps = 1e-9
    return l_lead / max(avg_other, eps)


def _condition_specificity_categorical(
    engine: BayesianInferenceEngine,
    leading_condition: str,
    question: dict[str, Any],
) -> float:
    symptom = str(question["symptom"])
    options = question.get("options") or {}
    others = [c for c in engine.probabilities if c != leading_condition]
    if not others:
        return 1.0
    best = 1.0
    for choice in options:
        l_lead = engine.categorical_likelihood(leading_condition, symptom, choice)
        avg_o = sum(engine.categorical_likelihood(c, symptom, choice) for c in others) / len(
            others
        )
        best = max(best, l_lead / max(avg_o, 1e-9))
    return best


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

    def _expected_entropy_binary(self, question: dict[str, Any]) -> tuple[float, float]:
        symptom = self._symptom_key(question)
        base = _copy_probs(self.engine)
        h_now = _entropy(base)

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

    def _expected_entropy_categorical(self, question: dict[str, Any]) -> tuple[float, float]:
        symptom = self._symptom_key(question)
        options = question.get("options") or {}
        base = _copy_probs(self.engine)
        h_now = _entropy(base)

        expected_h = 0.0
        for choice in options:
            p_o = 0.0
            for condition, prior in base.items():
                p_o += self.engine.categorical_likelihood(condition, symptom, choice) * prior
            p_o = min(1.0, max(0.0, p_o))
            post_o = _posterior_after_categorical(self.engine, base, symptom, choice)
            expected_h += p_o * _entropy(post_o)

        ig = h_now - expected_h
        return expected_h, ig

    def expected_entropy_after_question(self, question: dict[str, Any]) -> tuple[float, float]:
        if question.get("options"):
            return self._expected_entropy_categorical(question)
        return self._expected_entropy_binary(question)

    def get_next_question(self) -> dict[str, Any] | None:
        if self._is_stopped():
            return None

        candidates = [q for q in self.questions if self._symptom_key(q) not in self._asked]
        if not candidates:
            return None

        leading = max(self.engine.probabilities.items(), key=lambda kv: kv[1])[0]

        best: dict[str, Any] | None = None
        best_score = float("-inf")

        for q in candidates:
            _, ig = self.expected_entropy_after_question(q)
            symptom = self._symptom_key(q)
            if q.get("options"):
                spec = _condition_specificity_categorical(self.engine, leading, q)
            else:
                spec = _condition_specificity(self.engine, leading, symptom)
            final_score = ig + (self.BOOST_WEIGHT * spec)
            if final_score > best_score:
                best_score = final_score
                best = q

        return best

    def ask_question(self, question: dict[str, Any], answer: bool | str) -> None:
        symptom = self._symptom_key(question)
        self._asked.add(symptom)

        if question.get("options"):
            if not isinstance(answer, str):
                raise TypeError("categorical question requires string answer")
            opts = question["options"]
            if answer not in opts:
                raise ValueError(f"invalid choice {answer!r}")
            self.engine.apply_categorical_observation(symptom, answer)
            return

        if not isinstance(answer, bool):
            raise TypeError("binary question requires boolean answer")
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
            "Pain that improves with warm-up is often related to soft tissue irritation, while "
            "pain that worsens with continued running may indicate a more serious load-related injury."
        ),
        "symptom": "warmup_response",
        # Order: improves, worsens, stays_same (second-to-last), not_sure (last)
        "options": {
            "improves": "Improves after warming up",
            "worsens": "Worsens as you continue running",
            "stays_same": "Stays about the same",
            "not_sure": "Not sure",
        },
    },
    {
        "text": (
            "After your runs, does the pain tend to feel worse later "
            "(for example, later that day or the next morning)?"
        ),
        "why_ask": (
            "Pain that worsens after running — rather than during it — is an important signal "
            "for certain types of overuse injuries."
        ),
        "symptom": "delayed_pain",
        "options": {
            "yes": "Yes — it feels worse later",
            "no": "No — it doesn't get worse later",
            "not_sure": "Not sure",
        },
    },
    {
        "text": "Is the pain present when you're at rest, or only when you're running or active?",
        "why_ask": (
            "Pain that is present even at rest can be a warning sign of a more serious injury, "
            "while pain only during activity is often less severe."
        ),
        "symptom": "pain_at_rest",
        "options": {
            "only_activity": "Only during running or activity",
            "sometimes_rest": "Sometimes present at rest",
            "constant_rest": "Present even at rest most of the time",
            "not_sure": "Not sure",
        },
    },
]


if __name__ == "__main__":
    eng = BayesianInferenceEngine()
    selector = QuestionSelector(eng, QUESTIONS)

    while not selector.should_stop():
        q = selector.get_next_question()
        if q is None:
            break
        print(f"Next question: {q['text']}")
        first_choice = next(iter(q["options"]))
        selector.ask_question(q, first_choice)
