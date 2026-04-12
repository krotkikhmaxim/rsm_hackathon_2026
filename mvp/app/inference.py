import json
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from catboost import CatBoostClassifier

DEFAULT_FEATURE_COLS = [
    "hosts_log", "day_of_week", "day_of_month", "month", "quarter", "year",
    "is_weekend", "dow_sin", "dow_cos", "month_sin", "month_cos",
    "lag_inc_1d", "laginc2d", "lag_inc_3d", "lag_success_1d", "lag_success_2d",
    "inc_3d_sum", "inc_7d_sum", "inc_30d_sum", "succ_7d_sum", "succ_30d_sum",
    "had_incident_prev_1d", "had_incident_prev_3d", "had_incident_prev_7d",
    "days_since_last_incident", "days_since_last_success",
    "regioninc_7d_sum", "regioninc_30d_sum", "typeinc_7d_sum", "typeinc_30d_sum",
]
DEFAULT_CAT_FEATURES = []
DEFAULT_TARGETS = {"24h": "targetnext24h", "7d": "targetnext7d"}


def get_project_root(base_dir=None):
    return Path(base_dir).resolve() if base_dir else Path(__file__).resolve().parents[1]


def load_json(path: Path, default_value):
    if path.exists():
        with open(path, "r", encoding="utf-8") as file_obj:
            return json.load(file_obj)
    return default_value


def load_model_registry(project_root: Path, model_registry: dict, debug=True):
    def dbg(*args):
        if debug:
            print("[DEBUG]", *args)

    loaded_models = {"24h": {}, "7d": {}}

    dbg("load_model_registry started")
    dbg("project_root =", project_root)

    for horizon in ["24h", "7d"]:
        registry_rows = model_registry.get(horizon, [])
        dbg(f"horizon = {horizon}, items = {len(registry_rows)}")

        for idx, model_meta in enumerate(registry_rows):
            dbg("-" * 80)
            dbg(f"{horizon}[{idx}] raw meta =", model_meta)

            model_path_value = (
                model_meta.get("model_path")
                or model_meta.get("model_file")
                or model_meta.get("modelpath")
                or model_meta.get("modelfile")
            )
            dbg("model_path_value =", model_path_value)

            if not model_path_value:
                dbg("[WARN] Пропуск: отсутствует model_path/model_file/modelpath/modelfile")
                continue

            model_path = project_root / model_path_value
            dbg("model_path =", model_path)
            dbg("model_path exists =", model_path.exists())

            if not model_path.exists():
                dbg(f"[WARN] Пропуск: файл модели не найден: {model_path}")
                continue

            infrastructure_cluster = (
                model_meta.get("infrastructure_cluster")
                or model_meta.get("infrastructurecluster")
            )
            threat_cluster = (
                model_meta.get("threat_cluster")
                or model_meta.get("threatcluster")
            )

            dbg("infrastructure_cluster =", infrastructure_cluster)
            dbg("threat_cluster =", threat_cluster)

            if infrastructure_cluster is None or threat_cluster is None:
                dbg("[WARN] Пропуск: нет ключей infrastructure_cluster/threat_cluster")
                continue

            try:
                model = CatBoostClassifier()
                model.load_model(str(model_path))

                model_key = (str(infrastructure_cluster), int(threat_cluster))
                loaded_models[horizon][model_key] = model

                dbg(f"[OK] Загружена модель: {horizon} {model_key} -> {model_path}")

            except Exception as exc:
                dbg(f"[ERROR] Не удалось загрузить модель {model_path}: {type(exc).__name__}: {exc}")

    dbg("load_model_registry finished")
    dbg("loaded 24h =", len(loaded_models["24h"]))
    dbg("loaded 7d =", len(loaded_models["7d"]))

    return loaded_models


