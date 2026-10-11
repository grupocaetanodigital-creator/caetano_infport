-- ==============================================================================
-- INFPORT 1.0 — SCRIPT MESTRE DE CORREÇÃO DEFINITIVA (SUPABASE)
-- 
-- 1. Remove restrição conflitante "lotes_re_codigo_re_key"
-- 2. Adiciona todas as colunas ausentes em todas as tabelas (sem falhas de coluna inexistente)
-- 3. Habilita RLS com políticas irrestritas para anon e authenticated
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA: condominios
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  endereco TEXT,
  cnpj TEXT,
  telefone_portaria TEXT,
  sindico_nome TEXT,
  sindico_whatsapp TEXT,
  whatsapp_grupo_portaria TEXT,
  tipo_estrutura TEXT DEFAULT 'predio',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.condominios
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS telefone_portaria TEXT,
  ADD COLUMN IF NOT EXISTS sindico_nome TEXT,
  ADD COLUMN IF NOT EXISTS sindico_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_grupo_portaria TEXT,
  ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT DEFAULT 'predio',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO public.condominios (id, nome, endereco, tipo_estrutura)
VALUES ('aa205bfb-55cc-42fe-ab25-9c16ac943851', 'Village Di Padova', 'Rua Jairo de Almeida Machado N.100', 'predio')
ON CONFLICT (id) DO UPDATE SET 
  tipo_estrutura = COALESCE(public.condominios.tipo_estrutura, 'predio'),
  ativo = TRUE;

-- ------------------------------------------------------------------------------
-- 2. TABELA: operadores
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  login TEXT NOT NULL,
  senha TEXT,
  perfil TEXT DEFAULT 'operador',
  nivel_acesso INTEGER DEFAULT 3,
  nivel_acesso_custom_id TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nivel_acesso_custom_id TEXT,
  ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'operador',
  ADD COLUMN IF NOT EXISTS nivel_acesso INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 3. TABELA: moradores
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  bloco TEXT,
  unidade TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  documento TEXT,
  tipo TEXT DEFAULT 'proprietario',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.moradores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'proprietario',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_moradores_condo_unid ON public.moradores(condominio_id, unidade, bloco);

