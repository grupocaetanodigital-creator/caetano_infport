import { supabase } from './supabase';

export interface PermissaoModuloPadrao {
  visualizar?: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
  [key: string]: boolean | undefined;
}

export interface PermissoesModulo {
  encomendas?: PermissaoModuloPadrao & {
    entrada_lote?: boolean;
    triagem?: boolean;
    baixa?: boolean;
    excluir_lotes?: boolean;
    historico?: boolean;
  };
  custodia?: PermissaoModuloPadrao & {
    receber?: boolean;
    baixa?: boolean;
    auditoria?: boolean;
  };
  chaves?: PermissaoModuloPadrao & {
    emprestar?: boolean;
    devolver?: boolean;
    cadastrar?: boolean;
    excluir?: boolean;
  };
  rondas?: PermissaoModuloPadrao & {
    iniciar_ronda?: boolean;
    cadastrar_pontos?: boolean;
    setores?: boolean;
  };
  autorizados?: PermissaoModuloPadrao & {
    cadastrar?: boolean;
    dar_entrada?: boolean;
    dar_saida?: boolean;
  };
  materiais?: PermissaoModuloPadrao & {
    cadastrar_equipamentos?: boolean;
    editar?: boolean;
    excluir?: boolean;
  };
  manutencao?: PermissaoModuloPadrao & {
    abrir_os?: boolean;
    concluir?: boolean;
    excluir?: boolean;
  };
  ocorrencias?: PermissaoModuloPadrao & {
    criar?: boolean;
    resolver?: boolean;
    excluir?: boolean;
  };
  passagem_posto?: PermissaoModuloPadrao & {
    assumir_posto?: boolean;
    relatorio?: boolean;
  };
  cadastros?: PermissaoModuloPadrao & {
    operadores?: boolean;
    moradores?: boolean;
    condominios?: boolean;
    gerenciar_niveis?: boolean;
  };
  moradores?: PermissaoModuloPadrao & {
    adicionar?: boolean;
    editar?: boolean;
    excluir?: boolean;
  };
  historico_absoluto?: PermissaoModuloPadrao & {
    ver_feed?: boolean;
    ver_metricas?: boolean;
    exportar_csv?: boolean;
    limpar_dados?: boolean;
  };
  configuracoes?: PermissaoModuloPadrao & {
    gerenciar_niveis?: boolean;
    feature_flags?: boolean;
  };
}

export interface NivelAcessoItem {
  id: string; // Ex: 'nivel_0', 'nivel_1', 'nivel_2', 'nivel_3', 'nivel_4', ou custom
  nome: string; // Ex: 'Nível 0 — Administrador Geral', 'Supervisor de Segurança', etc.
  descricao?: string;
  condominio_id?: string | null;
  padrao_sistema?: boolean; // Se é nível nativo do sistema
  permissoes: PermissoesModulo;
}

export interface ModuloAcaoInfo {
  id: string;
  label: string;
}

export interface ModuloDefinicaoInfo {
  id: keyof PermissoesModulo;
  nome: string;
  descricao?: string;
  acoesEspecificas: ModuloAcaoInfo[];
}

