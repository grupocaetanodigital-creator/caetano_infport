import React, { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registrarPwaServiceWorker } from './services/offlineStorageService';
import { inicializarAcessibilidadeFonte } from './services/fontScaleService';
import { inicializarMotorSincronizacaoOffline } from './services/offlineSyncEngine';

// Blindagem global contra ReferenceError em escopos legados ou chamadas sem escopo
if (typeof window !== 'undefined') {
  (window as any).idCondominioAtivo = '';
}

// Inicializações com tratamento defensivo para garantir inicialização limpa no iframe
try {
  inicializarAcessibilidadeFonte();
} catch (e) {
  console.warn('[INFPORT] Acessibilidade inicializada com valores padrão:', e);
}

try {
  inicializarMotorSincronizacaoOffline();
} catch (e) {
  console.warn('[INFPORT] Motor offline operando em modo básico:', e);
}

try {
  registrarPwaServiceWorker();
} catch (e) {
  console.warn('[INFPORT] PWA Service Worker ignorado em dev:', e);
}

// Error Boundary de alta resiliência para que a tela NUNCA fique em branco
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SafeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[INFPORT Runtime Error]:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('infport_sessao_ativa_v1');
    } catch {}
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #334155',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
              Recuperação do Sistema INFPORT
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.5' }}>
              Ocorreu uma exceção no carregamento da tela:
            </p>
            <div style={{
              backgroundColor: '#0f172a',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#fca5a5',
              marginBottom: '20px',
              overflowX: 'auto',
              wordBreak: 'break-all'
            }}>
              {this.state.error?.message || 'Erro desconhecido de execução'}
            </div>
            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontWeight: 'bold',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reiniciar Sessão e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <SafeErrorBoundary>
        <App />
      </SafeErrorBoundary>
    </StrictMode>
  );
}
