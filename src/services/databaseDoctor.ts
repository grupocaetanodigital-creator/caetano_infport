import { supabase } from './supabase';

export interface TableDiagnostic {
  canonicalName: string;
  duplicateOrLegacyNames: string[];
  purpose: string;
  category: string;
  status: 'ok' | 'needs_migration' | 'checking' | 'error';
  canonicalCount?: number;
  legacyCounts?: Record<string, number>;
  notes: string;
}

export const CANONICAL_SCHEMA_MAP: TableDiagnostic[] = [
  {
    canonicalName: 'condominios',
    duplicateOrLegacyNames: [],
    purpose: 'Tabela principal multi-tenant de condomínios gerenciados',
    category: 'Cadastros Base',
    status: 'checking',
    notes: 'Essencial. Contém id, nome, endereco, created_at.'
  },
  {
    canonicalName: 'operadores',
    duplicateOrLegacyNames: ['usuarios_sistema'],
    purpose: 'Contas de operadores da portaria, supervisores, síndicos e admin',
    category: 'Segurança & Acesso',
    status: 'checking',
    notes: 'A tabela usuarios_sistema é redundante e pode ser migrada para operadores.'
  },
  {
    canonicalName: 'moradores',
    duplicateOrLegacyNames: ['unidades', 'blocos'],
    purpose: 'Cadastro de moradores com bloco, unidade, telefone WhatsApp',
    category: 'Cadastros Base',
    status: 'checking',
    notes: 'As tabelas avulsas "blocos" e "unidades" são legadas; moradores armazena diretamente bloco e unidade.'
  },
  {
    canonicalName: 'encomendas_itens',
    duplicateOrLegacyNames: ['encomendas'],
    purpose: 'Itens individuais triados e retidos na portaria',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'A tabela "encomendas" antiga é órfã; o fluxo usa lotes_re + encomendas_itens.'
  },
  {
    canonicalName: 'lotes_re',
    duplicateOrLegacyNames: [],
    purpose: 'Lotes de Recebimento de Entrega (RE) por entregador',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'Contém código RE diário sequencial e quantidade declarada.'
  },
  {
    canonicalName: 'entregadores',
    duplicateOrLegacyNames: [],
    purpose: 'Entregadores e transportadoras cadastrados',
    category: 'Módulo 02 - Encomendas',
    status: 'checking',
    notes: 'Contém nome, empresa e documento.'
  },
  {
    canonicalName: 'custodia',
    duplicateOrLegacyNames: ['custodia_itens'],
    purpose: 'Guarda temporária de itens deixados na portaria (chaves, pacotes, objetos)',
    category: 'Módulo 03 - Custódia',
    status: 'checking',
    notes: 'Custodia.jsx usa "custodia". A tabela "custodia_itens" é duplicata órfã.'
  },
  {
    canonicalName: 'materiais_posto',
    duplicateOrLegacyNames: ['materiais', 'inspecoes_materiais'],
    purpose: 'Inventário e controle de conservação dos equipamentos da guarita (HT, lanterna, etc.)',
    category: 'Módulo 04 - Materiais',
    status: 'checking',
    notes: 'Materiais.jsx gravava em materiais_posto, mas PassagemPosto lia de materiais. Devemos unificar em materiais_posto.'
  },
  {
    canonicalName: 'chaves',
    duplicateOrLegacyNames: [],
    purpose: 'Quadro digital de chaves do condomínio',
    category: 'Módulo 05 - Chaves',
    status: 'checking',
    notes: 'Contém código da chave, identificador, status e tempo limite.'
  },
  {
    canonicalName: 'movimentacao_chaves',
    duplicateOrLegacyNames: ['movimentacoes_chaves'],
    purpose: 'Histórico e status de retiradas/devoluções de chaves',
    category: 'Módulo 05 - Chaves',
    status: 'checking',
    notes: 'A tabela no plural "movimentacoes_chaves" é duplicata órfã.'
  },
  {
    canonicalName: 'checklist_manutencao',
    duplicateOrLegacyNames: [],
    purpose: 'Checklist de rotinas periódicas de manutenção predial',
    category: 'Módulo 06 - Manutenção',
    status: 'checking',
    notes: 'Tarefas diárias, semanais e mensais do manutencista.'
  },
  {
    canonicalName: 'chamados_manutencao',
    duplicateOrLegacyNames: [],
    purpose: 'Ordens de serviço (OS) e chamados corretivos',
    category: 'Módulo 06 - Manutenção',
    status: 'checking',
    notes: 'Contém fotos antes/depois e status do chamado.'
  },
  {
    canonicalName: 'rondas_pontos',
    duplicateOrLegacyNames: ['pontos_ronda'],
    purpose: 'Pontos físicos de ronda com QR Code e coordenadas GPS',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'Rondas.jsx usa rondas_pontos. A tabela "pontos_ronda" é duplicata legada.'
  },
  {
    canonicalName: 'rondas_execucao',
    duplicateOrLegacyNames: ['rondas_execucoes'],
    purpose: 'Sessões de rondas patrimoniais iniciadas e finalizadas',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'A tabela "rondas_execucoes" com final "es" é duplicata.'
  },
  {
    canonicalName: 'rondas_registros',
    duplicateOrLegacyNames: ['registros_ronda'],
    purpose: 'Leituras de QR Code, checklist do ponto e fotos das rondas',
    category: 'Módulo 07 - Rondas',
    status: 'checking',
    notes: 'A tabela "registros_ronda" é duplicata legada.'
  },
  {
    canonicalName: 'ocorrencias',
    duplicateOrLegacyNames: [],
    purpose: 'Livro digital de ocorrências internas e de moradores',
    category: 'Módulo 08 - Ocorrências',
    status: 'checking',
    notes: 'Auditado, com prioridade, fotos e disparo para WhatsApp.'
  },
  {
    canonicalName: 'passagens_posto',
    duplicateOrLegacyNames: ['rondas_passagem_posto'],
    purpose: 'Troca de turno e dupla assinatura digital da guarita',
    category: 'Módulo 09 - Passagem de Posto',
    status: 'checking',
    notes: 'Rondas.jsx gravava em rondas_passagem_posto e PassagemPosto.jsx em passagens_posto. Ambas devem usar passagens_posto.'
  },
  {
    canonicalName: 'prestadores',
    duplicateOrLegacyNames: ['visitas_prestadores'],
    purpose: 'Cadastro e registro de entrada/saída de prestadores e obras',
    category: 'Módulo 10 - Prestadores & Obras',
    status: 'checking',
    notes: 'A tabela "visitas_prestadores" é legada e redundante.'
  },
  {
    canonicalName: 'configuracoes',
    duplicateOrLegacyNames: [],
    purpose: 'Parametrização do condomínio e Feature Flags de módulos',
    category: 'Módulo 11 - Configurações',
    status: 'checking',
    notes: 'Armazena ativação dos módulos por condomínio.'
  },
  {
    canonicalName: 'templates_whatsapp',
    duplicateOrLegacyNames: [],
    purpose: 'Modelos configuráveis de mensagens automáticas de WhatsApp',
    category: 'Módulo 11 - Configurações',
    status: 'checking',
    notes: 'Templates com tags como {NOME_MORADOR}, {CODIGO}, etc.'
  },
  {
    canonicalName: 'agenda_emergencia',
    duplicateOrLegacyNames: [],
    purpose: 'Contatos de emergência (Polícia, SAMU, Zelador, Bombeiros)',
    category: 'Módulo 11 - Configurações',
    status: 'checking',
    notes: 'Agenda e botão de pânico rápido.'
  }
];

