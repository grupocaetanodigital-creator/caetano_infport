import { supabase } from './supabase';
import { registrarAtividade } from './auditoriaService';

export interface LembretePortaria {
  id: string;
  condominio_id: string;
  unidade_bloco: string; // Ex: "Apto 102 - Bloco B"
  remetente_tipo: 'morador' | 'portaria' | 'supervisao' | 'sindico';
  remetente_nome?: string;
  mensagem: string;
  tipo: 'Palavra-chave' | 'Instrução' | 'Aviso Geral' | 'Correspondência Urgente' | 'Autorização' | string;
  lido: boolean;
  lido_em?: string | null;
  lido_por_nome?: string | null;
  lido_por_id?: string | null;
  created_at: string;
  updated_at?: string;
}

const CACHE_PREFIX = 'infport_lembretes_cache_';
const SOUND_ENABLED_KEY = 'infport_lembretes_sound_enabled';

/**
 * Retorna se o alerta sonoro para novos recados está habilitado
 */
export function isSomHabilitado(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val === 'true';
}

/**
 * Salva preferência do alerta sonoro
 */
export function setSomHabilitado(habilitado: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SOUND_ENABLED_KEY, String(habilitado));
  }
}

/**
 * Dispara um bip suave e agradável usando Web Audio API (não depende de MP3 externo)
 */
export function reproduzirSinalSonoroAviso(): void {
  if (typeof window === 'undefined' || !isSomHabilitado()) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const agora = ctx.currentTime;

    // Primeiro tom suave (659Hz - E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, agora);
    gain1.gain.setValueAtTime(0.12, agora);
    gain1.gain.exponentialRampToValueAtTime(0.001, agora + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(agora);
    osc1.stop(agora + 0.22);

    // Segundo tom harmônico (880Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, agora + 0.12);
    gain2.gain.setValueAtTime(0.15, agora + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, agora + 0.40);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(agora + 0.12);
    osc2.stop(agora + 0.40);
  } catch {
    // Silencia erros de permissão de autoplay no navegador
  }
}

/**
 * Dispara evento global para que o cabeçalho e componentes sincronizem imediatamente
 */
export function notificarAtualizacaoLembretes(condominioId?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('lembretes_portaria_atualizados', {
        detail: { condominioId, timestamp: Date.now() }
      })
    );
  }
}

/**
 * Cache local persistente para uso offline ou enquanto o banco ainda não recebeu a migration
 */
