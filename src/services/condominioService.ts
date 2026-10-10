import { supabase } from './supabase';

export interface CondominioConfig {
  id: string;
  nome: string;
  endereco?: string;
  escala_plantao: '06_18' | '07_19' | '08_20' | 'personalizado';
  escala_label: string;
  horario_diurno_inicio: string; // Ex: "06:00" ou "07:00"
  horario_noturno_inicio: string; // Ex: "18:00" ou "19:00"
  whatsapp_grupo_url: string; // Ex: "https://chat.whatsapp.com/G8AZH67UIPO6xXSwzxROpZ"
  telefone_portaria?: string;
  sindico_nome?: string;
  sindico_whatsapp?: string;
  tipo_estrutura?: 'casas' | 'blocos' | 'torres' | 'numeral_direto' | string;
  qtd_blocos?: number;
  unidades_por_bloco?: number;
  nomes_blocos?: string;
}

export type TipoEstruturaCondominio = 'casas' | 'blocos' | 'torres' | 'numeral_direto';

export const OPCOES_TIPO_ESTRUTURA: {
  id: TipoEstruturaCondominio;
  label: string;
  descricao: string;
  rotuloBloco: string;
  rotuloUnidade: string;
}[] = [
  {
    id: 'casas',
    label: '🏡 Condomínio de Casas (Casas Horizontais)',
    descricao: 'Onde seria "Bloco" vira "Casa" fixo em todo o sistema. Ideal para vilas e residenciais.',
    rotuloBloco: 'Casa',
    rotuloUnidade: 'Número da Casa'
  },
  {
    id: 'blocos',
    label: '🏢 Condomínio de Apartamentos / Edifícios',
    descricao: 'Estrutura tradicional com Blocos e Apartamentos.',
    rotuloBloco: 'Bloco',
    rotuloUnidade: 'Apartamento'
  },
  {
    id: 'torres',
    label: '🏙️ Condomínio de Torres',
    descricao: 'Estrutura vertical com Torres e Apartamentos.',
    rotuloBloco: 'Torre',
    rotuloUnidade: 'Apartamento'
  },
  {
    id: 'numeral_direto',
    label: '🔢 Numeral Direto / Lotes',
    descricao: 'Numeração sequencial contínua sem necessidade de bloco.',
    rotuloBloco: 'Unidade',
    rotuloUnidade: 'Lote / Unidade'
  }
];

export function isEstruturaCasas(tipo?: string): boolean {
  if (!tipo) return true; // Padrão inteligente
  const lower = tipo.toString().toLowerCase();
  return lower.includes('casa');
}

export function getNomeRotuloBloco(tipo?: string): string {
  if (isEstruturaCasas(tipo)) return 'Casa';
  if (!tipo) return 'Bloco';
  const lower = tipo.toString().toLowerCase();
  if (lower.includes('torre')) return 'Torre';
  if (lower.includes('numeral') || lower.includes('lote')) return 'Unidade';
  return 'Bloco';
}

export function getNomeRotuloUnidade(tipo?: string): string {
  if (isEstruturaCasas(tipo)) return 'Casa';
  if (!tipo) return 'Apartamento';
  const lower = tipo.toString().toLowerCase();
  if (lower.includes('numeral') || lower.includes('lote')) return 'Lote';
  return 'Apartamento';
}

export interface UnidadeEstruturada {
  id: string; // Ex: "casa-1" ou "bloco-A-ap-101"
  numero: string; // Ex: "1", "101"
  bloco: string; // Ex: "Casa", "A"
  label: string; // Ex: "Casa 1" ou "Bloco A - Ap. 101"
}

