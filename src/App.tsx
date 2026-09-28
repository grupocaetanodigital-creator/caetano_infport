import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Cadastros from './pages/Cadastros';
import Encomendas from './pages/Encomendas';
import Custodia from './pages/Custodia';
import Materiais from './pages/Materiais';
import Chaves from './pages/Chaves';
import Manutencao from './pages/Manutencao';
import Rondas from './pages/Rondas';
import Ocorrencias from './pages/Ocorrencias';
import PassagemPosto from './pages/PassagemPosto';
import PrestadoresObras from './pages/PrestadoresObras';
import Configuracoes from './pages/Configuracoes';
import AlertaRondaGlobal from './components/AlertaRondaGlobal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import ControleFonteAcessibilidade from './components/ControleFonteAcessibilidade';
import IndicadorConectividade from './components/IndicadorConectividade';
import EmblemaInfport from './components/EmblemaInfport';
import LeitorNFC from './components/LeitorNFC';
import ModalMeuPerfil from './components/ModalMeuPerfil';
import { salvarCacheLocal, obterCacheLocal } from './services/offlineStorageService';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  LogOut, 
  Database, 
  Package, 
  Shield, 
  Radio, 
  Key, 
  Wrench, 
  QrCode, 
  BookOpen,
  Repeat,
  Briefcase,
  Settings,
  Filter,
  Menu,
  X,
  Home,
  Grid,
  ChevronLeft,
  Sparkles,
  HardHat,
  PackageCheck,
  ClipboardList,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';

const CHAVE_SESSAO = 'infport_sessao_ativa_v1';