export const MODULOS_DEFINICAO_RBAC: ModuloDefinicaoInfo[] = [
  {
    id: 'encomendas',
    nome: 'Encomendas & Triagem RE',
    acoesEspecificas: [
      { id: 'entrada_lote', label: 'Receber Lotes (RE)' },
      { id: 'triagem', label: 'Fazer Triagem' },
      { id: 'baixa', label: 'Saída/Baixa de Pacotes' },
      { id: 'excluir_lotes', label: 'Excluir Lotes ou Encomendas' }
    ]
  },
  {
    id: 'custodia',
    nome: 'Custódia de Itens',
    acoesEspecificas: [
      { id: 'receber', label: 'Receber e Guardar' },
      { id: 'baixa', label: 'Baixa / Devolução' },
      { id: 'auditoria', label: 'Auditoria' }
    ]
  },
  {
    id: 'chaves',
    nome: 'Quadro Digital de Chaves (Claviculário)',
    acoesEspecificas: [
      { id: 'emprestar', label: 'Emprestar' },
      { id: 'devolver', label: 'Devolver' },
      { id: 'cadastrar', label: 'Cadastrar Nova Chave' },
      { id: 'excluir', label: 'Excluir Chave' }
    ]
  },
  {
    id: 'rondas',
    nome: 'Rondas Patrimoniais QR',
    acoesEspecificas: [
      { id: 'iniciar_ronda', label: 'Iniciar Ronda' },
      { id: 'cadastrar_pontos', label: 'Cadastrar / Editar Pontos' },
      { id: 'setores', label: 'Configurar Setores' }
    ]
  },
  {
    id: 'autorizados',
    nome: 'Autorizados & Prestadores',
    acoesEspecificas: [
      { id: 'cadastrar', label: 'Cadastrar / Liberar' },
      { id: 'dar_entrada', label: 'Dar Entrada' },
      { id: 'dar_saida', label: 'Dar Saída' }
    ]
  },
  {
    id: 'materiais',
    nome: 'Materiais & Inventário do Posto',
    acoesEspecificas: [
      { id: 'cadastrar_equipamentos', label: 'Cadastrar Equipamentos (HT, etc)' },
      { id: 'editar', label: 'Editar' },
      { id: 'excluir', label: 'Excluir' }
    ]
  },
  {
    id: 'manutencao',
    nome: 'Gestão de Manutenção & OS',
    acoesEspecificas: [
      { id: 'abrir_os', label: 'Abertura de Chamados (OS)' },
      { id: 'concluir', label: 'Resolução / Concluir OS' },
      { id: 'excluir', label: 'Excluir Chamado' }
    ]
  },
  {
    id: 'ocorrencias',
    nome: 'Livro de Ocorrências',
    acoesEspecificas: [
      { id: 'criar', label: 'Registrar c/ áudio/foto' },
      { id: 'resolver', label: 'Dar Ciência / Resolver' },
      { id: 'excluir', label: 'Excluir Ocorrência' }
    ]
  },
  {
    id: 'passagem_posto',
    nome: 'Passagem de Posto',
    acoesEspecificas: [
      { id: 'assumir_posto', label: 'Realizar / Assumir Passagem' },
      { id: 'relatorio', label: 'Ver Relatório Completo' }
    ]
  },
  {
    id: 'cadastros',
    nome: 'Cadastros Base',
    acoesEspecificas: [
      { id: 'operadores', label: 'Gerenciar Operadores' },
      { id: 'moradores', label: 'Gerenciar Moradores & Unidades' },
      { id: 'condominios', label: 'Gerenciar Condomínios' },
      { id: 'gerenciar_niveis', label: 'Gerenciar Níveis de Acesso (RBAC)' }
    ]
  },
  {
    id: 'historico_absoluto',
    nome: 'Histórico Absoluto & Auditoria',
    acoesEspecificas: [
      { id: 'ver_feed', label: 'Feed em Tempo Real' },
      { id: 'ver_metricas', label: 'Métricas & Indicadores' },
      { id: 'exportar_csv', label: 'Exportar Relatórios CSV' },
      { id: 'limpar_dados', label: 'Limpeza de Dados por Período (Expurgo - Restrito)' }
    ]
  },
  {
    id: 'configuracoes',
    nome: 'Configurações do Sistema',
    acoesEspecificas: [
      { id: 'gerenciar_niveis', label: 'Gerenciar Níveis (RBAC)' },
      { id: 'feature_flags', label: 'Feature Flags (Módulos)' }
    ]
  }
];

