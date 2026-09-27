import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registrarPwaServiceWorker } from './services/offlineStorageService';
import { inicializarAcessibilidadeFonte } from './services/fontScaleService';

// Inicializa a escala de acessibilidade de fontes salva no navegador
inicializarAcessibilidadeFonte();

// Registra o Service Worker do PWA para cache offline da portaria
registrarPwaServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

