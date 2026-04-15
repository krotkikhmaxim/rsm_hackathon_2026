"""
ML Service for cyber threat prediction.
Loads 48 CatBoost models at startup, serves predictions via /internal/predict.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

from src.loader import get_artifacts
from src.inference import predict_for_date
from src.reporting import generate_markdown_report


_artifacts = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _artifacts
    print("[ML Service] Loading models...")
    _artifacts = get_artifacts()
    print("[ML Service] Ready")
    yield


app = FastAPI(
    title="CyberPredictor ML Service",
    description="Internal ML service for cyber threat prediction (48 CatBoost models)",
    version="2.0.0",
    lifespan=lifespan,
)


class InternalPredictRequest(BaseModel):
    date: str                       # YYYY-MM-DD
    horizon: str = "7d"             # "24h" or "7d"
    enterprise_type: Optional[str] = None
    region: Optional[str] = None
    host_count: Optional[int] = None


class ThreatResult(BaseModel):
    infrastructure_cluster: str
    threat_cluster: int
    threatname: str
    probability: float
    description: str
    recommendation: str


class InternalPredictResponse(BaseModel):
    date: str
    horizon: str
    top_threat: ThreatResult
    all_threats: list[ThreatResult]
    report_md: str


@app.post("/internal/predict", response_model=InternalPredictResponse)
async def internal_predict(request: InternalPredictRequest):
    if _artifacts is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet")

    if request.horizon not in ("24h", "7d"):
        raise HTTPException(status_code=400, detail=f"Invalid horizon: {request.horizon}. Use '24h' or '7d'.")

    try:
        result = predict_for_date(
            target_date=request.date,
            horizon=request.horizon,
            artifacts=_artifacts,
        )
    except Exception as e:
        print(f"[ML Error] predict_for_date failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    if result is None:
        raise HTTPException(status_code=500, detail="No predictions generated (no models matched)")

    report_md = generate_markdown_report(result)

    return InternalPredictResponse(
        date=str(result["date"].strftime("%Y-%m-%d")),
        horizon=result["horizon"],
        top_threat=ThreatResult(**result["topthreat"]),
        all_threats=[ThreatResult(**t) for t in result["allthreats"]],
        report_md=report_md,
    )


@app.get("/health")
async def health_check():
    if _artifacts is None:
        return {"status": "loading", "models_loaded": 0}

    n_24h = len(_artifacts["loaded_models"]["24h"])
    n_7d = len(_artifacts["loaded_models"]["7d"])
    return {
        "status": "ok",
        "models_loaded": n_24h + n_7d,
        "models_24h": n_24h,
        "models_7d": n_7d,
        "data_rows": len(_artifacts["incidents_data"]),
        "infra_clusters": _artifacts["infra_clusters"],
        "threat_clusters": _artifacts["threat_clusters"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, workers=1, reload=True)