export const NIVEIS_PADRAO: NivelAcessoItem[] = [
  {
    id: 'nivel_0',
    nome: 'Nível 0 — Administrador Geral',
    descricao: 'Acesso total e irrestrito a todos os módulos, configurações, exclusões e expurgo de dados.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: true, excluir: true, entrada_lote: true, triagem: true, baixa: true, excluir_lotes: true, historico: true },
      custodia: { visualizar: true, criar: true, editar: true, excluir: true, receber: true, baixa: true, auditoria: true },
      chaves: { visualizar: true, criar: true, editar: true, excluir: true, emprestar: true, devolver: true, cadastrar: true },
      rondas: { visualizar: true, criar: true, editar: true, excluir: true, iniciar_ronda: true, cadastrar_pontos: true, setores: true },
      autorizados: { visualizar: true, criar: true, editar: true, excluir: true, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: true, editar: true, excluir: true, cadastrar_equipamentos: true },
      manutencao: { visualizar: true, criar: true, editar: true, excluir: true, abrir_os: true, concluir: true },
      ocorrencias: { visualizar: true, criar: true, editar: true, excluir: true, resolver: true },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: true, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: true, editar: true, excluir: true, operadores: true, moradores: true, condominios: true, gerenciar_niveis: true },
      moradores: { visualizar: true, criar: true, editar: true, excluir: true, adicionar: true },
      historico_absoluto: { visualizar: true, criar: true, editar: true, excluir: true, ver_feed: true, ver_metricas: true, exportar_csv: true, limpar_dados: true },
      configuracoes: { visualizar: true, criar: true, editar: true, excluir: true, gerenciar_niveis: true, feature_flags: true }
    }
  },
  {
    id: 'nivel_1',
    nome: 'Nível 1 — Master (Síndico / Auditoria)',
    descricao: 'Visualização completa de relatórios, auditoria de dados, métricas executivas e cadastros.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: true, excluir: false, entrada_lote: true, triagem: true, baixa: true, excluir_lotes: false, historico: true },
      custodia: { visualizar: true, criar: true, editar: true, excluir: false, receber: true, baixa: true, auditoria: true },
      chaves: { visualizar: true, criar: true, editar: true, excluir: false, emprestar: true, devolver: true, cadastrar: true },
      rondas: { visualizar: true, criar: true, editar: true, excluir: false, iniciar_ronda: true, cadastrar_pontos: true, setores: true },
      autorizados: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar_equipamentos: true },
      manutencao: { visualizar: true, criar: true, editar: true, excluir: false, abrir_os: true, concluir: true },
      ocorrencias: { visualizar: true, criar: true, editar: true, excluir: false, resolver: true },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: false, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: true, editar: true, excluir: false, operadores: true, moradores: true, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: true, editar: true, excluir: false, adicionar: true },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: true, exportar_csv: true, limpar_dados: false },
      configuracoes: { visualizar: true, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false }
    }
  },
  {
    id: 'nivel_2',
    nome: 'Nível 2 — Supervisor de Segurança',
    descricao: 'Gestão operacional de equipes, controle de rondas, ocorrências, materiais e supervisão de portaria.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: false, excluir: false, entrada_lote: true, triagem: true, baixa: true, excluir_lotes: false, historico: true },
      custodia: { visualizar: true, criar: true, editar: false, excluir: false, receber: true, baixa: true, auditoria: true },
      chaves: { visualizar: true, criar: true, editar: true, excluir: false, emprestar: true, devolver: true, cadastrar: true },
      rondas: { visualizar: true, criar: true, editar: true, excluir: false, iniciar_ronda: true, cadastrar_pontos: true, setores: false },
      autorizados: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: true, editar: true, excluir: false, cadastrar_equipamentos: true },
      manutencao: { visualizar: true, criar: true, editar: true, excluir: false, abrir_os: true, concluir: true },
      ocorrencias: { visualizar: true, criar: true, editar: true, excluir: false, resolver: true },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: false, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: true, editar: true, excluir: false, operadores: false, moradores: true, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: true, editar: true, excluir: false, adicionar: true },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: true, exportar_csv: false, limpar_dados: false },
      configuracoes: { visualizar: false, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false }
    }
  },
  {
    id: 'nivel_3',
    nome: 'Nível 3 — Operador de Guarita / Portaria',
    descricao: 'Operação cotidiana do posto de trabalho: encomendas, triagem, liberação de pessoas e chaves.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: true, editar: false, excluir: false, entrada_lote: true, triagem: true, baixa: true, excluir_lotes: false, historico: true },
      custodia: { visualizar: true, criar: true, editar: false, excluir: false, receber: true, baixa: true, auditoria: false },
      chaves: { visualizar: true, criar: true, editar: false, excluir: false, emprestar: true, devolver: true, cadastrar: false },
      rondas: { visualizar: true, criar: true, editar: false, excluir: false, iniciar_ronda: true, cadastrar_pontos: false, setores: false },
      autorizados: { visualizar: true, criar: true, editar: false, excluir: false, cadastrar: true, dar_entrada: true, dar_saida: true },
      materiais: { visualizar: true, criar: false, editar: false, excluir: false, cadastrar_equipamentos: false },
      manutencao: { visualizar: true, criar: true, editar: false, excluir: false, abrir_os: true, concluir: false },
      ocorrencias: { visualizar: true, criar: true, editar: false, excluir: false, resolver: false },
      passagem_posto: { visualizar: true, criar: true, editar: true, excluir: false, assumir_posto: true, relatorio: true },
      cadastros: { visualizar: true, criar: false, editar: false, excluir: false, operadores: false, moradores: false, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: true, editar: false, excluir: false, adicionar: true },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: false, exportar_csv: false, limpar_dados: false },
      configuracoes: { visualizar: false, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false }
    }
  },
  {
    id: 'nivel_4',
    nome: 'Nível 4 — Síndico (Visualização & Consultas)',
    descricao: 'Acesso de consulta executiva a dashboards, relatórios e dossiês sem edição de portaria.',
    condominio_id: null,
    padrao_sistema: true,
    permissoes: {
      encomendas: { visualizar: true, criar: false, editar: false, excluir: false, entrada_lote: false, triagem: false, baixa: false, excluir_lotes: false, historico: true },
      custodia: { visualizar: true, criar: false, editar: false, excluir: false, receber: false, baixa: false, auditoria: true },
      chaves: { visualizar: true, criar: false, editar: false, excluir: false, emprestar: false, devolver: false, cadastrar: false },
      rondas: { visualizar: true, criar: false, editar: false, excluir: false, iniciar_ronda: false, cadastrar_pontos: false, setores: false },
      autorizados: { visualizar: true, criar: false, editar: false, excluir: false, cadastrar: false, dar_entrada: false, dar_saida: false },
      materiais: { visualizar: true, criar: false, editar: false, excluir: false, cadastrar_equipamentos: false },
      manutencao: { visualizar: true, criar: true, editar: false, excluir: false, abrir_os: true, concluir: false },
      ocorrencias: { visualizar: true, criar: true, editar: false, excluir: false, resolver: false },
      passagem_posto: { visualizar: true, criar: false, editar: false, excluir: false, assumir_posto: false, relatorio: true },
      cadastros: { visualizar: true, criar: false, editar: false, excluir: false, operadores: false, moradores: false, condominios: false, gerenciar_niveis: false },
      moradores: { visualizar: true, criar: false, editar: false, excluir: false, adicionar: false },
      historico_absoluto: { visualizar: true, criar: false, editar: false, excluir: false, ver_feed: true, ver_metricas: true, exportar_csv: true, limpar_dados: false },
      configuracoes: { visualizar: false, criar: false, editar: false, excluir: false, gerenciar_niveis: false, feature_flags: false }
    }
  }
];

