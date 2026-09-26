/**
 * Serviço de Gerenciamento de Cache Offline e Fallback para a Portaria
 * Garante que em caso de queda de conexão, o operador continue visualizando
 * dados essenciais e consiga navegar normalmente sem travamentos.
 */

const PREFIX_CACHE = 'infport_offline_cache_';

export function salvarCacheLocal<T>(chave: string, dados: T, condominioId: string = 'global'): void {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const payload = {
      timestamp: new Date().toISOString(),
      dados
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn(`[OfflineService] Erro ao persistir cache local para ${chave}:`, e);
  }
}

export function obterCacheLocal<T>(chave: string, condominioId: string = 'global', fallbackDefault: T): T {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dados !== undefined) {
        return parsed.dados as T;
      }
    }
  } catch (e) {
    console.warn(`[OfflineService] Erro ao ler cache local de ${chave}:`, e);
  }
  return fallbackDefault;
}

export function obterDataUltimoCache(chave: string, condominioId: string = 'global'): Date | null {
  try {
    const key = `${PREFIX_CACHE}${chave}_${condominioId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timestamp) {
        return new Date(parsed.timestamp);
      }
    }
  } catch (e) {
    // ignorar
  }
  return null;
}

/**
 * Registra o Service Worker do PWA
 */
export async function registrarPwaServiceWorker(): Promise<void> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      // Import dinâmico do virtual:pwa-register fornecido pelo vite-plugin-pwa
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] Nova versão do INFPORT disponível. Atualizando automaticamente...');
        },
        onOfflineReady() {
          console.log('[PWA] INFPORT pronto para funcionamento offline na portaria!');
        },
        onRegisterError(error: any) {
          console.warn('[PWA] Erro no registro do Service Worker:', error);
        }
      });
    } catch (e) {
      console.warn('[PWA] Falha ao inicializar virtual:pwa-register:', e);
    }
  }
}
