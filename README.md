# Credit Scorecard Engine — Dual-Track Scoring & Inclusion Gap Analysis

A production-style credit scoring system built on the **Home Credit Default
Risk** dataset (Kaggle `application_train.csv`, 307,511 real applications).
Applicant data is run through **two parallel WOE-binned logistic regression
scorecards** — a Traditional (bureau-based) and an Alternative (non-bureau)
model — each returning a 300–850 credit score, an accept/refer/reject decision,
and a variable-level explanation. An inclusion-gap analysis shows where the two
diverge: the population that traditional credit models systematically exclude.

All scorecard logic (WOE/IV binning, points scaling) is implemented from
scratch — no scorecardpy or other pre-built scorecard libraries.

**Repository:** [github.com/Tjay-cmd/sa-credit-scorecard](https://github.com/Tjay-cmd/sa-credit-scorecard)

## Dual-track scoring

| | Traditional Scorecard | Alternative Scorecard |
| --- | --- | --- |
| Features | Bureau + alternative (16) | Non-bureau only (10) |
| Bureau inputs | `EXT_SOURCE_1/2/3`, `AMT_CREDIT`, `AMT_ANNUITY`, `REGION_RATING_CLIENT` | none |
| Holdout AUC / Gini / KS | 0.737 / 0.473 / 0.355 | 0.631 / 0.261 / 0.203 |

**XGBoost benchmark** (same `COMBINED_FEATURES`, not used for decisions): holdout AUC
0.753 / Gini 0.505 / KS 0.376 — higher discrimination, but SHAP explainability is
post-hoc; the WOE scorecard remains the production model for NCA regulatory reasons.
| Cutoffs (accept/refer) | 603 / 587 | 598 / 590 |

The alternative model's lower discrimination is expected and reported honestly.
Feature groups are defined in `backend/feature_sets.py`; both scorecards are
instances of the same `ScorecardPipeline` class (`backend/pipeline.py`).

Every applicant is classified by where the two models agree or diverge:

- **Agreed Accept / Agreed Reject** — both models agree
- **Inclusion Gap** — traditional rejects/refers, alternative accepts
- **Risk Divergence** — traditional accepts, alternative rejects
- **Refer Overlap** — at least one model refers

### Key holdout findings (seed 42)

- **14.7%** of the holdout (9,021 applicants) fall in the inclusion gap
- Their real default rate is **12.1%** — 3.4× the agreed-accept rate (3.6%) but
  well below the agreed-reject rate (20.8%): the traditional model is
  partially, not entirely, right about this group
- The risk-divergence group defaults at just 5.1% — the alternative model is
  overly harsh on them; no single model has a monopoly on the truth
- Illustrative missed lending: 9,021 × R540k avg request ≈ **R4.9 billion**

## Stack

- **Backend** — FastAPI, scikit-learn, pandas, numpy, joblib (port 8000)
- **Frontend** — React + Vite, Tailwind CSS, Recharts, Axios (port 5173)

## Setup

Place the Kaggle data at `kaggle_data/application_train.csv` (from the
[Home Credit Default Risk](https://www.kaggle.com/c/home-credit-default-risk)
competition).

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows (source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
uvicorn main:app --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and click **Train Model** on the dashboard.

## How it works

### 1. Data loading (`backend/data_loader.py`)

16 credit-relevant features are selected from the 122 raw columns. Cleaning:

- `DAYS_BIRTH` / `DAYS_EMPLOYED` (negative day counts) → positive years
  (`AGE_YEARS`, `YEARS_EMPLOYED`).
- `DAYS_EMPLOYED == 365243` sentinel (pensioners / not working, ~18% of rows)
  → treated as missing.
- `EXT_SOURCE_1/2/3` keep their real missingness (up to 56%) — handled by a
  dedicated **Missing bin** in WOE binning rather than imputation, since
  missingness itself carries signal.
- Low-missingness columns (`AMT_ANNUITY`, `CNT_FAM_MEMBERS`) → median; junk
  categories (`CODE_GENDER='XNA'`, `NAME_FAMILY_STATUS='Unknown'`) → mode.

### 2. WOE binning (`backend/pipeline.py`)

- Continuous variables binned with a shallow decision tree (max 6 leaves,
  min 5% of samples per leaf) fitted against `TARGET`.
- Missing numeric values get their own "Missing" bin with its own WOE.
- Categorical variables get one bin per category.
- Per bin: `WOE = ln(dist_good / dist_bad)` with 0.5 smoothing;
  `IV = Σ (dist_good − dist_bad) × WOE`.
- Variables with IV < 0.02 are dropped (`AMT_INCOME_TOTAL`,
  `CNT_FAM_MEMBERS`, `FLAG_OWN_CAR`, `FLAG_OWN_REALTY` drop out).

### 3. Logistic regression

Trained on WOE-transformed features inside an sklearn `Pipeline` with
`class_weight='balanced'` (8.1% bad rate) and an L2 penalty; `C` is tuned via
5-fold cross-validated grid search on ROC AUC.

### 4. Train/test split

80/20 **stratified** split. All reported metrics (AUC, Gini, KS, ROC curve,
score distribution) are computed on the holdout set; train AUC is reported
alongside for an overfit check.

### 5. Scorecard scaling (`backend/scorer.py`)

Standard PDO formulation: `factor = PDO / ln(2)` with base score 600 and
PDO 20. The intercept is absorbed into the base score, so each variable's
contribution is exactly `−factor × coef × WOE` and **contributions sum to
(score − 600)**. Final score is clamped to 300–850.

### 6. Decision engine

Cutoffs are **recalibrated at train time** from percentiles of the training
score distribution (stored alongside the model in `scorecard.joblib`):

| Training-score percentile | Decision | Cutoff (seed 42) |
| ------------------------- | -------- | ---------------- |
| > 40th                    | Accept   | score ≥ 603      |
| 20th–40th                 | Refer    | 587–602          |
| < 20th                    | Reject   | < 587            |

This targets a ~60/20/20 accept/refer/reject mix; on the holdout set the
realised split is 61.1% / 19.8% / 19.2%.

## API

| Method | Path                  | Description                                                       |
| ------ | --------------------- | ----------------------------------------------------------------- |
| POST   | `/train`              | Trains both scorecards + XGBoost benchmark on the same split       |
| GET    | `/model/stats`        | Holdout metrics for scorecards + `xgboost_benchmark` (incl. SHAP) |
| GET    | `/model/woe-tables`   | WOE + IV tables (traditional; alternative under `alternative_tables`) |
| POST   | `/score`              | Both scores + decisions + `inclusion_gap_class`                   |
| GET    | `/inclusion-analysis` | 5-way gap distribution, population profiles, real default rates   |
| GET    | `/health`             | Health check + training status                                    |

`/score` accepts nulls for `YEARS_EMPLOYED` and `EXT_SOURCE_1/2/3` — these
route to the Missing bin.

The trained model is persisted to `backend/models/scorecard.joblib`;
retraining wipes and replaces it.

## Frontend pages

- **Dashboard** — side-by-side model comparison (Traditional / Alternative /
  XGBoost benchmark), three ROC curves, SHAP top features, NCA explainability
  panel, and two score distribution histograms.
- **Score Applicant** — both scores and decisions for every applicant, with an
  inclusion-gap / risk-divergence banner and dual contribution charts.
- **WOE Tables** — per-variable bins with WOE (green/red heat), IV, % goods,
  % bads, sorted by IV descending. Missing bins shown explicitly.
- **Inclusion Gap Analysis** — donut of the 5-way population split, profile
  cards (inclusion gap vs agreed reject) with real default rates, the
  illustrative cost-of-exclusion estimate, and the methodology note.

## Reference results (seed 42, 80/20 stratified split)

- Train: 246,008 rows · Test: 61,503 rows · bad rate 8.07%
- **Holdout AUC ≈ 0.737 · Gini ≈ 0.473 · KS ≈ 0.355** (train AUC ≈ 0.737, no overfit)
- Top predictors by IV: `EXT_SOURCE_3` (0.33), `EXT_SOURCE_2` (0.31),
  `EXT_SOURCE_1` (0.15), `YEARS_EMPLOYED` (0.11), `AGE_YEARS` (0.09)
- Recalibrated cutoffs: accept ≥ 603, refer ≥ 587 → holdout decision mix
  61.1% accept / 19.8% refer / 19.2% reject
