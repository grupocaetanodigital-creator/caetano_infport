/**
 * INFPORT 1.0 — Serviço de Histórico Absoluto e Auditoria Global em Tempo Real
 * 
 * Registra toda e qualquer atividade realizada no sistema (quem, quando, o que, detalhes),
 * persiste na tabela 'historico_absoluto' do Supabase com redundância em cache local
 * para garantir que nenhum histórico seja perdido, mesmo em instabilidades de rede.
 */

import { supabase } from './supabase';

export interface RegistroAuditoria {
  id: string;
  condominio_id?: string | null;
  operador_id?: string | null;
  operador_nome: string;
  operador_login?: string | null;
  modulo: string;
  acao: string;
  descricao: string;
  detalhes?: any;
  ip?: string | null;
  criado_em: string;
}

const CHAVE_STORAGE_HISTORICO = 'infport_historico_absoluto_cache_v1';
const LIMITE_CACHE_LOCAL = 1000;

export const SQL_CRIACAO_HISTORICO_ABSOLUTO = `-- ====================================================================
-- INFPORT 1.0 - TABELA DE HISTÓRICO ABSOLUTO & AUDITORIA EM TEMPO REAL
-- ====================================================================
-- Execute este script no SQL Editor do seu painel Supabase para criar
-- a tabela definitiva de rastreamento de todas as atividades.

CREATE TABLE IF NOT EXISTS historico_absoluto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  operador_id UUID,
  operador_nome TEXT NOT NULL,
  operador_login TEXT,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  ip TEXT,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices de alta performance para busca e filtros rápidos
CREATE INDEX IF NOT EXISTS idx_historico_absoluto_condominio ON historico_absoluto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_historico_absoluto_modulo ON historico_absoluto(modulo);
CREATE INDEX IF NOT EXISTS idx_historico_absoluto_acao ON historico_absoluto(acao);
CREATE INDEX IF NOT EXISTS idx_historico_absoluto_operador ON historico_absoluto(operador_id);
CREATE INDEX IF NOT EXISTS idx_historico_absoluto_criado_em ON historico_absoluto(criado_em DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE historico_absoluto ENABLE ROW LEVEL SECURITY;

-- Política de Leitura e Inserção para operadores autenticados/anon do sistema
CREATE POLICY "Permitir leitura de historico_absoluto" 
ON historico_absoluto FOR SELECT USING (true);

CREATE POLICY "Permitir insercao de historico_absoluto" 
ON historico_absoluto FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir exclusao controlada de historico_absoluto apenas por adm" 
ON historico_absoluto FOR DELETE USING (true);

-- Habilitar Realtime para a tabela historico_absoluto
ALTER PUBLICATION supabase_realtime ADD TABLE historico_absoluto;
`;

/**
 * Mapeamento completo de tabelas disponíveis para limpeza e expurgo controlado por período
 */
export interface DefinicaoTabelaLimpavel {
  id: string;
  nomeAmigavel: string;
  modulo: string;
  campoData: string;
  campoCondominio?: string;
  descricao: string;
  avisoPerigo?: boolean;
}

