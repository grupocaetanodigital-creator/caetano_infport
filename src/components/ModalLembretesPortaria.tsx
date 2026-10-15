import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Bell,
  BellRing,
  CheckCircle2,
  Check,
  CheckCheck,
  Clock,
  User,
  Shield,
  Home,
  Plus,
  Search,
  Filter,
  Trash2,
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  Key,
  FileText,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '../services/supabase';
import {
  buscarLembretes,
  marcarComoLido,
  marcarTodosComoLidos,
  criarLembrete,
  excluirLembrete,
  isSomHabilitado,
  setSomHabilitado,
  LembretePortaria
} from '../services/lembretesService';

interface ModalLembretesPortariaProps {
  aberto: boolean;
  onFechar: () => void;
  condominioId: string;
  condominioNome?: string;
  operadorAtual?: {
    id?: string;
    nome?: string;
  };
}

export default function ModalLembretesPortaria({
  aberto,
  onFechar,
  condominioId,
  condominioNome,
  operadorAtual
}: ModalLembretesPortariaProps) {
  const [lembretes, setLembretes] = useState<LembretePortaria[]>([]);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [tabelaExiste, setTabelaExiste] = useState<boolean>(true);
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'lidos' | 'morador' | 'portaria'>('pendentes');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [somAtivo, setSomAtivo] = useState<boolean>(isSomHabilitado());
  const [sqlCopiado, setSqlCopiado] = useState<boolean>(false);

  // Estado para criação de novo lembrete
  const [exibirFormNovo, setExibirFormNovo] = useState<boolean>(false);
  const [novoUnidadeBloco, setNovoUnidadeBloco] = useState<string>('');
  const [novoRemetenteTipo, setNovoRemetenteTipo] = useState<'morador' | 'portaria' | 'supervisao'>('morador');
  const [novoRemetenteNome, setNovoRemetenteNome] = useState<string>('');
  const [novoTipo, setNovoTipo] = useState<string>('Palavra-chave');
  const [novaMensagem, setNovaMensagem] = useState<string>('');
  const [salvandoNovo, setSalvandoNovo] = useState<boolean>(false);
  const [listaUnidadesSugeridas, setListaUnidadesSugeridas] = useState<string[]>([]);

  // Carregar lista de lembretes
  const carregarDados = async () => {
    if (!condominioId) return;
    setCarregando(true);
    try {
      const res = await buscarLembretes(condominioId);
      setLembretes(res.lembretes);
      setTabelaExiste(res.tabelaExisteNoSupabase);
    } catch {
      // Ignora erro transitório
    } finally {
      setCarregando(false);
    }
  };

  // Carregar unidades existentes para facilitar preenchimento
  useEffect(() => {
    async function carregarUnidades() {
      if (!condominioId) return;
      try {
        const { data } = await supabase
          .from('moradores')
          .select('bloco, unidade')
          .eq('condominio_id', condominioId)
          .limit(100);

        if (data && data.length > 0) {
          const unidades = data
            .map((m) => {
              const b = m.bloco ? `Bloco ${m.bloco}` : '';
              const u = m.unidade ? `Apto ${m.unidade}` : '';
              return [u, b].filter(Boolean).join(' - ');
            })
            .filter(Boolean);
          const unicas = Array.from(new Set(unidades));
          setListaUnidadesSugeridas(unicas);
        }
      } catch {
        // Silencioso
      }
    }
    if (aberto) {
      carregarUnidades();
    }
  }, [condominioId, aberto]);

  useEffect(() => {
    if (aberto) {
      carregarDados();
    }
  }, [aberto, condominioId]);

  // Listener para sincronização em tempo real quando o modal está aberto
  useEffect(() => {
    if (!aberto || !condominioId) return;

    const handleAtualizacao = () => {
      carregarDados();
    };

    window.addEventListener('lembretes_portaria_atualizados', handleAtualizacao);
    return () => {
      window.removeEventListener('lembretes_portaria_atualizados', handleAtualizacao);
    };
  }, [aberto, condominioId]);

  // Tecla ESC para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aberto) {
        onFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, onFechar]);

  // Alternar som
  const toggleSom = () => {
    const novoValor = !somAtivo;
    setSomAtivo(novoValor);
    setSomHabilitado(novoValor);
  };

  // Marcar um como lido
  const handleMarcarLido = async (id: string) => {
    await marcarComoLido(
      id,
      condominioId,
      operadorAtual?.nome || 'Operador',
      operadorAtual?.id
    );
    // Atualiza estado local imediatamente
    setLembretes((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              lido: true,
              lido_em: new Date().toISOString(),
              lido_por_nome: operadorAtual?.nome || 'Operador'
            }
          : item
      )
    );
  };

  // Marcar todos como lidos
  const handleMarcarTodosLidos = async () => {
    await marcarTodosComoLidos(
      condominioId,
      operadorAtual?.nome || 'Operador',
      operadorAtual?.id
    );
    setLembretes((prev) =>
      prev.map((item) => ({
        ...item,
        lido: true,
        lido_em: new Date().toISOString(),
        lido_por_nome: operadorAtual?.nome || 'Operador'
      }))
    );
  };

  // Excluir lembrete
  const handleExcluir = async (id: string) => {
    if (confirm('Deseja realmente remover este lembrete?')) {
      await excluirLembrete(id, condominioId);
      setLembretes((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Salvar novo lembrete
  const handleSalvarNovo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoUnidadeBloco.trim() || !novaMensagem.trim()) return;

    setSalvandoNovo(true);
    try {
      const res = await criarLembrete({
        condominio_id: condominioId,
        unidade_bloco: novoUnidadeBloco.trim(),
        remetente_tipo: novoRemetenteTipo,
        remetente_nome: novoRemetenteNome.trim() || (novoRemetenteTipo === 'portaria' ? 'Portaria' : 'Morador'),
        tipo: novoTipo,
        mensagem: novaMensagem.trim(),
        lido: false
      });

      if (res.sucesso && res.lembrete) {
        setLembretes((prev) => [res.lembrete!, ...prev]);
        setNovoUnidadeBloco('');
        setNovoRemetenteNome('');
        setNovaMensagem('');
        setNovoTipo('Palavra-chave');
        setExibirFormNovo(false);
      }
    } finally {
      setSalvandoNovo(false);
    }
  };

  // Copiar SQL para a área de transferência
  const handleCopiarSql = () => {
    const sql = `-- Script para tabela lembretes_portaria no Supabase
CREATE TABLE IF NOT EXISTS lembretes_portaria (
  id TEXT PRIMARY KEY,
  condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
  unidade_bloco TEXT NOT NULL,
  remetente_tipo TEXT NOT NULL DEFAULT 'morador',
  remetente_nome TEXT,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Aviso Geral',
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  lido_em TIMESTAMPTZ,
  lido_por_nome TEXT,
  lido_por_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lembretes_condominio_lido ON lembretes_portaria(condominio_id, lido, created_at DESC);
ALTER TABLE lembretes_portaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total lembretes_portaria" ON lembretes_portaria FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE lembretes_portaria; EXCEPTION WHEN duplicate_object THEN END;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';`;

    navigator.clipboard.writeText(sql);
    setSqlCopiado(true);
    setTimeout(() => setSqlCopiado(false), 3000);
  };

  // Formatar data em PT-BR
  const formatarData = (dataIso: string) => {
    try {
      const d = new Date(dataIso);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataIso;
    }
  };

  // Filtragem
  const lembretesFiltrados = useMemo(() => {
    return lembretes.filter((item) => {
      // Filtro status
      if (filtroStatus === 'pendentes' && item.lido) return false;
      if (filtroStatus === 'lidos' && !item.lido) return false;
      if (filtroStatus === 'morador' && item.remetente_tipo !== 'morador') return false;
      if (filtroStatus === 'portaria' && item.remetente_tipo !== 'portaria') return false;

      // Filtro tipo
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;

      // Filtro texto
      if (filtroTexto.trim()) {
        const termo = filtroTexto.toLowerCase();
        const coincideUnidade = item.unidade_bloco?.toLowerCase().includes(termo);
        const coincideMensagem = item.mensagem?.toLowerCase().includes(termo);
        const coincideRemetente = item.remetente_nome?.toLowerCase().includes(termo);
        const coincideTipo = item.tipo?.toLowerCase().includes(termo);
        return coincideUnidade || coincideMensagem || coincideRemetente || coincideTipo;
      }

      return true;
    });
  }, [lembretes, filtroStatus, filtroTipo, filtroTexto]);

  const totalPendentes = useMemo(() => {
    return lembretes.filter((l) => !l.lido).length;
  }, [lembretes]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              {totalPendentes > 0 ? (
                <BellRing className="w-6 h-6 animate-pulse" />
              ) : (
                <Bell className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Lembretes
                </h2>
                {totalPendentes > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-500 text-white animate-pulse">
                    {totalPendentes} pendente{totalPendentes > 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Nenhum pendente
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  Tempo Real Ativo
                </span>
                <span>•</span>
                <span className="truncate">{condominioNome || 'Condomínio'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle de som */}
            <button
              onClick={toggleSom}
              title={somAtivo ? 'Silenciar alerta sonoro' : 'Ativar alerta sonoro'}
              className={`p-2 rounded-xl border transition ${
                somAtivo
                  ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}
            >
              {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Botão Novo Recado */}
            <button
              onClick={() => setExibirFormNovo(!exibirFormNovo)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-3 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Recado</span>
            </button>

            {/* Fechar */}
            <button
              onClick={onFechar}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ALERTA SE A TABELA AINDA NÃO EXISTE NO SUPABASE */}
        {!tabelaExiste && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                A tabela <strong>lembretes_portaria</strong> ainda não foi executada no banco. O sistema está operando com cache local.
              </span>
            </div>
            <button
              onClick={handleCopiarSql}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 px-3 py-1.5 rounded-lg font-bold transition shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              {sqlCopiado ? 'SQL Copiado!' : 'Copiar Script SQL'}
            </button>
          </div>
        )}

        {/* FORMULÁRIO DE NOVO RECADOS (COLAPSÁVEL) */}
        {exibirFormNovo && (
          <form
            onSubmit={handleSalvarNovo}
            className="p-4 bg-slate-800/80 border-b border-slate-700/80 space-y-3 animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Lançar Novo Aviso / Lembrete
              </span>
              <button
                type="button"
                onClick={() => setExibirFormNovo(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Unidade / Bloco *
                </label>
                <input
                  type="text"
                  list="sugestoes_unidades"
                  required
                  placeholder="Ex: Apto 102 - Bloco B"
                  value={novoUnidadeBloco}
                  onChange={(e) => setNovoUnidadeBloco(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <datalist id="sugestoes_unidades">
                  <option value="Geral / Guarita" />
                  {listaUnidadesSugeridas.map((u, i) => (
                    <option key={i} value={u} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Remetente *
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setNovoRemetenteTipo('morador')}
                    className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition ${
                      novoRemetenteTipo === 'morador'
                        ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Morador
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoRemetenteTipo('portaria')}
                    className={`p-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 transition ${
                      novoRemetenteTipo === 'portaria'
                        ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" /> Portaria
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Classificação / Tipo *
                </label>
                <select
                  value={novoTipo}
                  onChange={(e) => setNovoTipo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="Palavra-chave">🔑 Palavra-chave</option>
                  <option value="Instrução">📋 Instrução</option>
                  <option value="Aviso Geral">📢 Aviso Geral</option>
                  <option value="Correspondência Urgente">📦 Correspondência Urgente</option>
                  <option value="Autorização">🚪 Autorização de Acesso</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Nome do Remetente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos (Morador) ou Caetano"
                  value={novoRemetenteNome}
                  onChange={(e) => setNovoRemetenteNome(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Mensagem / Texto do Aviso *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ex: Palavra-chave para entrega: 'AZUL2026'. Liberar apenas se souber a senha."
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={salvandoNovo}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    {salvandoNovo ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="p-3 sm:px-5 bg-slate-900 border-b border-slate-800 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por unidade, bloco, remetente ou palavra-chave..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
              {filtroTexto && (
                <button
                  onClick={() => setFiltroTexto('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Ação rápida de marcar todos como lidos */}
            {totalPendentes > 0 && (
              <button
                onClick={handleMarcarTodosLidos}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Marcar Todos como Ciente</span>
              </button>
            )}
          </div>

          {/* Chips de Filtro */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setFiltroStatus('pendentes')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'pendentes'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Pendentes ({totalPendentes})
            </button>
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'todos'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todos ({lembretes.length})
            </button>
            <button
              onClick={() => setFiltroStatus('morador')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'morador'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Morador ➔ Portaria
            </button>
            <button
              onClick={() => setFiltroStatus('portaria')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'portaria'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Portaria ➔ Morador
            </button>
            <button
              onClick={() => setFiltroStatus('lidos')}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                filtroStatus === 'lidos'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Histórico Cientes
            </button>
          </div>
        </div>

        {/* LISTA DE LEMBRETES E MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {carregando ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-8 h-8 mx-auto mb-2 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-semibold">Carregando avisos e lembretes...</p>
            </div>
          ) : lembretesFiltrados.length === 0 ? (
            <div className="py-12 text-center bg-slate-800/40 border border-slate-800 rounded-2xl p-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/60 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">Nenhum recado ou aviso encontrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {filtroStatus === 'pendentes'
                  ? 'Todos os lembretes já foram atendidos e marcados como cientes pela portaria!'
                  : 'Não há mensagens cadastradas para os critérios de busca selecionados.'}
              </p>
              <button
                onClick={() => setExibirFormNovo(true)}
                className="mt-4 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
              >
                <Plus className="w-4 h-4" /> Cadastrar Novo Recado
              </button>
            </div>
          ) : (
            lembretesFiltrados.map((item) => {
              const naoLido = !item.lido;

              // Cor do tipo
              const tipoBadge = (() => {
                switch (item.tipo) {
                  case 'Palavra-chave':
                    return 'bg-purple-900/60 text-purple-300 border-purple-500/40';
                  case 'Instrução':
                    return 'bg-amber-900/60 text-amber-300 border-amber-500/40';
                  case 'Correspondência Urgente':
                    return 'bg-red-900/60 text-red-300 border-red-500/40';
                  case 'Autorização':
                    return 'bg-emerald-900/60 text-emerald-300 border-emerald-500/40';
                  default:
                    return 'bg-blue-900/60 text-blue-300 border-blue-500/40';
                }
              })();

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-200 p-4 ${
                    naoLido
                      ? 'bg-slate-800/90 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/20'
                      : 'bg-slate-800/40 border-slate-800/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* LINHA SUPERIOR DO CARD */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      {/* Unidade / Bloco */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-extrabold text-xs sm:text-sm">
                        <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{item.unidade_bloco}</span>
                      </span>

                      {/* Tag do Tipo */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${tipoBadge}`}
                      >
                        {item.tipo === 'Palavra-chave' && <Key className="w-3 h-3" />}
                        {item.tipo === 'Instrução' && <FileText className="w-3 h-3" />}
                        {item.tipo}
                      </span>

                      {/* Remetente */}
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                        {item.remetente_tipo === 'portaria' ? (
                          <>
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Portaria: <strong>{item.remetente_nome || 'Operador'}</strong></span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>Morador: <strong>{item.remetente_nome || 'Morador'}</strong></span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Data/Hora de Criação */}
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatarData(item.created_at)}
                    </span>
                  </div>

                  {/* CORPO DA MENSAGEM */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800/90 text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                    {item.mensagem}
                  </div>

                  {/* RODAPÉ DO CARD E AÇÕES */}
                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div>
                      {naoLido ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                          Aguardando confirmação de ciência da portaria
                        </span>
                      ) : (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            Ciente por <strong>{item.lido_por_nome || 'Portaria'}</strong>
                            {item.lido_em && ` em ${formatarData(item.lido_em)}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {naoLido ? (
                        <button
                          onClick={() => handleMarcarLido(item.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Marcar como ciente</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleExcluir(item.id)}
                          title="Remover aviso"
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-3 sm:px-5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            {lembretes.length} aviso(s) no total • {totalPendentes} pendente(s)
          </span>
          <button
            onClick={onFechar}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-xl font-bold transition cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
