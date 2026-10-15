/**
 * Serviço de Gerenciamento do Modo de Alto Contraste / Visibilidade para Guarita
 * INFPORT 1.0
 * 
 * Permite alternar entre o Modo Escuro Padrão do sistema e o Modo Alto Contraste,
 * otimizado para ambientes de portaria com forte iluminação artificial ou reflexo solar.
 */

const CHAVE_STORAGE_CONTRASTE = 'infport_modo_alto_contraste';

/**
 * Retorna se o modo de alto contraste está ativado
 */
export function obterModoAltoContraste(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CHAVE_STORAGE_CONTRASTE) === 'true';
  } catch {
    return false;
  }
}

/**
 * Aplica a classe global 'alto-contraste' na tag <html> e persiste a preferência
 */
export function aplicarModoAltoContraste(ativo: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    if (ativo) {
      document.documentElement.classList.add('alto-contraste');
      document.body.classList.add('alto-contraste');
    } else {
      document.documentElement.classList.remove('alto-contraste');
      document.body.classList.remove('alto-contraste');
    }

    localStorage.setItem(CHAVE_STORAGE_CONTRASTE, ativo ? 'true' : 'false');

    // Notifica componentes na interface para re-renderização imediata
    window.dispatchEvent(
      new CustomEvent('infport_contraste_alterado', {
        detail: { altoContraste: ativo }
      })
    );
  } catch (err) {
    console.warn('[Acessibilidade] Erro ao aplicar modo de contraste:', err);
  }
}

/**
 * Alterna entre o modo escuro padrão e o modo alto contraste
 */
export function alternarModoAltoContraste(): boolean {
  const novoEstado = !obterModoAltoContraste();
  aplicarModoAltoContraste(novoEstado);
  return novoEstado;
}

/**
 * Inicializa a classe na inicialização do aplicativo
 */
export function inicializarModoContraste(): void {
  const ativo = obterModoAltoContraste();
  aplicarModoAltoContraste(ativo);
}