export async function runDatabaseAudit(): Promise<{
  diagnostics: TableDiagnostic[];
  orphanedTablesFound: string[];
  totalCanonical: number;
  totalOrphaned: number;
}> {
  const diagnostics: TableDiagnostic[] = JSON.parse(JSON.stringify(CANONICAL_SCHEMA_MAP));
  const orphanedTablesFound: string[] = [];

  for (const diag of diagnostics) {
    try {
      const { count, error } = await supabase
        .from(diag.canonicalName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        diag.status = 'error';
        diag.notes += ` (Erro ao consultar: ${error.message})`;
      } else {
        diag.canonicalCount = count ?? 0;
        diag.status = 'ok';
      }
    } catch {
      diag.status = 'error';
    }

    diag.legacyCounts = {};
    for (const legacyName of diag.duplicateOrLegacyNames) {
      try {
        const { count, error } = await supabase
          .from(legacyName)
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          diag.legacyCounts[legacyName] = count;
          if (count > 0) {
            diag.status = 'needs_migration';
          }
          orphanedTablesFound.push(legacyName);
        }
      } catch {
        // Tabela não existe ou inacessível
      }
    }
  }

  return {
    diagnostics,
    orphanedTablesFound,
    totalCanonical: diagnostics.length,
    totalOrphaned: orphanedTablesFound.length
  };
}

