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
    sindico_whatsapp: ''
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
