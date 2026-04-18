import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from "recharts";

import type { Threat } from '../../types/threat';

type Props = {
  data: Threat[];
};

export const RegionBarChart = ({ data }: Props) => {

  return (

    <div className="chart-card">

      <h3>Вероятности угроз</h3>

      <ResponsiveContainer width="100%" height={280}>

        <BarChart data={data}>

          <XAxis dataKey="name" />

          <YAxis />

          <Tooltip />

          <Bar
            dataKey="probability"
            radius={[8, 8, 0, 0]}
          />

        </BarChart>

      </ResponsiveContainer>

    </div>

  );
};