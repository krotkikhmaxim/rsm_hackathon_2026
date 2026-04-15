import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/predict', label: 'Прогноз' },
  { to: '/dashboard', label: 'Дашборд' },
  { to: '/threats', label: 'Каталог угроз' },
  { to: '/recommendations', label: 'Рекомендации' },
  { to: '/vulnerability', label: 'Уязвимости' },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'var(--color-primary)',
        color: '#fff',
        padding: '24px 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 20px 24px', fontSize: '18px', fontWeight: 700 }}>
          Киберугрозы
        </div>
        <nav>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'block',
                padding: '10px 20px',
                color: '#fff',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                textDecoration: 'none',
                fontSize: '14px',
                borderLeft: isActive ? '3px solid #fff' : '3px solid transparent',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
