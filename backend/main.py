"""Credit Scorecard Engine — FastAPI app (Home Credit / Kaggle data).

Dual-track scoring: a Traditional Scorecard (bureau + alternative features)
and an Alternative Scorecard (non-bureau features only), plus an inclusion-gap
analysis of where the two diverge on the holdout population.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

from data_loader import load_dataset
from feature_sets import (
    ALTERNATIVE_FEATURES,
    BENCHMARK_LABELS,
    COMBINED_FEATURES,
    SCORECARD_LABELS,
)
from pipeline import TARGET_COL, ScorecardPipeline
from xgb_benchmark import XGBBenchmark
from scorer import (
    BASE_SCORE,
    PDO,
    SCORE_MAX,
    SCORE_MIN,
    classify_inclusion_gap,
    compute_thresholds,
    decision_for,
    decisions_for,
    score_applicant,
    score_batch,
)

MODELS_DIR = Path(__file__).parent / "models"
MODEL_PATH = MODELS_DIR / "scorecard.joblib"

app = FastAPI(title="Credit Scorecard Engine (Home Credit)", version="3.0.0")

_cors_origins = [
    "http://localhost:5173",
    "https://sa-credit-scorecard.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_artifact: dict | None = None


class Applicant(BaseModel):
    AMT_INCOME_TOTAL: float = Field(ge=0, description="Total annual income")
    AMT_CREDIT: float = Field(ge=0, description="Credit amount of the loan")
    AMT_ANNUITY: float = Field(ge=0, description="Loan annuity")
    AGE_YEARS: float = Field(ge=18, le=100, description="Age in years")
    YEARS_EMPLOYED: float | None = Field(
        default=None, ge=0, le=60,
        description="Years at current employment; null = not working/pensioner",
    )
    CNT_FAM_MEMBERS: int = Field(ge=1, le=25)
    NAME_INCOME_TYPE: Literal[
        "Working", "State servant", "Commercial associate", "Pensioner",
        "Unemployed", "Student", "Businessman", "Maternity leave",
    ]
    NAME_EDUCATION_TYPE: Literal[
        "Secondary / secondary special", "Higher education",
        "Incomplete higher", "Lower secondary", "Academic degree",
    ]
    NAME_FAMILY_STATUS: Literal[
        "Single / not married", "Married", "Civil marriage", "Widow", "Separated",
    ]
    REGION_RATING_CLIENT: Literal[1, 2, 3]
    EXT_SOURCE_1: float | None = Field(default=None, ge=0, le=1)
    EXT_SOURCE_2: float | None = Field(default=None, ge=0, le=1)
    EXT_SOURCE_3: float | None = Field(default=None, ge=0, le=1)
    CODE_GENDER: Literal["M", "F"]
    FLAG_OWN_CAR: Literal["Y", "N"]
    FLAG_OWN_REALTY: Literal["Y", "N"]


class TrainRequest(BaseModel):
    seed: int = 42
    test_size: float = Field(default=0.2, gt=0.0, lt=0.5)


def _load_artifact() -> dict | None:
    global _artifact
    if _artifact is None and MODEL_PATH.exists():
        _artifact = joblib.load(MODEL_PATH)
    return _artifact


def _require_model() -> dict:
    artifact = _load_artifact()
    if artifact is None or "traditional" not in artifact:
        raise HTTPException(status_code=409, detail="Model not trained yet. Call POST /train first.")
    return artifact


def _compute_stats(scorecard: ScorecardPipeline, df: pd.DataFrame, thresholds: dict) -> dict:
    """Discrimination metrics + score distribution on the given (holdout) set."""
    y = df[TARGET_COL].to_numpy()

    proba = scorecard.predict_proba(df)[:, 1]
    auc = float(roc_auc_score(y, proba))
    fpr, tpr, _ = roc_curve(y, proba)
    ks = float(np.max(tpr - fpr))

    # Downsample ROC curve to ~100 points for the frontend
    step = max(len(fpr) // 100, 1)
    idx = np.unique(np.concatenate([np.arange(0, len(fpr), step), [len(fpr) - 1]]))
    roc_points = [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in idx]

    # Score distribution in 10-point bands, tagged with the decision band
    scores = score_batch(scorecard, df)
    band_width = 10
    edges = np.arange(SCORE_MIN, SCORE_MAX + band_width, band_width)
    counts, _ = np.histogram(scores, bins=edges)
    distribution = [
        {
            "bucket": f"{int(edges[i])}–{int(edges[i + 1])}",
            "min_score": int(edges[i]),
            "count": int(counts[i]),
            "band": decision_for(edges[i], thresholds),
        }
        for i in range(len(counts))
    ]

    n = len(scores)
    n_accept = int((scores >= thresholds["accept"]).sum())
    n_reject = int((scores < thresholds["refer"]).sum())
    n_refer = n - n_accept - n_reject

    return {
        "auc": round(auc, 4),
        "gini": round(2 * auc - 1, 4),
        "ks": round(ks, 4),
        "thresholds": thresholds,
        "roc_curve": roc_points,
        "score_distribution": distribution,
        "mean_score": round(float(scores.mean()), 1),
        "decision_mix": {"accept": n_accept, "refer": n_refer, "reject": n_reject},
        "decision_mix_pct": {
            "accept": round(100 * n_accept / n, 1),
            "refer": round(100 * n_refer / n, 1),
            "reject": round(100 * n_reject / n, 1),
        },
    }


def _population_profile(sub: pd.DataFrame) -> dict | None:
    """Average feature profile of a sub-population, incl. its REAL default rate."""
    if len(sub) == 0:
        return None

    def top_dist(col: str, k: int = 3) -> list[dict]:
        vc = sub[col].value_counts(normalize=True).head(k)
        return [{"name": str(name), "pct": round(100 * float(p), 1)} for name, p in vc.items()]

    return {
        "count": int(len(sub)),
        "avg_age": round(float(sub["AGE_YEARS"].mean()), 1),
        "avg_income": round(float(sub["AMT_INCOME_TOTAL"].mean()), 0),
        "avg_years_employed": round(float(sub["YEARS_EMPLOYED"].mean()), 1)
        if sub["YEARS_EMPLOYED"].notna().any() else None,
        "top_income_type": str(sub["NAME_INCOME_TYPE"].mode().iloc[0]),
        "top_education": str(sub["NAME_EDUCATION_TYPE"].mode().iloc[0]),
        "income_type_distribution": top_dist("NAME_INCOME_TYPE"),
        "education_distribution": top_dist("NAME_EDUCATION_TYPE"),
        "avg_credit_requested": round(float(sub["AMT_CREDIT"].mean()), 0),
        # Real outcomes from the holdout TARGET column — not model predictions
        "actual_default_rate": round(float(sub[TARGET_COL].mean()), 4),
    }


def _inclusion_analysis(traditional: dict, alternative: dict, test_df: pd.DataFrame) -> dict:
    """Scores the holdout set through both pipelines and profiles the divergence."""
    trad_scores = score_batch(traditional["scorecard"], test_df)
    alt_scores = score_batch(alternative["scorecard"], test_df)
    trad_dec = decisions_for(trad_scores, traditional["thresholds"])
    alt_dec = decisions_for(alt_scores, alternative["thresholds"])

    classes = np.select(
        [
            (trad_dec == "accept") & (alt_dec == "accept"),
            (trad_dec == "reject") & (alt_dec == "reject"),
            np.isin(trad_dec, ["reject", "refer"]) & (alt_dec == "accept"),
            (trad_dec == "accept") & (alt_dec == "reject"),
        ],
        ["agreed_accept", "agreed_reject", "inclusion_gap", "risk_divergence"],
        default="refer_overlap",
    )

    masks = {name: classes == name for name in
             ["agreed_accept", "agreed_reject", "inclusion_gap", "risk_divergence", "refer_overlap"]}
    n = len(test_df)

    gap_profile = _population_profile(test_df[masks["inclusion_gap"]])
    inclusion_count = int(masks["inclusion_gap"].sum())
    avg_credit_gap = gap_profile["avg_credit_requested"] if gap_profile else 0.0

    return {
        "n_holdout": int(n),
        "gap_distribution": {name: int(mask.sum()) for name, mask in masks.items()},
        "gap_distribution_pct": {
            name: round(100 * float(mask.sum()) / n, 1) for name, mask in masks.items()
        },
        "inclusion_gap_profile": gap_profile,
        "risk_divergence_profile": _population_profile(test_df[masks["risk_divergence"]]),
        "agreed_reject_profile": _population_profile(test_df[masks["agreed_reject"]]),
        "benchmarks": {
            "agreed_accept_default_rate": round(
                float(test_df[masks["agreed_accept"]][TARGET_COL].mean()), 4
            ) if masks["agreed_accept"].any() else None,
            "agreed_reject_default_rate": round(
                float(test_df[masks["agreed_reject"]][TARGET_COL].mean()), 4
            ) if masks["agreed_reject"].any() else None,
            "overall_default_rate": round(float(test_df[TARGET_COL].mean()), 4),
        },
        # Illustrative only — holdout gap count x avg credit requested by that group
        "cost_of_exclusion": {
            "inclusion_gap_count": inclusion_count,
            "avg_credit_requested": avg_credit_gap,
            "total_missed_lending": round(inclusion_count * avg_credit_gap, 0),
        },
    }


def _train_scorecard(name: str, features: list[str], train_df: pd.DataFrame,
                     test_df: pd.DataFrame, seed: int) -> dict:
    scorecard = ScorecardPipeline(features, name=name, random_state=seed).fit(train_df)

    # Cutoffs recalibrated per scorecard on its own training score distribution
    train_scores = score_batch(scorecard, train_df)
    thresholds = compute_thresholds(train_scores)

    stats = _compute_stats(scorecard, test_df, thresholds)
    stats["train_auc"] = round(
        float(roc_auc_score(train_df[TARGET_COL], scorecard.predict_proba(train_df)[:, 1])), 4
    )

    binner = scorecard.binner
    return {
        "label": SCORECARD_LABELS[name],
        "scorecard": scorecard,
        "features": features,
        "thresholds": thresholds,
        "stats": stats,
        "woe_tables": scorecard.woe_tables(),
        "selected_features": binner.selected_features_,
        "dropped_features": binner.dropped_features_,
        "best_C": scorecard.best_C,
    }


def _train_xgboost_benchmark(
    train_df: pd.DataFrame, test_df: pd.DataFrame, seed: int
) -> dict:
    benchmark = XGBBenchmark(COMBINED_FEATURES, random_state=seed)
    benchmark.fit(train_df, test_df)
    stats = benchmark.holdout_stats(train_df, test_df)
    return {
        "label": BENCHMARK_LABELS["xgboost"],
        "model_type": "xgboost_benchmark",
        "features": COMBINED_FEATURES,
        "benchmark": benchmark,
        "stats": stats,
    }


def _benchmark_block(model: dict) -> dict:
    """Public (JSON) view of the XGBoost benchmark — discrimination metrics only."""
    return {
        "label": model["label"],
        "model_type": model["model_type"],
        "features": model["features"],
        "is_benchmark": True,
        **model["stats"],
    }


def _model_block(model: dict) -> dict:
    """Public (JSON) view of one trained scorecard."""
    return {
        "label": model["label"],
        "features": model["features"],
        "selected_features": model["selected_features"],
        "dropped_features": model["dropped_features"],
        "best_C": model["best_C"],
        **model["stats"],
    }


@app.get("/health")
def health():
    artifact = _load_artifact()
    trained = artifact is not None and "traditional" in artifact
    return {
        "status": "ok",
        "model_trained": trained,
        "trained_at": artifact["trained_at"] if trained else None,
    }


@app.post("/train")
def train(req: TrainRequest | None = None):
    global _artifact
    req = req or TrainRequest()

    df = load_dataset()
    train_df, test_df = train_test_split(
        df,
        test_size=req.test_size,
        stratify=df[TARGET_COL],
        random_state=req.seed,
    )

    traditional = _train_scorecard("traditional", COMBINED_FEATURES, train_df, test_df, req.seed)
    alternative = _train_scorecard("alternative", ALTERNATIVE_FEATURES, train_df, test_df, req.seed)
    xgboost = _train_xgboost_benchmark(train_df, test_df, req.seed)
    inclusion = _inclusion_analysis(traditional, alternative, test_df)

    artifact = {
        "traditional": traditional,
        "alternative": alternative,
        "xgboost_benchmark": xgboost,
        "inclusion_analysis": inclusion,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_train": int(len(train_df)),
        "n_test": int(len(test_df)),
        "bad_rate": round(float(df[TARGET_COL].mean()), 4),
        "scorecard_config": {
            "base_score": BASE_SCORE,
            "pdo": PDO,
            "score_min": SCORE_MIN,
            "score_max": SCORE_MAX,
            "threshold_method": "train-score percentiles (reject <p20, refer p20-p40)",
        },
    }

    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(artifact, MODEL_PATH)  # retrain wipes and replaces
    _artifact = artifact

    return {
        "message": "Scorecards and XGBoost benchmark trained on application_train.csv",
        "trained_at": artifact["trained_at"],
        "n_train": artifact["n_train"],
        "n_test": artifact["n_test"],
        "bad_rate": artifact["bad_rate"],
        "traditional": {
            "auc": traditional["stats"]["auc"],
            "gini": traditional["stats"]["gini"],
            "ks": traditional["stats"]["ks"],
            "thresholds": traditional["thresholds"],
            "dropped_features": traditional["dropped_features"],
        },
        "alternative": {
            "auc": alternative["stats"]["auc"],
            "gini": alternative["stats"]["gini"],
            "ks": alternative["stats"]["ks"],
            "thresholds": alternative["thresholds"],
            "dropped_features": alternative["dropped_features"],
        },
        "xgboost_benchmark": {
            "auc": xgboost["stats"]["auc"],
            "gini": xgboost["stats"]["gini"],
            "ks": xgboost["stats"]["ks"],
            "train_auc": xgboost["stats"]["train_auc"],
        },
        "inclusion_gap_pct": inclusion["gap_distribution_pct"]["inclusion_gap"],
    }


@app.get("/model/stats")
def model_stats():
    artifact = _require_model()
    return {
        "trained_at": artifact["trained_at"],
        "n_train": artifact["n_train"],
        "n_test": artifact["n_test"],
        "bad_rate": artifact["bad_rate"],
        "scorecard_config": artifact["scorecard_config"],
        "traditional": _model_block(artifact["traditional"]),
        "alternative": _model_block(artifact["alternative"]),
        "xgboost_benchmark": _benchmark_block(artifact["xgboost_benchmark"])
        if "xgboost_benchmark" in artifact
        else None,
    }


@app.get("/model/woe-tables")
def woe_tables():
    artifact = _require_model()
    return {
        "trained_at": artifact["trained_at"],
        "tables": artifact["traditional"]["woe_tables"],
        "alternative_tables": artifact["alternative"]["woe_tables"],
    }


@app.get("/inclusion-analysis")
def inclusion_analysis():
    artifact = _require_model()
    return {
        "trained_at": artifact["trained_at"],
        **artifact["inclusion_analysis"],
    }


@app.post("/score")
def score(applicant: Applicant):
    artifact = _require_model()
    row = pd.DataFrame([applicant.model_dump()])

    trad = score_applicant(
        artifact["traditional"]["scorecard"], row, artifact["traditional"]["thresholds"]
    )
    alt = score_applicant(
        artifact["alternative"]["scorecard"], row, artifact["alternative"]["thresholds"]
    )
    return {
        "traditional": {"label": SCORECARD_LABELS["traditional"], **trad},
        "alternative": {"label": SCORECARD_LABELS["alternative"], **alt},
        "inclusion_gap_class": classify_inclusion_gap(trad["decision"], alt["decision"]),
    }