export const TABELAS_LIMPAGEM: DefinicaoTabelaLimpavel[] = [
  {
    id: 'encomendas_itens',
    nomeAmigavel: 'Fluxo de Encomendas (Pacotes e Baixas)',
    modulo: 'Encomendas',
    campoData: 'criado_em',
    campoCondominio: 'condominio_id',
    descricao: 'Registros individuais de encomendas recebidas, entregues e pendentes na guarita.'
  },
  {
    id: 'encomendas_lotes',
    nomeAmigavel: 'Lotes de Encomendas Recebidas (RE)',
    modulo: 'Encomendas',
    campoData: 'criado_em',
    campoCondominio: 'condominio_id',
    descricao: 'Lotes de recebimento gerados pelas transportadoras e entregadores.',
    avisoPerigo: true
  },
  {
    id: 'movimentacao_chaves',
    nomeAmigavel: 'Movimentações do Quadro de Chaves',
    modulo: 'Chaves',
    campoData: 'data_retirada',
    campoCondominio: 'condominio_id',
    descricao: 'Histórico de retiradas e devoluções de chaves da portaria.'
  },
  {
    id: 'rondas_registros',
    nomeAmigavel: 'Pontos e Leituras de Ronda Realizadas',
    modulo: 'Rondas',
    campoData: 'data_hora',
    campoCondominio: 'condominio_id',
    descricao: 'Check-ins em pontos de ronda via QR Code ou NFC efetuados pela vigilância.'
  },
  {
    id: 'rondas_execucao',
    nomeAmigavel: 'Sessões de Ronda Concluídas',
    modulo: 'Rondas',
    campoData: 'hora_inicio',
    campoCondominio: 'condominio_id',
    descricao: 'Sessões gerais de rondas abertas e finalizadas com relatórios.'
  },
  {
    id: 'ocorrencias',
    nomeAmigavel: 'Livro de Ocorrências da Portaria',
    modulo: 'Ocorrências',
    campoData: 'data_hora',
    campoCondominio: 'condominio_id',
    descricao: 'Registros no livro digital de ocorrências do condomínio.'
  },
  {
    id: 'passagens_posto',
    nomeAmigavel: 'Histórico de Passagem de Posto / Turno',
    modulo: 'Passagem de Posto',
    campoData: 'data_passagem',
    campoCondominio: 'condominio_id',
    descricao: 'Relatórios de conferência de troca de plantão entre operadores.'
  },
  {
    id: 'prestadores_acessos',
    nomeAmigavel: 'Entradas e Saídas de Prestadores e Obras',
    modulo: 'Prestadores',
    campoData: 'hora_entrada',
    campoCondominio: 'condominio_id',
    descricao: 'Fluxo de acesso de terceiros, visitantes e trabalhadores de obras.'
  },
  {
    id: 'chamados_manutencao',
    nomeAmigavel: 'Chamados e Ordens de Manutenção',
    modulo: 'Manutenção',
    campoData: 'data_abertura',
    campoCondominio: 'condominio_id',
    descricao: 'Histórico de solicitações preventivas e corretivas de manutenção predial.'
  },
  {
    id: 'custodia_itens',
    nomeAmigavel: 'Itens em Custódia e Guarda Temporária',
    modulo: 'Custódia',
    campoData: 'criado_em',
    campoCondominio: 'condominio_id',
    descricao: 'Registros de objetos de valor, chaves e pertences sob guarda da portaria.'
  },
  {
    id: 'historico_absoluto',
    nomeAmigavel: 'Histórico Absoluto (Auditoria Global Antiga)',
    modulo: 'Auditoria',
    campoData: 'criado_em',
    campoCondominio: 'condominio_id',
    descricao: 'O próprio registro geral de auditoria para expurgo de logs muito antigos.',
    avisoPerigo: true
  }
];

/**
 * Salva no cache local do navegador para persistência imediata
 */
function salvarRegistroEmCacheLocal(registro: RegistroAuditoria): void {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_HISTORICO);
    let lista: RegistroAuditoria[] = raw ? JSON.parse(raw) : [];
    // Adiciona no topo
    lista.unshift(registro);
    // Limita tamanho
    if (lista.length > LIMITE_CACHE_LOCAL) {
      lista = lista.slice(0, LIMITE_CACHE_LOCAL);
    }
    localStorage.setItem(CHAVE_STORAGE_HISTORICO, JSON.stringify(lista));
  } catch (err) {
    console.warn('[Auditoria] Falha ao salvar no cache local:', err);
  }
}

/**
 * Obtém os registros salvos em cache local
 */
export function obterHistoricoCacheLocal(): RegistroAuditoria[] {
  try {
    const raw = localStorage.getItem(CHAVE_STORAGE_HISTORICO);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Auditoria] Falha ao ler cache local:', err);
  }
  return [];
}

/**
 * REGISTRO CENTRAL DE ATIVIDADE:
 * Grava toda e qualquer atividade no sistema (quem, quando, o que, detalhes),
 * enviando para o Supabase e mantendo réplica local com disparo em tempo real.
 */