def load_artifacts(base_dir=None, debug=True):
    def dbg(*args):
        if debug:
            print("[DEBUG]", *args)

    project_root = get_project_root(base_dir)
    data_dir = project_root / "data"

    feature_config_path = data_dir / "featureconfig.json"
    cluster_info_path = data_dir / "clusterinfo.json"
    threat_descriptions_path = data_dir / "threatdescriptions.json"
    model_registry_path = data_dir / "model_registry.json"
    incidents_data_path = data_dir / "incidents_data.csv"

    dbg("project_root =", project_root)
    dbg("data_dir =", data_dir)

    if not feature_config_path.exists():
        raise FileNotFoundError(f"Не найден файл конфигурации признаков: {feature_config_path}")

    if not model_registry_path.exists():
        raise FileNotFoundError(
            f"Не найден реестр моделей: {model_registry_path}. "
            f"Создай modelregistry.json или укажи правильное имя файла."
        )

    if not incidents_data_path.exists():
        raise FileNotFoundError(f"Отсутствует файл: {incidents_data_path}")

    feature_config = load_json(
        feature_config_path,
        {
            "featurecols": DEFAULT_FEATURE_COLS,
            "catfeatures": DEFAULT_CAT_FEATURES,
            "targets": DEFAULT_TARGETS,
        },
    )
    cluster_info = load_json(cluster_info_path, {})
    threat_descriptions = load_json(threat_descriptions_path, {})
    model_registry = load_json(model_registry_path, {"24h": [], "7d": []})

    featurecols = feature_config.get("featurecols")
    if not featurecols:
        raise ValueError(
            f"В {feature_config_path} пустой список featurecols. "
            f"Нужно заполнить его актуальными именами признаков."
        )

    incidents_data = pd.read_csv(incidents_data_path)
    dbg("incidents_data shape =", incidents_data.shape)
    dbg("incidents_data columns =", incidents_data.columns.tolist())

    required_columns = ["date", "infrastructure_cluster", "threat_cluster"]
    missing_columns = [col for col in required_columns if col not in incidents_data.columns]
    if missing_columns:
        raise KeyError(f"В incidents_data.csv отсутствуют колонки: {missing_columns}")

    incidents_data["date"] = pd.to_datetime(incidents_data["date"], errors="coerce")
    incidents_data["infrastructure_cluster"] = incidents_data["infrastructure_cluster"].astype(str)
    incidents_data["threat_cluster"] = pd.to_numeric(
        incidents_data["threat_cluster"], errors="coerce"
    ).astype("Int64")

    if incidents_data["date"].isna().all():
        raise ValueError("Колонка date не распарсилась: все значения NaT")

    dbg("model_registry counts =", {
        "24h": len(model_registry.get("24h", [])),
        "7d": len(model_registry.get("7d", [])),
    })

    loaded_models = load_model_registry(project_root, model_registry)

    dbg("loaded_models 24h count =", len(loaded_models["24h"]))
    dbg("loaded_models 7d count =", len(loaded_models["7d"]))

    if len(loaded_models["24h"]) == 0 and len(loaded_models["7d"]) == 0:
        raise RuntimeError(
            "Не загружено ни одной модели. Проверь modelregistry.json и пути к .cbm файлам."
        )

    infra_clusters = sorted(
        incidents_data["infrastructure_cluster"].dropna().astype(str).unique().tolist()
    )
    threat_clusters = sorted(
        incidents_data["threat_cluster"].dropna().astype(int).unique().tolist()
    )

    return {
        "project_root": project_root,
        "incidents_data": incidents_data,
        "featurecols": featurecols,
        "catfeatures": feature_config.get("catfeatures", DEFAULT_CAT_FEATURES),
        "targets": feature_config.get("targets", DEFAULT_TARGETS),
        "clusterinfo": cluster_info,
        "threatdescriptions": threat_descriptions,
        "modelregistry": model_registry,
        "loaded_models": loaded_models,
        "infra_clusters": infra_clusters,
        "threat_clusters": threat_clusters,
    }
    return artifacts


def get_historical_data_for_date(target_date, incidents_data, infrastructure_cluster, threat_cluster, horizon_days=30):
    target_date = pd.Timestamp(target_date)
    start_date = target_date - timedelta(days=horizon_days)
    historical_data = incidents_data[
        (incidents_data["infrastructure_cluster"].astype(str) == str(infrastructure_cluster))
        & (pd.to_numeric(incidents_data["threat_cluster"], errors="coerce") == int(threat_cluster))
        & (incidents_data["date"] >= start_date)
        & (incidents_data["date"] < target_date)
    ].sort_values("date")
    return historical_data.copy()


def get_last_value_or_zero(series, position_from_end):
    if len(series) >= position_from_end:
        return float(series.iloc[-position_from_end])
    return 0.0


def get_days_since_last_positive(recent_data, value_column, target_date):
    if recent_data.empty or value_column not in recent_data.columns:
        return 999.0
    positive_rows = recent_data[recent_data[value_column] > 0]
    if positive_rows.empty:
        return 999.0
    return float((pd.Timestamp(target_date) - positive_rows["date"].max()).days)


