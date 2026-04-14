import React from 'react';
// import { Provider } from 'react-redux';
// import { store } from './store'; // пока нет store

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  // Пока просто возвращаем children. Позже добавим Provider из redux.
  return <>{children}</>;
};