import { useState } from "react";

export const PredictionPage = () => {

  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handlePredict = () => {

    if (!file) {
      alert("Выберите файл");
      return;
    }

    console.log("Файл:", file.name);

    // позже здесь будет fetch к backend
  };

  return (
    <div className="container">

      <h1>Prediction</h1>

      <div className="card">

        <h2>Upload CSV</h2>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />

        <br /><br />

        <button
          className="button"
          onClick={handlePredict}
        >
          Run prediction
        </button>

      </div>

    </div>
  );
};