// components/layout/PageWrapper.tsx
import type { ReactNode } from 'react';   // ← import type

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export default function PageWrapper({ title, children, actions }: PageWrapperProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">{title}</h2>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}