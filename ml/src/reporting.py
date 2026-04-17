"""
Markdown report generator for cyber threat predictions.
Ported from mvp/app/reporting.py.
"""

import pandas as pd


def generate_markdown_report(prediction_result):
    date_str = pd.Timestamp(prediction_result["date"]).strftime("%Y-%m-%d")
    horizon_text = "7 дней" if prediction_result["horizon"] == "7d" else "24 часа"
    top_threat = prediction_result["topthreat"]

    report_lines = [
        "## Отчет по прогнозу угроз",
        "",
        f"- **Дата прогноза:** {date_str}",
        f"- **Горизонт:** {horizon_text}",
        "",
        "### Главная угроза",
        f"- **Тип угрозы:** {top_threat['threatname']}",
        f"- **Вероятность:** {top_threat['probability']:.1%}",
        f"- **Описание:** {top_threat.get('description', '')}",
        f"- **Рекомендация:** {top_threat.get('recommendation', '')}",
        "",
        "### Все угрозы",
    ]

    for threat_row in prediction_result["allthreats"]:
        risk_level = (
            "Высокий" if threat_row["probability"] >= 0.7
            else "Средний" if threat_row["probability"] >= 0.4
            else "Низкий"
        )
        report_lines.append(
            f"- **{threat_row['threatname']}** — {threat_row['probability']:.1%} ({risk_level} риск)"
        )

    report_lines.extend(["", "---", "Сгенерировано на основе сегментных CatBoost-моделей."])
    return "\n".join(report_lines)