const STORAGE_KEY_NIVEIS = 'infport_niveis_acesso_v1';

export function obterNiveisLocal(): NivelAcessoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NIVEIS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Garantir que todos os níveis padrão existam no merge
        const mapa = new Map<string, NivelAcessoItem>();
        NIVEIS_PADRAO.forEach(n => mapa.set(n.id, n));
        parsed.forEach((n: NivelAcessoItem) => mapa.set(n.id, n));
        return Array.from(mapa.values());
      }
    }
  } catch (e) {
    console.warn('Erro ao ler níveis locais:', e);
  }
  return [...NIVEIS_PADRAO];
}

export function salvarNiveisLocal(niveis: NivelAcessoItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_NIVEIS, JSON.stringify(niveis));
    window.dispatchEvent(new CustomEvent('niveis_acesso_atualizados', { detail: niveis }));
  } catch (e) {
    console.warn('Erro ao salvar níveis locais:', e);
  }
}

export async function carregarNiveisAcesso(condominioId?: string): Promise<NivelAcessoItem[]> {
  const locais = obterNiveisLocal();

  try {
    if (condominioId) {
      const { data } = await supabase
        .from('configuracoes')
        .select('niveis_acesso')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      if (data?.niveis_acesso && Array.isArray(data.niveis_acesso) && data.niveis_acesso.length > 0) {
        const mapa = new Map<string, NivelAcessoItem>();
        NIVEIS_PADRAO.forEach(n => mapa.set(n.id, n));
        locais.forEach(n => mapa.set(n.id, n));
        data.niveis_acesso.forEach((n: NivelAcessoItem) => mapa.set(n.id, n));
        const consolidados = Array.from(mapa.values());
        salvarNiveisLocal(consolidados);
        return consolidados;
      }
    }
  } catch (err) {
    console.warn('Erro ao buscar níveis remotos:', err);
  }

  return locais;
}

