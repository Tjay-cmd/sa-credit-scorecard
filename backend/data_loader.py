"""Loader for the Home Credit (Kaggle) application_train.csv dataset.

Cleaning rules:
- DAYS_BIRTH / DAYS_EMPLOYED are negative day counts -> converted to positive
  years (AGE_YEARS, YEARS_EMPLOYED).
- DAYS_EMPLOYED == 365243 is a sentinel for "not employed / pensioner" ->
  treated as missing (handled by a dedicated Missing bin in WOE binning).
- EXT_SOURCE_1/2/3 have heavy real missingness (up to 56%) -> kept as NaN so
  the WOE binner assigns them a dedicated Missing bin instead of imputing.
- Low-missingness continuous columns (AMT_ANNUITY, CNT_FAM_MEMBERS) -> median.
- Rare junk categories (CODE_GENDER 'XNA', NAME_FAMILY_STATUS 'Unknown') -> mode.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

KAGGLE_CSV = Path(__file__).parent.parent / "kaggle_data" / "application_train.csv"

DAYS_EMPLOYED_SENTINEL = 365243
TARGET_COL = "TARGET"

RAW_COLUMNS = [
    "TARGET",
    "AMT_INCOME_TOTAL",
    "AMT_CREDIT",
    "AMT_ANNUITY",
    "DAYS_BIRTH",
    "DAYS_EMPLOYED",
    "CNT_FAM_MEMBERS",
    "NAME_INCOME_TYPE",
    "NAME_EDUCATION_TYPE",
    "NAME_FAMILY_STATUS",
    "REGION_RATING_CLIENT",
    "EXT_SOURCE_1",
    "EXT_SOURCE_2",
    "EXT_SOURCE_3",
    "CODE_GENDER",
    "FLAG_OWN_CAR",
    "FLAG_OWN_REALTY",
]

MEDIAN_IMPUTE_COLS = ["AMT_ANNUITY", "CNT_FAM_MEMBERS"]


def load_dataset(path: Path | str = KAGGLE_CSV) -> pd.DataFrame:
    df = pd.read_csv(path, usecols=RAW_COLUMNS)

    # Negative day counts -> positive years
    df["AGE_YEARS"] = (-df["DAYS_BIRTH"] / 365.25).round(1)
    days_employed = df["DAYS_EMPLOYED"].replace(DAYS_EMPLOYED_SENTINEL, np.nan)
    df["YEARS_EMPLOYED"] = (-days_employed / 365.25).round(1)
    df = df.drop(columns=["DAYS_BIRTH", "DAYS_EMPLOYED"])

    for col in MEDIAN_IMPUTE_COLS:
        df[col] = df[col].fillna(df[col].median())

    df["CODE_GENDER"] = df["CODE_GENDER"].replace("XNA", df["CODE_GENDER"].mode()[0])
    df["NAME_FAMILY_STATUS"] = df["NAME_FAMILY_STATUS"].replace(
        "Unknown", df["NAME_FAMILY_STATUS"].mode()[0]
    )

    # EXT_SOURCE_* and YEARS_EMPLOYED keep NaN -> Missing bin in WOE binning
    return df


if __name__ == "__main__":
    df = load_dataset()
    print(f"Rows: {len(df)}, bad rate: {df[TARGET_COL].mean():.4f}")
    print(df.isna().sum())
