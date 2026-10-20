import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://juafrepntyksgqiqzyes.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1YWZyZXBudHlrc2dxaXF6eWVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTk2NDEsImV4cCI6MjEwNTE5NTY0MX0.vIAQfpjj2PXkgF5Lw8txa0OrCitxmUxG8IEhWePM3Is';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TABLES_TO_CHECK = [
  'condominios',
  'operadores',
  'moradores',
  'entregadores',
  'lotes_re',
  'encomendas_itens',
  'locais_armazenamento',
  'custodia',
  'materiais_posto',
  'chaves',
  'movimentacao_chaves',
  'prestadores_obras',
  'entradas_prestadores',
  'manutencoes',
  'ocorrencias_livro',
  'passagens_posto',
  'rotas_ronda',
  'pontos_ronda',
  'execucoes_ronda',
  'leituras_ronda',
  'auditoria_sistema',
  // Legadas / duplicadas que possam existir:
  'usuarios_sistema',
  'unidades',
  'blocos',
  'encomendas',
  'custodia_itens',
  'materiais',
  'inspecoes_materiais',
  'movimentacoes_chaves',
  'prestadores',
  'visitas_prestadores',
  'ocorrencias',
  'passagem_posto',
  'passagens_plantao',
  'pontos_verificacao',
  'rondas_executadas'
];

async function runDiagnosis() {
  console.log('=== TESTE DE CONECTIVIDADE E TABELAS SUPABASE ===');
  console.log('URL:', supabaseUrl);

  const results: Record<string, any> = {};

  for (const table of TABLES_TO_CHECK) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        results[table] = {
          exists: false,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        };
      } else {
        const sampleRow = data && data[0] ? Object.keys(data[0]) : [];
        results[table] = {
          exists: true,
          count: count ?? data?.length,
          columns: sampleRow,
          sample: data?.[0]
        };
      }
    } catch (e: any) {
      results[table] = {
        exists: false,
        error: e.message
      };
    }
  }

  console.log('\n--- RESULTADOS POR TABELA ---');
  let existingCount = 0;
  let missingCount = 0;

  for (const [table, res] of Object.entries(results)) {
    if (res.exists) {
      existingCount++;
      console.log(`✅ [EXISTE] ${table.padEnd(25)} | Linhas: ${res.count} | Colunas detectadas: ${res.columns.length > 0 ? res.columns.join(', ') : '(Tabela vazia)'}`);
    } else {
      missingCount++;
      console.log(`❌ [FALTA OU ERRO] ${table.padEnd(25)} | Erro: ${res.error} (código: ${res.code || 'N/A'})`);
    }
  }

  console.log(`\nResumo: ${existingCount} tabelas encontradas, ${missingCount} com erro ou inexistentes.`);
}

runDiagnosis().catch(console.error);
