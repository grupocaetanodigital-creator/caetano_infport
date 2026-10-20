import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Layers,
  Plus,
  Minus,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Share2,
  History,
  Search,
  Building,
  Home,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Delete,
  Clock,
  User,
  PackageCheck,
  Mail,
  Box,
  Package,
  Settings,
  X,
  Sliders,
  MapPin,
  Archive
} from 'lucide-react';
import {
  ItemBancada,
  carregarItensBancada,
  adicionarOuIncrementarItemBancada,
  atualizarItemBancada,
  darBaixaVolumeBancada,
  removerItemBancada,
  limparBancada,
  salvarSnapshotConferencia,
  obterHistoricoConferencias,
  agruparItensPorEstrutura,
  gerarTextoResumoBancadaWhats,
  sincronizarComEncomendasRetidas,
  ConferenciaBancadaSnapshot
} from '../services/bancadaService';
import {
  CondominioConfig,
  obterListaBlocosOuTorres,
  getNomeRotuloBloco,
  getNomeRotuloUnidade,
  isEstruturaCasas
} from '../services/condominioService';
import { supabase } from '../services/supabase';

export interface BotaoTipoVolumeConfig {
  id: string;
  tipo: string; // Ex: 'Pacote', 'Caixa', 'Carta'
  local: string; // Ex: 'Bancada', 'Chão', 'Fora'
  icone?: 'Package' | 'Box' | 'Mail' | 'Archive' | 'Layers';
  ativo: boolean;
}

export const BOTOES_PADRAO_BANCADA: BotaoTipoVolumeConfig[] = [
  { id: '1', tipo: 'Pacote', local: 'Bancada', icone: 'Package', ativo: true },
  { id: '2', tipo: 'Caixa', local: 'Chão', icone: 'Box', ativo: true },
  { id: '3', tipo: 'Carta', local: 'Fora', icone: 'Mail', ativo: true }
];

interface BancadaProps {
  usuarioLogado: any;
}