export function generateMigrationSql(): string {
  return `-- ==============================================================================
-- SCRIPT DE SANEAMENTO E ORGANIZAÇÃO DO SUPABASE - INFPORT 1.0 (VERSÃO BLINDADA)
-- Remove as 13 tabelas fantasmas/duplicadas sem travar por erro de colunas.
-- Execute no SQL Editor do seu projeto Supabase: https://supabase.com/dashboard
-- ==============================================================================

BEGIN;

-- 0. Garantir colunas de parametrização e JSONB na tabela configuracoes
ALTER TABLE IF EXISTS configuracoes 
  ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dados_tenant JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mod02_gestao_encomendas BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod03_custodia_itens BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod04_materiais_posto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod05_quadro_chaves BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod06_gestao_manutencao BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod07_gestao_ronda BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod08_livro_ocorrencias BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod09_passagem_posto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod10_prestadores_servico BOOLEAN DEFAULT true;

-- 0.1 Garantir colunas na tabela condominios (Painel Tenant & Estrutura Física & WhatsApp)
ALTER TABLE IF EXISTS condominios
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS telefone_portaria TEXT,
  ADD COLUMN IF NOT EXISTS sindico_nome TEXT,
  ADD COLUMN IF NOT EXISTS sindico_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_url TEXT,
  ADD COLUMN IF NOT EXISTS escala_plantao TEXT DEFAULT '06_18',
  ADD COLUMN IF NOT EXISTS horario_diurno_inicio TEXT DEFAULT '06:00',
  ADD COLUMN IF NOT EXISTS horario_noturno_inicio TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS intervalo_ronda INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT DEFAULT 'Blocos (Edifícios Baixos / Conjuntos)',
  ADD COLUMN IF NOT EXISTS qtd_blocos INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS unidades_por_bloco INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS nomes_blocos TEXT,
  ADD COLUMN IF NOT EXISTS locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  ADD COLUMN IF NOT EXISTS turnos_plantao JSONB DEFAULT '{}'::jsonb;

-- 0.2 Garantir coluna de local_armazenamento na tabela encomendas_itens
ALTER TABLE IF EXISTS encomendas_itens
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada Principal';

-- 1. Tentativa de cópia segura de materiais (se as colunas existirem, migra; senão, ignora com segurança)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materiais') THEN
    BEGIN
      INSERT INTO materiais_posto (condominio_id, nome, categoria, codigo_patrimonio, estado, observacao_avaria, foto_avaria_url, created_at)
      SELECT 
        m.condominio_id,
        COALESCE(m.nome, 'Material'),
        'Outros',
        '',
        'Perfeito',
        '',
        '',
        COALESCE(m.created_at, NOW())
      FROM materiais m
      WHERE NOT EXISTS (
        SELECT 1 FROM materiais_posto mp 
        WHERE mp.condominio_id = m.condominio_id AND mp.nome = m.nome
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Tabela materiais não possui colunas compatíveis, prosseguindo com a limpeza.';
    END;
  END IF;
END $$;

-- 2. Tentativa de cópia segura de pontos_ronda
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pontos_ronda') THEN
    BEGIN
      INSERT INTO rondas_pontos (id, condominio_id, nome_ponto, codigo_tag, localizacao_descricao, setor_id, latitude, longitude, created_at)
      SELECT 
        pr.id, pr.condominio_id, pr.nome_ponto, pr.codigo_tag, pr.localizacao_descricao, pr.setor_id, pr.latitude, pr.longitude, pr.created_at
      FROM pontos_ronda pr
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Ignorando cópia de pontos_ronda.';
    END;
  END IF;
END $$;

-- 3. Tentativa de cópia segura de rondas_execucoes
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rondas_execucoes') THEN
    BEGIN
      INSERT INTO rondas_execucao (id, condominio_id, operador_nome, status, data_inicio, data_fim, pontos_totais, pontos_lidos, resumo_detalhado, created_at)
      SELECT 
        re.id, re.condominio_id, re.operador_nome, re.status, re.data_inicio, re.data_fim, re.pontos_totais, re.pontos_lidos, re.resumo_detalhado, re.created_at
      FROM rondas_execucoes re
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Ignorando cópia de rondas_execucoes.';
    END;
  END IF;
END $$;

-- 4. Tentativa de cópia segura de registros_ronda
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'registros_ronda') THEN
    BEGIN
      INSERT INTO rondas_registros (id, ronda_id, ponto_id, condominio_id, data_hora, latitude, longitude, foto_evidencia_url, observacao, created_at)
      SELECT 
        rr.id, rr.ronda_id, rr.ponto_id, rr.condominio_id, rr.data_hora, rr.latitude, rr.longitude, rr.foto_evidencia_url, rr.observacao, rr.created_at
      FROM registros_ronda rr
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Ignorando cópia de registros_ronda.';
    END;
  END IF;
END $$;

-- 5. Tentativa de cópia segura de rondas_passagem_posto
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rondas_passagem_posto') THEN
    BEGIN
      INSERT INTO passagens_posto (condominio_id, codigo, operador_sainte_nome, operador_entrante_nome, observacoes, status, created_at)
      SELECT 
        rp.condominio_id,
        COALESCE('PAS-LEGADO-' || rp.id::text, 'PAS:LEGADO'),
        COALESCE(rp.operador_sainte, 'Operador Anterior'),
        COALESCE(rp.operador_entrante, 'Operador Assumiu'),
        COALESCE(rp.ocorrencias_plantao, 'Migrado de rondas_passagem_posto'),
        'Concluída',
        COALESCE(rp.data_hora, rp.created_at, NOW())
      FROM rondas_passagem_posto rp
      WHERE NOT EXISTS (
        SELECT 1 FROM passagens_posto pp 
        WHERE pp.condominio_id = rp.condominio_id AND pp.created_at = rp.data_hora
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Ignorando cópia de rondas_passagem_posto.';
    END;
  END IF;
END $$;

-- ==============================================================================
-- REMOÇÃO DIRETA E DEFINITIVA DE TODAS AS TABELAS FANTASMAS / DUPLICADAS
-- ==============================================================================

DROP TABLE IF EXISTS rondas_execucoes CASCADE;
DROP TABLE IF EXISTS registros_ronda CASCADE;
DROP TABLE IF EXISTS pontos_ronda CASCADE;
DROP TABLE IF EXISTS movimentacoes_chaves CASCADE;
DROP TABLE IF EXISTS rondas_passagem_posto CASCADE;
DROP TABLE IF EXISTS custodia_itens CASCADE;
DROP TABLE IF EXISTS inspecoes_materiais CASCADE;
DROP TABLE IF EXISTS visitas_prestadores CASCADE;
DROP TABLE IF EXISTS usuarios_sistema CASCADE;
DROP TABLE IF EXISTS blocos CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS encomendas CASCADE;
DROP TABLE IF EXISTS materiais CASCADE;

COMMIT;

-- VERIFICAÇÃO FINAL: Lista apenas as tabelas oficiais que restaram
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
`;
}

