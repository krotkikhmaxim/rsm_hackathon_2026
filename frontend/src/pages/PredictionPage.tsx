import { useState } from "react";

type PredictionResult = {
  threat: string;
  probability: number;
};


export const PredictionPage = () => {

  const [days, setDays] = useState(7);

  const [result, setResult] =
    useState<PredictionResult | null>(null);

  const handlePredict = () => {

    const probability =
      Math.min(0.4 + days * 0.01, 0.9);

    const mockResult: PredictionResult = {
      threat: "Malware",
      probability
    };

    setResult(mockResult);
  };

  return (

    <div className="page">

      <h1>Прогноз угроз</h1>

      <div className="slider-block">

        <label>
          Диапазон прогноза:
          <b> {days} дней</b>
        </label>

        <input
          type="range"
          min="1"
          max="30"
          value={days}

          onChange={(e) =>
            setDays(Number(e.target.value))
          }
        />

      </div>

      <button
        className="predict-button"
        onClick={handlePredict}
      >
        Сделать прогноз
      </button>

      {result && (

        <div className="result-card">

          <h2>Главная угроза</h2>

          <p>{result.threat}</p>

          <p>
            {(result.probability * 100).toFixed(1)}%
          </p>

        </div>

      )}

    </div>
  );
};