function obterLembretesCache(condominioId: string): LembretePortaria[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${condominioId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function salvarLembretesCache(condominioId: string, lembretes: LembretePortaria[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${CACHE_PREFIX}${condominioId}`, JSON.stringify(lembretes));
  } catch (err) {
    console.warn('Erro ao salvar cache de lembretes:', err);
  }
}

/**
 * Fornece dados iniciais demonstrativos quando não há registros no cache nem no banco
 */
function gerarExemplosIniciais(condominioId: string): LembretePortaria[] {
  const agora = new Date();
  return [
    {
      id: 'demo-lembrete-1',
      condominio_id: condominioId,
      unidade_bloco: 'Apto 102 - Bloco B',
      remetente_tipo: 'morador',
      remetente_nome: 'Carlos Eduardo (Morador)',
      mensagem: 'Palavra-chave para entrega da Smart TV: "AZUL2026". Só liberar se o entregador souber a senha.',
      tipo: 'Palavra-chave',
      lido: false,
      created_at: new Date(agora.getTime() - 25 * 60000).toISOString()
    },
    {
      id: 'demo-lembrete-2',
      condominio_id: condominioId,
      unidade_bloco: 'Apto 504 - Torre A',
      remetente_tipo: 'morador',
      remetente_nome: 'Dra. Mariana Costa (Moradora)',
      mensagem: 'Instrução: Minha mãe virá buscar a chave reserva às 16h30. Ela está com RG com final 448-X.',
      tipo: 'Instrução',
      lido: false,
      created_at: new Date(agora.getTime() - 50 * 60000).toISOString()
    },
    {
      id: 'demo-lembrete-3',
      condominio_id: condominioId,
      unidade_bloco: 'Geral / Guarita',
      remetente_tipo: 'portaria',
      remetente_nome: 'Supervisão Operacional',
      mensagem: 'Aviso Geral: Manutenção preventiva do gerador de energia e portão de pedestres agendada para as 14h.',
      tipo: 'Aviso Geral',
      lido: true,
      lido_em: new Date(agora.getTime() - 120 * 60000).toISOString(),
      lido_por_nome: 'Caetano (Operador)',
      created_at: new Date(agora.getTime() - 180 * 60000).toISOString()
    }
  ];
}

/**
 * Busca a lista de lembretes do condomínio em ordem decrescente (mais recentes no topo)
 */
export async function buscarLembretes(condominioId: string): Promise<{
  lembretes: LembretePortaria[];
  tabelaExisteNoSupabase: boolean;
  erro?: string;
}> {
  if (!condominioId) {
    return { lembretes: [], tabelaExisteNoSupabase: true };
  }

  try {
    const { data, error } = await supabase
      .from('lembretes_portaria')
      .select('*')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false });

    if (error) {
      // Se a tabela ainda não foi criada no banco (PGRST205 / 404 / 42P01)
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist')
      ) {
        let emCache = obterLembretesCache(condominioId);
        if (emCache.length === 0) {
          emCache = gerarExemplosIniciais(condominioId);
          salvarLembretesCache(condominioId, emCache);
        }
        return {
          lembretes: emCache,
          tabelaExisteNoSupabase: false,
          erro: 'A tabela "lembretes_portaria" ainda precisa ser criada no Supabase SQL Editor.'
        };
      }

      // Outro erro de rede / timeout: fallback para cache local
      const emCache = obterLembretesCache(condominioId);
      return {
        lembretes: emCache,
        tabelaExisteNoSupabase: true,
        erro: error.message
      };
    }

    const lista = (data as LembretePortaria[]) || [];
    salvarLembretesCache(condominioId, lista);

    return {
      lembretes: lista,
      tabelaExisteNoSupabase: true
    };
  } catch (err: any) {
    const emCache = obterLembretesCache(condominioId);
    return {
      lembretes: emCache,
      tabelaExisteNoSupabase: false,
      erro: err?.message || 'Falha de conexão com o banco de dados.'
    };
  }
}

/**
 * Conta a quantidade de lembretes pendentes (não lidos)
 */
export function contarNaoLidos(lembretes: LembretePortaria[]): number {
  return lembretes.filter((l) => !l.lido).length;
}

/**
 * Marca um lembrete como lido / ciente
 */
export async function marcarComoLido(
  id: string,
  condominioId: string,
  operadorNome?: string,
  operadorId?: string
): Promise<{ sucesso: boolean; erro?: string }> {
  const agora = new Date().toISOString();
  const nome = operadorNome || 'Operador da Portaria';

  // 1. Atualiza imediatamente o cache local para resposta instantânea na UI
  const cache = obterLembretesCache(condominioId);
  const atualizados = cache.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null
      };
    }
    return item;
  });
  salvarLembretesCache(condominioId, atualizados);
  notificarAtualizacaoLembretes(condominioId);

  // 2. Tenta persistir no Supabase
  try {
    const { error } = await supabase
      .from('lembretes_portaria')
      .update({
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null,
        updated_at: agora
      })
      .eq('id', id);

    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      console.warn('Erro ao atualizar status de leitura no Supabase:', error);
    }

    // Auditoria silenciosa
    registrarAtividade({
      operador_id: operadorId || '',
      operador_nome: nome,
      acao: 'LEMBRETE_CIENTE',
      descricao: `Lembrete ID ${id} marcado como ciente pelo operador ${nome}.`,
      detalhes: { lembreteId: id, acao: 'marcar_lido' },
      modulo: 'lembretes_portaria',
      condominio_id: condominioId
    }).catch(() => {});

    return { sucesso: true };
  } catch (err: any) {
    return { sucesso: true }; // Cache local já garantiu a fluidez
  }
}

/**
 * Marca TODOS os lembretes do condomínio como cientes / lidos de uma vez
 */
export async function marcarTodosComoLidos(
  condominioId: string,
  operadorNome?: string,
  operadorId?: string
): Promise<{ sucesso: boolean; totalAtualizados: number }> {
  const agora = new Date().toISOString();
  const nome = operadorNome || 'Operador da Portaria';

  const cache = obterLembretesCache(condominioId);
  let total = 0;
  const atualizados = cache.map((item) => {
    if (!item.lido) {
      total++;
      return {
        ...item,
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null
      };
    }
    return item;
  });

  salvarLembretesCache(condominioId, atualizados);
  notificarAtualizacaoLembretes(condominioId);

  try {
    await supabase
      .from('lembretes_portaria')
      .update({
        lido: true,
        lido_em: agora,
        lido_por_nome: nome,
        lido_por_id: operadorId || null,
        updated_at: agora
      })
      .eq('condominio_id', condominioId)
      .eq('lido', false);

    registrarAtividade({
      operador_id: operadorId || '',
      operador_nome: nome,
      acao: 'TODOS_LEMBRETES_LIDOS',
      descricao: `${total} lembretes marcados como lidos de uma só vez pelo operador ${nome}.`,
      detalhes: { totalAtualizados: total },
      modulo: 'lembretes_portaria',
      condominio_id: condominioId
    }).catch(() => {});
  } catch {
    // Falha silenciosa
  }

  return { sucesso: true, totalAtualizados: total };
}

/**
 * Cria um novo lembrete ou recado (seja da Portaria ou lançado para Morador)
 */
export async function criarLembrete(dados: {
  condominio_id: string;
  unidade_bloco: string;
  remetente_tipo: 'morador' | 'portaria' | 'supervisao' | 'sindico';
  remetente_nome?: string;
  mensagem: string;
  tipo: string;
  lido?: boolean;
}): Promise<{ sucesso: boolean; lembrete?: LembretePortaria; erro?: string }> {
  const novo: LembretePortaria = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `lemb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    condominio_id: dados.condominio_id,
    unidade_bloco: dados.unidade_bloco.trim(),
    remetente_tipo: dados.remetente_tipo,
    remetente_nome: dados.remetente_nome?.trim() || (dados.remetente_tipo === 'portaria' ? 'Portaria' : 'Morador'),
    mensagem: dados.mensagem.trim(),
    tipo: dados.tipo || 'Aviso Geral',
    lido: Boolean(dados.lido),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Salva no cache local
  const cache = obterLembretesCache(dados.condominio_id);
  const novaLista = [novo, ...cache];
  salvarLembretesCache(dados.condominio_id, novaLista);
  notificarAtualizacaoLembretes(dados.condominio_id);

  // 2. Persiste no Supabase
  try {
    const { error } = await supabase.from('lembretes_portaria').insert([novo]);
    if (error && error.code !== 'PGRST205' && error.code !== '42P01') {
      console.warn('Erro ao inserir lembrete no Supabase:', error);
    }
  } catch (err: any) {
    console.warn('Falha ao conectar com Supabase no insert:', err);
  }

  return { sucesso: true, lembrete: novo };
}

/**
 * Exclui um lembrete do banco e do cache
 */
export async function excluirLembrete(
  id: string,
  condominioId: string
): Promise<{ sucesso: boolean }> {
  const cache = obterLembretesCache(condominioId);
  const filtrados = cache.filter((item) => item.id !== id);
  salvarLembretesCache(condominioId, filtrados);
  notificarAtualizacaoLembretes(condominioId);

  try {
    await supabase.from('lembretes_portaria').delete().eq('id', id);
  } catch {
    // Silencia erro
  }

  return { sucesso: true };
}