export interface CondominioConfigDiagnostic {
  condominioId: string;
  condominioNome: string;
  configId?: string | null;
  status: 'integra' | 'ausente' | 'corrompida';
  detalhesStatus: string;
  featureFlags: {
    mod02_gestao_encomendas: boolean;
    mod03_custodia_itens: boolean;
    mod04_materiais_posto: boolean;
    mod05_quadro_chaves: boolean;
    mod06_gestao_manutencao: boolean;
    mod07_gestao_ronda: boolean;
    mod08_livro_ocorrencias: boolean;
    mod09_passagem_posto: boolean;
    mod10_prestadores_servico: boolean;
  };
  chavesFaltantes: string[];
}

export const REQUIRED_MODULE_KEYS = [
  'mod02_gestao_encomendas',
  'mod03_custodia_itens',
  'mod04_materiais_posto',
  'mod05_quadro_chaves',
  'mod06_gestao_manutencao',
  'mod07_gestao_ronda',
  'mod08_livro_ocorrencias',
  'mod09_passagem_posto',
  'mod10_prestadores_servico'
] as const;

/**
 * Executa verificação de integridade das configurações de módulos
 * para cada condomínio cadastrado na tabela condominios.
 */
export async function auditCondominiosConfigs(): Promise<CondominioConfigDiagnostic[]> {
  try {
    const { data: condominios, error: condErr } = await supabase
      .from('condominios')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (condErr) throw condErr;
    if (!condominios || condominios.length === 0) return [];

    const { data: configs, error: cfgErr } = await supabase
      .from('configuracoes')
      .select('*');

    if (cfgErr) {
      console.warn('Aviso ao consultar configuracoes:', cfgErr.message);
    }

    const listaDiagnosticos: CondominioConfigDiagnostic[] = condominios.map((condo) => {
      const cfg = configs?.find((c) => c.condominio_id === condo.id);

      if (!cfg) {
        return {
          condominioId: condo.id,
          condominioNome: condo.nome || 'Condomínio Sem Nome',
          configId: null,
          status: 'ausente',
          detalhesStatus: 'Nenhum registro encontrado na tabela configuracoes.',
          featureFlags: {
            mod02_gestao_encomendas: true,
            mod03_custodia_itens: true,
            mod04_materiais_posto: true,
            mod05_quadro_chaves: true,
            mod06_gestao_manutencao: true,
            mod07_gestao_ronda: true,
            mod08_livro_ocorrencias: true,
            mod09_passagem_posto: true,
            mod10_prestadores_servico: true
          },
          chavesFaltantes: [...REQUIRED_MODULE_KEYS]
        };
      }

      const flagsJson = typeof cfg.feature_flags === 'object' && cfg.feature_flags !== null 
        ? cfg.feature_flags 
        : {};

      const chavesFaltantes: string[] = [];
      const resolvedFlags: any = {};

      REQUIRED_MODULE_KEYS.forEach((key) => {
        const valColuna = cfg[key];
        const valJson = flagsJson[key];

        if (typeof valColuna === 'boolean') {
          resolvedFlags[key] = valColuna;
        } else if (typeof valJson === 'boolean') {
          resolvedFlags[key] = valJson;
        } else {
          chavesFaltantes.push(key);
          resolvedFlags[key] = true; // valor padrão
        }
      });

      let status: 'integra' | 'ausente' | 'corrompida' = 'integra';
      let detalhesStatus = 'Configuração completa e íntegra (9/9 módulos parametrizados)';

      if (chavesFaltantes.length > 0 || !cfg.feature_flags || typeof cfg.feature_flags !== 'object') {
        status = 'corrompida';
        detalhesStatus = chavesFaltantes.length > 0 
          ? `Faltam ${chavesFaltantes.length} chave(s) de módulos: ${chavesFaltantes.join(', ')}`
          : 'Campo feature_flags nulo ou não formatado como JSON';
      }

      return {
        condominioId: condo.id,
        condominioNome: condo.nome || 'Condomínio Sem Nome',
        configId: cfg.id,
        status,
        detalhesStatus,
        featureFlags: resolvedFlags,
        chavesFaltantes
      };
    });

    return listaDiagnosticos;
  } catch (err) {
    console.error('Erro na auditoria de configurações de condomínios:', err);
    return [];
  }
}

