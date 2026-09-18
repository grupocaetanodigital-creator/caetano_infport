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
  ChevronRight
} from 'lucide-react';

export default function App() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState(null);
  const [condominio, setCondominio] = useState(null);
  
  // Lista Global de Condomínios e Seleção para Administrador
  const [listaCondominios, setListaCondominios] = useState([]);
  const [condominioAtivoId, setCondominioAtivoId] = useState('');

  // Controle do Menu Lateral Responsivo (Sidebar)
  const [menuAberto, setMenuAberto] = useState(true);

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

  const [moduloAtual, setModuloAtual] = useState('encomendas');
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
  };

  const handleTrocarOperador = (novoOperador) => {
    setOperador(novoOperador);
    setModuloAtual('encomendas');
  };

  const objCondominioSelecionado = listaCondominios.find(c => c.id === condominioAtivoId);

  const operadorContextoGlobal = operador ? {
    ...operador,
    condominio_id: eAdmin ? (condominioAtivoId || operador.condominio_id) : operador.condominio_id,
    condominio_nome: eAdmin 
      ? (objCondominioSelecionado?.nome || (condominioAtivoId ? 'Condomínio Selecionado' : 'Visão Global (Todos os Condomínios)'))
      : (condominio?.nome || 'Condomínio Geral')
  } : null;

  if (operador) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
        
        {/* BARRA LATERAL / SIDEBAR DE NAVEGAÇÃO VERTICAL */}
        <aside className={`bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 z-30 ${
          menuAberto ? 'w-full md:w-72' : 'w-full md:w-20'
        } shrink-0`}>
          
          <div>
            {/* Logótipo e Botão de Alternar Menu */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                {menuAberto && (
                  <div>
                    <h1 className="font-bold text-base leading-tight flex items-center gap-2">
                      INFPORT 1.0 <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
                    </h1>
                    <p className="text-[11px] text-slate-400 truncate max-w-[170px]">
                      {operadorContextoGlobal.condominio_nome}
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setMenuAberto(!menuAberto)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title="Expandir/Recolher Menu"
              >
                {menuAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {/* Seletor Multi-Tenant no Menu Lateral para Administrador */}
            {eAdmin && menuAberto && (
              <div className="p-3 bg-slate-800/80 mx-3 mt-3 rounded-xl border border-slate-700/60 space-y-1">
                <label className="block text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Condomínio Ativo
                </label>
                <select
                  value={condominioAtivoId}
                  onChange={(e) => setCondominioAtivoId(e.target.value)}
                  className="w-full bg-slate-900 text-white text-xs font-bold p-2 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                >
                  <option value="">🏢 Todos (Visão Global)</option>
                  {listaCondominios.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Lista Vertical de Módulos Categorizada por Função */}
            <nav className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]">
              
              {/* GRUPO 1: PORTARIA & ATENDIMENTO */}
              <div className="space-y-1">
                {menuAberto && <span className="text-[10px] font-bold text-slate-500 uppercase px-3 tracking-wider">Portaria & Atendimento</span>}
                
                {featureFlags.mod03_gestao_encomendas && (
                  <button
                    onClick={() => setModuloAtual('encomendas')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'encomendas' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Encomendas & Entregas</span>}
                    </div>
                    {menuAberto && moduloAtual === 'encomendas' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {featureFlags.mod03_gestao_encomendas && (
                  <button
                    onClick={() => setModuloAtual('custodia')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'custodia' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Custódia de Itens</span>}
                    </div>
                    {menuAberto && moduloAtual === 'custodia' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {featureFlags.mod10_prestadores_servico && (
                  <button
                    onClick={() => setModuloAtual('prestadores')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'prestadores' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Prestadores & Obras</span>}
                    </div>
                    {menuAberto && moduloAtual === 'prestadores' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* GRUPO 2: GESTÃO DO POSTO */}
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                {menuAberto && <span className="text-[10px] font-bold text-slate-500 uppercase px-3 tracking-wider">Gestão do Posto</span>}

                {featureFlags.mod04_materiais_posto && (
                  <button
                    onClick={() => setModuloAtual('materiais')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'materiais' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Radio className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Materiais do Posto</span>}
                    </div>
                    {menuAberto && moduloAtual === 'materiais' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {featureFlags.mod05_quadro_chaves && (
                  <button
                    onClick={() => setModuloAtual('chaves')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'chaves' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Quadro de Chaves</span>}
                    </div>
                    {menuAberto && moduloAtual === 'chaves' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {featureFlags.mod06_gestao_manutencao && (
                  <button
                    onClick={() => setModuloAtual('manutencao')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'manutencao' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Manutenção & OS</span>}
                    </div>
                    {menuAberto && moduloAtual === 'manutencao' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* GRUPO 3: SEGURANÇA & AUDITORIA */}
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                {menuAberto && <span className="text-[10px] font-bold text-slate-500 uppercase px-3 tracking-wider">Segurança & Auditoria</span>}

                {featureFlags.mod07_gestao_ronda && (
                  <button
                    onClick={() => setModuloAtual('rondas')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'rondas' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <QrCode className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Rondas Patrimoniais</span>}
                    </div>
                    {menuAberto && moduloAtual === 'rondas' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {featureFlags.mod08_livro_ocorrencias && (
                  <button
                    onClick={() => setModuloAtual('ocorrencias')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'ocorrencias' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Livro de Ocorrências</span>}
                    </div>
                    {menuAberto && moduloAtual === 'ocorrencias' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {featureFlags.mod09_passagem_posto && (
                  <button
                    onClick={() => setModuloAtual('passagem')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'passagem' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Repeat className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Passagem de Posto</span>}
                    </div>
                    {menuAberto && moduloAtual === 'passagem' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* GRUPO 4: ADMINISTRAÇÃO */}
              <div className="space-y-1 pt-2 border-t border-slate-800/80">
                {menuAberto && <span className="text-[10px] font-bold text-slate-500 uppercase px-3 tracking-wider">Administração</span>}

                {featureFlags.mod02_controle_acesso && (
                  <button
                    onClick={() => setModuloAtual('cadastros')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'cadastros' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Cadastros Base</span>}
                    </div>
                    {menuAberto && moduloAtual === 'cadastros' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}

                {eAdmin && (
                  <button
                    onClick={() => setModuloAtual('configuracoes')}
                    className={`w-full p-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
                      moduloAtual === 'configuracoes' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 shrink-0" />
                      {menuAberto && <span>Configurações (ADM)</span>}
                    </div>
                    {menuAberto && moduloAtual === 'configuracoes' && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
              </div>

            </nav>
          </div>

          {/* Rodapé da Sidebar / Operador Conectado & Logout */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            {menuAberto ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  {operador.nome?.charAt(0)}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{operador.nome}</p>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">
                    {eAdmin ? 'DEV ADMIN' : `NÍVEL ${operador.nivel_acesso}`}
                  </p>
                </div>
              </div>
            ) : null}

            <button
              onClick={handleLogout}
              className="bg-red-600/90 hover:bg-red-700 text-white p-2.5 rounded-xl transition shadow-sm flex items-center gap-1 text-xs font-bold mx-auto md:mx-0"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
              {menuAberto && <span>Sair</span>}
            </button>
          </div>

        </aside>

        {/* ÁREA DE CONTEÚDO PRINCIPAL DO APLICATIVO */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Cabeçalho do Conteúdo */}
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Módulo Ativo:</span>
              <span className="text-xs font-bold uppercase text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                {moduloAtual === 'encomendas' && '📦 Encomendas & Entregadores'}
                {moduloAtual === 'custodia' && '🛡️ Custódia de Itens'}
                {moduloAtual === 'materiais' && '📻 Materiais do Posto'}
                {moduloAtual === 'chaves' && '🔑 Quadro de Chaves'}
                {moduloAtual === 'manutencao' && '🔧 Manutenção & OS'}
                {moduloAtual === 'rondas' && '📱 Rondas Patrimoniais'}
                {moduloAtual === 'ocorrencias' && '📖 Livro de Ocorrências'}
                {moduloAtual === 'passagem' && '🔄 Passagem de Posto'}
                {moduloAtual === 'prestadores' && '💼 Prestadores & Obras'}
                {moduloAtual === 'cadastros' && '🗄️ Cadastros Base'}
                {moduloAtual === 'configuracoes' && '⚙️ Configurações do Sistema'}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              Condomínio: <strong className="text-slate-800">{operadorContextoGlobal.condominio_nome}</strong>
            </div>
          </header>

          {/* Renderização da Tela do Módulo Selecionado */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
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

          {/* Rodapé Fixo da Área de Conteúdo */}
          <footer className="bg-white border-t border-slate-200 text-slate-400 text-[11px] py-2.5 text-center font-medium">
            INFPORT 1.0 — Gestão de Portaria Inteligente
          </footer>
        </div>

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