export function gerarCardsUnidadesCondominio(config?: CondominioConfig | null): UnidadeEstruturada[] {
  const lista: UnidadeEstruturada[] = [];
  if (!config) return lista;

  const tipo = config.tipo_estrutura || 'casas';
  const eCasas = isEstruturaCasas(tipo);
  const totalCasas = config.unidades_por_bloco ? Number(config.unidades_por_bloco) : 117;

  if (eCasas) {
    const qtd = Math.max(1, Math.min(totalCasas, 1000));
    for (let i = 1; i <= qtd; i++) {
      lista.push({
        id: `casa-${i}`,
        numero: String(i),
        bloco: 'Casa',
        label: `Casa ${i}`
      });
    }
  } else if (tipo === 'numeral_direto') {
    const qtd = Math.max(1, Math.min(totalCasas, 1000));
    for (let i = 1; i <= qtd; i++) {
      lista.push({
        id: `und-${i}`,
        numero: String(i),
        bloco: '',
        label: `Unidade ${i}`
      });
    }
  } else {
    // blocos ou torres
    const qBlocos = Math.max(1, Math.min(Number(config.qtd_blocos) || 1, 50));
    const nomesBlocosCustom = config.nomes_blocos 
      ? config.nomes_blocos.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const undPorBloco = Math.max(1, Math.min(Number(config.unidades_por_bloco) || 20, 200));

    for (let b = 0; b < qBlocos; b++) {
      const nomeBloco = nomesBlocosCustom[b] || (tipo === 'torres' ? `Torre ${b + 1}` : `Bloco ${String.fromCharCode(65 + b)}`);
      for (let u = 1; u <= undPorBloco; u++) {
        const numFormatado = u < 100 ? (100 + u) : u;
        lista.push({
          id: `${nomeBloco}-${numFormatado}`,
          numero: String(numFormatado),
          bloco: nomeBloco,
          label: `${nomeBloco} • Ap. ${numFormatado}`
        });
      }
    }
  }

  return lista;
}

export const OPCOES_ESCALA = [
  {
    id: '06_18',
    label: '06:00 às 18:00 / 18:00 às 06:00',
    descricao: 'Plantão 12x36 padrão com troca às 06h e 18h',
    diurnoInicio: '06:00',
    noturnoInicio: '18:00'
  },
  {
    id: '07_19',
    label: '07:00 às 19:00 / 19:00 às 07:00',
    descricao: 'Plantão 12x36 com troca às 07h e 19h',
    diurnoInicio: '07:00',
    noturnoInicio: '19:00'
  },
  {
    id: '08_20',
    label: '08:00 às 20:00 / 20:00 às 08:00',
    descricao: 'Plantão 12x36 com troca às 08h e 20h',
    diurnoInicio: '08:00',
    noturnoInicio: '20:00'
  },
  {
    id: 'personalizado',
    label: 'Horário Personalizado',
    descricao: 'Defina horários específicos de início para turno diurno e noturno',
    diurnoInicio: '06:00',
    noturnoInicio: '18:00'
  }
];

const STORAGE_KEY_PREFIX = 'infport_condominio_config_';

