// components/common/EmptyState.tsx
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  title = 'Нет данных',
  message = 'По вашему запросу ничего не найдено',
  icon = '📭',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-200 mb-1">{title}</h3>
      <p className="text-gray-400 text-center max-w-md">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}