export async function salvarNivelAcesso(nivel: NivelAcessoItem, condominioId?: string): Promise<void> {
  const atuais = obterNiveisLocal();
  const idx = atuais.findIndex(n => n.id === nivel.id);
  let atualizados: NivelAcessoItem[];

  if (idx >= 0) {
    atualizados = [...atuais];
    atualizados[idx] = nivel;
  } else {
    atualizados = [...atuais, nivel];
  }

  salvarNiveisLocal(atualizados);

  const targetCondo = condominioId || nivel.condominio_id;
  if (targetCondo) {
    try {
      const customizadosDoCondo = atualizados.filter(n => n.condominio_id === targetCondo || !n.padrao_sistema);
      const { error } = await supabase
        .from('configuracoes')
        .update({ niveis_acesso: customizadosDoCondo } as any)
        .eq('condominio_id', targetCondo);
      if (error) {
        console.warn('Persistência remota de nível no Supabase (coluna niveis_acesso requer migração SQL):', error.message);
      }
    } catch (e) {
      console.warn('Persistência remota de nível de acesso (graceful fallback):', e);
    }
  }
}

export async function excluirNivelAcesso(id: string, condominioId?: string): Promise<void> {
  const atuais = obterNiveisLocal();
  const atualizados = atuais.filter(n => n.id !== id);
  salvarNiveisLocal(atualizados);

  if (condominioId) {
    try {
      const customizadosDoCondo = atualizados.filter(n => n.condominio_id === condominioId || !n.padrao_sistema);
      const { error } = await supabase
        .from('configuracoes')
        .update({ niveis_acesso: customizadosDoCondo } as any)
        .eq('condominio_id', condominioId);
      if (error) {
        console.warn('Exclusão remota de nível no Supabase:', error.message);
      }
    } catch (e) {
      console.warn('Erro ao atualizar exclusão de nível remoto:', e);
    }
  }
}

/**
 * Valida se um perfil de nível de acesso está sendo usado por algum operador.
 * Retorna a lista de nomes de operadores usando este perfil.
 */