-- ------------------------------------------------------------------------------
-- 4. TABELA: entregadores
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entregadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.entregadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 5. TABELA: lotes_re (CORREÇÃO DA CONSTRAINT ÚNICA lotes_re_codigo_re_key)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lotes_re (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_re TEXT NOT NULL,
  condominio_id UUID,
  entregador_id UUID,
  qtd_declarada INTEGER DEFAULT 1,
  qtd_triada INTEGER DEFAULT 0,
  status TEXT DEFAULT 'aguardando_triagem',
  operador_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRÍTICO: Remoção definitiva da restrição única conflitante
ALTER TABLE public.lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_key;
ALTER TABLE public.lotes_re DROP CONSTRAINT IF EXISTS lotes_re_codigo_re_unique;
DROP INDEX IF EXISTS public.lotes_re_codigo_re_key;

ALTER TABLE public.lotes_re
  ADD COLUMN IF NOT EXISTS codigo_re TEXT,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS entregador_id UUID,
  ADD COLUMN IF NOT EXISTS qtd_declarada INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qtd_triada INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aguardando_triagem',
  ADD COLUMN IF NOT EXISTS operador_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_lotes_re_codigo ON public.lotes_re(codigo_re);
CREATE INDEX IF NOT EXISTS idx_lotes_re_condo_created ON public.lotes_re(condominio_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. TABELA: locais_armazenamento (GARANTE COLUNA descricao ANTES DO INSERT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locais_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  capacidade INTEGER DEFAULT 50,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.locais_armazenamento
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS capacidade INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locais_armazenamento WHERE nome = 'Bancada Principal' AND condominio_id = 'aa205bfb-55cc-42fe-ab25-9c16ac943851') THEN
    INSERT INTO public.locais_armazenamento (condominio_id, nome, descricao)
    VALUES ('aa205bfb-55cc-42fe-ab25-9c16ac943851', 'Bancada Principal', 'Área de triagem imediata');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.locais_armazenamento WHERE nome = 'Prateleira A - Pacotes Pequenos' AND condominio_id = 'aa205bfb-55cc-42fe-ab25-9c16ac943851') THEN
    INSERT INTO public.locais_armazenamento (condominio_id, nome, descricao)
    VALUES ('aa205bfb-55cc-42fe-ab25-9c16ac943851', 'Prateleira A - Pacotes Pequenos', 'Para envelopes e caixas compactas');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.locais_armazenamento WHERE nome = 'Armário de Volumes Especiais' AND condominio_id = 'aa205bfb-55cc-42fe-ab25-9c16ac943851') THEN
    INSERT INTO public.locais_armazenamento (condominio_id, nome, descricao)
    VALUES ('aa205bfb-55cc-42fe-ab25-9c16ac943851', 'Armário de Volumes Especiais', 'Para itens volumosos');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 7. TABELA: encomendas_itens
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.encomendas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_re_id UUID,
  condominio_id UUID,
  bloco TEXT,
  unidade TEXT NOT NULL,
  morador_id UUID,
  codigo_barras TEXT,
  codigo_rastreio TEXT,
  rastreio TEXT,
  foto_etiqueta_url TEXT,
  observacoes TEXT,
  local_armazenamento TEXT DEFAULT 'Bancada Principal',
  status TEXT DEFAULT 'retido',
  retirado_por TEXT,
  foto_retirada_url TEXT,
  foto_comprovante_url TEXT,
  data_retirada TIMESTAMPTZ,
  data_hora_retirada TIMESTAMPTZ,
  operador_baixa_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.encomendas_itens
  ADD COLUMN IF NOT EXISTS lote_re_id UUID,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS morador_id UUID,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS codigo_rastreio TEXT,
  ADD COLUMN IF NOT EXISTS rastreio TEXT,
  ADD COLUMN IF NOT EXISTS foto_etiqueta_url TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT DEFAULT 'Bancada Principal',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'retido',
  ADD COLUMN IF NOT EXISTS retirado_por TEXT,
  ADD COLUMN IF NOT EXISTS foto_retirada_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_comprovante_url TEXT,
  ADD COLUMN IF NOT EXISTS data_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operador_baixa_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_encomendas_itens_status ON public.encomendas_itens(condominio_id, status);
CREATE INDEX IF NOT EXISTS idx_encomendas_itens_unidade ON public.encomendas_itens(condominio_id, unidade, bloco);