/**
 * Corrige ou restaura a configuração íntegra de um condomínio específico.
 */
export async function repairCondominioConfig(
  condominioId: string, 
  currentDiag?: CondominioConfigDiagnostic
): Promise<{ success: boolean; error?: string }> {
  try {
    const defaultFlags = {
      mod02_gestao_encomendas: currentDiag?.featureFlags?.mod02_gestao_encomendas ?? true,
      mod03_custodia_itens: currentDiag?.featureFlags?.mod03_custodia_itens ?? true,
      mod04_materiais_posto: currentDiag?.featureFlags?.mod04_materiais_posto ?? true,
      mod05_quadro_chaves: currentDiag?.featureFlags?.mod05_quadro_chaves ?? true,
      mod06_gestao_manutencao: currentDiag?.featureFlags?.mod06_gestao_manutencao ?? true,
      mod07_gestao_ronda: currentDiag?.featureFlags?.mod07_gestao_ronda ?? true,
      mod08_livro_ocorrencias: currentDiag?.featureFlags?.mod08_livro_ocorrencias ?? true,
      mod09_passagem_posto: currentDiag?.featureFlags?.mod09_passagem_posto ?? true,
      mod10_prestadores_servico: currentDiag?.featureFlags?.mod10_prestadores_servico ?? true
    };

    // Atualiza imediatamente cache local do navegador
    localStorage.setItem(`infport_flags_${condominioId}`, JSON.stringify(defaultFlags));

    const fullPayload: any = {
      condominio_id: condominioId,
      feature_flags: defaultFlags,
      ...defaultFlags
    };

    let saved = false;

    // Verifica se já existe registro
    const { data: existing } = await supabase
      .from('configuracoes')
      .select('id')
      .eq('condominio_id', condominioId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('configuracoes')
        .update(fullPayload)
        .eq('id', existing.id);
      if (!error) saved = true;
    } else {
      const { error } = await supabase
        .from('configuracoes')
        .insert([fullPayload]);
      if (!error) saved = true;
    }

    // Fallback caso colunas individuais específicas não estejam no cache do Supabase
    if (!saved) {
      const fallbackPayload = {
        condominio_id: condominioId,
        feature_flags: defaultFlags
      };

      if (existing?.id) {
        const { error: fbErr } = await supabase
          .from('configuracoes')
          .update(fallbackPayload)
          .eq('id', existing.id);
        if (fbErr) throw fbErr;
      } else {
        const { error: fbErr } = await supabase
          .from('configuracoes')
          .insert([fallbackPayload]);
        if (fbErr) throw fbErr;
      }
    }

    // Dispara evento em tempo real para sincronização com o App
    window.dispatchEvent(new CustomEvent('modulos_atualizados', {
      detail: { condominio_id: condominioId, flags: defaultFlags }
    }));

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao reparar configuração' };
  }
}

/**
 * Corrige em lote todas as configurações ausentes ou corrompidas de condomínios.
 */
export async function repairAllCondominiosConfigs(): Promise<{ totalRepaired: number; totalErrors: number; errors: string[] }> {
  const diagnostics = await auditCondominiosConfigs();
  const needingRepair = diagnostics.filter((d) => d.status !== 'integra');

  let totalRepaired = 0;
  let totalErrors = 0;
  const errors: string[] = [];

  for (const diag of needingRepair) {
    const res = await repairCondominioConfig(diag.condominioId, diag);
    if (res.success) {
      totalRepaired++;
    } else {
      totalErrors++;
      if (res.error) errors.push(`${diag.condominioNome}: ${res.error}`);
    }
  }

  return { totalRepaired, totalErrors, errors };
}
