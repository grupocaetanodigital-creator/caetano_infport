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
import { 
  ShieldCheck, 
  Lock, 
  User, 
  LogOut, 
  Building2, 
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
  ChevronRight,
  Home,
  Grid,
  ChevronLeft
} from 'lucide-react';

export default function App() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState(null);
  const [condominio, setCondominio] = useState(null);
  
  // Lista Global de Condomínios e Seleção para Administrador
  const [listaCondominios, setListaCondominios] = useState([]);
  const [condominioAtivoId, setCondominioAtivoId] = useState('');

  // Controles de Navegação Responsiva
  const [menuAberto, setMenuAberto] = useState(true); // Sidebar Desktop
  const [drawerMobileAberto, setDrawerMobileAberto] = useState(false); // Menu Gaveta Mobile

  // Feature Flags / Parametrização Dinâmica de Módulos
  const [featureFlags, setFeatureFlags] = useState({
    mod02_controle_acesso: true,
    mod03_gestao_encomendas: true,
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

  // Identificação de Perfil de Administrador (Nível 0 / Admin)
  const eAdmin = operador?.perfil === 'admin' || operador?.nivel_acesso === 0;

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
      }
    }
  }, [operador, condominioAtivoId]);

  const carregarCondominiosHeader = async () => {
    try {
      const { data, error } = await supabase
        .from('condominios')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      setListaCondominios(data || []);
    } catch (err) {
      console.error('Erro ao carregar condomínios no topo:', err);
    }
  };

  const carregarFeatureFlags = async (condominioId) => {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('*')
        .eq('condominio_id', condominioId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFeatureFlags({
          mod02_controle_acesso: data.mod02_controle_acesso ?? true,
          mod03_gestao_encomendas: data.mod03_gestao_encomendas ?? true,
          mod04_materiais_posto: data.mod04_materiais_posto ?? true,
          mod05_quadro_chaves: data.mod05_quadro_chaves ?? true,
          mod06_gestao_manutencao: data.mod06_gestao_manutencao ?? true,
          mod07_gestao_ronda: data.mod07_gestao_ronda ?? true,
          mod08_livro_ocorrencias: data.mod08_livro_ocorrencias ?? true,
          mod09_passagem_posto: data.mod09_passagem_posto ?? true,
          mod10_prestadores_servico: data.mod10_prestadores_servico ?? true
        });
      } else {
        setFeatureFlags({
          mod02_controle_acesso: true,
          mod03_gestao_encomendas: true,
          mod04_materiais_posto: true,
          mod05_quadro_chaves: true,
          mod06_gestao_manutencao: true,
          mod07_gestao_ronda: true,
          mod08_livro_ocorrencias: true,
          mod09_passagem_posto: true,
          mod10_prestadores_servico: true
        });
      }
    } catch (err) {
      console.error('Erro ao carregar Feature Flags:', err);
    }
  };

  const handleLogin = async (e) => {
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
      setModuloAtual('dashboard');
    } catch (err) {
      setErro(`Falha de conexão: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setOperador(null);
    setCondominio(null);
    setLogin('');
    setSenha('');
    setCondominioAtivoId('');
    setDrawerMobileAberto(false);
  };

  const handleTrocarOperador = (novoOperador) => {
    setOperador(novoOperador);
    setModuloAtual('dashboard');
  };

  const navegarMobile = (modulo) => {
    setModuloAtual(modulo);
    setDrawerMobileAberto(false);
  };

  const objCondominioSelecionado = listaCondominios.find(c => c.id === condominioAtivoId);

  const operadorContextoGlobal = operador ? {
    ...operador,
    condominio_id: eAdmin ? (condominioAtivoId || operador.condominio_id) : operador.condominio_id,
    condominio_nome: eAdmin 
      ? (objCondominioSelecionado?.nome || (condominioAtivoId ? 'Condomínio Selecionado' : 'Visão Global (Todos)'))
      : (condominio?.nome || 'Condomínio Geral')
  } : null;

  // Grade de Módulos Ativos para a Home / Dashboard Mobile
  const modulosDisponiveis = [
    { id: 'encomendas', titulo: 'Encomendas', icone: Package, flag: featureFlags.mod03_gestao_encomendas, cor: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'custodia', titulo: 'Custódia Itens', icone: Shield, flag: featureFlags.mod03_gestao_encomendas, cor: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'prestadores', titulo: 'Prestadores & Obras', icone: Briefcase, flag: featureFlags.mod10_prestadores_servico, cor: 'bg-purple-50 text-purple-600 border-purple-200' },
    { id: 'materiais', titulo: 'Materiais Posto', icone: Radio, flag: featureFlags.mod04_materiais_posto, cor: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'chaves', titulo: 'Quadro Chaves', icone: Key, flag: featureFlags.mod05_quadro_chaves, cor: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { id: 'manutencao', titulo: 'Manutenção OS', icone: Wrench, flag: featureFlags.mod06_gestao_manutencao, cor: 'bg-orange-50 text-orange-600 border-orange-200' },
    { id: 'rondas', titulo: 'Rondas QR', icone: QrCode, flag: featureFlags.mod07_gestao_ronda, cor: 'bg-teal-50 text-teal-600 border-teal-200' },
    { id: 'ocorrencias', titulo: 'Ocorrências', icone: BookOpen, flag: featureFlags.mod08_livro_ocorrencias, cor: 'bg-rose-50 text-rose-600 border-rose-200' },
    { id: 'passagem', titulo: 'Passagem Posto', icone: Repeat, flag: featureFlags.mod09_passagem_posto, cor: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { id: 'cadastros', titulo: 'Cadastros Base', icone: Database, flag: featureFlags.mod02_controle_acesso, cor: 'bg-slate-100 text-slate-700 border-slate-300' },
  ];

  if (eAdmin) {
    modulosDisponiveis.push({ id: 'configuracoes', titulo: 'Configurações', icone: Settings, flag: true, cor: 'bg-slate-800 text-white border-slate-900' });
  }

  if (operador) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans pb-16 md:pb-0">
        
        {/* CABEÇALHO COMPACTO EXCLUSIVO MOBILE */}
        <header className="md:hidden bg-slate-900 text-white p-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <ShieldCheck className="w-7 h-7 text-emerald-400 shrink-0" />
            <div className="truncate">
              <h1 className="font-bold text-sm leading-tight">INFPORT 1.0</h1>
              <p className="text-[11px] text-slate-300 truncate max-w-[190px]">
                {operadorContextoGlobal.condominio_nome}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerMobileAberto(true)}
              className="p-2 text-slate-200 bg-slate-800 active:bg-slate-700 rounded-xl transition"
              title="Menu Principal"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* SIDEBAR VERTICAL (Telas Médias/Grandes e Tablets) */}
        <aside className={`hidden md:flex bg-slate-900 text-white flex-col justify-between transition-all duration-300 z-30 ${
          menuAberto ? 'w-64' : 'w-20'
        } shrink-0 min-h-screen sticky top-0`}>
          
          <div>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                {menuAberto && (
                  <div>
                    <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                      INFPORT 1.0 <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
                    </h1>
                    <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
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

            {/* Seletor Multi-Tenant Admin no Desktop */}
            {eAdmin && menuAberto && (
              <div className="p-3 bg-slate-800/80 mx-3 mt-3 rounded-xl border border-slate-700/60 space-y-1">
                <label className="block text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Condomínio Ativo
                </label>
                <select
                  value={condominioAtivoId}
                  onChange={(e) => setCondominioAtivoId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2 rounded-lg border border-slate-600 focus:outline-none"
                >
                  <option value="">🏢 Todos (Visão Global)</option>
                  {listaCondominios.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Menu de Ícones Lateral */}
            <nav className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-200px)]">
              <button
                onClick={() => setModuloAtual('dashboard')}
                className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
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
                    onClick={() => setModuloAtual(item.id)}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
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

          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            {menuAberto && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {operador.nome?.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{operador.nome}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-mono">
                    {eAdmin ? 'DEV ADMIN' : `NÍVEL ${operador.nivel_acesso}`}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600/90 hover:bg-red-700 text-white p-2.5 rounded-xl transition font-bold text-xs mx-auto md:mx-0"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* DRAWER / MENU DESLIZANTE PARA TELAS MÓVEIS */}
        {drawerMobileAberto && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-end md:hidden">
            <div className="w-4/5 max-w-xs bg-slate-900 h-full flex flex-col justify-between p-4 shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-200">
              <div>
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                    <span className="font-bold text-white text-sm">Menu INFPORT</span>
                  </div>
                  <button onClick={() => setDrawerMobileAberto(false)} className="text-slate-400 p-1">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {eAdmin && (
                  <div className="my-3 p-2.5 bg-slate-800 rounded-xl space-y-1">
                    <label className="text-[10px] font-bold text-emerald-400 uppercase">Condomínio Ativo</label>
                    <select
                      value={condominioAtivoId}
                      onChange={(e) => setCondominioAtivoId(e.target.value)}
                      className="w-full bg-slate-900 text-white text-xs font-bold p-2 rounded-lg border border-slate-700"
                    >
                      <option value="">🏢 Todos os Condomínios</option>
                      {listaCondominios.map((c) => (
                        <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="py-3 space-y-1 overflow-y-auto max-h-[60vh]">
                  <button
                    onClick={() => navegarMobile('dashboard')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center gap-3 ${
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
                        onClick={() => navegarMobile(item.id)}
                        className={`w-full p-3 rounded-xl font-bold text-xs flex items-center gap-3 ${
                          moduloAtual === item.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Icone className="w-5 h-5" /> {item.titulo}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{operador.nome}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{operadorContextoGlobal.condominio_nome}</p>
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

        {/* ÁREA DE CONTEÚDO PRINCIPAL DO APLICATIVO */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Cabeçalho do Módulo para Navegação Fácil */}
          {moduloAtual !== 'dashboard' && (
            <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm">
              <button 
                onClick={() => setModuloAtual('dashboard')}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar ao Painel
              </button>

              <span className="text-xs font-bold uppercase text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {modulosDisponiveis.find(m => m.id === moduloAtual)?.titulo || moduloAtual}
              </span>
            </div>
          )}

          {/* Renderização das Telas dos Módulos */}
          <main className="flex-1 p-3 sm:p-6 overflow-y-auto">
            
            {/* TELA DASHBOARD / GRADE DE ICONES ESTILO APP MÓVEL */}
            {moduloAtual === 'dashboard' && (
              <div className="max-w-4xl mx-auto space-y-4">
                
                {/* Banner de Operador Fixo (Estilo Engemoura) */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md flex items-center justify-between border border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                      Posto Ativo
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-white truncate">
                      {operadorContextoGlobal.condominio_nome}
                    </h2>
                    <p className="text-xs text-slate-300">
                      Operador: <strong className="text-white">{operador.nome}</strong>
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-slate-800 rounded-full flex items-center justify-center text-emerald-400 font-bold text-lg border border-slate-700 shrink-0">
                    {operador.nome?.charAt(0)}
                  </div>
                </div>

                {/* Grade 3xN de Ícones Grandes (Estilo PorteiroWeb / RJ Johnson) */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
                    Módulos Operacionais
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {modulosDisponiveis.filter(m => m.flag).map((item) => {
                      const Icone = item.icone;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setModuloAtual(item.id)}
                          className="bg-white hover:bg-slate-50 active:scale-[0.97] p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2.5 transition group"
                        >
                          <div className={`p-3.5 rounded-2xl border ${item.cor} group-hover:scale-110 transition duration-200`}>
                            <Icone className="w-7 h-7" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 leading-tight">
                            {item.titulo}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Telas dos Módulos Específicos */}
            {moduloAtual === 'encomendas' && <Encomendas usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'custodia' && <Custodia usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'materiais' && <Materiais usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'chaves' && <Chaves usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'manutencao' && <Manutencao usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'rondas' && <Rondas usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'ocorrencias' && <Ocorrencias usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'passagem' && <PassagemPosto usuarioLogado={operadorContextoGlobal} onTrocarOperador={handleTrocarOperador} />}
            {moduloAtual === 'prestadores' && <PrestadoresObras usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'cadastros' && <Cadastros usuarioLogado={operadorContextoGlobal} />}
            {moduloAtual === 'configuracoes' && eAdmin && (
              <Configuracoes 
                usuarioLogado={operadorContextoGlobal} 
                onConfigSalva={() => carregarFeatureFlags(operadorContextoGlobal.condominio_id)} 
              />
            )}
          </main>

        </div>

        {/* BARRA DE NAVEGAÇÃO INFERIOR FIXA (BOTTOM BAR - ESTILO APP CELULAR) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-slate-400 flex justify-around items-center h-16 z-40 px-1 shadow-2xl">
          <button
            onClick={() => setModuloAtual('dashboard')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition ${
              moduloAtual === 'dashboard' ? 'text-emerald-400' : 'hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            Início
          </button>

          <button
            onClick={() => setModuloAtual('encomendas')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition ${
              moduloAtual === 'encomendas' ? 'text-emerald-400' : 'hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5 mb-0.5" />
            Encomendas
          </button>

          <button
            onClick={() => setModuloAtual('chaves')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition ${
              moduloAtual === 'chaves' ? 'text-emerald-400' : 'hover:text-slate-200'
            }`}
          >
            <Key className="w-5 h-5 mb-0.5" />
            Chaves
          </button>

          <button
            onClick={() => setModuloAtual('rondas')}
            className={`flex flex-col items-center justify-center w-full h-full text-[10px] font-bold transition ${
              moduloAtual === 'rondas' ? 'text-emerald-400' : 'hover:text-slate-200'
            }`}
          >
            <QrCode className="w-5 h-5 mb-0.5" />
            Rondas
          </button>

          <button
            onClick={() => setDrawerMobileAberto(true)}
            className="flex flex-col items-center justify-center w-full h-full text-[10px] font-bold hover:text-slate-200 text-slate-300"
          >
            <Grid className="w-5 h-5 mb-0.5" />
            Módulos
          </button>
        </nav>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-10 h-10 text-slate-800" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">INFPORT 1.0</h1>
          <p className="text-sm text-slate-500">Acesso à Guarita / Operação</p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200 break-words">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Usuário / Login
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Digite seu usuário"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-900 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full p-3 pl-10 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-base"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition duration-200 shadow-md active:scale-[0.98] disabled:opacity-50 text-base mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