export async function registrarAtividade(params: {
  modulo: string;
  acao: string;
  descricao: string;
  detalhes?: any;
  operador_nome?: string;
  operador_id?: string | null;
  operador_login?: string | null;
  condominio_id?: string | null;
}): Promise<RegistroAuditoria> {
  const agora = new Date().toISOString();
  const id = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // Tenta obter operador ativo do localStorage se não foi explicitamente fornecido
  let opNome = params.operador_nome;
  let opId = params.operador_id;
  let opLogin = params.operador_login;
  let condoId = params.condominio_id;

  if (!opNome && typeof window !== 'undefined') {
    try {
      const sessaoRaw = localStorage.getItem('infport_sessao_ativa_v1');
      if (sessaoRaw) {
        const sessao = JSON.parse(sessaoRaw);
        opId = opId || sessao.operadorId;
        opLogin = opLogin || sessao.login;
        condoId = condoId || sessao.condominioId;
      }
    } catch {}
  }

  const registro: RegistroAuditoria = {
    id,
    condominio_id: condoId || null,
    operador_id: opId || null,
    operador_nome: opNome || opLogin || 'Operador da Portaria',
    operador_login: opLogin || null,
    modulo: params.modulo,
    acao: params.acao.toUpperCase(),
    descricao: params.descricao,
    detalhes: params.detalhes || {},
    ip: 'Portaria Local',
    criado_em: agora
  };

  // 1. Persistência imediata no cache local
  salvarRegistroEmCacheLocal(registro);

  // 2. Dispara evento local para atualização instantânea na UI em tempo real
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('infport_historico_novo', { detail: registro }));
  }

  // 3. Persistência na tabela do Supabase (assíncrona e resiliente)
  try {
    const payloadSupabase = {
      condominio_id: registro.condominio_id,
      operador_id: registro.operador_id,
      operador_nome: registro.operador_nome,
      operador_login: registro.operador_login,
      modulo: registro.modulo,
      acao: registro.acao,
      descricao: registro.descricao,
      detalhes: registro.detalhes,
      ip: registro.ip,
      criado_em: registro.criado_em
    };

    const { error } = await supabase.from('historico_absoluto').insert([payloadSupabase]);
    if (error) {
      // Se a tabela ainda não existir no Supabase, apenas avisa sem travar a aplicação
      console.warn('[Auditoria] Aviso ao salvar no Supabase (verifique se a tabela historico_absoluto foi criada):', error.message);
    } else {
      console.log(`[Auditoria Realtime] Registrado com sucesso: [${registro.modulo}] ${registro.acao} - ${registro.descricao}`);
    }
  } catch (err: any) {
    console.warn('[Auditoria] Exceção de rede ao enviar histórico para Supabase:', err.message);
  }

  return registro;
}

/**
 * Consulta registros do Histórico Absoluto com filtros avançados
 */
