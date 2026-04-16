import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type Threat = {
  name: string;
  probability: number;
};

type Props = {
  data: Threat[];
};

export const ThreatChart = ({ data }: Props) => {

  return (

    <div className="chart-card">

      <h3>Вероятности угроз</h3>

      <ResponsiveContainer width="100%" height={250}>

        <BarChart data={data}>

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="probability"
            radius={[6, 6, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>

  );
};