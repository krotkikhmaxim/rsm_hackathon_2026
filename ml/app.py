from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import random

app = FastAPI(
    title="CyberPredictor",
    description="Сервис для прогнозирования киберугроз",
    version="1.0.0"
)

class PredictRequest(BaseModel):
    enterprise_type: str
    host_count: int
    region: str
    hour: int
    day_of_week: int
    month: int

class PredictResponse(BaseModel):
    will_happen: bool
    probability: float
    attack_time: str
    threat_code: str
    target_object: str
    vulnerability_level: str
    shap_values: List[Dict[str, Any]]

class CyberModelSuiteMock:
    def predict_all(self, data: PredictRequest) -> dict:
        base_prob = 0.2
        if data.host_count > 500:
            base_prob += 0.3
        if data.hour in [2, 3, 4]:
            base_prob += 0.2
            
        prob = min(base_prob + random.uniform(-0.1, 0.1), 0.99)
        shap_explanations = [
            {"feature": "host_count", "impact": round(prob * 0.6, 2), "description": "Большой размер инфраструктуры увеличивает поверхность атаки"},
            {"feature": "hour", "impact": round(prob * 0.3, 2), "description": "Ночное время снижает скорость реакции ИБ-отдела"}
        ]

        return {
            "will_happen": prob > 0.5,
            "probability": round(prob, 2),
            "attack_time": "night_shift", 
            "threat_code": "УБИ.190",      
            "target_object": "Сервер БД", 
            "vulnerability_level": "Высокий" if prob > 0.7 else "Средний",
            "shap_values": shap_explanations
        }

model_suite = CyberModelSuiteMock()

@app.post("/predict", response_model=PredictResponse)
async def make_prediction(request: PredictRequest):
    try:
        result = model_suite.predict_all(request)
        return result
    except Exception as e:
        print(f"[ML Error]: {str(e)}")
        raise HTTPException(status_code=500, detail="Ошибка при генерации прогноза")
@app.get("/health")
async def health_check():
    return {"status": "ok", "models_loaded": 6}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)