export default function Bancada({ usuarioLogado }: BancadaProps) {
  const condominioId = usuarioLogado?.condominio_id || '';
  const nomeCondominio = usuarioLogado?.condominio_nome || 'Condomínio';
  const nomeOperador = usuarioLogado?.nome || usuarioLogado?.login || 'Portaria';

  // Estados principais
  const [itens, setItens] = useState<ItemBancada[]>([]);
  const [loading, setLoading] = useState(true);
  const [configCondominio, setConfigCondominio] = useState<CondominioConfig | null>(null);
  const [estruturasDisponiveis, setEstruturasDisponiveis] = useState<string[]>([]);
  const [estruturaSelecionada, setEstruturaSelecionada] = useState<string>('');

  // Configuração dos Botões de Tipos e Locais (Pacote -> Bancada, Caixa -> Chão, Carta -> Fora...)
  const [botoesConfig, setBotoesConfig] = useState<BotaoTipoVolumeConfig[]>(() => {
    if (typeof window !== 'undefined' && condominioId) {
      try {
        const salvo = localStorage.getItem(`bancada_botoes_${condominioId}`);
        if (salvo) {
          const parsed = JSON.parse(salvo);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return BOTOES_PADRAO_BANCADA;
  });
  const [botaoSelecionadoId, setBotaoSelecionadoId] = useState<string>('1');
  const [modalConfigBotoes, setModalConfigBotoes] = useState<boolean>(false);
  const [botoesEmEdicao, setBotoesEmEdicao] = useState<BotaoTipoVolumeConfig[]>(BOTOES_PADRAO_BANCADA);

  // Formulário de lançamento rápido (Touch)
  const [unidadeDigitada, setUnidadeDigitada] = useState<string>('');
  const [qtdVolumes, setQtdVolumes] = useState<number>(1);
  const [modalQtdAberto, setModalQtdAberto] = useState<boolean>(false);
  const [observacao, setObservacao] = useState<string>('');

  // Busca na lista da torre ativa
  const [buscaListaTorre, setBuscaListaTorre] = useState<string>('');

  const [feedbackUltimoLancamento, setFeedbackUltimoLancamento] = useState<{
    mensagem: string;
    tipo: 'novo' | 'incremento';
    unidade: string;
    estrutura: string;
  } | null>(null);

  // Busca e visualização
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [abaVisualizacao, setAbaVisualizacao] = useState<'lancamento' | 'visao_geral' | 'historico'>('lancamento');

  // Modais
  const [modalZerarAberto, setModalZerarAberto] = useState<boolean>(false);
  const [motivoZerar, setMotivoZerar] = useState<string>('');
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState<boolean>(false);
  const [historicoSnapshots, setHistoricoSnapshots] = useState<ConferenciaBancadaSnapshot[]>([]);
  const [snapshotVisualizar, setSnapshotVisualizar] = useState<ConferenciaBancadaSnapshot | null>(null);
  const [copiadoWhats, setCopiadoWhats] = useState<boolean>(false);
  const [sincronizandoRE, setSincronizandoRE] = useState<boolean>(false);
  const [novaEstruturaNome, setNovaEstruturaNome] = useState<string>('');
  const [modalNovaEstrutura, setModalNovaEstrutura] = useState<boolean>(false);

  // Referência do input para auto-foco ininterrupto
  const inputUnidadeRef = useRef<HTMLInputElement>(null);

  // Carrega configurações do condomínio para detecção de estrutura
  useEffect(() => {
    async function carregarEstruturaCondominio() {
      if (!condominioId) return;
      try {
        const { data: condData } = await supabase
          .from('condominios')
          .select('*')
          .eq('id', condominioId)
          .maybeSingle();

        if (condData) {
          setConfigCondominio(condData);
        }

        // Busca também blocos existentes em moradores para não deixar nenhuma torre de fora
        const { data: moradoresData } = await supabase
          .from('moradores')
          .select('bloco')
          .eq('condominio_id', condominioId);

        const lista = obterListaBlocosOuTorres(condData, moradoresData || []);
        const listaFinal = lista.length > 0 ? lista : ['Torre A', 'Torre B'];
        setEstruturasDisponiveis(listaFinal);
        if (!estruturaSelecionada && listaFinal.length > 0) {
          setEstruturaSelecionada(listaFinal[0]);
        }
      } catch (e) {
        console.warn('Erro ao carregar estrutura do condomínio:', e);
        const listaFallback = ['Torre A', 'Torre B', 'Torre C'];
        setEstruturasDisponiveis(listaFallback);
        setEstruturaSelecionada(listaFallback[0]);
      }
    }
    carregarEstruturaCondominio();
  }, [condominioId]);

  // Carrega os itens da bancada
  const carregarDadosBancada = async () => {
    if (!condominioId) return;
    setLoading(true);
    try {
      const dados = await carregarItensBancada(condominioId);
      setItens(dados);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosBancada();

    // Ouve atualizações de outras abas ou da passagem de posto
    const handleSync = (e: any) => {
      if (!e.detail || e.detail.condominio_id === condominioId) {
        carregarDadosBancada();
      }
    };
    window.addEventListener('bancada_atualizada', handleSync);
    return () => window.removeEventListener('bancada_atualizada', handleSync);
  }, [condominioId]);

  // Foco automático imediato no input após renderizar ou trocar de torre
  useEffect(() => {
    if (abaVisualizacao === 'lancamento') {
      setTimeout(() => {
        inputUnidadeRef.current?.focus();
      }, 50);
    }
  }, [estruturaSelecionada, abaVisualizacao]);

  // Agrupamento estruturado
  const itensAgrupados = useMemo(() => {
    return agruparItensPorEstrutura(itens);
  }, [itens]);

  // Estatísticas globais
  const estatisticas = useMemo(() => {
    const totalVolumes = itens.reduce((acc, it) => acc + (it.volumes || 1), 0);
    const totalUnidades = itens.length;
    const estruturasComVolumes = new Set(itens.map(it => it.estrutura)).size;
    return { totalVolumes, totalUnidades, estruturasComVolumes };
  }, [itens]);

  // Itens da estrutura atualmente selecionada
  const itensEstruturaAtiva = useMemo(() => {
    if (!estruturaSelecionada) return [];
    return itens.filter(
      it => it.estrutura.toLowerCase() === estruturaSelecionada.toLowerCase()
    );
  }, [itens, estruturaSelecionada]);

  // Itens da estrutura filtrados pela busca rápida da lista
  const itensEstruturaAtivaFiltrados = useMemo(() => {
    if (!buscaListaTorre.trim()) return itensEstruturaAtiva;
    const termo = buscaListaTorre.trim().toLowerCase();
    return itensEstruturaAtiva.filter(it =>
      it.unidade.toLowerCase().includes(termo) ||
      (it.tipo_volume && it.tipo_volume.toLowerCase().includes(termo)) ||
      (it.local_armazenamento && it.local_armazenamento.toLowerCase().includes(termo)) ||
      (it.observacao && it.observacao.toLowerCase().includes(termo))
    );
  }, [itensEstruturaAtiva, buscaListaTorre]);

  // Total de volumes da estrutura selecionada
  const totalVolumesEstruturaAtiva = useMemo(() => {
    return itensEstruturaAtiva.reduce((acc, it) => acc + (it.volumes || 1), 0);
  }, [itensEstruturaAtiva]);

  // Rótulos dinâmicos
  const rotuloBloco = getNomeRotuloBloco(configCondominio?.tipo_estrutura);
  const rotuloUnidade = getNomeRotuloUnidade(configCondominio?.tipo_estrutura);

  // Botão ativo atual
  const botaoAtivoAtual = useMemo(() => {
    return botoesConfig.find(b => b.id === botaoSelecionadoId) || botoesConfig.find(b => b.ativo) || BOTOES_PADRAO_BANCADA[0];
  }, [botoesConfig, botaoSelecionadoId]);

  // Abertura e salvamento da configuração de botões
  const abrirModalConfigBotoes = () => {
    setBotoesEmEdicao(JSON.parse(JSON.stringify(botoesConfig)));
    setModalConfigBotoes(true);
  };

  const salvarConfiguracaoBotoes = () => {
    const filtrados = botoesEmEdicao.filter(b => b.tipo.trim() && b.local.trim());
    if (filtrados.length === 0) return;

    setBotoesConfig(filtrados);
    if (condominioId) {
      try {
        localStorage.setItem(`bancada_botoes_${condominioId}`, JSON.stringify(filtrados));
      } catch {}
    }
    if (!filtrados.some(b => b.id === botaoSelecionadoId && b.ativo)) {
      const primeiro = filtrados.find(b => b.ativo) || filtrados[0];
      if (primeiro) setBotaoSelecionadoId(primeiro.id);
    }
    setModalConfigBotoes(false);
  };

  const restaurarBotoesPadrao = () => {
    setBotoesEmEdicao(JSON.parse(JSON.stringify(BOTOES_PADRAO_BANCADA)));
  };

  // Handler de confirmação de lançamento
  const handleAdicionarUnidade = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const unidadeLimpa = unidadeDigitada.trim();
    if (!unidadeLimpa || !estruturaSelecionada || !condominioId) {
      inputUnidadeRef.current?.focus();
      return;
    }

    const tipoFinal = botaoAtivoAtual.tipo;
    const localFinal = botaoAtivoAtual.local;

    try {
      const res = await adicionarOuIncrementarItemBancada(condominioId, {
        estrutura: estruturaSelecionada,
        unidade: unidadeLimpa,
        volumes: qtdVolumes,
        tipo_volume: tipoFinal,
        local_armazenamento: localFinal,
        observacao: observacao.trim() || undefined,
        operador_nome: nomeOperador,
        operador_id: usuarioLogado?.id
      });

      setItens(res.itens);

      // Feedback visual rápido
      setFeedbackUltimoLancamento({
        mensagem: res.incrementou
          ? `+${qtdVolumes} ${tipoFinal.toLowerCase()}(s) [${localFinal}] adicionado ao ${rotuloUnidade} ${unidadeLimpa} (${res.itemAdicionado.volumes} vol. total)`
          : `${rotuloUnidade} ${unidadeLimpa} registrado: ${qtdVolumes} ${tipoFinal.toLowerCase()}(s) em ${localFinal}`,
        tipo: res.incrementou ? 'incremento' : 'novo',
        unidade: unidadeLimpa,
        estrutura: estruturaSelecionada
      });

      // Limpa os campos mantendo o foco instantâneo
      setUnidadeDigitada('');
      setQtdVolumes(1);
      setObservacao('');

      setTimeout(() => {
        inputUnidadeRef.current?.focus();
      }, 30);
    } catch (err) {
      console.error('Erro ao adicionar unidade na bancada:', err);
    }
  };

  // Teclado virtual Touch Numpad Exclusivo
  const tocarNumeroVirtual = (num: string) => {
    setUnidadeDigitada(prev => prev + num);
  };

  const apagarUltimoDigito = () => {
    setUnidadeDigitada(prev => prev.slice(0, -1));
  };

  const limparDigitos = () => {
    setUnidadeDigitada('');
  };

  // Ajuste rápido de volumes (+ e -)
  const handleAlterarVolumeItem = async (item: ItemBancada, delta: number) => {
    const novos = item.volumes + delta;
    if (novos <= 0) {
      handleDarBaixa(item);
    } else {
      const atualizados = await atualizarItemBancada(condominioId, item.id, { volumes: novos });
      setItens(atualizados);
    }
  };

  // Baixa / Entrega de volume
  const handleDarBaixa = async (item: ItemBancada) => {
    const atualizados = await darBaixaVolumeBancada(condominioId, item.id, 1, nomeOperador);
    setItens(atualizados);
  };

  // Excluir registro
  const handleRemoverItem = async (item: ItemBancada) => {
    const atualizados = await removerItemBancada(condominioId, item.id, nomeOperador);
    setItens(atualizados);
  };

  // Salvar Snapshot e Zerar Balcão
  const handleExecutarZerarBalcão = async () => {
    await limparBancada(condominioId, nomeOperador, motivoZerar);
    setItens([]);
    setModalZerarAberto(false);
    setMotivoZerar('');
  };

  // Copiar resumo formatado para o WhatsApp
  const handleCopiarWhatsApp = () => {
    const texto = gerarTextoResumoBancadaWhats(itens, nomeCondominio, nomeOperador);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoWhats(true);
      setTimeout(() => setCopiadoWhats(false), 3000);
    });
  };

  // Abrir histórico de snapshots
  const handleAbrirHistorico = async () => {
    setModalHistoricoAberto(true);
    const dados = await obterHistoricoConferencias(condominioId);
    setHistoricoSnapshots(dados);
  };

  // Adicionar estrutura manual
  const handleAdicionarNovaEstrutura = () => {
    const nome = novaEstruturaNome.trim();
    if (!nome) return;
    if (!estruturasDisponiveis.some(e => e.toLowerCase() === nome.toLowerCase())) {
      const atualizada = [...estruturasDisponiveis, nome];
      setEstruturasDisponiveis(atualizada);
      setEstruturaSelecionada(nome);
    } else {
      setEstruturaSelecionada(nome);
    }
    setNovaEstruturaNome('');
    setModalNovaEstrutura(false);
  };

  // Sincroniza e importa encomendas retidas do Módulo 02 com 1 clique
  const handleSincronizarRE = async () => {
    if (!condominioId) return;
    setSincronizandoRE(true);
    try {
      const res = await sincronizarComEncomendasRetidas(condominioId, nomeOperador);
      setItens(res.itens);
      if (res.importados > 0) {
        setFeedbackUltimoLancamento({
          mensagem: `✓ ${res.importados} volume(s) de encomendas pendentes sincronizados com a bancada!`,
          tipo: 'novo',
          unidade: 'Módulo 02',
          estrutura: 'Sincronizado'
        });
      } else {
        setFeedbackUltimoLancamento({
          mensagem: `Bancada já está alinhada com as encomendas retidas do Módulo 02.`,
          tipo: 'incremento',
          unidade: 'OK',
          estrutura: 'Alinhado'
        });
      }
    } catch (e) {
      console.error('Erro ao sincronizar:', e);
    } finally {
      setSincronizandoRE(false);
    }
  };

  // Filtro para a Visão Geral
  const itensFiltradosVisaoGeral = useMemo(() => {
    if (!termoBusca.trim()) return itensAgrupados;
    const termo = termoBusca.toLowerCase().trim();
    return itensAgrupados
      .map(g => {
        const itensMatch = g.itens.filter(
          it =>
            it.unidade.toLowerCase().includes(termo) ||
            it.estrutura.toLowerCase().includes(termo) ||
            (it.observacao && it.observacao.toLowerCase().includes(termo))
        );
        return {
          ...g,
          itens: itensMatch,
          totalVolumes: itensMatch.reduce((acc, it) => acc + (it.volumes || 1), 0),
          totalUnidades: itensMatch.length
        };
      })
      .filter(g => g.itens.length > 0);
  }, [itensAgrupados, termoBusca]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-16">
      {/* CABEÇALHO COM IDENTIFICAÇÃO E AÇÕES RÁPIDAS */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-amber-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Em Tempo Real
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 tracking-tight">
              <Layers className="w-6 h-6 text-amber-200" />
              Bancada de Portaria & Conferência de Balcão
            </h1>
          </div>

          {/* BOTÕES DE AÇÃO PRINCIPAIS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSincronizarRE}
              disabled={sincronizandoRE}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer border border-purple-400/30"
              title="Importar e sincronizar encomendas retidas do Módulo 02 com a bancada"
            >
              <RefreshCw className={`w-4 h-4 ${sincronizandoRE ? 'animate-spin' : ''}`} />
              <span>{sincronizandoRE ? 'Sincronizando...' : 'Enco (RE)'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarWhatsApp}
              className="p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer border border-emerald-400/30"
              title="Copiar lista estruturada para o grupo de WhatsApp"
            >
              {copiadoWhats ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleAbrirHistorico}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-white/20"
              title="Ver histórico de conferências e trocas de plantão"
            >
              <History className="w-4 h-4" />
              Histórico
            </button>

            <button
              type="button"
              onClick={() => setModalZerarAberto(true)}
              className="px-3 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-rose-400/40 shadow-sm"
              title="Zerar balcão para iniciar nova contagem"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Zerar</span>
            </button>
          </div>
        </div>

        {/* CARDS DE ESTATÍSTICAS DA BANCADA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-amber-500/40">
          <div className="bg-amber-900/40 border border-amber-400/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider block">
              Total
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {estatisticas.totalVolumes}
              </span>
              <span className="text-xs text-amber-200 font-bold">volumes</span>
            </div>
          </div>

          <div className="bg-amber-900/40 border border-amber-400/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider block">
              Unidades
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {estatisticas.totalUnidades}
              </span>
              <span className="text-xs text-amber-200 font-bold">{rotuloUnidade.toLowerCase()}s</span>
            </div>
          </div>

          <div className="bg-amber-900/40 border border-amber-400/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider block">
              Blocos
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {estatisticas.estruturasComVolumes}
              </span>
              <span className="text-xs text-amber-200 font-bold">de {estruturasDisponiveis.length}</span>
            </div>
          </div>

          <div className="bg-amber-900/40 border border-amber-400/30 rounded-xl p-2.5 sm:p-3">
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider block">
              Operador
            </span>
            <div className="flex items-center gap-1.5 mt-1 truncate">
              <User className="w-4 h-4 text-amber-300 flex-shrink-0" />
              <span className="text-sm font-black text-white truncate" title={nomeOperador}>
                {nomeOperador}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-xs gap-1">
        <button
          type="button"
          onClick={() => setAbaVisualizacao('lancamento')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition ${
            abaVisualizacao === 'lancamento'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Plus className="w-4 h-4" />
          1. Lançamento Rápido por {rotuloBloco}
        </button>

        <button
          type="button"
          onClick={() => setAbaVisualizacao('visao_geral')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-black flex items-center justify-center gap-2 transition ${
            abaVisualizacao === 'visao_geral'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          2. Visão Geral da Bancada ({estatisticas.totalVolumes} vol.)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: LANÇAMENTO RÁPIDO OTIMIZADO PARA TOUCH & TECLADO NUMÉRICO          */}
      {/* ========================================================================= */}
      {abaVisualizacao === 'lancamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* PAINEL ESQUERDO: SELEÇÃO DE ESTRUTURA E ENTRADA NUMÉRICA TOUCH */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* SELEÇÃO DA ESTRUTURA (TORRE / BLOCO / QUADRA) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-600" />
                  1. Selecione a {rotuloBloco} Atual:
                </label>
                <button
                  type="button"
                  onClick={() => setModalNovaEstrutura(true)}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Outra {rotuloBloco}
                </button>
              </div>

              {/* BOTÕES TOUCH GRANDES DE CADA TORRE / BLOCO */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {estruturasDisponiveis.map(estr => {
                  const itensDestaEstrutura = itens.filter(
                    it => it.estrutura.toLowerCase() === estr.toLowerCase()
                  );
                  const volsDestaEstrutura = itensDestaEstrutura.reduce(
                    (acc, it) => acc + (it.volumes || 1),
                    0
                  );
                  const isAtiva = estruturaSelecionada.toLowerCase() === estr.toLowerCase();

                  return (
                    <button
                      key={estr}
                      type="button"
                      onClick={() => {
                        setEstruturaSelecionada(estr);
                        inputUnidadeRef.current?.focus();
                      }}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all active:scale-95 cursor-pointer ${
                        isAtiva
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                      }`}
                    >
                      <span className={`text-xs font-black truncate ${isAtiva ? 'text-white' : 'text-slate-900'}`}>
                        {estr}
                      </span>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-black/10">
                        <span className={`text-[10px] font-bold uppercase ${isAtiva ? 'text-amber-200' : 'text-slate-500'}`}>
                          Volumes:
                        </span>
                        <span
                          className={`text-xs font-black px-1.5 py-0.2 rounded-full ${
                            volsDestaEstrutura > 0
                              ? isAtiva
                                ? 'bg-white text-amber-700'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isAtiva
                              ? 'bg-amber-700/60 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {volsDestaEstrutura}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ENTRADA DE DADOS NUMÉRICA OBRIGATÓRIA (OTIMIZADA PARA TOUCH) */}
            <div className="bg-white p-4 rounded-2xl border-2 border-amber-500/50 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                    2
                  </span>
                  Lançamento de {rotuloUnidade} na {estruturaSelecionada || rotuloBloco}
                </span>
              </div>

              {/* FORMULÁRIO COM INPUT NUMÉRICO TOUCH EXCLUSIVO */}
              <form onSubmit={handleAdicionarUnidade} className="space-y-3">
                <div>
                  <div className="relative">
                    {/* INPUT COM USO EXCLUSIVO DO NUMPAD (inputMode="none" + readOnly={true} NÃO ABRE TECLADO DO DISPOSITIVO) */}
                    <input
                      ref={inputUnidadeRef}
                      type="text"
                      inputMode="none"
                      readOnly={true}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      placeholder={`Toque no Numpad abaixo para digitar o ${rotuloUnidade.toLowerCase()}...`}
                      value={unidadeDigitada}
                      tabIndex={0}
                      onKeyDown={e => {
                        // Suporte a teclado físico ou leitor de código de barras no computador caso conectado
                        if (e.key === 'Backspace') {
                          e.preventDefault();
                          apagarUltimoDigito();
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAdicionarUnidade();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          limparDigitos();
                        } else if (/^[0-9a-zA-Z]$/.test(e.key)) {
                          e.preventDefault();
                          tocarNumeroVirtual(e.key.toUpperCase());
                        }
                      }}
                      className="w-full text-2xl sm:text-3xl font-black font-mono uppercase text-slate-900 bg-amber-50/50 border-2 border-amber-400 focus:border-amber-600 focus:bg-white rounded-xl py-3 px-4 shadow-inner outline-none transition placeholder:text-slate-400 placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal cursor-pointer select-none text-center"
                    />

                    {unidadeDigitada && (
                      <button
                        type="button"
                        onClick={limparDigitos}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 p-1.5 cursor-pointer transition active:scale-95"
                        title="Limpar digitação"
                      >
                        <Delete className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* QUANTIDADE DE VOLUMES (MANTER QTD + TELINHA DE QTD CONFIGURÁVEL COM + E -) */}
                <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-black text-slate-600 uppercase px-1">Qtd:</span>
                  {[1, 2, 3, 4].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQtdVolumes(q)}
                      className={`px-2 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                        qtdVolumes === q
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}

                  {/* TELINHA DE QTD CONFIGURÁVEL COM + E - (10 A 50 OU ATÉ MAIS VOLUMES) */}
                  <div className="flex items-center bg-white border border-amber-300 rounded-lg p-0.5 shadow-2xs ml-auto">
                    <button
                      type="button"
                      onClick={() => setQtdVolumes(prev => Math.max(1, prev - 1))}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-700 hover:text-amber-900 hover:bg-amber-50 active:scale-95 transition font-black cursor-pointer select-none"
                      title="Diminuir 1 volume (-)"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalQtdAberto(true)}
                      className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 border border-amber-200 rounded text-center cursor-pointer transition flex items-center gap-1"
                      title="Telinha de QTD: clique para ajustar volumes (10 a 50+)"
                    >
                      <span className="text-xs font-black text-amber-950 font-mono">{qtdVolumes}</span>
                      <span className="text-[9px] font-bold text-amber-800 uppercase">vol</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQtdVolumes(prev => prev + 1)}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-700 hover:text-amber-900 hover:bg-amber-50 active:scale-95 transition font-black cursor-pointer select-none"
                      title="Adicionar +1 volume (+)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalQtdAberto(true)}
                      className="text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white px-1.5 py-1 rounded ml-1 transition shadow-2xs cursor-pointer flex items-center gap-0.5"
                      title="Abrir telinha com botões rápidos (+5, +10, 50...)"
                    >
                      <span>+Qtd</span>
                    </button>
                  </div>
                </div>

                {/* TECLADO NUMÉRICO & ALFANUMÉRICO VIRTUAL EXCLUSIVO (SEMPRE ATIVO NA TELA) */}
                <div className="bg-slate-100 p-2.5 sm:p-3 rounded-2xl border border-slate-300 shadow-inner space-y-2">
                  {/* Cabeçalho do Seletor de Tipo e Local com Atalho de Configuração */}
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      Tipo & Local da Encomenda
                    </span>
                    <button
                      type="button"
                      onClick={abrirModalConfigBotoes}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer transition"
                      title="Configurar tipos e locais das encomendas (Pacote, Caixa, Carta...)"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Configurar Locais</span>
                    </button>
                  </div>

                  {/* Seletor Rápido de Tipo de Volume e Local Físico Configurável por Condomínio */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {botoesConfig.filter(b => b.ativo).map(btn => {
                      const ativo = (botaoAtivoAtual?.id || botoesConfig[0]?.id) === btn.id;
                      const Icone = btn.icone === 'Mail' ? Mail : btn.icone === 'Box' ? Box : btn.icone === 'Archive' ? Archive : btn.icone === 'Layers' ? Layers : Package;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setBotaoSelecionadoId(btn.id)}
                          className={`h-12 sm:h-13 rounded-xl px-1 py-1 text-xs font-black flex flex-col items-center justify-center transition active:scale-95 cursor-pointer border shadow-2xs select-none touch-manipulation ${
                            ativo
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-400/50'
                              : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <Icone className={`w-3.5 h-3.5 shrink-0 ${ativo ? 'text-white' : 'text-amber-600'}`} />
                            <span className="truncate">{btn.tipo.toUpperCase()}</span>
                          </div>
                          <span className={`text-[10px] font-bold truncate mt-0.5 ${ativo ? 'text-amber-100' : 'text-slate-500'}`}>
                            {btn.local}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Grade Numérica 3x3 + 0 + Ações Rápidas */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => tocarNumeroVirtual(d)}
                        className="h-12 sm:h-14 bg-white hover:bg-amber-50 active:bg-amber-200 text-slate-900 rounded-xl text-2xl font-black shadow-xs border border-slate-300 active:scale-95 transition flex items-center justify-center cursor-pointer select-none touch-manipulation"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={apagarUltimoDigito}
                      className="h-12 sm:h-14 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 rounded-xl text-base font-black shadow-xs border border-amber-300 active:scale-95 transition flex items-center justify-center cursor-pointer select-none touch-manipulation"
                      title="Apagar último caractere"
                    >
                      <Delete className="w-6 h-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => tocarNumeroVirtual('0')}
                      className="h-12 sm:h-14 bg-white hover:bg-amber-50 active:bg-amber-200 text-slate-900 rounded-xl text-2xl font-black shadow-xs border border-slate-300 active:scale-95 transition flex items-center justify-center cursor-pointer select-none touch-manipulation"
                    >
                      0
                    </button>
                    <button
                      type="submit"
                      disabled={!unidadeDigitada.trim()}
                      className="h-12 sm:h-14 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xl sm:text-2xl font-black shadow-xs border border-emerald-500 active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer select-none touch-manipulation"
                      title="Confirmar e adicionar unidade"
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                      <span>OK</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* FEEDBACK DO ÚLTIMO LANÇAMENTO */}
              {feedbackUltimoLancamento && (
                <div
                  className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold animate-fadeIn ${
                    feedbackUltimoLancamento.tipo === 'incremento'
                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                      : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    {feedbackUltimoLancamento.mensagem}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DIREITO: LISTA EM TEMPO REAL DOS APARTAMENTOS DA TORRE SELECIONADA */}
          <div className="lg:col-span-6 space-y-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[460px]">
              
              {/* TOPO DA LISTA */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-amber-600" />
                    Volumes na {estruturaSelecionada}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {itensEstruturaAtivaFiltrados.length} {rotuloUnidade.toLowerCase()}(s) • {totalVolumesEstruturaAtiva} volume(s) físicos
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {itensEstruturaAtiva.length > 0 && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black rounded-lg">
                      {totalVolumesEstruturaAtiva} vol.
                    </span>
                  )}
                  {/* Ícone de engrenagem bem no cantinho acima da barra de pesquisa */}
                  <button
                    type="button"
                    onClick={abrirModalConfigBotoes}
                    title="Configurar botões e locais de encomendas (Pacote -> Bancada, Caixa -> Chão, Carta -> Fora...)"
                    className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-100 active:scale-95 rounded-lg border border-slate-300 transition cursor-pointer shadow-2xs"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* BARRA DE PESQUISA RÁPIDA DA LISTA DE VOLUMES */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Buscar ${rotuloUnidade.toLowerCase()} nesta ${rotuloBloco.toLowerCase()}...`}
                  value={buscaListaTorre}
                  onChange={e => setBuscaListaTorre(e.target.value)}
                  className="w-full text-xs font-semibold pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none transition"
                />
                {buscaListaTorre && (
                  <button
                    type="button"
                    onClick={() => setBuscaListaTorre('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* CONTEÚDO DA LISTA */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[500px]">
                {itensEstruturaAtivaFiltrados.length === 0 ? (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-xl my-auto">
                    <PackageCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-500">
                      {buscaListaTorre ? `Nenhuma unidade encontrada com o filtro "${buscaListaTorre}".` : `Nenhum volume lançado para a ${estruturaSelecionada} ainda.`}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {buscaListaTorre ? 'Tente buscar por outro número de unidade.' : 'Digite o número da unidade no painel ao lado para começar o lançamento rápido.'}
                    </p>
                  </div>
                ) : (
                  itensEstruturaAtivaFiltrados.map(item => (
                    <div
                      key={item.id}
                      className="bg-slate-50 hover:bg-amber-50/60 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition"
                    >
                      {/* IDENTIFICAÇÃO DA UNIDADE */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white font-black text-base flex items-center justify-center shadow-xs flex-shrink-0">
                          {item.unidade}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-slate-900">
                              {rotuloUnidade} {item.unidade}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                              {item.volumes} {item.volumes > 1 ? 'volumes' : 'volume'}
                            </span>
                            {item.tipo_volume && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800 border border-slate-300">
                                {item.tipo_volume}
                              </span>
                            )}
                            {item.local_armazenamento && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-amber-700" />
                                {item.local_armazenamento}
                              </span>
                            )}
                          </div>
                          {item.observacao && (
                            <p className="text-[11px] text-slate-600 font-medium italic mt-0.5">
                              {item.observacao}
                            </p>
                          )}
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • por {item.operador_nome || 'Portaria'}
                          </span>
                        </div>
                      </div>

                      {/* AÇÕES RÁPIDAS (INCREMENTAR, DECREMENTAR, BAIXA E EXCLUIR) */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* BOTÕES + E - */}
                        <div className="flex items-center bg-white rounded-lg border border-slate-300 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleAlterarVolumeItem(item, -1)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-l-lg transition"
                            title="Diminuir 1 volume"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-black text-slate-900">
                            {item.volumes}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAlterarVolumeItem(item, 1)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-r-lg transition"
                            title="Adicionar +1 volume"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* BOTÃO DAR BAIXA / ENTREGAR */}
                        <button
                          type="button"
                          onClick={() => handleDarBaixa(item)}
                          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Morador retirou volume"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Baixa
                        </button>

                        {/* BOTÃO EXCLUIR */}
                        <button
                          type="button"
                          onClick={() => handleRemoverItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* RODAPÉ DO PAINEL COM BOTÃO RÁPIDO PARA IR PARA A PRÓXIMA TORRE */}
              <div className="pt-3 border-t border-slate-200 mt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Finalizou esta {rotuloBloco.toLowerCase()}?
                </span>
                <div className="flex items-center gap-1">
                  {estruturasDisponiveis.map(estr => {
                    if (estr.toLowerCase() === estruturaSelecionada.toLowerCase()) return null;
                    return (
                      <button
                        key={estr}
                        type="button"
                        onClick={() => {
                          setEstruturaSelecionada(estr);
                          inputUnidadeRef.current?.focus();
                        }}
                        className="text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition"
                      >
                        Ir para {estr} →
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: VISÃO GERAL DA BANCADA (TODAS AS TORRES LADO A LADO COM BUSCA)     */}
      {/* ========================================================================= */}
      {abaVisualizacao === 'visao_geral' && (
        <div className="space-y-4">
          {/* BARRA DE FILTRO E BUSCA RÁPIDA */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Buscar unidade ou ${rotuloBloco.toLowerCase()}...`}
                value={termoBusca}
                onChange={e => setTermoBusca(e.target.value)}
                className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Resumo:</span>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-black">
                  {estatisticas.totalVolumes} vol. em {estatisticas.totalUnidades} un.
                </span>
              </div>
              <button
                type="button"
                onClick={abrirModalConfigBotoes}
                title="Configurar botões e locais de encomendas"
                className="p-1.5 text-slate-500 hover:text-amber-800 hover:bg-amber-100 active:scale-95 rounded-lg border border-slate-300 transition cursor-pointer shadow-2xs"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* GRID DE CARDS POR ESTRUTURA */}
          {itensFiltradosVisaoGeral.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-black text-slate-700">
                {termoBusca ? 'Nenhum volume encontrado com este filtro' : 'A bancada está completamente limpa!'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {termoBusca
                  ? 'Tente buscar por outro número de unidade ou bloco.'
                  : 'Nenhum volume físico pendente sob custódia na portaria neste instante.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {itensFiltradosVisaoGeral.map(grupo => (
                <div
                  key={grupo.estrutura}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* CABEÇALHO DO CARD DA TORRE */}
                  <div className="bg-amber-50 border-b border-amber-200/80 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-black text-amber-950">
                        {grupo.estrutura}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full border border-amber-300">
                        {grupo.totalVolumes} {grupo.totalVolumes > 1 ? 'volumes' : 'vol'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600">
                        ({grupo.totalUnidades} un.)
                      </span>
                    </div>
                  </div>

                  {/* LISTAGEM DE UNIDADES NO CARD */}
                  <div className="p-3 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-72">
                    {grupo.itens.map(item => (
                      <div
                        key={item.id}
                        className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900">
                              {rotuloUnidade} {item.unidade}
                            </span>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                              {item.volumes} vol.
                            </span>
                            {item.tipo_volume && (
                              <span className="text-[9px] font-extrabold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200">
                                {item.tipo_volume}
                              </span>
                            )}
                            {item.local_armazenamento && (
                              <span className="text-[9px] font-extrabold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5 text-amber-700" />
                                {item.local_armazenamento}
                              </span>
                            )}
                          </div>
                          {item.observacao && (
                            <p className="text-[10px] text-slate-500 italic mt-0.5">
                              {item.observacao}
                            </p>
                          )}
                        </div>

                        {/* AÇÃO RÁPIDA DE BAIXA */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDarBaixa(item)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[11px] font-bold transition flex items-center gap-0.5 cursor-pointer"
                            title="Dar baixa / Entregar"
                          >
                            <Check className="w-3 h-3 text-emerald-600" /> Baixa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* RODAPÉ DO CARD */}
                  <div className="bg-slate-50 border-t border-slate-100 p-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEstruturaSelecionada(grupo.estrutura);
                        setAbaVisualizacao('lancamento');
                      }}
                      className="text-xs font-black text-amber-700 hover:text-amber-800 transition cursor-pointer"
                    >
                      Lançar mais para {grupo.estrutura} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TELINHA DE QUANTIDADE CONFIGURÁVEL (+ e - / 10 A 50+ VOLUMES)     */}
      {/* ========================================================================= */}
      {modalQtdAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-600" />
                Telinha de Quantidade de Volumes
              </h4>
              <button
                type="button"
                onClick={() => setModalQtdAberto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Ajuste rapidamente a quantidade para unidades com múltiplos pacotes (de 10 a 50 ou até mais).
            </p>

            {/* DISPLAY DIGITAL CENTRAL */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 text-center shadow-inner space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                Volumes Selecionados
              </span>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setQtdVolumes(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl flex items-center justify-center font-black text-xl transition cursor-pointer"
                  title="Diminuir volume"
                >
                  <Minus className="w-5 h-5 stroke-[3]" />
                </button>
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-400 min-w-[80px]">
                  {qtdVolumes}
                </span>
                <button
                  type="button"
                  onClick={() => setQtdVolumes(prev => prev + 1)}
                  className="w-10 h-10 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-xl flex items-center justify-center font-black text-xl transition cursor-pointer"
                  title="Aumentar volume"
                >
                  <Plus className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
              <span className="text-xs text-slate-400">
                {qtdVolumes === 1 ? '1 volume' : `${qtdVolumes} volumes para esta unidade`}
              </span>
            </div>

            {/* BOTÕES DE INCREMENTO RÁPIDO (+5, +10, +20, +50) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                Adicionar mais volumes (+):
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 20, 50].map(delta => (
                  <button
                    key={delta}
                    type="button"
                    onClick={() => setQtdVolumes(prev => prev + delta)}
                    className="py-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    +{delta}
                  </button>
                ))}
              </div>
            </div>

            {/* ATALHOS DE QUANTIDADES FIXAS (1, 5, 10, 15, 20, 30, 40, 50) */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                Definir quantidade exata:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 20, 25, 30, 40, 50].map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQtdVolumes(q)}
                    className={`py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                      qtdVolumes === q
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {q} vol
                  </button>
                ))}
              </div>
            </div>

            {/* CAMPO DE DIGITAÇÃO MANUAL LIVRE */}
            <div className="pt-1">
              <label className="text-[10px] font-black text-slate-600 uppercase block mb-1">
                Ou digite a quantidade manual:
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={qtdVolumes}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setQtdVolumes(Math.max(1, val));
                }}
                className="w-full text-center text-lg font-black font-mono p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setQtdVolumes(1);
                  setModalQtdAberto(false);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Resetar (1)
              </button>
              <button
                type="button"
                onClick={() => setModalQtdAberto(false)}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                Confirmar ({qtdVolumes})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURAR BOTÕES DE TIPOS E LOCAIS DAS ENCOMENDAS (CONFIGURÁVEL)  */}
      {/* ========================================================================= */}
      {modalConfigBotoes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-amber-600" />
                  Configurar Botões & Locais de Encomendas
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {nomeCondominio} • Identifique o local físico (ex: Bancada, Chão, Fora...)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalConfigBotoes(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Personalize os botões de tipo e local da bancada. Cada condomínio configura os seus:
              <strong className="text-slate-900"> Pacote ➔ Bancada</strong>,
              <strong className="text-slate-900"> Caixa ➔ Chão</strong>,
              <strong className="text-slate-900"> Carta ➔ Fora</strong>, ou adicione outros locais conforme a necessidade.
            </p>

            {/* LISTA DE BOTÕES EM EDIÇÃO */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {botoesEmEdicao.map((btn, index) => (
                <div
                  key={btn.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                      Botão #{index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={btn.ativo}
                          onChange={e => {
                            const updated = [...botoesEmEdicao];
                            updated[index].ativo = e.target.checked;
                            setBotoesEmEdicao(updated);
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        Ativo
                      </label>
                      {botoesEmEdicao.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBotoesEmEdicao(botoesEmEdicao.filter((_, i) => i !== index));
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Remover este botão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">
                        Tipo de Volume *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Pacote, Caixa..."
                        value={btn.tipo}
                        onChange={e => {
                          const updated = [...botoesEmEdicao];
                          updated[index].tipo = e.target.value;
                          setBotoesEmEdicao(updated);
                        }}
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">
                        Local Físico Identificado *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Bancada, Chão, Fora..."
                        value={btn.local}
                        onChange={e => {
                          const updated = [...botoesEmEdicao];
                          updated[index].local = e.target.value;
                          setBotoesEmEdicao(updated);
                        }}
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500 text-amber-950"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-0.5">
                        Ícone
                      </label>
                      <select
                        value={btn.icone || 'Package'}
                        onChange={e => {
                          const updated = [...botoesEmEdicao];
                          updated[index].icone = e.target.value as any;
                          setBotoesEmEdicao(updated);
                        }}
                        className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg outline-none focus:border-amber-500"
                      >
                        <option value="Package">📦 Pacote</option>
                        <option value="Box">📦 Caixa</option>
                        <option value="Mail">✉️ Carta / Envelope</option>
                        <option value="Archive">📁 Arquivo / Gaveta</option>
                        <option value="Layers">📑 Balcão / Outro</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* BOTÃO ADICIONAR NOVO BOTÃO */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  const novoId = String(Date.now());
                  setBotoesEmEdicao([
                    ...botoesEmEdicao,
                    { id: novoId, tipo: 'Outro', local: 'Bancada', icone: 'Package', ativo: true }
                  ]);
                }}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Outro Botão
              </button>

              <button
                type="button"
                onClick={restaurarBotoesPadrao}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Restaurar Padrão
              </button>
            </div>

            {/* AÇÕES FINAIS */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalConfigBotoes(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarConfiguracaoBotoes}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE ZERAR / NOVA CONFERÊNCIA                             */}
      {/* ========================================================================= */}
      {modalZerarAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">
                Zerar Bancada & Iniciar Nova Contagem?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Esta ação salva um <strong>Snapshot de Auditoria</strong> com a situação atual ({estatisticas.totalVolumes} volumes em {estatisticas.totalUnidades} unidades) e limpa o balcão físico para um novo plantão ou nova conferência.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Motivo / Observação (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Troca de plantão 07h às 19h, Limpeza de balcão..."
                value={motivoZerar}
                onChange={e => setMotivoZerar(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalZerarAberto(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutarZerarBalcão}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition"
              >
                Confirmar & Zerar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HISTÓRICO DE AUDITORIAS E CONFERÊNCIAS                             */}
      {/* ========================================================================= */}
      {modalHistoricoAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">
                  Histórico de Conferências da Bancada
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {historicoSnapshots.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold">
                  Nenhum histórico arquivado ainda. As conferências são gravadas ao passar o posto ou ao zerar o balcão.
                </div>
              ) : (
                historicoSnapshots.map(snap => (
                  <div
                    key={snap.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 space-y-1.5 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">
                        {new Date(snap.data_hora).toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        {snap.total_volumes} volumes ({snap.total_unidades} un.)
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      <span>👤 Conferente: <strong>{snap.operador_nome}</strong></span>
                      {snap.observacoes && <span>• <em>{snap.observacoes}</em></span>}
                    </div>

                    {/* DISCRIMINAÇÃO RÁPIDA POR ESTRUTURA */}
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                      {snap.estruturas_resumo?.map(e => (
                        <span key={e.estrutura} className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          <strong>{e.estrutura}:</strong> {e.totalVolumes} vol.
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setModalHistoricoAberto(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR ESTRUTURA PERSONALIZADA                                  */}
      {/* ========================================================================= */}
      {modalNovaEstrutura && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-amber-600" />
              Adicionar Nova {rotuloBloco}
            </h4>
            <p className="text-xs text-slate-500">
              Digite o identificador da estrutura para incluir na lista rápida da bancada.
            </p>
            <input
              type="text"
              autoFocus
              placeholder={`Ex: Torre C, Bloco 4, Quadra 10...`}
              value={novaEstruturaNome}
              onChange={e => setNovaEstruturaNome(e.target.value)}
              className="w-full text-sm p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 font-bold"
            />
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalNovaEstrutura(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdicionarNovaEstrutura}
                disabled={!novaEstruturaNome.trim()}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
