from datetime import timedelta
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from inference import load_artifacts, predict_for_date
from reporting import generate_markdown_report

project_root = Path(__file__).resolve().parents[1]

st.set_page_config(page_title="Прогноз киберугроз MVP", page_icon="🛡️", layout="wide")
st.title("Прогноз киберугроз MVP")
st.caption("MVP-интерфейс для прогноза киберугроз на 24 часа и 7 дней")


@st.cache_resource
def init_artifacts():
    return load_artifacts(project_root)


try:
    artifacts = init_artifacts()
except Exception as exc:
    st.error(f"Не удалось загрузить артефакты проекта: {exc}")
    st.stop()

with st.sidebar:
    st.header("Параметры")
    min_date = pd.Timestamp(artifacts["incidents_data"]["date"].min()).date()
    max_date = pd.Timestamp(artifacts["incidents_data"]["date"].max()).date()
    selected_date = st.date_input(
        "Дата прогноза",
        value=max_date,
        min_value=min_date,
        max_value=max_date + timedelta(days=30),
    )

    col_24h, col_7d = st.columns(2)
    with col_24h:
        predict_24h = st.button("24h", use_container_width=True, type="primary")
    with col_7d:
        predict_7d = st.button("7d", use_container_width=True)

    st.markdown("---")
    st.write(f"Инфра-кластеры: {len(artifacts['infra_clusters'])}")
    st.write(f"Кластеры угроз: {len(artifacts['threat_clusters'])}")

if predict_24h or predict_7d:
    horizon = "24h" if predict_24h else "7d"
    prediction_result = predict_for_date(selected_date, horizon, artifacts)

    if prediction_result is None:
        st.warning("Нет доступных моделей для прогноза")
        st.stop()

    top_threat = prediction_result["topthreat"]
    plot_data = pd.DataFrame(prediction_result["allthreats"])

    left_col, right_col = st.columns([1, 1])
    with left_col:
        st.subheader("Главная угроза")
        st.metric("Угроза", top_threat["threatname"])
        st.metric("Вероятность", f"{top_threat['probability']:.1%}")
        st.write(top_threat.get("description", ""))
        if top_threat.get("recommendation"):
            st.info(top_threat["recommendation"])

    with right_col:
        st.subheader("Распределение вероятностей")
        probability_fig = px.bar(
            plot_data,
            x="threatname",
            y="probability",
            color="probability",
            color_continuous_scale="RdYlGn_r",
        )
        probability_fig.update_layout(height=420)
        st.plotly_chart(probability_fig, use_container_width=True)

    report_markdown = generate_markdown_report(prediction_result)
    st.subheader("Отчет")
    st.markdown(report_markdown)
    st.download_button(
        "Скачать .md",
        report_markdown.encode("utf-8"),
        file_name=f"threat_report_{horizon}_{selected_date}.md",
        mime="text/markdown",
    )
else:
    st.info("Выбери дату и запусти прогноз.")