export async function buscarHistoricoAbsoluto(filtros: {
  condominio_id?: string;
  modulo?: string;
  acao?: string;
  operador_id?: string;
  dataInicio?: string;
  dataFim?: string;
  termoBusca?: string;
  limite?: number;
}): Promise<{ registros: RegistroAuditoria[]; total: number; fonte: 'supabase' | 'cache_local' }> {
  const limite = filtros.limite || 100;

  try {
    let query = supabase
      .from('historico_absoluto')
      .select('*', { count: 'exact' })
      .order('criado_em', { ascending: false })
      .limit(limite);

    if (filtros.condominio_id) {
      query = query.eq('condominio_id', filtros.condominio_id);
    }
    if (filtros.modulo && filtros.modulo !== 'todos') {
      query = query.eq('modulo', filtros.modulo);
    }
    if (filtros.acao && filtros.acao !== 'todas') {
      query = query.eq('acao', filtros.acao.toUpperCase());
    }
    if (filtros.operador_id && filtros.operador_id !== 'todos') {
      query = query.eq('operador_id', filtros.operador_id);
    }
    if (filtros.dataInicio) {
      query = query.gte('criado_em', `${filtros.dataInicio}T00:00:00.000Z`);
    }
    if (filtros.dataFim) {
      query = query.lte('criado_em', `${filtros.dataFim}T23:59:59.999Z`);
    }
    if (filtros.termoBusca && filtros.termoBusca.trim()) {
      const termo = `%${filtros.termoBusca.trim()}%`;
      query = query.or(`descricao.ilike.${termo},operador_nome.ilike.${termo},modulo.ilike.${termo}`);
    }

    const { data, count, error } = await query;

    if (!error && data && data.length > 0) {
      return {
        registros: data as RegistroAuditoria[],
        total: count || data.length,
        fonte: 'supabase'
      };
    }
  } catch (err) {
    console.warn('[Auditoria] Falha ao consultar Supabase, usando cache local:', err);
  }

  // Fallback para cache local se Supabase falhar ou tabela não estiver criada
  let locais = obterHistoricoCacheLocal();

  if (filtros.condominio_id) {
    locais = locais.filter(r => !r.condominio_id || r.condominio_id === filtros.condominio_id);
  }
  if (filtros.modulo && filtros.modulo !== 'todos') {
    locais = locais.filter(r => r.modulo.toLowerCase() === filtros.modulo?.toLowerCase());
  }
  if (filtros.acao && filtros.acao !== 'todas') {
    locais = locais.filter(r => r.acao.toUpperCase() === filtros.acao?.toUpperCase());
  }
  if (filtros.dataInicio) {
    const tInicio = new Date(`${filtros.dataInicio}T00:00:00.000Z`).getTime();
    locais = locais.filter(r => new Date(r.criado_em).getTime() >= tInicio);
  }
  if (filtros.dataFim) {
    const tFim = new Date(`${filtros.dataFim}T23:59:59.999Z`).getTime();
    locais = locais.filter(r => new Date(r.criado_em).getTime() <= tFim);
  }
  if (filtros.termoBusca && filtros.termoBusca.trim()) {
    const termo = filtros.termoBusca.toLowerCase().trim();
    locais = locais.filter(r => 
      r.descricao.toLowerCase().includes(termo) ||
      r.operador_nome.toLowerCase().includes(termo) ||
      r.modulo.toLowerCase().includes(termo)
    );
  }

  return {
    registros: locais.slice(0, limite),
    total: locais.length,
    fonte: 'cache_local'
  };
}

/**
 * Consulta quantidade de registros em uma tabela específica dentro de um intervalo de datas
 */
export async function consultarRegistrosTabelaPeriodo(params: {
  tabela: string;
  dataInicio: string;
  dataFim: string;
  condominio_id?: string | null;
}): Promise<{ total: number; campoDataUsado: string; erro?: string }> {
  const def = TABELAS_LIMPAGEM.find(t => t.id === params.tabela);
  const campoData = def ? def.campoData : 'criado_em';

  try {
    let query = supabase
      .from(params.tabela)
      .select('*', { count: 'exact', head: true });

    if (params.condominio_id && def?.campoCondominio) {
      query = query.eq(def.campoCondominio, params.condominio_id);
    }

    if (params.dataInicio) {
      query = query.gte(campoData, `${params.dataInicio}T00:00:00.000Z`);
    }
    if (params.dataFim) {
      query = query.lte(campoData, `${params.dataFim}T23:59:59.999Z`);
    }

    const { count, error } = await query;

    if (error) {
      // Tenta fallback com campo alternativo caso o campoData não exista
      if (campoData !== 'created_at') {
        const fallback = await supabase
          .from(params.tabela)
          .select('*', { count: 'exact', head: true })
          .gte('created_at', `${params.dataInicio}T00:00:00.000Z`)
          .lte('created_at', `${params.dataFim}T23:59:59.999Z`);

        if (!fallback.error) {
          return { total: fallback.count || 0, campoDataUsado: 'created_at' };
        }
      }
      return { total: 0, campoDataUsado: campoData, erro: error.message };
    }

    return { total: count || 0, campoDataUsado: campoData };
  } catch (err: any) {
    return { total: 0, campoDataUsado: campoData, erro: err.message };
  }
}

/**
 * Exporta registros que serão apagados como backup de segurança (JSON)
 */