export function verificarOperadoresEmUso(nivelId: string, operadores: any[]): string[] {
  if (!operadores || operadores.length === 0) return [];

  // Mapear correspondência com o nível ID (ex: 'nivel_0' -> nivel_acesso === 0, ou custom id)
  const nivelNum = nivelId.startsWith('nivel_') ? parseInt(nivelId.replace('nivel_', ''), 10) : NaN;

  const operadoresVinculados = operadores.filter(op => {
    if (op.nivel_acesso_custom_id === nivelId) return true;
    if (op.perfil_id === nivelId) return true;
    if (!isNaN(nivelNum) && op.nivel_acesso === nivelNum) return true;
    if (op.perfil === nivelId) return true;
    return false;
  });

  return operadoresVinculados.map(op => op.nome || op.login || 'Operador sem nome');
}

/**
 * Retorna o nome amigável de um perfil pelo seu ID ou nível numérico
 */
export function obterNomeNivel(nivelIdentificador: string | number | undefined, niveis?: NivelAcessoItem[]): string {
  if (nivelIdentificador === undefined || nivelIdentificador === null) return 'Nível Desconhecido';

  const lista = niveis || obterNiveisLocal();
  const idStr = String(nivelIdentificador);

  // Busca direta por ID
  const direto = lista.find(n => n.id === idStr);
  if (direto) return direto.nome;

  // Busca por 'nivel_' + id
  const porPrefixo = lista.find(n => n.id === `nivel_${idStr}`);
  if (porPrefixo) return porPrefixo.nome;

  // Fallbacks conhecidos
  switch (idStr) {
    case '0':
    case 'admin':
      return 'Nível 0 — Administrador Geral';
    case '1':
    case 'master':
      return 'Nível 1 — Master (Síndico / Auditoria)';
    case '2':
    case 'supervisor':
      return 'Nível 2 — Supervisor de Segurança';
    case '3':
    case 'operador':
      return 'Nível 3 — Operador de Guarita';
    case '4':
    case 'sindico':
      return 'Nível 4 — Síndico (Visualização)';
    default:
      return idStr;
  }
}

/**
 * Clona as permissões de um perfil base para um novo perfil customizado
 */
export function clonarPermissoes(permissoesOrigem: PermissoesModulo): PermissoesModulo {
  return JSON.parse(JSON.stringify(permissoesOrigem || {}));
}

/**
 * Verifica se um operador logado possui uma permissão específica.
 */
export function verificarPermissao(
  operador: any,
  modulo: keyof PermissoesModulo,
  acao: string
): boolean {
  if (!operador) return false;

  // Administrador Geral (Nível 0 ou perfil 'admin') tem sempre acesso total
  const ehAdmin = operador.perfil === 'admin' || operador.nivel_acesso === 0 || operador.nivel === 0;
  if (ehAdmin) {
    return true;
  }

  // Identifica o nível do operador
  const idNivel = operador.nivel_acesso_custom_id || 
                  (operador.nivel_acesso !== undefined ? `nivel_${operador.nivel_acesso}` : null) ||
                  (operador.perfil ? `nivel_${operador.perfil}` : 'nivel_3');

  const todos = obterNiveisLocal();
  let nivelObj = todos.find(n => n.id === idNivel);

  if (!nivelObj && operador.nivel_acesso !== undefined) {
    nivelObj = todos.find(n => n.id === `nivel_${operador.nivel_acesso}`);
  }

  if (!nivelObj) {
    const perfilStr = String(operador.perfil || '').toLowerCase();
    if (perfilStr.includes('master')) nivelObj = NIVEIS_PADRAO.find(n => n.id === 'nivel_1');
    else if (perfilStr.includes('superv')) nivelObj = NIVEIS_PADRAO.find(n => n.id === 'nivel_2');
    else if (perfilStr.includes('sind')) nivelObj = NIVEIS_PADRAO.find(n => n.id === 'nivel_4');
    else nivelObj = NIVEIS_PADRAO.find(n => n.id === 'nivel_3');
  }

  if (!nivelObj || !nivelObj.permissoes) {
    return true; // Fallback seguro
  }

  const permissoesModulo: any = (nivelObj.permissoes as any)[modulo];
  if (!permissoesModulo) {
    return false;
  }

  return Boolean(permissoesModulo[acao]);
}
