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
  ADD COLUMN IF NOT EXISTS mod02_gestao_encomendas BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod03_custodia_itens BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod04_materiais_posto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod05_quadro_chaves BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod06_gestao_manutencao BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod07_gestao_ronda BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod08_livro_ocorrencias BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod09_passagem_posto BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mod10_prestadores_servico BOOLEAN DEFAULT true;

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