export function getCondominioConfigLocal(condominioId: string): CondominioConfig | null {
  if (!condominioId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${condominioId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler config local do condomínio:', e);
  }
  return null;
}

export function saveCondominioConfigLocal(condominioId: string, config: CondominioConfig): void {
  if (!condominioId) return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${condominioId}`, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('condominio_config_updated', { detail: config }));
  } catch (e) {
    console.warn('Erro ao salvar config local do condomínio:', e);
  }
}

/**
 * Busca a configuração completa do condomínio (mesclando banco de dados com cache local)
 */
export async function carregarCondominioConfig(condominioId: string): Promise<CondominioConfig> {
  const local = getCondominioConfigLocal(condominioId);

  // Valores padrão
  let defaultConfig: CondominioConfig = {
    id: condominioId,
    nome: 'Condomínio',
    endereco: '',
    escala_plantao: '06_18',
    escala_label: '06:00 às 18:00 / 18:00 às 06:00',
    horario_diurno_inicio: '06:00',
    horario_noturno_inicio: '18:00',
    whatsapp_grupo_url: '',
    telefone_portaria: '',
    sindico_nome: '',
    sindico_whatsapp: '',
    tipo_estrutura: 'casas',
    qtd_blocos: 1,
    unidades_por_bloco: 117,
    nomes_blocos: ''
  };

  if (local) {
    defaultConfig = { ...defaultConfig, ...local };
  }

  try {
    const { data, error } = await supabase
      .from('condominios')
      .select('*')
      .eq('id', condominioId)
      .maybeSingle();

    if (!error && data) {
      defaultConfig.nome = data.nome || defaultConfig.nome;
      defaultConfig.endereco = data.endereco || defaultConfig.endereco;

      // Se existirem colunas específicas no Supabase:
      if (data.tipo_estrutura) {
        defaultConfig.tipo_estrutura = data.tipo_estrutura;
      }
      if (data.qtd_blocos !== undefined && data.qtd_blocos !== null) {
        defaultConfig.qtd_blocos = Number(data.qtd_blocos);
      }
      if (data.unidades_por_bloco !== undefined && data.unidades_por_bloco !== null) {
        defaultConfig.unidades_por_bloco = Number(data.unidades_por_bloco);
      }
      if (data.nomes_blocos) {
        defaultConfig.nomes_blocos = data.nomes_blocos;
      }
      if (data.whatsapp_grupo_url) {
        defaultConfig.whatsapp_grupo_url = data.whatsapp_grupo_url;
      }
      if (data.escala_plantao) {
        defaultConfig.escala_plantao = data.escala_plantao;
        const opt = OPCOES_ESCALA.find(o => o.id === data.escala_plantao);
        if (opt) defaultConfig.escala_label = opt.label;
      }
      if (data.horario_diurno_inicio) {
        defaultConfig.horario_diurno_inicio = data.horario_diurno_inicio;
      }
      if (data.horario_noturno_inicio) {
        defaultConfig.horario_noturno_inicio = data.horario_noturno_inicio;
      }
      if (data.telefone_portaria) {
        defaultConfig.telefone_portaria = data.telefone_portaria;
      }
      if (data.sindico_nome) {
        defaultConfig.sindico_nome = data.sindico_nome;
      }
      if (data.sindico_whatsapp) {
        defaultConfig.sindico_whatsapp = data.sindico_whatsapp;
      }

      // Também salvar no cache local para persistência garantida e ultra rápida
      saveCondominioConfigLocal(condominioId, defaultConfig);
    }
  } catch (err) {
    console.warn('Erro ao carregar dados do condomínio no supabase, usando cache local:', err);
  }

  return defaultConfig;
}

/**
 * Salva a configuração do condomínio no Supabase (com fallback tolerante) e no localStorage
 */
export async function salvarCondominioConfig(
  condominioId: string, 
  dados: Partial<CondominioConfig>
): Promise<CondominioConfig> {
  const atual = await carregarCondominioConfig(condominioId);
  const atualizada: CondominioConfig = {
    ...atual,
    ...dados,
    id: condominioId
  };

  // 1. Salvar no localStorage primeiro (garantia instantânea)
  saveCondominioConfigLocal(condominioId, atualizada);

  // 2. Tentar atualizar no Supabase com tolerância a colunas ausentes
  try {
    // Primeiro tenta atualizar apenas campos padrão
    const updateBasico: any = {
      nome: atualizada.nome,
      endereco: atualizada.endereco
    };

    // Tentar com as colunas extras
    const updateCompleto: any = {
      ...updateBasico,
      tipo_estrutura: atualizada.tipo_estrutura || 'casas',
      qtd_blocos: atualizada.qtd_blocos !== undefined ? Number(atualizada.qtd_blocos) : 1,
      unidades_por_bloco: atualizada.unidades_por_bloco !== undefined ? Number(atualizada.unidades_por_bloco) : 117,
      nomes_blocos: atualizada.nomes_blocos || '',
      whatsapp_grupo_url: atualizada.whatsapp_grupo_url,
      escala_plantao: atualizada.escala_plantao,
      horario_diurno_inicio: atualizada.horario_diurno_inicio,
      horario_noturno_inicio: atualizada.horario_noturno_inicio,
      telefone_portaria: atualizada.telefone_portaria,
      sindico_nome: atualizada.sindico_nome,
      sindico_whatsapp: atualizada.sindico_whatsapp
    };

    const { error: errCompleto } = await supabase
      .from('condominios')
      .update(updateCompleto)
      .eq('id', condominioId);

    if (errCompleto) {
      console.warn('Supabase não possui algumas colunas extras de condominios. Salvando dados básicos no banco:', errCompleto.message);
      // Fallback para campos nativos que com certeza existem
      await supabase
        .from('condominios')
        .update(updateBasico)
        .eq('id', condominioId);
    }
  } catch (err) {
    console.warn('Aviso ao sincronizar condominios no Supabase:', err);
  }

  return atualizada;
}

/**
 * Calcula o início e fim exatos do plantão atual com base na configuração do condomínio
 * Ex: Se a escala é 06:00 às 18:00 / 18:00 às 06:00 e agora são 14:00, o início foi às 06:00 de hoje.
 * Se a escala é 07:00 às 19:00 / 19:00 às 07:00 e agora são 03:00, o início foi às 19:00 de ontem.
 */
export function calcularPlantaoVigente(
  config?: CondominioConfig | null, 
  agora: Date = new Date()
): {
  inicio: Date;
  fim: Date;
  turnoAtual: 'diurno' | 'noturno';
  labelTurno: string;
  horasTurno: number;
} {
  const diurnoInicioStr = config?.horario_diurno_inicio || '06:00';
  const noturnoInicioStr = config?.horario_noturno_inicio || '18:00';

  const [hDiurno, mDiurno] = diurnoInicioStr.split(':').map(Number);
  const [hNoturno, mNoturno] = noturnoInicioStr.split(':').map(Number);

  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const minutosDiurno = (hDiurno || 6) * 60 + (mDiurno || 0);
  const minutosNoturno = (hNoturno || 18) * 60 + (mNoturno || 0);

  let inicio = new Date(agora);
  let fim = new Date(agora);
  let turnoAtual: 'diurno' | 'noturno' = 'diurno';
  let labelTurno = `Turno Diurno (${diurnoInicioStr} às ${noturnoInicioStr})`;

  if (minutosAgora >= minutosDiurno && minutosAgora < minutosNoturno) {
    // Estamos no Turno Diurno
    turnoAtual = 'diurno';
    labelTurno = `Turno Diurno (${diurnoInicioStr} às ${noturnoInicioStr})`;
    
    inicio.setHours(hDiurno || 6, mDiurno || 0, 0, 0);
    fim.setHours(hNoturno || 18, mNoturno || 0, 0, 0);
  } else {
    // Estamos no Turno Noturno
    turnoAtual = 'noturno';
    labelTurno = `Turno Noturno (${noturnoInicioStr} às ${diurnoInicioStr})`;

    if (minutosAgora >= minutosNoturno) {
      // Início foi hoje às horas do turno noturno, fim é amanhã no início do diurno
      inicio.setHours(hNoturno || 18, mNoturno || 0, 0, 0);
      
      fim.setDate(fim.getDate() + 1);
      fim.setHours(hDiurno || 6, mDiurno || 0, 0, 0);
    } else {
      // Início foi ontem às horas do turno noturno, fim é hoje no início do diurno
      inicio.setDate(inicio.getDate() - 1);
      inicio.setHours(hNoturno || 18, mNoturno || 0, 0, 0);

      fim.setHours(hDiurno || 6, mDiurno || 0, 0, 0);
    }
  }

  const diffMs = agora.getTime() - inicio.getTime();
  const horasTurno = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  return {
    inicio,
    fim,
    turnoAtual,
    labelTurno,
    horasTurno
  };
}