export default function App() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState<any | null>(null);
  const [condominio, setCondominio] = useState<any | null>(null);
  const [modalLeitorNfcGlobal, setModalLeitorNfcGlobal] = useState(false);
  const [modalMeuPerfilAberto, setModalMeuPerfilAberto] = useState(false);
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  const [lembrarAcesso, setLembrarAcesso] = useState(true);
  const [restaurandoSessao, setRestaurandoSessao] = useState(true);
  
  const [listaCondominios, setListaCondominios] = useState<any[]>([]);
  const [condominioAtivoId, setCondominioAtivoId] = useState('');

  const [menuAberto, setMenuAberto] = useState(true);
  const [drawerMobileAberto, setDrawerMobileAberto] = useState(false);

  const [featureFlags, setFeatureFlags] = useState({
    mod02_gestao_encomendas: true,
    mod03_custodia_itens: true,
    mod04_materiais_posto: true,
    mod05_quadro_chaves: true,
    mod06_gestao_manutencao: true,
    mod07_gestao_ronda: true,
    mod08_livro_ocorrencias: true,
    mod09_passagem_posto: true,
    mod10_prestadores_servico: true
  });

  const [moduloAtual, setModuloAtual] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const eAdmin = operador?.perfil === 'admin' || operador?.nivel_acesso === 0;
  const podeAcessarConfiguracoes = eAdmin || operador?.perfil === 'master' || operador?.nivel_acesso === 1;

  useEffect(() => {
    let montado = true;
    const restaurarSessaoSalva = async () => {
      try {
        const sessaoRaw = localStorage.getItem(CHAVE_SESSAO);
        if (sessaoRaw) {
          const sessao = JSON.parse(sessaoRaw);
          if (sessao.operadorId) {
            const { data: opData } = await supabase
              .from('operadores')
              .select('*')
              .eq('id', sessao.operadorId)
              .eq('ativo', true)
              .maybeSingle();

            if (opData && montado) {
              setOperador(opData);
              const targetCondo = sessao.condominioId || opData.condominio_id;
              setCondominioAtivoId(targetCondo || '');
              if (targetCondo) {
                const { data: cData } = await supabase
                  .from('condominios')
                  .select('*')
                  .eq('id', targetCondo)
                  .maybeSingle();
                if (cData && montado) setCondominio(cData);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Falha ao restaurar sessão salva:', err);
      } finally {
        if (montado) setRestaurandoSessao(false);
      }
    };

    restaurarSessaoSalva();
    return () => { montado = false; };
  }, []);

  useEffect(() => {
    if (!operador) return;

    window.history.replaceState({ modulo: moduloAtual }, '');

    const handlePopState = () => {
      if (moduloAtual !== 'dashboard') {
        setModuloAtual('dashboard');
        window.history.pushState({ modulo: 'dashboard' }, '');
      } else {
        window.history.pushState({ modulo: 'dashboard' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [operador, moduloAtual]);

  const mudarModulo = (novoModulo: string) => {
    setModuloAtual(novoModulo);
    setDrawerMobileAberto(false);
    window.history.pushState({ modulo: novoModulo }, '');
  };

  useEffect(() => {
    if (operador) {
      carregarCondominiosHeader();
    }
  }, [operador]);

  useEffect(() => {
    if (operador) {
      const idCondTarget = eAdmin ? (condominioAtivoId || operador.condominio_id) : operador.condominio_id;
      if (idCondTarget) {
        carregarFeatureFlags(idCondTarget);
      } else {
        resetarFeatureFlagsPadrao();
      }
    }
  }, [operador, condominioAtivoId]);

  // Listener para atualização em tempo real quando as flags forem salvas em Configurações
  useEffect(() => {
    const handleAtualizacaoModulos = (e: any) => {
      if (e.detail) {
        const idAlvo = e.detail.condominio_id;
        const condoAtual = eAdmin ? (condominioAtivoId || operador?.condominio_id) : operador?.condominio_id;
        if (!idAlvo || idAlvo === condoAtual) {
          const novas = e.detail.flags || e.detail;
          setFeatureFlags(prev => ({
            ...prev,
            ...novas
          }));
        }
      }
    };

    window.addEventListener('modulos_atualizados', handleAtualizacaoModulos);
    return () => {
      window.removeEventListener('modulos_atualizados', handleAtualizacaoModulos);
    };
  }, [operador?.condominio_id, condominioAtivoId, eAdmin]);

  const carregarCondominiosHeader = async () => {
    try {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      setListaCondominios(data || []);
      salvarCacheLocal('condominios', data || [], 'global');
    } catch (err) {
      console.warn('Erro ao carregar condomínios (tentando cache offline):', err);
      const cache = obterCacheLocal<any[]>('condominios', 'global', []);
      if (cache && cache.length > 0) {
        setListaCondominios(cache);
      }
    }
  };

  const resetarFeatureFlagsPadrao = () => {
    setFeatureFlags({
      mod02_gestao_encomendas: true,
      mod03_custodia_itens: true,
      mod04_materiais_posto: true,
      mod05_quadro_chaves: true,
      mod06_gestao_manutencao: true,
      mod07_gestao_ronda: true,
      mod08_livro_ocorrencias: true,
      mod09_passagem_posto: true,
      mod10_prestadores_servico: true
    });
  };

  const carregarFeatureFlags = async (condominioId: string) => {
    if (!condominioId) {
      resetarFeatureFlagsPadrao();
      return;
    }

    try {
      // 1. Tenta carregar do localStorage primeiro para resposta instantânea
      const cacheLocal = localStorage.getItem(`infport_flags_${condominioId}`);
      if (cacheLocal) {
        try {
          const parsed = JSON.parse(cacheLocal);
          setFeatureFlags(prev => ({
            ...prev,
            ...parsed,
            mod02_gestao_encomendas: parsed.mod02_gestao_encomendas ?? true,
            mod03_custodia_itens: parsed.mod03_custodia_itens ?? true
          }));
        } catch {
          // ignore
        }
      }

      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const ff = (typeof data.feature_flags === 'object' && data.feature_flags !== null) 
          ? data.feature_flags 
          : {};

        const novasFlags = {
          mod02_gestao_encomendas: data.mod02_gestao_encomendas ?? ff.mod02_gestao_encomendas ?? true,
          mod03_custodia_itens: data.mod03_custodia_itens ?? ff.mod03_custodia_itens ?? true,
          mod04_materiais_posto: data.mod04_materiais_posto ?? ff.mod04_materiais_posto ?? true,
          mod05_quadro_chaves: data.mod05_quadro_chaves ?? ff.mod05_quadro_chaves ?? true,
          mod06_gestao_manutencao: data.mod06_gestao_manutencao ?? ff.mod06_gestao_manutencao ?? true,
          mod07_gestao_ronda: data.mod07_gestao_ronda ?? ff.mod07_gestao_ronda ?? true,
          mod08_livro_ocorrencias: data.mod08_livro_ocorrencias ?? ff.mod08_livro_ocorrencias ?? true,
          mod09_passagem_posto: data.mod09_passagem_posto ?? ff.mod09_passagem_posto ?? true,
          mod10_prestadores_servico: data.mod10_prestadores_servico ?? ff.mod10_prestadores_servico ?? true
        };

        setFeatureFlags(novasFlags);
        localStorage.setItem(`infport_flags_${condominioId}`, JSON.stringify(novasFlags));
      } else {
        resetarFeatureFlagsPadrao();
      }
    } catch (err) {
      console.error('Erro ao carregar Feature Flags:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const loginLimpo = login.trim();
      const senhaLimpa = senha.trim();

      const { data: opData, error: opError } = await supabase
        .from('operadores')
        .select('*')
        .eq('login', loginLimpo)
        .eq('senha', senhaLimpa)
        .eq('ativo', true)
        .maybeSingle();

      if (opError) throw opError;
      if (!opData) {
        setErro('Usuário ou senha incorretos.');
        setLoading(false);
        return;
      }

      let condData = null;
      if (opData.condominio_id) {
        const { data: cData } = await supabase
          .from('condominios')
          .select('*')
          .eq('id', opData.condominio_id)
          .maybeSingle();
        condData = cData;
      }

      setOperador(opData);
      setCondominio(condData || { nome: 'Administração Geral Dev' });
      setCondominioAtivoId(opData.condominio_id || '');

      if (lembrarAcesso) {
        localStorage.setItem(CHAVE_SESSAO, JSON.stringify({
          operadorId: opData.id,
          login: opData.login,
          condominioId: opData.condominio_id,
          salvoEm: new Date().toISOString()
        }));
      } else {
        localStorage.removeItem(CHAVE_SESSAO);
      }

      mudarModulo('dashboard');
    } catch (err: any) {
      setErro(`Falha de conexão: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(CHAVE_SESSAO);
    setOperador(null);
    setCondominio(null);
    setLogin('');
    setSenha('');
    setCondominioAtivoId('');
    setDrawerMobileAberto(false);
  };

  const handleTrocarOperador = (novoOperador: any) => {
    setOperador(novoOperador);
    mudarModulo('dashboard');
  };

  const objCondominioSelecionado = listaCondominios.find(c => c.id === condominioAtivoId);

  const operadorContextoGlobal = operador ? {
    ...operador,
    condominio_id: eAdmin ? (condominioAtivoId || operador.condominio_id) : operador.condominio_id,
    condominio_nome: eAdmin 
      ? (objCondominioSelecionado?.nome || (condominioAtivoId ? 'Condomínio Selecionado' : 'Visão Global (Todos)'))
      : (condominio?.nome || 'Condomínio Geral')
  } : null;

  const modulosDisponiveis = [
    { id: 'encomendas', titulo: 'Encomendas', icone: Package, flag: Boolean(featureFlags.mod02_gestao_encomendas), cor: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'custodia', titulo: 'Custódia Itens', icone: PackageCheck, flag: Boolean(featureFlags.mod03_custodia_itens), cor: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'prestadores', titulo: 'Prestadores & Obras', icone: HardHat, flag: Boolean(featureFlags.mod10_prestadores_servico), cor: 'bg-amber-50 text-amber-700 border-amber-300' },
    { id: 'materiais', titulo: 'Materiais Posto', icone: ClipboardList, flag: Boolean(featureFlags.mod04_materiais_posto), cor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { id: 'chaves', titulo: 'Quadro Chaves', icone: Key, flag: Boolean(featureFlags.mod05_quadro_chaves), cor: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { id: 'manutencao', titulo: 'Manutenção OS', icone: Wrench, flag: Boolean(featureFlags.mod06_gestao_manutencao), cor: 'bg-orange-50 text-orange-600 border-orange-200' },
    { id: 'rondas', titulo: 'Rondas QR', icone: QrCode, flag: Boolean(featureFlags.mod07_gestao_ronda), cor: 'bg-slate-100 text-slate-800 border-slate-300' },
    { id: 'ocorrencias', titulo: 'Ocorrências', icone: BookOpen, flag: Boolean(featureFlags.mod08_livro_ocorrencias), cor: 'bg-rose-50 text-rose-600 border-rose-200' },
    { id: 'passagem', titulo: 'Passagem Posto', icone: Repeat, flag: Boolean(featureFlags.mod09_passagem_posto), cor: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { id: 'cadastros', titulo: 'Cadastros Base', icone: Database, flag: true, cor: 'bg-slate-100 text-slate-700 border-slate-300' },
  ];

  // Se o módulo ativo no momento for desativado nas flags, redireciona para o dashboard
  useEffect(() => {
    if (moduloAtual !== 'dashboard' && moduloAtual !== 'configuracoes') {
      const modAtivo = modulosDisponiveis.find(m => m.id === moduloAtual);
      if (modAtivo && !modAtivo.flag) {
        setModuloAtual('dashboard');
      }
    }
  }, [featureFlags, moduloAtual]);

  if (podeAcessarConfiguracoes) {
    modulosDisponiveis.push({ id: 'configuracoes', titulo: 'Configurações', icone: Settings, flag: true, cor: 'bg-slate-800 text-white border-slate-900' });
  }

  if (operador) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans pb-16 md:pb-0 text-slate-900 antialiased">
        
        {/* SIDEBAR DESKTOP */}
        <aside className={`hidden md:flex bg-slate-900 text-white flex-col justify-between transition-all duration-300 z-30 ${
          menuAberto ? 'w-64' : 'w-20'
        } shrink-0 min-h-screen sticky top-0`}>
          
          <div>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <EmblemaInfport tamanho="md" comBrilho />
                {menuAberto && (
                  <div>
                    <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                      INFPORT 1.0 <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
                    </h1>
                    <p className="text-xs text-slate-400 truncate max-w-[150px]">
                      {operadorContextoGlobal.condominio_nome}
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setMenuAberto(!menuAberto)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {eAdmin && menuAberto && (
              <div className="p-3 bg-slate-800/80 mx-3 mt-3 rounded-xl border border-slate-700/60 space-y-1">
                <label className="block text-xs font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Condomínio Ativo
                </label>
                <select
                  value={condominioAtivoId}
                  onChange={(e) => setCondominioAtivoId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-600 focus:outline-none"
                >
                  <option value="">🏢 Todos (Visão Global)</option>
                  {listaCondominios.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-250px)]">
              <button
                onClick={() => mudarModulo('dashboard')}
                className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                  moduloAtual === 'dashboard' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 shrink-0" />
                  {menuAberto && <span>Painel Principal</span>}
                </div>
              </button>

              {modulosDisponiveis.filter(m => m.flag).map((item) => {
                const IconeComponente = item.icone;
                return (
                  <button
                    key={item.id}
                    onClick={() => mudarModulo(item.id)}
                    className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-between transition ${
                      moduloAtual === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconeComponente className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>{item.titulo}</span>}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-1">
            {menuAberto && (
              <div
                onClick={() => setModalMeuPerfilAberto(true)}
                className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-85 transition group"
                title="Meu Perfil & Alterar Senha"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                  {operador.nome?.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1">
                    {operador.nome}
                    <KeyRound className="w-3 h-3 text-slate-500 group-hover:text-emerald-400" />
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">
                    {eAdmin ? 'DEV ADMIN' : `NÍVEL ${operador.nivel_acesso ?? 3}`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setModalMeuPerfilAberto(true)}
                className="text-slate-400 hover:text-emerald-400 hover:bg-slate-800 p-2 rounded-xl transition font-bold text-xs cursor-pointer"
                title="Meu Perfil & Senha"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="bg-red-600/90 hover:bg-red-700 text-white p-2 rounded-xl transition font-bold text-xs cursor-pointer"
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* DRAWER MOBILE */}
        {drawerMobileAberto && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-end md:hidden">
            <div className="w-4/5 max-w-xs bg-slate-900 h-full flex flex-col justify-between p-4 shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-200">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <EmblemaInfport tamanho="sm" />
                    <span className="font-bold text-white text-sm sm:text-base">Menu INFPORT</span>
                  </div>
                  <button onClick={() => setDrawerMobileAberto(false)} className="text-slate-400 p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {eAdmin && (
                  <div className="my-3 p-2.5 bg-slate-800 rounded-xl space-y-1">
                    <label className="text-xs font-bold text-emerald-400 uppercase">Condomínio Ativo</label>
                    <select
                      value={condominioAtivoId}
                      onChange={(e) => setCondominioAtivoId(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs font-bold p-2.5 rounded-lg border border-slate-700"
                    >
                      <option value="">🏢 Todos os Condomínios</option>
                      {listaCondominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="py-3 space-y-1 overflow-y-auto max-h-[55vh]">
                  <button
                    onClick={() => mudarModulo('dashboard')}
                    className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 ${
                      moduloAtual === 'dashboard' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Home className="w-5 h-5" /> Painel Geral
                  </button>

                  {modulosDisponiveis.filter(m => m.flag).map((item) => {
                    const Icone = item.icone;
                    return (
                      <button
                        key={item.id}
                        onClick={() => mudarModulo(item.id)}
                        className={`w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 ${
                          moduloAtual === item.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icone className="w-5 h-5" /> {item.titulo}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => {
                      setModalLeitorNfcGlobal(true);
                      setDrawerMobileAberto(false);
                    }}
                    className="w-full p-3 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-3 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/20 transition mt-2 cursor-pointer"
                  >
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <span>Leitor NFC / Tags</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">{operador.nome}</p>
                  <p className="text-xs text-slate-400 uppercase">{operadorContextoGlobal.condominio_nome}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white p-2.5 rounded-xl font-bold text-xs"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">
          
          <AlertaRondaGlobal 
            onNavegarRondas={() => mudarModulo('rondas')} 
            usuarioLogado={operadorContextoGlobal} 
          />

          {/* CABEÇALHO MOBILE */}
          <header className="md:hidden bg-slate-900 text-white px-3 py-2 flex items-center justify-between sticky top-0 z-30 shadow-md border-b border-slate-800">
            <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
              <EmblemaInfport tamanho="sm" comBrilho />
              <div className="min-w-0 flex-1">
                <h1 className="font-extrabold text-xs text-white truncate leading-tight">
                  {operadorContextoGlobal.condominio_nome || 'Condomínio Homologação INFPORT'}
                </h1>
                <p className="text-[11px] text-emerald-400 font-semibold truncate leading-tight mt-0.5">
                  Operador: <span className="text-white font-bold">{operador.nome || 'Caetano'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setModalMeuPerfilAberto(true)}
                className="p-1.5 text-slate-300 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                title="Meu Perfil & Senha"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                onClick={() => setModalLeitorNfcGlobal(true)}
                className="p-1.5 text-emerald-400 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg transition cursor-pointer"
                title="Leitor de Tags & Cartões NFC"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              </button>
            </div>
          </header>

          {moduloAtual !== 'dashboard' && (
            <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between shadow-xs">
              <button 
                onClick={() => mudarModulo('dashboard')}
                className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar ao Painel
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  {modulosDisponiveis.find(m => m.id === moduloAtual)?.titulo || moduloAtual}
                </span>
                <div className="hidden sm:flex items-center gap-2">
                  <ControleFonteAcessibilidade />
                  <PWAInstallButton />
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 p-2.5 sm:p-4 overflow-y-auto text-slate-900">
            
            {moduloAtual === 'dashboard' && (
              <div className="max-w-4xl mx-auto space-y-3">
                
                {/* Faixa Rápida de Status do Posto (Sleek & Sem Duplicações) */}
                <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-xl shadow-xs flex items-center justify-between gap-2 border border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-bold text-white truncate">
                        Posto Ativo: <span className="text-emerald-400 font-extrabold">{operadorContextoGlobal.condominio_nome || 'Condomínio'}</span>
                      </p>
                      <p className="text-[11px] text-slate-300 truncate">
                        Plantão Operacional • Operador: <strong className="text-white">{operador.nome || 'Caetano'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <ControleFonteAcessibilidade />
                    <PWAInstallButton />
                    <button
                      onClick={() => setModalLeitorNfcGlobal(true)}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-bold px-2 py-1 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Abrir Leitor de Tags e Cartões NFC"
                    >
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span className="hidden sm:inline">NFC</span>
                    </button>
                  </div>
                </div>

                {/* Grid dos Módulos Operacionais Otimizado (Ícones Compactos e Fáceis de Clicar) */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2 px-1">
                    Módulos Operacionais
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {modulosDisponiveis.filter(m => m.flag).map((item) => {
                      const Icone = item.icone;
                      return (
                        <button
                          key={item.id}
                          onClick={() => mudarModulo(item.id)}
                          className="bg-white hover:bg-slate-50 active:scale-[0.98] p-2.5 sm:p-3 rounded-xl border border-slate-200 hover:border-slate-300 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition group cursor-pointer"
                        >
                          <div className={`p-2 rounded-lg border ${item.cor} group-hover:scale-105 transition duration-150`}>
                            <Icone className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 leading-tight line-clamp-1">
                            {item.titulo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {moduloAtual === 'encomendas' && featureFlags.mod02_gestao_encomendas && (
              <Encomendas usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'custodia' && featureFlags.mod03_custodia_itens && (
              <Custodia usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'materiais' && featureFlags.mod04_materiais_posto && (
              <Materiais usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'chaves' && featureFlags.mod05_quadro_chaves && (
              <Chaves usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'manutencao' && featureFlags.mod06_gestao_manutencao && (
              <Manutencao usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'rondas' && featureFlags.mod07_gestao_ronda && (
              <Rondas usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'ocorrencias' && featureFlags.mod08_livro_ocorrencias && (
              <Ocorrencias usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'passagem' && featureFlags.mod09_passagem_posto && (
              <PassagemPosto usuarioLogado={operadorContextoGlobal} onTrocarOperador={handleTrocarOperador} />
            )}
            {moduloAtual === 'prestadores' && featureFlags.mod10_prestadores_servico && (
              <PrestadoresObras usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'cadastros' && (
              <Cadastros usuarioLogado={operadorContextoGlobal} />
            )}
            {moduloAtual === 'configuracoes' && podeAcessarConfiguracoes && (
              <Configuracoes 
                usuarioLogado={operadorContextoGlobal} 
                onConfigSalva={() => carregarFeatureFlags(operadorContextoGlobal.condominio_id)} 
              />
            )}
          </main>

        </div>

        {/* BARRA INFERIOR MOBILE COMPACTA & MODERNA */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-slate-300 flex justify-around items-center h-12 z-40 px-1 shadow-xl">
          <button
            onClick={() => mudarModulo('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
              moduloAtual === 'dashboard' ? 'text-emerald-400' : 'hover:text-slate-100'
            }`}
          >
            <Home className="w-4 h-4 mb-0.5" />
            Início
          </button>

          {featureFlags.mod02_gestao_encomendas && (
            <button
              onClick={() => mudarModulo('encomendas')}
              className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                moduloAtual === 'encomendas' ? 'text-emerald-400' : 'hover:text-slate-100'
              }`}
            >
              <Package className="w-4 h-4 mb-0.5" />
              Encomendas
            </button>
          )}

          {featureFlags.mod05_quadro_chaves && (
            <button
              onClick={() => mudarModulo('chaves')}
              className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                moduloAtual === 'chaves' ? 'text-emerald-400' : 'hover:text-slate-100'
              }`}
            >
              <Key className="w-4 h-4 mb-0.5" />
              Chaves
            </button>
          )}

          {featureFlags.mod07_gestao_ronda && (
            <button
              onClick={() => mudarModulo('rondas')}
              className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition cursor-pointer ${
                moduloAtual === 'rondas' ? 'text-emerald-400' : 'hover:text-slate-100'
              }`}
            >
              <QrCode className="w-4 h-4 mb-0.5" />
              Rondas
            </button>
          )}

          <button
            onClick={() => setDrawerMobileAberto(true)}
            className="flex flex-col items-center justify-center w-full h-full text-[10px] font-bold hover:text-slate-100 text-slate-300 transition cursor-pointer"
          >
            <Grid className="w-4 h-4 mb-0.5" />
            Módulos
          </button>
        </nav>

        {/* Indicador de Status Offline e Conexão na Portaria */}
        <IndicadorConectividade />
        <OfflineIndicator />

        {/* Modal Global do Leitor de Tags & Cartões NFC */}
        {modalLeitorNfcGlobal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <LeitorNFC
                titulo="Leitor de Tags & Cartões NFC"
                subtitulo="Aproxime qualquer tag física, cartão ou chaveiro da portaria"
                onTagLida={(tagLida, dadosExtras) => {
                  console.log('[App] Tag NFC lida:', tagLida, dadosExtras);
                }}
                onFechar={() => setModalLeitorNfcGlobal(false)}
              />
            </div>
          </div>
        )}

        {/* Modal de Meu Perfil & Troca de Senha */}
        {modalMeuPerfilAberto && (
          <ModalMeuPerfil
            isOpen={modalMeuPerfilAberto}
            onClose={() => setModalMeuPerfilAberto(false)}
            operador={operadorContextoGlobal}
            condominio={condominio}
            onOperadorAtualizado={(opAtualizado) => {
              setOperador(opAtualizado);
            }}
          />
        )}

      </div>
    );
  }

  if (restaurandoSessao) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-16 h-16 mb-3 animate-pulse flex items-center justify-center">
          <EmblemaInfport tamanho="xl" comBrilho />
        </div>
        <h1 className="text-lg font-bold tracking-tight">INFPORT 1.0</h1>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Restaurando sessão segura...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-slate-900 antialiased relative">
      {/* Barra Superior de Acessibilidade e Instalação na Tela de Login */}
      <div className="absolute top-4 right-4 flex items-center gap-2.5 z-20">
        <ControleFonteAcessibilidade />
        <PWAInstallButton />
      </div>

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 my-auto">
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <EmblemaInfport tamanho="xl" comBrilho />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">INFPORT 1.0</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
            Sistema Integrado de Portaria & Segurança Patrimonial
          </p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm mb-4 border border-red-200 break-words font-semibold">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1.5">
              Usuário / Login
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 z-10" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário (ex: admin)"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 uppercase mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-3.5 z-10" />
              <input
                type={mostrarSenhaLogin ? "text" : "password"}
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base font-semibold"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={mostrarSenhaLogin ? "Ocultar senha" : "Ver senha"}
              >
                {mostrarSenhaLogin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-0.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-semibold select-none">
              <input
                type="checkbox"
                checked={lembrarAcesso}
                onChange={(e) => setLembrarAcesso(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Manter conectado neste dispositivo</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition text-sm sm:text-base uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 font-medium">
          <span>INFPORT 1.0 — Guarita</span>
          <span>Sistema Operacional</span>
        </div>
      </div>

      <IndicadorConectividade />
      <OfflineIndicator />
    </div>
  );
}
