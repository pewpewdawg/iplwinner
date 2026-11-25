"""Train the IPL win-probability model.

Run from anywhere:  python backend/train_model.py
Outputs: backend/model.json (XGBoost) and backend/meta.json (encodings).
"""
import json
import os

import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

from names import norm_team, norm_venue

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "dataset", "matches.csv")

df = pd.read_csv(DATA)
df = df[["team1", "team2", "venue", "toss_winner", "toss_decision", "winner"]].dropna()

for col in ["team1", "team2", "toss_winner", "winner"]:
    df[col] = df[col].map(norm_team)
df["venue"] = df["venue"].map(norm_venue)

teams = sorted(set(df.team1) | set(df.team2))
venues = sorted(set(df.venue))
team_id = {t: i for i, t in enumerate(teams)}
venue_id = {v: i for i, v in enumerate(venues)}


def features(t1, t2, venue, toss_winner, toss_decision):
    """Feature row from the point of view of t1 (t1 = 'our' team)."""
    return [
        team_id[t1],
        team_id[t2],
        venue_id[venue],
        int(toss_winner == t1),
        int(toss_decision == "bat"),
    ]


def build(frame, swap=False):
    X, y = [], []
    for r in frame.itertuples():
        a, b = (r.team2, r.team1) if swap else (r.team1, r.team2)
        X.append(features(a, b, r.venue, r.toss_winner, r.toss_decision))
        y.append(int(r.winner == a))
    return X, y


train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

# Train on both orderings so the model has no "team1" position bias.
X1, y1 = build(train_df)
X2, y2 = build(train_df, swap=True)
Xt, yt = build(test_df)

model = XGBClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=4,
    subsample=0.9,
    colsample_bytree=0.9,
    eval_metric="logloss",
)
model.fit(X1 + X2, y1 + y2)

pred = model.predict(Xt)
print("Test accuracy:", round(accuracy_score(yt, pred), 4))
print("Baseline (always team1):", round(sum(yt) / len(yt), 4))

# Final model on all data
Xa, ya = build(df)
Xb, yb = build(df, swap=True)
model.fit(Xa + Xb, ya + yb)

model.save_model(os.path.join(HERE, "model.json"))
with open(os.path.join(HERE, "meta.json"), "w") as f:
    json.dump({"teams": teams, "venues": venues}, f, indent=2)
print(f"Saved model.json + meta.json ({len(teams)} teams, {len(venues)} venues)")