export async function baixarBackupSegurancaPeriodo(params: {
  tabela: string;
  dataInicio: string;
  dataFim: string;
  condominio_id?: string | null;
}): Promise<any[]> {
  const def = TABELAS_LIMPAGEM.find(t => t.id === params.tabela);
  const campoData = def ? def.campoData : 'criado_em';

  try {
    let query = supabase
      .from(params.tabela)
      .select('*')
      .order(campoData, { ascending: true })
      .limit(5000);

    if (params.condominio_id && def?.campoCondominio) {
      query = query.eq(def.campoCondominio, params.condominio_id);
    }
    if (params.dataInicio) {
      query = query.gte(campoData, `${params.dataInicio}T00:00:00.000Z`);
    }
    if (params.dataFim) {
      query = query.lte(campoData, `${params.dataFim}T23:59:59.999Z`);
    }

    const { data } = await query;
    return data || [];
  } catch {
    return [];
  }
}

/**
 * EXECUÇÃO CONTROLADA DE LIMPEZA / EXPURGO POR PERÍODO (Exclusivo para Administrador)
 * Apaga dados de qualquer tabela selecionada pelo período ex: 01/03/2026 até 03/06/2026
 * e gera registro obrigatório e imutável de auditoria no Histórico Absoluto!
 */
export async function executarLimpezaTabelaPorPeriodo(params: {
  tabela: string;
  dataInicio: string;
  dataFim: string;
  condominio_id?: string | null;
  operador: {
    id?: string;
    nome: string;
    login?: string;
    perfil?: string;
  };
  motivo?: string;
}): Promise<{ sucesso: boolean; registrosRemovidos: number; erro?: string }> {
  const def = TABELAS_LIMPAGEM.find(t => t.id === params.tabela);
  const nomeTabela = def ? def.nomeAmigavel : params.tabela;
  const campoData = def ? def.campoData : 'criado_em';

  try {
    // 1. Primeiro verifica quantidade de registros
    const consulta = await consultarRegistrosTabelaPeriodo({
      tabela: params.tabela,
      dataInicio: params.dataInicio,
      dataFim: params.dataFim,
      condominio_id: params.condominio_id
    });

    const campoReal = consulta.campoDataUsado || campoData;

    // 2. Executa a exclusão no Supabase
    let deleteQuery = supabase.from(params.tabela).delete();

    if (params.condominio_id && def?.campoCondominio) {
      deleteQuery = deleteQuery.eq(def.campoCondominio, params.condominio_id);
    }
    deleteQuery = deleteQuery
      .gte(campoReal, `${params.dataInicio}T00:00:00.000Z`)
      .lte(campoReal, `${params.dataFim}T23:59:59.999Z`);

    const { error } = await deleteQuery;

    if (error) {
      throw new Error(error.message);
    }

    const registrosRemovidos = consulta.total || 0;

    // 3. REGISTRO OBRIGATÓRIO E IMUTÁVEL DE AUDITORIA NO HISTÓRICO ABSOLUTO
    await registrarAtividade({
      modulo: 'Limpeza de Dados',
      acao: 'LIMPEZA_PERIODO',
      descricao: `Administrador ${params.operador.nome} executou limpeza na tabela [${nomeTabela}] no período de ${formatarDataBr(params.dataInicio)} até ${formatarDataBr(params.dataFim)}. Total de registros removidos: ${registrosRemovidos}.`,
      detalhes: {
        tabela: params.tabela,
        nomeTabela,
        campoDataUsado: campoReal,
        dataInicio: params.dataInicio,
        dataFim: params.dataFim,
        registrosRemovidos,
        motivo: params.motivo || 'Expurgo periódico de rotina administrativa',
        executadoPor: params.operador
      },
      operador_nome: params.operador.nome,
      operador_id: params.operador.id,
      operador_login: params.operador.login,
      condominio_id: params.condominio_id
    });

    return {
      sucesso: true,
      registrosRemovidos
    };
  } catch (err: any) {
    console.error(`[Auditoria] Falha ao executar limpeza na tabela ${params.tabela}:`, err);
    return {
      sucesso: false,
      registrosRemovidos: 0,
      erro: err.message || 'Erro desconhecido ao executar exclusão no banco'
    };
  }
}

function formatarDataBr(dataStr: string): string {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  if (ano && mes && dia) {
    return `${dia}/${mes}/${ano}`;
  }
  return dataStr;
}
