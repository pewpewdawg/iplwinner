import json
import os

import numpy as np
import requests
from flask import Flask, jsonify, request, send_from_directory
import xgboost as xgb

from names import norm_team, norm_venue

HERE = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.abspath(os.path.join(HERE, "..", "frontend"))

app = Flask(__name__, static_folder=FRONTEND, static_url_path="")

# ---- Load model + encodings (no pickle, so no library-version issues) ----
model = xgb.Booster()
model.load_model(os.path.join(HERE, "model.json"))
with open(os.path.join(HERE, "meta.json")) as f:
    META = json.load(f)
TEAM_ID = {t: i for i, t in enumerate(META["teams"])}
VENUE_ID = {v: i for i, v in enumerate(META["venues"])}

# Set this in your hosting dashboard, never commit it.
CRICAPI_KEY = os.environ.get("CRICAPI_KEY", "")


def row(t1, t2, venue, toss_winner, toss_decision):
    return [
        TEAM_ID[t1],
        TEAM_ID[t2],
        VENUE_ID[venue],
        int(toss_winner == t1),
        int(toss_decision == "bat"),
    ]


# ---- Frontend ----
@app.route("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


# ---- API ----
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/venues")
def venues():
    return jsonify({"venues": META["venues"]})


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    try:
        team1 = norm_team(data["team1"])
        team2 = norm_team(data["team2"])
        venue = norm_venue(data["venue"])
        toss_winner = norm_team(data["toss_winner"])
        toss_decision = str(data["toss_decision"]).lower()
    except KeyError as e:
        return jsonify({"error": f"Missing field: {e.args[0]}"}), 400

    if team1 == team2:
        return jsonify({"error": "Teams must be different."}), 400
    for name, label in ((team1, "team1"), (team2, "team2")):
        if name not in TEAM_ID:
            return jsonify({"error": f"Unknown {label}: {name}"}), 400
    if venue not in VENUE_ID:
        return jsonify({"error": f"Unknown venue: {venue}"}), 400
    if toss_winner not in (team1, team2):
        return jsonify({"error": "Toss winner must be one of the two teams."}), 400
    if toss_decision not in ("bat", "field"):
        return jsonify({"error": "toss_decision must be 'bat' or 'field'."}), 400

    # Average both orderings so the result doesn't depend on who is "team1".
    X = np.array([
        row(team1, team2, venue, toss_winner, toss_decision),
        row(team2, team1, venue, toss_winner, toss_decision),
    ])
    p = model.predict(xgb.DMatrix(X))
    team1_prob = float((p[0] + (1 - p[1])) / 2)
    team2_prob = 1 - team1_prob

    winner = team1 if team1_prob >= 0.5 else team2
    return jsonify({
        "predicted_winner": winner,
        "confidence": round(max(team1_prob, team2_prob) * 100, 2),
        "team1_prob": round(team1_prob * 100, 2),
        "team2_prob": round(team2_prob * 100, 2),
    })


@app.route("/api/live-score")
def live_score():
    if not CRICAPI_KEY:
        return jsonify({"error": "CRICAPI_KEY is not configured on the server."}), 503
    try:
        res = requests.get(
            "https://api.cricapi.com/v1/currentMatches",
            params={"apikey": CRICAPI_KEY, "offset": 0},
            timeout=10,
        )
        res.raise_for_status()
        return jsonify(res.json())
    except requests.RequestException:
        return jsonify({"error": "Live score provider unavailable."}), 502


if __name__ == "__main__":
    # Local dev only. In production gunicorn imports `app`.
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
