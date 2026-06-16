"""WOE binning + logistic regression scorecard pipeline.

Implemented from scratch (no scorecardpy):
- Continuous variables are binned with a shallow decision tree (max 6 leaves,
  min 5% of samples per leaf) fitted against the default flag.
- Missing numeric values get a dedicated "Missing" bin with its own WOE
  (important for EXT_SOURCE_* which are missing for up to 56% of applicants).
- Categorical variables use one bin per category.
- WOE = ln(dist_good / dist_bad) per bin, with 0.5 smoothing.
- IV  = sum((dist_good - dist_bad) * WOE); variables with IV < 0.02 are dropped.
- Logistic regression on WOE-transformed features, class_weight='balanced',
  L2 penalty, C tuned via 5-fold cross-validation.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier

NUMERIC_FEATURES = [
    "AMT_INCOME_TOTAL",
    "AMT_CREDIT",
    "AMT_ANNUITY",
    "AGE_YEARS",
    "YEARS_EMPLOYED",
    "CNT_FAM_MEMBERS",
    "EXT_SOURCE_1",
    "EXT_SOURCE_2",
    "EXT_SOURCE_3",
]
CATEGORICAL_FEATURES = [
    "NAME_INCOME_TYPE",
    "NAME_EDUCATION_TYPE",
    "NAME_FAMILY_STATUS",
    "REGION_RATING_CLIENT",
    "CODE_GENDER",
    "FLAG_OWN_CAR",
    "FLAG_OWN_REALTY",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET_COL = "TARGET"
MISSING_BIN_LABEL = "Missing"

IV_THRESHOLD = 0.02
MAX_BINS = 6
SMOOTHING = 0.5


def _fmt_num(x: float) -> str:
    if abs(x) >= 1000:
        return f"{x:,.0f}"
    if float(x).is_integer():
        return f"{x:.0f}"
    return f"{x:.2f}"


def _woe_stats(goods: np.ndarray, bads: np.ndarray, total_good: int, total_bad: int):
    """Per-bin WOE and IV contribution with smoothing to avoid div-by-zero."""
    dist_good = (goods + SMOOTHING) / (total_good + SMOOTHING * len(goods))
    dist_bad = (bads + SMOOTHING) / (total_bad + SMOOTHING * len(bads))
    woe = np.log(dist_good / dist_bad)
    iv_contrib = (dist_good - dist_bad) * woe
    return woe, iv_contrib, dist_good, dist_bad


class WOEBinner(BaseEstimator, TransformerMixin):
    """Fits WOE bins per feature and transforms raw values to WOE values.

    After fit():
      self.bin_info_  : {feature: {"type", "edges"|"categories", "bins": [...], "iv": float}}
      self.selected_features_ : features with IV >= threshold (in stable order)
    """

    def __init__(self, numeric_features: list[str] | None = None,
                 categorical_features: list[str] | None = None,
                 max_bins: int = MAX_BINS, iv_threshold: float = IV_THRESHOLD,
                 min_leaf_frac: float = 0.05, random_state: int = 42):
        self.numeric_features = numeric_features
        self.categorical_features = categorical_features
        self.max_bins = max_bins
        self.iv_threshold = iv_threshold
        self.min_leaf_frac = min_leaf_frac
        self.random_state = random_state

    # ----- fitting -----

    def fit(self, X: pd.DataFrame, y):
        numeric = self.numeric_features if self.numeric_features is not None else NUMERIC_FEATURES
        categorical = (
            self.categorical_features if self.categorical_features is not None else CATEGORICAL_FEATURES
        )
        all_features = numeric + categorical

        y = np.asarray(y).astype(int)
        total_bad = int(y.sum())
        total_good = int(len(y) - total_bad)

        self.bin_info_ = {}
        for feature in numeric:
            self.bin_info_[feature] = self._fit_numeric(
                X[feature].to_numpy(dtype=float), y, total_good, total_bad
            )
        for feature in categorical:
            self.bin_info_[feature] = self._fit_categorical(
                X[feature].astype(str).to_numpy(), y, total_good, total_bad
            )

        self.selected_features_ = [
            f for f in all_features if self.bin_info_[f]["iv"] >= self.iv_threshold
        ]
        self.dropped_features_ = [
            f for f in all_features if f not in self.selected_features_
        ]
        return self

    def _fit_numeric(self, x: np.ndarray, y: np.ndarray, total_good: int, total_bad: int):
        missing_mask = np.isnan(x)
        has_missing = bool(missing_mask.any())
        x_obs, y_obs = x[~missing_mask], y[~missing_mask]

        tree = DecisionTreeClassifier(
            criterion="entropy",
            max_leaf_nodes=self.max_bins,
            min_samples_leaf=max(int(self.min_leaf_frac * len(x)), 1),
            random_state=self.random_state,
        )
        tree.fit(x_obs.reshape(-1, 1), y_obs)
        thresholds = sorted(
            t for t, f in zip(tree.tree_.threshold, tree.tree_.feature) if f != -2
        )
        edges = np.array([-np.inf, *thresholds, np.inf])

        idx = np.digitize(x_obs, edges[1:-1], right=False)  # bin index per row
        n_bins = len(edges) - 1
        goods = [np.sum((idx == b) & (y_obs == 0)) for b in range(n_bins)]
        bads = [np.sum((idx == b) & (y_obs == 1)) for b in range(n_bins)]
        if has_missing:
            # Dedicated Missing bin: missingness itself carries signal
            goods.append(np.sum(missing_mask & (y == 0)))
            bads.append(np.sum(missing_mask & (y == 1)))
        goods, bads = np.array(goods), np.array(bads)
        woe, iv_contrib, dist_good, dist_bad = _woe_stats(goods, bads, total_good, total_bad)

        bins = []
        for b in range(n_bins):
            lo, hi = edges[b], edges[b + 1]
            if np.isinf(lo):
                label = f"<= {_fmt_num(hi)}"
            elif np.isinf(hi):
                label = f"> {_fmt_num(lo)}"
            else:
                label = f"({_fmt_num(lo)} – {_fmt_num(hi)}]"
            bins.append(self._bin_record(label, goods[b], bads[b], woe[b],
                                         iv_contrib[b], dist_good[b], dist_bad[b]))
        if has_missing:
            bins.append(self._bin_record(MISSING_BIN_LABEL, goods[-1], bads[-1],
                                         woe[-1], iv_contrib[-1],
                                         dist_good[-1], dist_bad[-1]))
        return {
            "type": "numeric",
            "edges": edges.tolist(),
            "bins": bins,
            "missing_woe": float(woe[-1]) if has_missing else 0.0,
            "has_missing_bin": has_missing,
            "iv": float(iv_contrib.sum()),
        }

    def _fit_categorical(self, x: np.ndarray, y: np.ndarray, total_good: int, total_bad: int):
        categories = sorted(pd.unique(x).tolist())
        goods = np.array([np.sum((x == c) & (y == 0)) for c in categories])
        bads = np.array([np.sum((x == c) & (y == 1)) for c in categories])
        woe, iv_contrib, dist_good, dist_bad = _woe_stats(goods, bads, total_good, total_bad)

        bins = [
            self._bin_record(c, goods[i], bads[i], woe[i], iv_contrib[i],
                             dist_good[i], dist_bad[i])
            for i, c in enumerate(categories)
        ]
        return {
            "type": "categorical",
            "categories": categories,
            "woe_map": {c: float(w) for c, w in zip(categories, woe)},
            "bins": bins,
            "iv": float(iv_contrib.sum()),
        }

    @staticmethod
    def _bin_record(label, good, bad, woe, iv_contrib, dist_good, dist_bad):
        count = int(good + bad)
        return {
            "bin": str(label),
            "count": count,
            "count_good": int(good),
            "count_bad": int(bad),
            "bad_rate": float(bad / count) if count else 0.0,
            "pct_goods": float(dist_good),
            "pct_bads": float(dist_bad),
            "woe": float(woe),
            "iv_contribution": float(iv_contrib),
        }

    # ----- transforming -----

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        out = {}
        for feature in self.selected_features_:
            info = self.bin_info_[feature]
            if info["type"] == "numeric":
                out[feature] = self._transform_numeric(
                    X[feature].to_numpy(dtype=float), info
                )
            else:
                woe_map = info["woe_map"]
                out[feature] = (
                    X[feature].astype(str).map(woe_map).fillna(0.0).to_numpy()
                )
        return pd.DataFrame(out, index=X.index)

    @staticmethod
    def _transform_numeric(x: np.ndarray, info: dict) -> np.ndarray:
        edges = np.array(info["edges"])
        n_value_bins = len(edges) - 1
        woes = np.array([b["woe"] for b in info["bins"][:n_value_bins]])
        idx = np.digitize(np.nan_to_num(x), edges[1:-1], right=False)
        out = woes[idx]
        out[np.isnan(x)] = info.get("missing_woe", 0.0)
        return out

    # ----- introspection helpers -----

    def assign_bins(self, X: pd.DataFrame) -> dict:
        """Returns {feature: (bin_label, woe)} for a single-row DataFrame."""
        row = X.iloc[0]
        result = {}
        for feature in self.selected_features_:
            info = self.bin_info_[feature]
            if info["type"] == "numeric":
                value = row[feature]
                if pd.isna(value):
                    result[feature] = (MISSING_BIN_LABEL, info.get("missing_woe", 0.0))
                    continue
                edges = np.array(info["edges"])
                idx = int(np.digitize([float(value)], edges[1:-1], right=False)[0])
                b = info["bins"][idx]
                result[feature] = (b["bin"], b["woe"])
            else:
                val = str(row[feature])
                woe = info["woe_map"].get(val, 0.0)
                result[feature] = (val, woe)
        return result


class ScorecardPipeline:
    """A complete WOE + logistic regression scorecard over an explicit feature list.

    Both the Traditional and Alternative scorecards are instances of this class
    with different feature lists; WOE/IV logic, IV drop threshold and CV-tuned
    L2 logistic regression are identical.
    """

    def __init__(self, features: list[str], name: str = "scorecard", random_state: int = 42):
        unknown = set(features) - set(NUMERIC_FEATURES) - set(CATEGORICAL_FEATURES)
        if unknown:
            raise ValueError(f"Unknown features: {sorted(unknown)}")
        self.features = list(features)
        self.name = name
        self.random_state = random_state
        self.numeric_features = [f for f in self.features if f in NUMERIC_FEATURES]
        self.categorical_features = [f for f in self.features if f in CATEGORICAL_FEATURES]

        lr_search = GridSearchCV(
            LogisticRegression(
                # L2 (ridge) penalty is sklearn's default; strength tuned via C below
                class_weight="balanced",
                solver="lbfgs",
                max_iter=2000,
                random_state=random_state,
            ),
            param_grid={"C": [0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]},
            scoring="roc_auc",
            cv=5,
            n_jobs=-1,
        )
        self.pipeline = Pipeline(
            [
                ("woe", WOEBinner(
                    numeric_features=self.numeric_features,
                    categorical_features=self.categorical_features,
                    random_state=random_state,
                )),
                ("lr", lr_search),
            ]
        )

    @property
    def named_steps(self):
        return self.pipeline.named_steps

    @property
    def binner(self) -> WOEBinner:
        return self.pipeline.named_steps["woe"]

    @property
    def best_C(self) -> float:
        return float(self.pipeline.named_steps["lr"].best_params_["C"])

    def fit(self, df: pd.DataFrame) -> "ScorecardPipeline":
        self.pipeline.fit(df[self.features], df[TARGET_COL])
        return self

    def predict_proba(self, X: pd.DataFrame):
        return self.pipeline.predict_proba(X[self.features])

    def woe_tables(self) -> list[dict]:
        binner = self.binner
        return [
            {
                "feature": feature,
                "iv": round(binner.bin_info_[feature]["iv"], 4),
                "selected": feature in binner.selected_features_,
                "type": binner.bin_info_[feature]["type"],
                "bins": binner.bin_info_[feature]["bins"],
            }
            for feature in sorted(
                binner.bin_info_, key=lambda f: binner.bin_info_[f]["iv"], reverse=True
            )
        ]
