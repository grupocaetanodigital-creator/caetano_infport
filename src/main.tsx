import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registrarPwaServiceWorker } from './services/offlineStorageService';
import { inicializarAcessibilidadeFonte } from './services/fontScaleService';
import { inicializarMotorSincronizacaoOffline } from './services/offlineSyncEngine';

// Inicializa a escala de acessibilidade de fontes salva no navegador
inicializarAcessibilidadeFonte();

// Inicializa o motor de sincronização automática e autonomia de 3 horas
inicializarMotorSincronizacaoOffline();

// Registra o Service Worker do PWA para cache offline da portaria
registrarPwaServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

