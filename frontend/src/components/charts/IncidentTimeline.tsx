import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type Point = {
  day: number;
  value: number;
};

type Props = {
  data: Point[];
};

export const ThreatLineChart = ({ data }: Props) => {

  return (

    <div className="chart-card">

      <h3>Динамика риска</h3>

      <ResponsiveContainer width="100%" height={280}>

        <LineChart data={data}>

          <XAxis dataKey="day" />

          <YAxis />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="value"
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  );
};