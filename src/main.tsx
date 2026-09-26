import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registrarPwaServiceWorker } from './services/offlineStorageService';

// Registra o Service Worker do PWA para cache offline da portaria
registrarPwaServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
