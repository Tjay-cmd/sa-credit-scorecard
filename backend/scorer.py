"""Scorecard scaling and decision engine.

Points scaling (standard PDO formulation, implemented from scratch):
    factor = PDO / ln(2)
    log_odds_bad = intercept + sum(coef_i * WOE_i)
    score = BASE_SCORE - factor * sum(coef_i * WOE_i)

The intercept is absorbed into the base score, so each variable's
contribution is exactly -factor * coef_i * WOE_i and contributions
sum to (score - BASE_SCORE) before clamping to [300, 850].
"""

from __future__ import annotations

import numpy as np
import pandas as pd

BASE_SCORE = 600
PDO = 20
FACTOR = PDO / np.log(2)
SCORE_MIN = 300
SCORE_MAX = 850

# Fallback cutoffs; production cutoffs are recalibrated per model via
# compute_thresholds() on the training score distribution.
ACCEPT_THRESHOLD = 580
REFER_THRESHOLD = 520

REJECT_PERCENTILE = 20  # bottom 20% of training scores -> reject
REFER_PERCENTILE = 40   # 20th-40th percentile -> refer; above -> accept


def compute_thresholds(scores: np.ndarray) -> dict:
    """Percentile-based cutoffs calibrated on the training score distribution."""
    refer = int(round(float(np.percentile(scores, REJECT_PERCENTILE))))
    accept = int(round(float(np.percentile(scores, REFER_PERCENTILE))))
    return {"accept": accept, "refer": refer}


def decision_for(score: float, thresholds: dict | None = None) -> str:
    accept = thresholds["accept"] if thresholds else ACCEPT_THRESHOLD
    refer = thresholds["refer"] if thresholds else REFER_THRESHOLD
    if score >= accept:
        return "accept"
    if score >= refer:
        return "refer"
    return "reject"


def decisions_for(scores: np.ndarray, thresholds: dict) -> np.ndarray:
    """Vectorised decision_for."""
    return np.select(
        [scores >= thresholds["accept"], scores >= thresholds["refer"]],
        ["accept", "refer"],
        default="reject",
    )


def classify_inclusion_gap(traditional_decision: str, alternative_decision: str) -> str:
    """Classifies where the two scorecards agree or diverge for one applicant."""
    t, a = traditional_decision, alternative_decision
    if t == "accept" and a == "accept":
        return "agreed_accept"
    if t == "reject" and a == "reject":
        return "agreed_reject"
    if t in ("reject", "refer") and a == "accept":
        return "inclusion_gap"  # traditional excludes, alternative accepts
    if t == "accept" and a == "reject":
        return "risk_divergence"  # passes bureau checks, alt data flags risk
    return "refer_overlap"


def _model_parts(pipeline):
    binner = pipeline.named_steps["woe"]
    lr = pipeline.named_steps["lr"].best_estimator_
    return binner, lr


def score_batch(pipeline, X: pd.DataFrame) -> np.ndarray:
    """Vectorised scores for many applicants (clamped)."""
    binner, lr = _model_parts(pipeline)
    woe_df = binner.transform(X)
    linear = woe_df.to_numpy() @ lr.coef_[0]
    raw = BASE_SCORE - FACTOR * linear
    return np.clip(np.round(raw), SCORE_MIN, SCORE_MAX).astype(int)


def score_applicant(pipeline, applicant: pd.DataFrame, thresholds: dict | None = None) -> dict:
    """Score a single applicant with full variable-level explanation."""
    binner, lr = _model_parts(pipeline)
    coefs = dict(zip(binner.selected_features_, lr.coef_[0]))
    bin_assignments = binner.assign_bins(applicant)

    contributions = []
    for feature in binner.selected_features_:
        bin_label, woe = bin_assignments[feature]
        points = float(-FACTOR * coefs[feature] * woe)
        raw_value = applicant.iloc[0][feature]
        contributions.append(
            {
                "feature": feature,
                "value": raw_value.item() if hasattr(raw_value, "item") else raw_value,
                "bin": bin_label,
                "woe": round(float(woe), 4),
                "points": round(points, 2),
            }
        )
    contributions.sort(key=lambda c: c["points"])

    total_points = sum(c["points"] for c in contributions)
    raw_score = BASE_SCORE + total_points
    score = int(np.clip(round(raw_score), SCORE_MIN, SCORE_MAX))

    woe_df = binner.transform(applicant)
    pd_default = float(lr.predict_proba(woe_df)[0, 1])

    return {
        "score": score,
        "raw_score": round(raw_score, 2),
        "base_score": BASE_SCORE,
        "decision": decision_for(score, thresholds),
        "probability_of_default": round(pd_default, 4),
        "contributions": contributions,
        "thresholds": thresholds or {"accept": ACCEPT_THRESHOLD, "refer": REFER_THRESHOLD},
    }
