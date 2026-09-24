import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  ArrowRight, 
  X,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  CANONICAL_SCHEMA_MAP, 
  runDatabaseAudit, 
  generateMigrationSql, 
  TableDiagnostic 
} from '../services/databaseDoctor';

interface SupabaseDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupabaseDoctorModal({ isOpen, onClose }: SupabaseDoctorModalProps) {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<TableDiagnostic[]>(CANONICAL_SCHEMA_MAP);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'auditoria' | 'script' | 'storage'>('auditoria');

  useEffect(() => {
    if (isOpen) {
      executarAuditoria();
    }
  }, [isOpen]);

  const executarAuditoria = async () => {
    setLoading(true);
    try {
      const result = await runDatabaseAudit();
      setDiagnostics(result.diagnostics);
      setOrphanedCount(result.orphanedTablesFound.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copiarScriptSql = () => {
    const sql = generateMigrationSql();
    navigator.clipboard.writeText(sql);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">Saneamento & Auditoria do Supabase</h3>
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  INFPORT Doctor
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Diagnóstico das 32+ tabelas, unificação das duplicatas e remoção de tabelas órfãs.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setAbaAtiva('auditoria')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === 'auditoria'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" /> Mapa de Tabelas & Duplicatas
          </button>

          <button
            onClick={() => setAbaAtiva('script')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === 'script'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500" /> Script SQL de Limpeza (1-Clique)
          </button>

          <button
            onClick={() => setAbaAtiva('storage')}
            className={`py-2.5 px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 ${
              abaAtiva === 'storage'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            📁 Buckets de Storage
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {abaAtiva === 'auditoria' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    Diagnóstico dos seus prints do Supabase:
                  </div>
                  <button
                    onClick={executarAuditoria}
                    disabled={loading}
                    className="flex items-center gap-1 text-[11px] bg-white border border-amber-300 text-amber-900 font-bold px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Recarregar Status
                  </button>
                </div>
                <p className="leading-relaxed">
                  Identificamos mais de <strong>12 tabelas duplicadas ou com nomes divergentes</strong> criadas no seu banco ao longo dos testes. 
                  O aplicativo foi 100% corrigido para apontar apenas para as <strong>tabelas canônicas oficiais</strong>. Veja a lista abaixo:
                </p>
              </div>

              {/* Tabela de diagnóstico */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-slate-100 px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase grid grid-cols-12 gap-2 border-b">
                  <div className="col-span-4">Tabela Oficial (Canônica)</div>
                  <div className="col-span-4">Tabelas Duplicadas / Lixo a Remover</div>
                  <div className="col-span-4 text-right">Status do Banco</div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {diagnostics.map((diag) => (
                    <div key={diag.canonicalName} className="px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition">
                      <div className="col-span-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {diag.canonicalName}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{diag.purpose}</p>
                      </div>

                      <div className="col-span-4">
                        {diag.duplicateOrLegacyNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {diag.duplicateOrLegacyNames.map((leg) => (
                              <span key={leg} className="font-mono text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded line-through">
                                {leg}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Nenhuma duplicata</span>
                        )}
                      </div>

                      <div className="col-span-4 text-right">
                        {diag.status === 'ok' && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {diag.canonicalCount !== undefined ? `${diag.canonicalCount} reg.` : 'OK'}
                          </span>
                        )}
                        {diag.status === 'needs_migration' && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            Contém reg. legados
                          </span>
                        )}
                        {diag.status === 'error' && (
                          <span className="inline-flex items-center gap-1 font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                            Verificando...
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de ação direta */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Deseja limpar as tabelas duplicadas agora?</h4>
                  <p className="text-xs text-emerald-800">
                    Clique na aba ao lado para copiar o script SQL e rodar no seu Supabase com segurança total (sem perda de dados).
                  </p>
                </div>
                <button
                  onClick={() => setAbaAtiva('script')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow-sm"
                >
                  Ver Script SQL <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {abaAtiva === 'script' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-100 p-4 rounded-2xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Script SQL Seguro de Unificação & Limpeza
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Este script migra todos os dados que estavam nas tabelas com nomes errados para as tabelas certas antes de remover as sobras.
                  </p>
                </div>

                <button
                  onClick={copiarScriptSql}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md whitespace-nowrap"
                >
                  {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'SQL Copiado com Sucesso!' : 'Copiar Script SQL'}
                </button>
              </div>

              {/* Passos fáceis */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-900 space-y-2">
                <strong className="block font-bold">Como aplicar no seu Supabase em 3 passos:</strong>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Clique no botão acima <strong>"Copiar Script SQL"</strong>.</li>
                  <li>
                    Acesse seu painel do Supabase: {' '}
                    <a
                      href="https://supabase.com/dashboard/project/juafrepntyksgqiqzyes/sql/new"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-blue-950 inline-flex items-center gap-1"
                    >
                      Abrir SQL Editor do Projeto <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Cole o código copiado na janela e clique no botão verde <strong>"RUN"</strong>.</li>
                </ol>
              </div>

              {/* Bloco de Código */}
              <div className="relative">
                <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-[380px] border border-slate-800 leading-relaxed">
                  {generateMigrationSql()}
                </pre>
              </div>
            </div>
          )}

          {abaAtiva === 'storage' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Situação dos Buckets de Storage (Prints 2, 3 e 5)</h4>
                <p>
                  No seu Supabase Storage existem atualmente dois buckets:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Bucket Ativo no Código
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-1 font-mono">encomendas (Public)</h5>
                    <p className="text-[11px] text-slate-500">
                      Possui 3 Policies públicas e armazena todas as subpastas operacionais:
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-mono text-slate-700">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/avarias_materiais</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/chaves_devolucao</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/chaves_retirada</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/checklist_fotos</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/comprovantes_baixa</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/custodia_entrada</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/custodia_saida</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/etiquetas</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/ocorrencias</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded">/rondas_evidencias</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-1 opacity-75">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                      Bucket Vazio / Opcional
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 mt-1 font-mono">fotos-infport (Public)</h5>
                    <p className="text-[11px] text-slate-500">
                      Criado sem policies e atualmente vazio. Pode ser mantido como reserva ou excluído se desejar manter tudo centralizado em <code>encomendas</code>.
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-900 text-[11px]">
                  ✅ <strong>Tudo OK no Storage:</strong> O aplicativo já está configurado para salvar todas as fotos dos módulos (chaves, rondas, encomendas, avarias, etc.) no bucket público <code>encomendas</code>, mantendo links seguros e acessíveis sem quebras de imagem.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
          <span className="text-xs text-slate-500">
            INFPORT 1.0 — Guarita & Gestão de Acesso
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-xs transition"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
}
