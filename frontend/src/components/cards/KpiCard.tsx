// components/cards/KpiCard.tsx
interface KpiCardProps {
  title: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}

export default function KpiCard({ title, value, color = 'text-gray-100', icon }: KpiCardProps) {
  return (
    <div className="bg-[#0f172a] rounded-lg shadow p-4 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className={`text-2xl font-semibold ${color}`}>{value}</p>
        </div>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
    </div>
  );
}