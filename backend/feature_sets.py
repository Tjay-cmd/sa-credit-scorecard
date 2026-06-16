"""Explicit feature groups for the dual-track scoring system.

- BUREAU_FEATURES: features that require (or proxy) a credit bureau inquiry.
- ALTERNATIVE_FEATURES: behavioural/demographic features available without one.
- COMBINED_FEATURES: the full set used by the existing Traditional Scorecard.
"""

BUREAU_FEATURES = [
    "EXT_SOURCE_1",
    "EXT_SOURCE_2",
    "EXT_SOURCE_3",
    "AMT_CREDIT",
    "AMT_ANNUITY",
    "REGION_RATING_CLIENT",
]

ALTERNATIVE_FEATURES = [
    "AGE_YEARS",
    "YEARS_EMPLOYED",
    "AMT_INCOME_TOTAL",
    "NAME_INCOME_TYPE",
    "NAME_EDUCATION_TYPE",
    "NAME_FAMILY_STATUS",
    "CNT_FAM_MEMBERS",
    "CODE_GENDER",
    "FLAG_OWN_CAR",
    "FLAG_OWN_REALTY",
]

COMBINED_FEATURES = BUREAU_FEATURES + ALTERNATIVE_FEATURES  # Traditional Scorecard

SCORECARD_LABELS = {
    "traditional": "Traditional Scorecard",
    "alternative": "Alternative Scorecard",
}

BENCHMARK_LABELS = {
    "xgboost": "XGBoost Benchmark",
}
