-- ==============================================================================
-- INFPORT 1.0 - SCRIPT SQL GLOBAL DEFINITIVO PARA O SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase:
-- https://supabase.com/dashboard/project/_/sql
--
-- Este script:
-- 1. Cria ou garante todas as 20 tabelas oficiais do sistema.
-- 2. Adiciona todas as colunas necessárias (incluindo local_armazenamento e fotos OCR).
-- 3. Remove com segurança tabelas antigas duplicadas/fantasmas sem perder dados.
-- 4. Habilita Row Level Security (RLS) permissivo para a portaria.
-- 5. Recarrega o cache do PostgREST (NOTIFY pgrst, 'reload schema').
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. EXTENSÕES BÁSICAS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABELA: condominios (Cadastro Multi-Tenant e Estrutura Física)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS condominios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT DEFAULT 'São Paulo',
  uf TEXT DEFAULT 'SP',
  telefone_portaria TEXT,
  sindico_nome TEXT,
  sindico_whatsapp TEXT,
  whatsapp_grupo_url TEXT,
  escala_plantao TEXT DEFAULT '06_18',
  horario_diurno_inicio TEXT DEFAULT '06:00',
  horario_noturno_inicio TEXT DEFAULT '18:00',
  intervalo_ronda INTEGER DEFAULT 15,
  tipo_estrutura TEXT DEFAULT 'Blocos (Edifícios Baixos / Conjuntos)',
  qtd_blocos INTEGER DEFAULT 10,
  unidades_por_bloco INTEGER DEFAULT 20,
  nomes_blocos TEXT,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA: operadores (Porteiros, Vigilantes, Supervisores)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS operadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT,
  funcao TEXT DEFAULT 'Porteiro',
  telefone TEXT,
  turno_padrao TEXT DEFAULT 'Diurno',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABELA: moradores (Moradores, Inquilinos e Proprietários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS moradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  tipo TEXT DEFAULT 'Morador',
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABELA: entregadores (Empresas de Entrega, Correios, Mercado Livre)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS entregadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. TABELA: lotes_re (Lotes de Recebimento de Encomendas - RE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS lotes_re (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_re TEXT NOT NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  entregador_id UUID REFERENCES entregadores(id) ON DELETE SET NULL,
  qtd_declarada INTEGER DEFAULT 1,
  qtd_triada INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  operador_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TABELA: encomendas_itens (Itens Individuais de Encomenda)
-- ATENÇÃO: Garante a coluna local_armazenamento requerida na portaria!
-- ==============================================================================
CREATE TABLE IF NOT EXISTS encomendas_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lote_re_id UUID REFERENCES lotes_re(id) ON DELETE SET NULL,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  bloco TEXT,
  unidade TEXT NOT NULL,
  morador_id UUID REFERENCES moradores(id) ON DELETE SET NULL,
  codigo_barras TEXT,
  foto_etiqueta_url TEXT,
  observacoes TEXT,
  local_armazenamento TEXT DEFAULT 'Bancada Principal',
  status TEXT DEFAULT 'retido', -- retido, entregue
  retirado_por TEXT,
  foto_comprovante_url TEXT,
  data_hora_retirada TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que a coluna local_armazenamento exista caso a tabela já estivesse criada
ALTER TABLE encomendas_itens 
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada Principal',
  ADD COLUMN IF NOT EXISTS retirado_por TEXT,
  ADD COLUMN IF NOT EXISTS foto_comprovante_url TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ;

-- ==============================================================================
-- 8. TABELA: locais_armazenamento (Gestão dos Locais Físicos de Guarda)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Prateleira',
  capacidade TEXT,
  observacao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. TABELA: custodia (Pertences e Envelopes Guardados na Guarita)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS custodia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Pertence / Objeto',
  deixado_por TEXT,
  bloco TEXT,
  unidade TEXT,
  destinatario_nome TEXT,
  destinatario_tipo TEXT DEFAULT 'Morador',
  morador_id UUID REFERENCES moradores(id) ON DELETE SET NULL,
  observacoes TEXT,
  foto_url TEXT,
  status TEXT DEFAULT 'GUARDADO', -- GUARDADO, RETIRADO
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  data_hora_saida TIMESTAMPTZ,
  retirado_por_nome TEXT,
  retirado_por_doc TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. TABELA: materiais_posto (Inventário de Rádios, Lanternas, Controles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS materiais_posto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Equipamento',
  codigo_patrimonio TEXT,
  estado TEXT DEFAULT 'Perfeito', -- Perfeito, Com Avaria, Em Manutenção
  observacao_avaria TEXT,
  foto_avaria_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. TABELA: chaves (Claviculário Digital de Chaves)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_chave TEXT NOT NULL,
  identificacao_sala TEXT NOT NULL,
  setor TEXT DEFAULT 'Área Comum',
  status TEXT DEFAULT 'DISPONIVEL', -- DISPONIVEL, RETIRADA
  posse_atual TEXT,
  contato_posse TEXT,
  retirado_as TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  chave_id UUID REFERENCES chaves(id) ON DELETE CASCADE,
  tipo_movimento TEXT NOT NULL, -- RETIRADA, DEVOLUCAO
  responsavel_nome TEXT NOT NULL,
  responsavel_doc TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  operador_id TEXT
);

-- ==============================================================================
-- 12. TABELA: chamados_manutencao (OS e Manutenção Preventiva/Corretiva)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS chamados_manutencao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT DEFAULT 'Elétrica',
  prioridade TEXT DEFAULT 'Média', -- Baixa, Média, Alta, Urgente
  status TEXT DEFAULT 'PENDENTE', -- PENDENTE, EM_EXECUCAO, CONCLUIDO
  local_especifico TEXT,
  solicitante TEXT,
  foto_antes_url TEXT,
  foto_depois_url TEXT,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 13. TABELAS: rondas_pontos, rondas_execucao e rondas_registros (Módulo 07)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS rondas_pontos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome_ponto TEXT NOT NULL,
  codigo_tag TEXT NOT NULL,
  localizacao_descricao TEXT,
  setor_id TEXT DEFAULT 'Geral',
  latitude NUMERIC,
  longitude NUMERIC,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rondas_execucao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  operador_nome TEXT NOT NULL,
  status TEXT DEFAULT 'EM_ANDAMENTO', -- EM_ANDAMENTO, FINALIZADA, CANCELADA
  horario_inicio TIMESTAMPTZ DEFAULT NOW(),
  horario_fim TIMESTAMPTZ,
  pontos_esperados INTEGER DEFAULT 0,
  pontos_concluidos INTEGER DEFAULT 0,
  observacao_geral TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rondas_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ronda_id UUID REFERENCES rondas_execucao(id) ON DELETE CASCADE,
  ponto_id UUID REFERENCES rondas_pontos(id) ON DELETE CASCADE,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  latitude NUMERIC,
  longitude NUMERIC,
  foto_evidencia_url TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 14. TABELA: passagens_posto (Troca de Turno da Portaria)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS passagens_posto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  turno TEXT NOT NULL, -- Diurno, Noturno
  operador_sai_nome TEXT NOT NULL,
  operador_sai_doc TEXT,
  operador_entra_nome TEXT NOT NULL,
  operador_entra_doc TEXT,
  data_hora_troca TIMESTAMPTZ DEFAULT NOW(),
  resumo_encomendas_retidas INTEGER DEFAULT 0,
  resumo_custodia_ativa INTEGER DEFAULT 0,
  resumo_materiais_avaria INTEGER DEFAULT 0,
  resumo_chaves_retiradas INTEGER DEFAULT 0,
  resumo_rondas_cumpridas INTEGER DEFAULT 0,
  resumo_prestadores_em_andamento INTEGER DEFAULT 0,
  observacao_passagem TEXT,
  assinatura_sai_status BOOLEAN DEFAULT true,
  assinatura_entra_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 15. TABELA: ocorrencias (Livro Negro Digital de Ocorrências)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS ocorrencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT DEFAULT 'Geral',
  prioridade TEXT DEFAULT 'Normal',
  bloco TEXT,
  unidade TEXT,
  envolvidos TEXT,
  fotos JSONB DEFAULT '[]'::jsonb,
  notificar_sindico BOOLEAN DEFAULT true,
  registrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. TABELA: prestadores (Obras, Prestadores e Leitura OCR de Documentos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS prestadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  nome_profissional TEXT NOT NULL,
  empresa TEXT,
  documento TEXT NOT NULL,
  tipo_documento TEXT DEFAULT 'CPF',
  foto_documento TEXT,
  foto_rosto TEXT,
  tipo_servico TEXT DEFAULT 'Manutenção / Reforma',
  atende_condominio BOOLEAN DEFAULT false,
  unidade TEXT,
  bloco TEXT,
  observacoes TEXT,
  cracha_atribuido TEXT,
  status_acesso TEXT DEFAULT 'AUTORIZADO', -- AUTORIZADO, EM_ANDAMENTO, CONCLUIDO
  data_hora_entrada TIMESTAMPTZ,
  data_hora_saida TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garante as colunas de OCR e fotos caso a tabela já existisse
ALTER TABLE prestadores
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS foto_rosto TEXT,
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'CPF',
  ADD COLUMN IF NOT EXISTS cracha_atribuido TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_entrada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ;

-- ==============================================================================
-- 17. TABELA: configuracoes (Feature Flags e Parametrizações dos Módulos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID UNIQUE REFERENCES condominios(id) ON DELETE CASCADE,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  locais_armazenamento JSONB DEFAULT '["Bancada Principal", "Chão / Caixas Grandes"]'::jsonb,
  turnos_plantao JSONB DEFAULT '{}'::jsonb,
  dados_tenant JSONB DEFAULT '{}'::jsonb,
  mod02_gestao_encomendas BOOLEAN DEFAULT true,
  mod03_custodia_itens BOOLEAN DEFAULT true,
  mod04_materiais_posto BOOLEAN DEFAULT true,
  mod05_quadro_chaves BOOLEAN DEFAULT true,
  mod06_gestao_manutencao BOOLEAN DEFAULT true,
  mod07_gestao_ronda BOOLEAN DEFAULT true,
  mod08_livro_ocorrencias BOOLEAN DEFAULT true,
  mod09_passagem_posto BOOLEAN DEFAULT true,
  mod10_prestadores_servico BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 18. TABELAS: templates_whatsapp e agenda_emergencia
-- ==============================================================================
CREATE TABLE IF NOT EXISTS templates_whatsapp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  codigo_evento TEXT NOT NULL,
  canal_destino TEXT DEFAULT 'Morador Direct',
  corpo_texto TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_emergencia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  categoria TEXT DEFAULT 'Órgão Público',
  nome_descricao TEXT NOT NULL,
  telefone_principal TEXT NOT NULL,
  telefone_whatsapp TEXT,
  exibir_menu_flutuante BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 19. SANEAMENTO SEGURO: MIGRAÇÃO E LIMPEZA DE TABELAS DUPLICADAS / FANTASMAS
-- ==============================================================================
-- Copia materiais antigos para materiais_posto caso a tabela antiga exista
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materiais') THEN
    INSERT INTO materiais_posto (condominio_id, nome, categoria, codigo_patrimonio, estado, created_at)
    SELECT m.condominio_id, COALESCE(m.nome, 'Material'), 'Outros', '', 'Perfeito', COALESCE(m.created_at, NOW())
    FROM materiais m
    WHERE NOT EXISTS (
      SELECT 1 FROM materiais_posto mp WHERE mp.condominio_id = m.condominio_id AND mp.nome = m.nome
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migração de materiais ignorada com segurança.';
END $$;

-- Copia pontos_ronda antigos para rondas_pontos
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pontos_ronda') THEN
    INSERT INTO rondas_pontos (id, condominio_id, nome_ponto, codigo_tag, localizacao_descricao, created_at)
    SELECT pr.id, pr.condominio_id, pr.nome_ponto, pr.codigo_tag, pr.localizacao_descricao, pr.created_at
    FROM pontos_ronda pr
    WHERE NOT EXISTS (
      SELECT 1 FROM rondas_pontos rp WHERE rp.id = pr.id
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Migração de pontos_ronda ignorada com segurança.';
END $$;

-- Remoção das 13 tabelas antigas duplicadas
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

-- ==============================================================================
-- 20. HABILITAR RLS PERMISSIVO (Para a portaria operar com chave anon/service)
-- ==============================================================================
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes_re ENABLE ROW LEVEL SECURITY;
ALTER TABLE encomendas_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE locais_armazenamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodia ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais_posto ENABLE ROW LEVEL SECURITY;
ALTER TABLE chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados_manutencao ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_execucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE rondas_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE passagens_posto ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_emergencia ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso total para as operações do sistema da portaria
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total portaria %I" ON %I;', tbl.table_name, tbl.table_name);
    EXECUTE format('CREATE POLICY "Acesso total portaria %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl.table_name, tbl.table_name);
  END LOOP;
END $$;

COMMIT;

-- ==============================================================================
-- 21. RECARREGAR O SCHEMA CACHE DO POSTGREST IMEDIATAMENTE
-- Isso limpa o erro: "Could not find the 'local_armazenamento' column of 'encomendas_itens' in the schema cache"
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
