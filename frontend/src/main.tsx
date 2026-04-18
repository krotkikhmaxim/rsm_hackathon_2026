import React from 'react';
import ReactDOM from 'react-dom/client';

import { Provider } from 'react-redux';

import { store } from './store';

import AppRouter from "./App"

import './index.css';

ReactDOM.createRoot(
  document.getElementById('root')!
).render(

  <React.StrictMode>

    <Provider store={store}>

      <AppRouter />

    </Provider>

  </React.StrictMode>

);