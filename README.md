# IPL Winner Predictor

Flask + XGBoost app. Flask serves both the API and the frontend, so there is one service to deploy.

## Run locally
    pip install -r backend/requirements.txt
    python backend/app.py            # http://localhost:5000

## Retrain the model (optional)
    pip install -r backend/requirements-train.txt
    python backend/train_model.py    # rewrites backend/model.json + meta.json

## Deploy (Render)
1. Push this repo to GitHub.
2. Render -> New -> Blueprint (it reads `render.yaml`), or New Web Service with:
   - Build: `pip install -r backend/requirements.txt`
   - Start: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
3. Optional: add env var `CRICAPI_KEY` for the live-score panel.

`Procfile` is included for Heroku/Railway-style platforms.
