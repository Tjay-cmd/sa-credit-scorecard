"""XGBoost performance benchmark on COMBINED_FEATURES.

Trained alongside the WOE scorecards as a discrimination benchmark only — not used
for production scoring decisions. SHAP (TreeExplainer) provides post-hoc
explainability for comparison against the scorecard's native point contributions.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from pipeline import CATEGORICAL_FEATURES, NUMERIC_FEATURES, TARGET_COL

SHAP_SAMPLE_SIZE = 3000


def _roc_points(y: np.ndarray, proba: np.ndarray) -> list[dict]:
    fpr, tpr, _ = roc_curve(y, proba)
    step = max(len(fpr) // 100, 1)
    idx = np.unique(np.concatenate([np.arange(0, len(fpr), step), [len(fpr) - 1]]))
    return [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in idx]


class XGBBenchmark:
    """XGBoost classifier with sklearn preprocessing and SHAP summaries."""

    def __init__(self, features: list[str], random_state: int = 42):
        unknown = set(features) - set(NUMERIC_FEATURES) - set(CATEGORICAL_FEATURES)
        if unknown:
            raise ValueError(f"Unknown features: {sorted(unknown)}")
        self.features = list(features)
        self.random_state = random_state
        self.numeric_features = [f for f in self.features if f in NUMERIC_FEATURES]
        self.categorical_features = [f for f in self.features if f in CATEGORICAL_FEATURES]

        self.preprocessor = ColumnTransformer(
            transformers=[
                (
                    "num",
                    SimpleImputer(strategy="median"),
                    self.numeric_features,
                ),
                (
                    "cat",
                    OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                    self.categorical_features,
                ),
            ],
        )
        self.model: xgb.XGBClassifier | None = None
        self.feature_names_: list[str] = []
        self.shap_importance_: list[dict] = []

    def _transform(self, df: pd.DataFrame) -> np.ndarray:
        return self.preprocessor.transform(df[self.features])

    def fit(self, train_df: pd.DataFrame, test_df: pd.DataFrame) -> "XGBBenchmark":
        X_train = self.preprocessor.fit_transform(train_df[self.features])
        y_train = train_df[TARGET_COL].to_numpy()

        num_names = list(self.numeric_features)
        cat_names = (
            self.preprocessor.named_transformers_["cat"]
            .get_feature_names_out(self.categorical_features)
            .tolist()
        )
        self.feature_names_ = num_names + cat_names

        n_pos = int(y_train.sum())
        n_neg = len(y_train) - n_pos
        scale_pos_weight = n_neg / max(n_pos, 1)

        self.model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            scale_pos_weight=scale_pos_weight,
            eval_metric="auc",
            random_state=self.random_state,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train, verbose=False)

        self._compute_shap_importance(test_df)
        return self

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X = self._transform(df)
        return self.model.predict_proba(X)[:, 1]

    def _compute_shap_importance(self, test_df: pd.DataFrame) -> None:
        """Mean |SHAP| on a holdout subsample — global feature importance."""
        sample = test_df
        if len(sample) > SHAP_SAMPLE_SIZE:
            sample = sample.sample(SHAP_SAMPLE_SIZE, random_state=self.random_state)

        X = self._transform(sample)
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X)

        mean_abs = np.abs(shap_values).mean(axis=0)
        ranked = sorted(
            zip(self.feature_names_, mean_abs),
            key=lambda x: x[1],
            reverse=True,
        )
        self.shap_importance_ = [
            {"feature": name, "mean_abs_shap": round(float(val), 4)}
            for name, val in ranked
        ]

    def explain(self, df: pd.DataFrame) -> list[dict]:
        """Per-applicant SHAP contributions (for optional /score extension)."""
        X = self._transform(df)
        explainer = shap.TreeExplainer(self.model)
        shap_values = explainer.shap_values(X)
        base = float(explainer.expected_value)

        rows = []
        for i in range(len(df)):
            contribs = [
                {
                    "feature": self.feature_names_[j],
                    "shap_value": round(float(shap_values[i, j]), 4),
                }
                for j in range(len(self.feature_names_))
            ]
            contribs.sort(key=lambda c: abs(c["shap_value"]), reverse=True)
            rows.append(
                {
                    "base_value": round(base, 4),
                    "contributions": contribs[:12],
                }
            )
        return rows

    def holdout_stats(self, train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
        y_test = test_df[TARGET_COL].to_numpy()
        proba_test = self.predict_proba(test_df)
        auc = float(roc_auc_score(y_test, proba_test))

        y_train = train_df[TARGET_COL].to_numpy()
        proba_train = self.predict_proba(train_df)
        train_auc = float(roc_auc_score(y_train, proba_train))

        fpr, tpr, _ = roc_curve(y_test, proba_test)
        ks = float(np.max(tpr - fpr))

        return {
            "auc": round(auc, 4),
            "gini": round(2 * auc - 1, 4),
            "ks": round(ks, 4),
            "train_auc": round(train_auc, 4),
            "roc_curve": _roc_points(y_test, proba_test),
            "shap_importance": self.shap_importance_[:15],
        }