def prepare_features_for_prediction(target_date, infrastructure_cluster, threat_cluster, historical_data):
    target_date = pd.Timestamp(target_date)
    recent_data = historical_data.sort_values("date").tail(30).copy()

    incidents_series = recent_data["incidentscountday"] if "incidentscountday" in recent_data.columns else pd.Series(dtype=float)
    success_series = recent_data["successcountday"] if "successcountday" in recent_data.columns else pd.Series(dtype=float)

    features = {
        "date": target_date,
        "infrastructure_cluster": str(infrastructure_cluster),
        "threat_cluster": int(threat_cluster),
        "hosts_log": float(recent_data["hosts_log"].iloc[-1]) if len(recent_data) and "hosts_log" in recent_data.columns else 0.0,
        "day_of_week": int(target_date.day_of_week),
        "day_of_month": int(target_date.day),
        "month": int(target_date.month),
        "quarter": int(target_date.quarter),
        "year": int(target_date.year),
        "is_weekend": int(target_date.day_of_week >= 5),
        "dow_sin": float(np.sin(2 * np.pi * target_date.day_of_week / 7)),
        "dow_cos": float(np.cos(2 * np.pi * target_date.day_of_week / 7)),
        "month_sin": float(np.sin(2 * np.pi * target_date.month / 12)),
        "month_cos": float(np.cos(2 * np.pi * target_date.month / 12)),
        "lag_inc_1d": get_last_value_or_zero(incidents_series, 1),
        "laginc2d": get_last_value_or_zero(incidents_series, 2),
        "lag_inc_3d": get_last_value_or_zero(incidents_series, 3),
        "lag_success_1d": get_last_value_or_zero(success_series, 1),
        "lag_success_2d": get_last_value_or_zero(success_series, 2),
        "inc_3d_sum": float(incidents_series.tail(3).sum()) if len(incidents_series) else 0.0,
        "inc_7d_sum": float(incidents_series.tail(7).sum()) if len(incidents_series) else 0.0,
        "inc_30d_sum": float(incidents_series.sum()) if len(incidents_series) else 0.0,
        "succ_7d_sum": float(success_series.tail(7).sum()) if len(success_series) else 0.0,
        "succ_30d_sum": float(success_series.sum()) if len(success_series) else 0.0,
        "had_incident_prev_1d": int(get_last_value_or_zero(incidents_series, 1) > 0),
        "had_incident_prev_3d": int(float(incidents_series.tail(3).sum()) > 0) if len(incidents_series) else 0,
        "had_incident_prev_7d": int(float(incidents_series.tail(7).sum()) > 0) if len(incidents_series) else 0,
        "days_since_last_incident": get_days_since_last_positive(recent_data, "incidentscountday", target_date),
        "days_since_last_success": get_days_since_last_positive(recent_data, "successcountday", target_date),
        "regioninc_7d_sum": float(recent_data["regioninc_7d_sum"].iloc[-1]) if len(recent_data) and "regioninc_7d_sum" in recent_data.columns else 0.0,
        "regioninc_30d_sum": float(recent_data["regioninc_30d_sum"].iloc[-1]) if len(recent_data) and "regioninc_30d_sum" in recent_data.columns else 0.0,
        "typeinc_7d_sum": float(recent_data["typeinc_7d_sum"].iloc[-1]) if len(recent_data) and "typeinc_7d_sum" in recent_data.columns else 0.0,
        "typeinc_30d_sum": float(recent_data["typeinc_30d_sum"].iloc[-1]) if len(recent_data) and "typeinc_30d_sum" in recent_data.columns else 0.0,
    }
    return features


def predict_for_date(target_date, horizon, artifacts):
    incidents_data = artifacts["incidents_data"]
    loaded_models = artifacts["loaded_models"][horizon]
    featurecols = artifacts["featurecols"]
    threat_descriptions = artifacts["threatdescriptions"]
    all_predictions = []

    for infrastructure_cluster in artifacts["infra_clusters"]:
        for threat_cluster in artifacts["threat_clusters"]:
            model_key = (str(infrastructure_cluster), int(threat_cluster))
            if model_key not in loaded_models:
                continue

            historical_data = get_historical_data_for_date(
                target_date=target_date,
                incidents_data=incidents_data,
                infrastructure_cluster=infrastructure_cluster,
                threat_cluster=threat_cluster,
            )
            features = prepare_features_for_prediction(
                target_date=target_date,
                infrastructure_cluster=infrastructure_cluster,
                threat_cluster=threat_cluster,
                historical_data=historical_data,
            )
            model = loaded_models[model_key]
            model_feature_names = list(model.feature_names_)

            x_pred = pd.DataFrame([features])

            for col in model_feature_names:
                if col not in x_pred.columns:
                    x_pred[col] = np.nan

            x_pred = x_pred[model_feature_names].copy()

            for idx in model.get_cat_feature_indices():
                col = model_feature_names[idx]
                x_pred[col] = x_pred[col].astype(str).fillna("")

            for col in x_pred.columns:
                if col not in [model_feature_names[idx] for idx in model.get_cat_feature_indices()]:
                    x_pred[col] = pd.to_numeric(x_pred[col], errors="coerce").fillna(0)

            probability = float(model.predict_proba(x_pred)[0, 1])
            threat_meta = threat_descriptions.get(str(threat_cluster), {})

            all_predictions.append({
                "infrastructure_cluster": str(infrastructure_cluster),
                "threat_cluster": int(threat_cluster),
                "threatname": threat_meta.get("name", f"Threat {threat_cluster}"),
                "probability": probability,
                "description": threat_meta.get("description", ""),
                "recommendation": threat_meta.get("recommendation", ""),
            })

    if not all_predictions:
        return None

    aggregated_predictions = {}
    for prediction_row in all_predictions:
        threat_cluster = prediction_row["threat_cluster"]
        aggregated_predictions.setdefault(threat_cluster, {**prediction_row, "probabilities": []})
        aggregated_predictions[threat_cluster]["probabilities"].append(prediction_row["probability"])

    all_threats = []
    for _, prediction_row in aggregated_predictions.items():
        row = dict(prediction_row)
        row["probability"] = float(np.mean(row.pop("probabilities")))
        all_threats.append(row)

    all_threats.sort(key=lambda row: row["probability"], reverse=True)

    return {
        "date": pd.Timestamp(target_date),
        "horizon": horizon,
        "topthreat": all_threats[0],
        "allthreats": all_threats,
    }
