// components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Дашборд', icon: '📊' },
  { to: '/predict', label: 'Прогноз', icon: '🔮' },
  { to: '/vulnerability', label: 'Уязвимости', icon: '🛡️' },
  { to: '/recommendations', label: 'Рекомендации', icon: '📋' },
  { to: '/threats', label: 'Угрозы ФСТЭК', icon: '⚠️' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#0f172a] border-r border-white/10 min-h-screen">
      <div className="p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}