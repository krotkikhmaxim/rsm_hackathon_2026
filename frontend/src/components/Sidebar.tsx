export const Sidebar = () => {
  return (
    <div>

      <h3>Параметры</h3>

      <label>
        Дата прогноза
      </label>

      <input type="date" />

      <br /><br />

      <button>
        24h
      </button>

      <button>
        7d
      </button>

      <hr />

      <p>Кластеры: 4</p>
      <p>Угрозы: 6</p>

    </div>
  );
};