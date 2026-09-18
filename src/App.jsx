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
  Filter
} from 'lucide-react';

export default function App() {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [operador, setOperador] = useState(null);
  const [condominio, setCondominio] = useState(null);
  
  // Lista Global de Condomínios e Seleção para Administrador
  const [listaCondominios, setListaCondominios] = useState([]);
  const [condominioAtivoId, setCondominioAtivoId] = useState('');

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

  const eAdmin = operador?.perfil === 'admin' || operador?.nivel_acesso === 0;

  useEffect(() => {
    if (operador) {
      carregarCondominiosHeader();
    }
  }, [operador]);

  // Recarrega as Feature Flags sempre que o condomínio ativo mudar
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

  // Carrega a tabela 'configuracoes' para ativar/desativar botões do menu
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
        // Padrão: todos os módulos ativos se não houver configuração salva
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
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* Cabeçalho do Sistema */}
        <header className="bg-slate-900 text-white p-4 shadow-md flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                INFPORT 1.0 <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono px-2 py-0.5 rounded">PWA</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" /> {operadorContextoGlobal.condominio_nome}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor Multi-Tenant de Condomínios (Exclusivo ADM CAETANO) */}
            {eAdmin && (
              <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <select
                  value={condominioAtivoId}
                  onChange={(e) => setCondominioAtivoId(e.target.value)}
                  className="bg-slate-900 text-white text-xs font-bold py-1 px-2.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer max-w-[200px] sm:max-w-[260px] truncate"
                >
                  <option value="">🏢 Todos os Condomínios (Visão Global)</option>
                  {listaCondominios.map((c) => (
                    <option key={c.id} value={c.id}>🏢 {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <span className="text-xs text-slate-300 hidden md:inline">
              Operador: <strong>{operador.nome}</strong>
            </span>

            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </header>

        {/* Menu de Módulos / Navegação Dinâmico (Renderização Condicional por Feature Flags) */}
        <div className="bg-white border-b border-slate-200 shadow-sm overflow-x-auto">
          <div className="max-w-7xl mx-auto flex gap-2 p-2 min-w-max">
            
            {/* Módulo 03: Encomendas */}
            {featureFlags.mod03_gestao_encomendas && (
              <button
                onClick={() => setModuloAtual('encomendas')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'encomendas' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="w-4 h-4" /> Encomendas & Entregadores
              </button>
            )}

            {/* Custódia de Itens */}
            {featureFlags.mod03_gestao_encomendas && (
              <button
                onClick={() => setModuloAtual('custodia')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'custodia' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" /> Custódia de Itens
              </button>
            )}

            {/* Módulo 04: Materiais do Posto */}
            {featureFlags.mod04_materiais_posto && (
              <button
                onClick={() => setModuloAtual('materiais')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'materiais' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-4 h-4" /> Materiais do Posto
              </button>
            )}

            {/* Módulo 05: Quadro de Chaves */}
            {featureFlags.mod05_quadro_chaves && (
              <button
                onClick={() => setModuloAtual('chaves')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'chaves' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Key className="w-4 h-4" /> Quadro de Chaves
              </button>
            )}

            {/* Módulo 06: Manutenção & OS */}
            {featureFlags.mod06_gestao_manutencao && (
              <button
                onClick={() => setModuloAtual('manutencao')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'manutencao' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wrench className="w-4 h-4" /> Manutenção & OS
              </button>
            )}

            {/* Módulo 07: Rondas Patrimoniais */}
            {featureFlags.mod07_gestao_ronda && (
              <button
                onClick={() => setModuloAtual('rondas')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'rondas' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4" /> Rondas Patrimoniais
              </button>
            )}

            {/* Módulo 08: Livro de Ocorrências */}
            {featureFlags.mod08_livro_ocorrencias && (
              <button
                onClick={() => setModuloAtual('ocorrencias')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'ocorrencias' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Livro de Ocorrências
              </button>
            )}

            {/* Módulo 09: Passagem de Posto */}
            {featureFlags.mod09_passagem_posto && (
              <button
                onClick={() => setModuloAtual('passagem')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'passagem' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Repeat className="w-4 h-4" /> Passagem de Posto
              </button>
            )}

            {/* Módulo 10: Prestadores & Obras */}
            {featureFlags.mod10_prestadores_servico && (
              <button
                onClick={() => setModuloAtual('prestadores')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'prestadores' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-4 h-4" /> Prestadores & Obras
              </button>
            )}

            {/* Módulo 01/02: Cadastro Base */}
            {featureFlags.mod02_controle_acesso && (
              <button
                onClick={() => setModuloAtual('cadastros')}
                className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                  moduloAtual === 'cadastros' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Database className="w-4 h-4" /> Cadastro Base
              </button>
            )}

            {/* Módulo 11: Configurações (Sempre visível para administração e personalização) */}
            <button
              onClick={() => setModuloAtual('configuracoes')}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition ${
                moduloAtual === 'configuracoes' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" /> Configurações
            </button>
          </div>
        </div>

        {/* Conteúdo Dinâmico */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
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
          {moduloAtual === 'configuracoes' && (
            <Configuracoes 
              usuarioLogado={operadorContextoGlobal} 
              onConfigSalva={() => carregarFeatureFlags(operadorContextoGlobal.condominio_id)} 
            />
          )}
        </main>

        {/* Rodapé */}
        <footer className="bg-slate-900 text-slate-500 text-[11px] py-3 text-center border-t border-slate-800">
          INFPORT 1.0 — Gestão de Portaria Inteligente
        </footer>
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
