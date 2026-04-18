// hooks/useToast.ts
import { useState, useCallback, useEffect } from 'react';
import type { ToastType } from '../components/common/Toast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let globalAddToast: ((message: string, type: ToastType) => void) | null = null;

export function useToastProvider() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Регистрируем глобальную функцию в useEffect — это безопасно
  useEffect(() => {
    globalAddToast = addToast;

    // Очистка при размонтировании провайдера
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  return { toasts, addToast, removeToast };
}

export const toast = {
  success: (message: string) => globalAddToast?.(message, 'success'),
  error: (message: string) => globalAddToast?.(message, 'error'),
  info: (message: string) => globalAddToast?.(message, 'info'),
  warning: (message: string) => globalAddToast?.(message, 'warning'),
};