-- ------------------------------------------------------------------------------
-- 8. TABELA: custodia
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custodia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo_custodia TEXT,
  fluxo TEXT DEFAULT 'MM',
  origem_tipo TEXT,
  origem_unidade TEXT,
  origem_bloco TEXT,
  origem_nome_doc TEXT,
  origem_whats TEXT,
  destino_tipo TEXT,
  destino_unidade TEXT,
  destino_bloco TEXT,
  destino_nome_doc TEXT,
  destino_whats TEXT,
  descricao TEXT,
  foto_entrada_url TEXT,
  foto_saida_url TEXT,
  local_armazenamento TEXT,
  status TEXT DEFAULT 'guardado',
  recebedor_nome TEXT,
  recebedor_doc TEXT,
  operador_entrada TEXT,
  operador_saida TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  data_hora_saida TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.custodia
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS codigo_custodia TEXT,
  ADD COLUMN IF NOT EXISTS fluxo TEXT DEFAULT 'MM',
  ADD COLUMN IF NOT EXISTS local_armazenamento TEXT,
  ADD COLUMN IF NOT EXISTS foto_saida_url TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_saida TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 9. TABELAS: chaves & movimentacao_chaves
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  codigo TEXT NOT NULL,
  identificacao TEXT NOT NULL,
  sala_local TEXT,
  categoria TEXT,
  status TEXT DEFAULT 'disponivel',
  tempo_limite_horas INTEGER DEFAULT 24,
  retirada_por TEXT,
  data_hora_retirada TIMESTAMPTZ,
  terceiro_documento TEXT,
  terceiro_empresa TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chaves
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS sala_local TEXT,
  ADD COLUMN IF NOT EXISTS terceiro_documento TEXT,
  ADD COLUMN IF NOT EXISTS terceiro_empresa TEXT,
  ADD COLUMN IF NOT EXISTS tempo_limite_horas INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.movimentacao_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_id UUID,
  condominio_id UUID,
  tipo TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  telefone TEXT,
  unidade TEXT,
  bloco TEXT,
  operador_retirada TEXT,
  operador_devolucao TEXT,
  data_hora_retirada TIMESTAMPTZ,
  data_hora_devolucao TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.movimentacao_chaves
  ADD COLUMN IF NOT EXISTS chave_id UUID,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS documento TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS unidade TEXT,
  ADD COLUMN IF NOT EXISTS bloco TEXT,
  ADD COLUMN IF NOT EXISTS operador_retirada TEXT,
  ADD COLUMN IF NOT EXISTS operador_devolucao TEXT,
  ADD COLUMN IF NOT EXISTS data_hora_retirada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_hora_devolucao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 10. TABELA: materiais_posto
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.materiais_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  codigo TEXT,
  categoria TEXT,
  quantidade INTEGER DEFAULT 1,
  estado_conservacao TEXT DEFAULT 'bom',
  localizacao TEXT,
  foto_url TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'operacional',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.materiais_posto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'operacional',
  ADD COLUMN IF NOT EXISTS estado_conservacao TEXT DEFAULT 'bom',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 11. TABELAS: manutencao (chamados e checklist)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chamados_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  numero_os TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  local TEXT,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'aberto',
  solicitante_nome TEXT,
  solicitante_unidade TEXT,
  solicitante_bloco TEXT,
  responsavel TEXT,
  foto_abertura_url TEXT,
  foto_conclusao_url TEXT,
  observacoes_conclusao TEXT,
  data_abertura TIMESTAMPTZ DEFAULT NOW(),
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chamados_manutencao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS foto_abertura_url TEXT,
  ADD COLUMN IF NOT EXISTS foto_conclusao_url TEXT,
  ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.checklist_manutencao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  item TEXT NOT NULL,
  categoria TEXT,
  frequencia TEXT DEFAULT 'diario',
  status TEXT DEFAULT 'pendente',
  data_verificacao TIMESTAMPTZ,
  operador_nome TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.checklist_manutencao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 12. TABELAS: prestadores & prestadores_acessos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  documento TEXT,
  tipo_documento TEXT DEFAULT 'CPF',
  empresa TEXT,
  parentesco_vinculo TEXT,
  telefone TEXT,
  placa_veiculo TEXT,
  perfil_acesso TEXT DEFAULT 'autorizado',
  unidade_autorizada TEXT,
  bloco_autorizado TEXT,
  tipo_servico TEXT,
  foto_rosto TEXT,
  foto_documento TEXT,
  tipo_validade TEXT DEFAULT 'hoje',
  data_validade_inicio DATE,
  data_validade_fim DATE,
  termo_reutilizacao TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prestadores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS placa_veiculo TEXT,
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT DEFAULT 'autorizado',
  ADD COLUMN IF NOT EXISTS foto_documento TEXT,
  ADD COLUMN IF NOT EXISTS data_validade_inicio DATE,
  ADD COLUMN IF NOT EXISTS data_validade_fim DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.prestadores_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  prestador_id UUID,
  nome TEXT NOT NULL,
  documento TEXT,
  tipo_documento TEXT,
  empresa TEXT,
  parentesco_vinculo TEXT,
  perfil_acesso TEXT,
  unidade_destino TEXT,
  bloco_destino TEXT,
  cracha_numero TEXT,
  placa_veiculo TEXT,
  tipo_servico TEXT,
  foto_rosto TEXT,
  foto_documento TEXT,
  data_hora_entrada TIMESTAMPTZ DEFAULT NOW(),
  data_hora_saida TIMESTAMPTZ,
  hora_limite_prorrogada TIMESTAMPTZ,
  operador_entrada TEXT,
  operador_saida TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'dentro',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prestadores_acessos
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS prestador_id UUID,
  ADD COLUMN IF NOT EXISTS hora_limite_prorrogada TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parentesco_vinculo TEXT,
  ADD COLUMN IF NOT EXISTS perfil_acesso TEXT,
  ADD COLUMN IF NOT EXISTS cracha_numero TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 13. TABELAS: rondas
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rondas_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rondas_setores
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.rondas_pontos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  setor_id UUID,
  nome TEXT NOT NULL,
  localizacao TEXT,
  codigo_qr TEXT,
  codigo_nfc TEXT,
  ordem INTEGER DEFAULT 0,
  tempo_estimado_minutos INTEGER DEFAULT 5,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rondas_pontos
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS setor_id UUID,
  ADD COLUMN IF NOT EXISTS codigo_nfc TEXT,
  ADD COLUMN IF NOT EXISTS tempo_estimado_minutos INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.rondas_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  setor_id UUID,
  operador_nome TEXT,
  status TEXT DEFAULT 'em_andamento',
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_fim TIMESTAMPTZ,
  total_pontos INTEGER DEFAULT 0,
  pontos_verificados INTEGER DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rondas_execucao
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS setor_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.rondas_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ronda_execucao_id UUID,
  ponto_id UUID,
  condominio_id UUID,
  operador_nome TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  metodo TEXT DEFAULT 'qr',
  foto_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rondas_registros
  ADD COLUMN IF NOT EXISTS ronda_execucao_id UUID,
  ADD COLUMN IF NOT EXISTS ponto_id UUID,
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 14. TABELA: ocorrencias
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT DEFAULT 'geral',
  gravidade TEXT DEFAULT 'baixa',
  status TEXT DEFAULT 'aberta',
  unidade TEXT,
  bloco TEXT,
  operador_nome TEXT,
  foto_url TEXT,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ocorrencias
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 15. TABELA: passagens_posto
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.passagens_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  operador_sai TEXT NOT NULL,
  operador_entra TEXT NOT NULL,
  data_hora TIMESTAMPTZ DEFAULT NOW(),
  observacoes TEXT,
  checklist_itens JSONB DEFAULT '[]'::jsonb,
  materiais_conferidos JSONB DEFAULT '[]'::jsonb,
  chaves_pendentes JSONB DEFAULT '[]'::jsonb,
  encomendas_retidas JSONB DEFAULT '[]'::jsonb,
  custodia_pendente JSONB DEFAULT '[]'::jsonb,
  rondas_realizadas JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'concluido',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.passagens_posto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 16. TABELA: historico_absoluto
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historico_absoluto (
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
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.historico_absoluto
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS detalhes JSONB DEFAULT '{}'::jsonb;

-- ------------------------------------------------------------------------------
-- 17. TABELA: configuracoes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID,
  tipo_estrutura TEXT DEFAULT 'predio',
  whatsapp_config JSONB DEFAULT '{}'::jsonb,
  permissoes_config JSONB DEFAULT '{}'::jsonb,
  rondas_config JSONB DEFAULT '{}'::jsonb,
  notificacoes_config JSONB DEFAULT '{}'::jsonb,
  geral_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS condominio_id UUID,
  ADD COLUMN IF NOT EXISTS tipo_estrutura TEXT DEFAULT 'predio',
  ADD COLUMN IF NOT EXISTS whatsapp_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS permissoes_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rondas_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notificacoes_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS geral_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ------------------------------------------------------------------------------
-- 18. PERMISSÕES E POLÍTICAS RLS (EXECUÇÃO SEGURA)
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'condominios', 'operadores', 'moradores', 'entregadores', 'lotes_re', 
    'locais_armazenamento', 'encomendas_itens', 'custodia', 'chaves', 
    'movimentacao_chaves', 'materiais_posto', 'chamados_manutencao', 
    'checklist_manutencao', 'prestadores', 'prestadores_acessos', 
    'rondas_setores', 'rondas_pontos', 'rondas_execucao', 'rondas_registros', 
    'ocorrencias', 'passagens_posto', 'historico_absoluto', 'configuracoes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "Acesso_Geral_Infport_%I" ON public.%I;', t, t);
      EXECUTE format('CREATE POLICY "Acesso_Geral_Infport_%I" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t, t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
